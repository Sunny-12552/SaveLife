import User from '../models/User.js';
import PasswordHelpRequest from '../models/PasswordHelpRequest.js';
import generateToken from '../utils/generateToken.js';
import sendResponse from '../utils/responseHandler.js';
import { createHash, randomBytes } from 'node:crypto';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+[1-9]\d{10,14}$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
const ASSIGNABLE_ROLES = ['admin', 'organizer', 'donor', 'patient'];
const PUBLIC_REGISTRATION_ROLES = ['donor', 'patient', 'organizer', 'admin'];
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

const hashResetToken = (token) => createHash('sha256').update(token).digest('hex');

export const requestPasswordHelp = async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
    const phone = typeof req.body.phone === 'string'
      ? req.body.phone.trim()
      : '';
    const message = typeof req.body.message === 'string'
      ? req.body.message.trim()
      : '';

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      res.status(400);
      throw new Error('Enter the email address associated with your account.');
    }

    if (!/^\+[1-9]\d{10,14}$/.test(phone)) {
      res.status(400);
      throw new Error('Enter the phone number registered with your account, including its country code.');
    }

    if (message.length > 500) {
      res.status(400);
      throw new Error('The help message must be 500 characters or fewer.');
    }

    const recentRequest = await PasswordHelpRequest.exists({
      email,
      phone,
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });

    if (!recentRequest) {
      await PasswordHelpRequest.create({ email, phone, message });
    }

    return sendResponse(
      res,
      202,
      true,
      'If an account uses that email, an administrator can review the help request.'
    );
  } catch (error) {
    next(error);
  }
};

export const getPasswordHelpRequests = async (req, res, next) => {
  try {
    const requests = await PasswordHelpRequest.find()
      .sort({ status: 1, createdAt: -1 })
      .limit(100)
      .lean();

    const matchingAccounts = requests.length
      ? await User.find({
        $or: requests.map(({ email, phone }) => ({ email, phone })),
      }).select('email phone').lean()
      : [];
    const matches = new Set(matchingAccounts.map(({ email, phone }) => `${email}:${phone}`));
    const requestsWithMatch = requests.map((request) => ({
      ...request,
      phoneMatchesAccount: matches.has(`${request.email}:${request.phone}`),
    }));

    return sendResponse(res, 200, true, 'Password help requests retrieved.', requestsWithMatch);
  } catch (error) {
    next(error);
  }
};

export const issuePasswordResetLink = async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      res.status(404);
      throw new Error('Password help request not found.');
    }

    const helpRequest = await PasswordHelpRequest.findOne({
      _id: req.params.id,
      status: { $in: ['pending', 'link_issued'] },
    });

    if (!helpRequest) {
      res.status(404);
      throw new Error('Password help request not found.');
    }

    const user = await User.findOne({ email: helpRequest.email });
    if (!user) {
      res.status(404);
      throw new Error('No account is associated with this help request.');
    }

    if (user.phone !== helpRequest.phone) {
      res.status(403);
      throw new Error('The submitted phone number does not match the account. Do not issue a reset link.');
    }

    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    user.passwordResetTokenHash = hashResetToken(resetToken);
    user.passwordResetExpires = expiresAt;
    await user.save();

    helpRequest.status = 'link_issued';
    helpRequest.reviewedBy = req.user._id;
    helpRequest.reviewedAt = new Date();
    await helpRequest.save();

    return sendResponse(res, 200, true, 'One-time password reset link created.', {
      resetToken,
      expiresAt,
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (
      typeof token !== 'string' ||
      token.length !== 64 ||
      !/^[a-f\d]{64}$/i.test(token) ||
      typeof password !== 'string' ||
      !STRONG_PASSWORD_PATTERN.test(password)
    ) {
      res.status(400);
      throw new Error(
        'Use a valid reset link and a password with uppercase, lowercase, number, special character, and at least 8 characters.'
      );
    }

    const user = await User.findOneAndUpdate(
      {
        passwordResetTokenHash: hashResetToken(token),
        passwordResetExpires: { $gt: new Date() },
      },
      {
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetExpires: 1,
        },
      },
      { new: true }
    ).select('+password');

    if (!user) {
      res.status(400);
      throw new Error('This password reset link is invalid or has expired.');
    }

    user.password = password;
    await user.save();

    return sendResponse(res, 200, true, 'Password changed successfully. You can now log in.');
  } catch (error) {
    next(error);
  }
};

const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  profileImage: user.profileImage || '',
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt || null,
  loginHistory: user.loginHistory || [],
  createdAt: user.createdAt,
});

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, phoneCountryCode } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedPhone = typeof phone === 'string' && typeof phoneCountryCode === 'string'
      ? `${phoneCountryCode}${phone}`
      : '';

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      res.status(400);
      throw new Error('Enter a valid email address, for example name@example.com.');
    }

    if (!/^\+[1-9]\d{0,2}$/.test(phoneCountryCode || '') || !/^\d{10}$/.test(phone || '') || !PHONE_PATTERN.test(normalizedPhone)) {
      res.status(400);
      throw new Error('Select a country code and enter a valid 10-digit phone number.');
    }

    if (typeof password !== 'string' || !STRONG_PASSWORD_PATTERN.test(password)) {
      res.status(400);
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
    }

    if (role && !PUBLIC_REGISTRATION_ROLES.includes(role)) {
      res.status(400);
      throw new Error('Choose a valid account role.');
    }

    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role,
      phone: normalizedPhone,
    });

    if (user) {
      return sendResponse(res, 201, true, 'User registered successfully', {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      if (!user.isActive) {
        res.status(401);
        throw new Error('Account is deactivated');
      }

      const loginAt = new Date();
      user.lastLoginAt = loginAt;
      user.loginHistory.push(loginAt);
      await user.save();

      return sendResponse(res, 200, true, 'Login successful', {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      return sendResponse(res, 200, true, 'Profile retrieved successfully', {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        loginHistory: user.loginHistory,
        createdAt: user.createdAt,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};

    if (role && ASSIGNABLE_ROLES.includes(role)) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search && typeof search === 'string') {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (escapedSearch) {
        filter.$or = [
          { name: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
          { phone: { $regex: escapedSearch, $options: 'i' } },
        ];
      }
    }

    const users = await User.find(filter)
      .select('name email phone role profileImage isActive lastLoginAt loginHistory createdAt')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Accounts retrieved successfully', users);
  } catch (error) {
    next(error);
  }
};

export const updateManagedUser = async (req, res, next) => {
  try {
    const { isActive, role } = req.body;
    const updates = {};

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        res.status(400);
        throw new Error('Account status must be active or inactive.');
      }
      updates.isActive = isActive;
    }

    if (role !== undefined) {
      if (!ASSIGNABLE_ROLES.includes(role)) {
        res.status(400);
        throw new Error('Choose a valid account role.');
      }
      updates.role = role;
    }

    if (!Object.keys(updates).length) {
      res.status(400);
      throw new Error('Provide an account status or role to update.');
    }

    if (req.params.id === req.user._id.toString()) {
      if (updates.isActive === false) {
        res.status(400);
        throw new Error('You cannot deactivate your own administrator account.');
      }
      if (updates.role && updates.role !== 'admin') {
        res.status(400);
        throw new Error('You cannot remove your own administrator role.');
      }
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      res.status(404);
      throw new Error('User not found.');
    }

    if (
      targetUser.role === 'admin' &&
      targetUser.isActive &&
      (updates.isActive === false || (updates.role && updates.role !== 'admin'))
    ) {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        res.status(400);
        throw new Error('The last active administrator cannot be deactivated or changed to another role.');
      }
    }

    Object.assign(targetUser, updates);
    await targetUser.save();

    return sendResponse(
      res,
      200,
      true,
      'Account updated successfully',
      toPublicUser(targetUser)
    );
  } catch (error) {
    next(error);
  }
};

export const updateProfileImage = async (req, res, next) => {
  try {
    const { profileImage } = req.body;
    let imageToSave = '';

    if (profileImage !== null && profileImage !== '') {
      const match = typeof profileImage === 'string'
        ? profileImage.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/)
        : null;

      if (!match) {
        res.status(400);
        throw new Error('Choose a PNG, JPEG, or WebP image.');
      }

      const imageBytes = Buffer.from(match[2], 'base64');
      if (imageBytes.length > MAX_PROFILE_IMAGE_BYTES) {
        res.status(400);
        throw new Error('Profile images must be 2 MB or smaller.');
      }

      const isPng = imageBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isJpeg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
      const isWebp = imageBytes.toString('ascii', 0, 4) === 'RIFF' &&
        imageBytes.toString('ascii', 8, 12) === 'WEBP';
      const matchesDeclaredType =
        (match[1] === 'png' && isPng) ||
        (match[1] === 'jpeg' && isJpeg) ||
        (match[1] === 'webp' && isWebp);

      if (!matchesDeclaredType) {
        res.status(400);
        throw new Error('The selected file is not a valid PNG, JPEG, or WebP image.');
      }

      imageToSave = profileImage;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: imageToSave },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    return sendResponse(res, 200, true, 'Profile image updated successfully', {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      profileImage: user.profileImage,
    });
  } catch (error) {
    next(error);
  }
};

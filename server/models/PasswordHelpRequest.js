import mongoose from 'mongoose';

const passwordHelpRequestSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      required: true,
      match: /^\+[1-9]\d{10,14}$/,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'link_issued'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

passwordHelpRequestSchema.index({ email: 1, status: 1, createdAt: -1 });

const PasswordHelpRequest = mongoose.model(
  'PasswordHelpRequest',
  passwordHelpRequestSchema
);

export default PasswordHelpRequest;

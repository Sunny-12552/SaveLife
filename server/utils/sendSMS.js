import twilio from 'twilio';
import Notification from '../models/Notification.js';

let twilioClient = null;
let twilioInitialized = false;

/**
 * Initialize Twilio client lazily (on first use)
 */
const initializeTwilioClient = () => {
  if (twilioInitialized) {
    return twilioClient;
  }

  twilioInitialized = true;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  console.log('🔍 Initializing Twilio Client:');
  console.log('   TWILIO_ACCOUNT_SID:', accountSid ? '✓ Present' : '✗ Missing');
  console.log('   TWILIO_AUTH_TOKEN:', authToken ? '✓ Present' : '✗ Missing');
  console.log('   TWILIO_PHONE_NUMBER:', twilioNumber ? '✓ Present' : '✗ Missing');

  if (!accountSid || !authToken || !twilioNumber) {
    console.warn('⚠️ Twilio credentials not configured. SMS functionality will be disabled.');
    return null;
  }

  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('❌ Error initializing Twilio client:', error.message);
    return null;
  }
};

const getTwilioNumber = () => process.env.TWILIO_PHONE_NUMBER;
const getWhatsAppNumber = () => process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio Sandbox default
const getNotificationMode = () => process.env.NOTIFICATION_MODE || 'whatsapp'; // 'sms' or 'whatsapp'

/**
 * Send notification via Twilio (SMS or WhatsApp)
 * @param {Object} options - Notification options
 * @param {String} options.to - Recipient phone number (E.164 format)
 * @param {String} options.message - Message body
 * @param {String} options.recipientId - Recipient user ID
 * @param {String} options.sentBy - Sender user ID
 * @param {String} options.type - Notification type
 * @param {Object} options.relatedEntity - Related entity (optional)
 * @returns {Object} - Result object with success status and notification details
 */
export const sendSMS = async ({
  to,
  message,
  recipientId,
  sentBy,
  type = 'general',
  relatedEntity = null,
}) => {
  let notification = null;

  try {
    // Validate required fields
    if (!to || !message || !recipientId || !sentBy) {
      throw new Error('Missing required fields: to, message, recipientId, sentBy');
    }

    // Determine notification mode
    const mode = getNotificationMode();

    // Format phone number to E.164 if not already
    let formattedPhone = to;
    if (!to.startsWith('+') && !to.startsWith('whatsapp:')) {
      // Assume Indian number if no country code
      formattedPhone = to.startsWith('91') ? `+${to}` : `+91${to}`;
    }

    // Add WhatsApp prefix if using WhatsApp mode
    let recipientNumber = formattedPhone;
    let senderNumber;

    if (mode === 'whatsapp') {
      // Format for WhatsApp
      recipientNumber = formattedPhone.startsWith('whatsapp:')
        ? formattedPhone
        : `whatsapp:${formattedPhone}`;
      senderNumber = getWhatsAppNumber();
      console.log(`📱 Sending WhatsApp message to ${recipientNumber}`);
    } else {
      // Format for SMS
      recipientNumber = formattedPhone.replace('whatsapp:', '');
      senderNumber = getTwilioNumber();
      console.log(`📱 Sending SMS to ${recipientNumber}`);
    }

    // Create notification record in DB
    notification = await Notification.create({
      recipientId,
      recipientPhone: formattedPhone,
      message,
      type,
      sentBy,
      relatedEntity,
      status: 'pending',
    });

    // Initialize Twilio client if not already initialized
    const client = initializeTwilioClient();

    if (!client) {
      throw new Error('Twilio client not initialized. Check your environment variables.');
    }

    if (!senderNumber) {
      throw new Error(`${mode === 'whatsapp' ? 'WhatsApp' : 'SMS'} number not configured.`);
    }

    // Send message via Twilio (SMS or WhatsApp)
    const twilioResponse = await client.messages.create({
      body: message,
      from: senderNumber,
      to: recipientNumber,
    });

    // Update notification with success status
    notification.status = twilioResponse.status === 'queued' || twilioResponse.status === 'sent'
      ? 'sent'
      : 'failed';
    notification.twilioMessageSid = twilioResponse.sid;
    notification.twilioStatus = twilioResponse.status;
    notification.sentAt = new Date();

    await notification.save();

    console.log(`✅ ${mode === 'whatsapp' ? 'WhatsApp' : 'SMS'} sent successfully to ${formattedPhone} (SID: ${twilioResponse.sid})`);

    return {
      success: true,
      notification,
      twilioResponse: {
        sid: twilioResponse.sid,
        status: twilioResponse.status,
      },
    };
  } catch (error) {
    console.error(`❌ Error sending ${getNotificationMode() === 'whatsapp' ? 'WhatsApp' : 'SMS'}:`, error.message);

    // Update notification with failed status if it was created
    if (notification) {
      notification.status = 'failed';
      notification.errorMessage = error.message;
      await notification.save();
    }

    return {
      success: false,
      error: error.message,
      notification,
    };
  }
};

/**
 * Send SMS to multiple recipients
 * @param {Array} recipients - Array of recipient objects
 * @param {String} message - SMS message body
 * @param {String} sentBy - Sender user ID
 * @param {String} type - Notification type
 * @param {Object} relatedEntity - Related entity (optional)
 * @returns {Object} - Result object with success count and failures
 */
export const sendBulkSMS = async ({
  recipients,
  message,
  sentBy,
  type = 'general',
  relatedEntity = null,
}) => {
  try {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Recipients must be a non-empty array');
    }

    const results = {
      total: recipients.length,
      successful: 0,
      failed: 0,
      details: [],
    };

    // Send SMS to each recipient
    for (const recipient of recipients) {
      const result = await sendSMS({
        to: recipient.phone,
        message,
        recipientId: recipient.userId,
        sentBy,
        type,
        relatedEntity,
      });

      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }

      results.details.push({
        recipientId: recipient.userId,
        phone: recipient.phone,
        success: result.success,
        error: result.error || null,
      });
    }

    console.log(`📊 Bulk ${getNotificationMode() === 'whatsapp' ? 'WhatsApp' : 'SMS'} completed: ${results.successful}/${results.total} sent successfully`);

    return results;
  } catch (error) {
    console.error('❌ Error sending bulk SMS:', error.message);
    throw error;
  }
};

/**
 * Get notification history for a user
 * @param {String} userId - User ID
 * @param {Number} limit - Number of notifications to retrieve
 * @returns {Array} - Array of notifications
 */
export const getNotificationHistory = async (userId, limit = 50) => {
  try {
    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sentBy', 'name email')
      .lean();

    return notifications;
  } catch (error) {
    console.error('❌ Error fetching notification history:', error.message);
    throw error;
  }
};

/**
 * Check SMS delivery status from Twilio
 * @param {String} messageSid - Twilio message SID
 * @returns {Object} - Message status details
 */
export const checkSMSStatus = async (messageSid) => {
  try {
    const client = initializeTwilioClient();

    if (!client) {
      throw new Error('Twilio client not initialized');
    }

    const message = await client.messages(messageSid).fetch();

    // Update notification in DB
    await Notification.findOneAndUpdate(
      { twilioMessageSid: messageSid },
      {
        twilioStatus: message.status,
        status: message.status === 'delivered' ? 'delivered' : 'sent',
        deliveredAt: message.status === 'delivered' ? new Date() : undefined,
      }
    );

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent,
      dateUpdated: message.dateUpdated,
    };
  } catch (error) {
    console.error('❌ Error checking SMS status:', error.message);
    throw error;
  }
};

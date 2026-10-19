import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },
    recipientPhone: {
      type: String,
      required: [true, 'Recipient phone number is required'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [1600, 'Message cannot exceed 1600 characters'],
    },
    type: {
      type: String,
      enum: ['camp_created', 'emergency_request', 'general'],
      required: [true, 'Notification type is required'],
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['Camp', 'Request', null],
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedEntity.entityType',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'delivered'],
      default: 'pending',
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
    twilioMessageSid: {
      type: String,
    },
    twilioStatus: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

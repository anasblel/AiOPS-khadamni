import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['booking_created', 'booking_accepted', 'booking_rejected', 'booking_completed', 'booking_deleted'],
    required: true,
  },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  // Contact info revealed on accepted bookings
  contactPhone: { type: String, default: '' },
  // Booking details snapshot
  bookingDetails: {
    skill: String,
    date: String,
    timeFrom: String,
    budget: Number,
    providerName: String,
    clientName: String,
  },
  // Location info (client location shared with provider)
  location: {
    coordinates: { type: [Number], default: undefined }, // [lat, lng]
    address: { type: String, default: '' },
  },
  read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);

import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  skill: String,
  date: String,
  timeFrom: String,
  budget: Number,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  providerMessage: String,
  // Client location shared with provider on booking
  clientLocation: {
    coordinates: { type: [Number], default: undefined }, // [lat, lng]
    address: { type: String, default: '' },
  },
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
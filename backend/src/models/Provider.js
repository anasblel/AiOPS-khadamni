import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  start: String,
  end: String,
}, { _id: false });

const availabilitySchema = new mongoose.Schema({
  day: String,
  slots: [slotSchema],
}, { _id: false });

const providerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skills: [String],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  isRemote: { type: Boolean, default: false },
  hourlyRate: { type: Number, default: 0 },
  currency: { type: String, default: 'TND' },
  availability: [availabilitySchema],
  rating: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
}, { timestamps: true });

// FIX: split compound array index into two separate indexes
providerSchema.index({ location: '2dsphere' });
providerSchema.index({ skills: 1 });
providerSchema.index({ 'availability.day': 1 });

export default mongoose.model('Provider', providerSchema);
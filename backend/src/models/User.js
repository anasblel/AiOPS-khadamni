import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return !this.googleId; } },
  googleId: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['client', 'provider'], required: true },
  // Feature 4 — phone for clients too (shown after booking accepted)
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }, // [lng, lat]
  },
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

export default mongoose.model('User', userSchema);
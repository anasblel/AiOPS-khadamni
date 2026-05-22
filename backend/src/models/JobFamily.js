import mongoose from 'mongoose';

const jobFamilySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  icon: { type: String, required: true },
  remoteAllowed: { type: Boolean, default: true },
  specialties: { type: [String], default: [] },
  isCustom: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('JobFamily', jobFamilySchema);

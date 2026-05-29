import mongoose from 'mongoose';

// ─── Job Family taxonomy ──────────────────────────────────────────────────────
// Each family has: a name, whether remote is EVER allowed, and its specialties.
// "remoteAllowed: false" means the toggle is hidden entirely for these families.
export const JOB_FAMILIES = [
  {
    id: 'software',
    label: 'Software & Tech',
    icon: '💻',
    remoteAllowed: true,
    specialties: ['React Developer', 'Node.js Developer', 'Full-Stack Developer', 'Mobile Developer', 'DevOps Engineer', 'UI/UX Designer', 'Data Scientist', 'QA Engineer']
  },
  {
    id: 'design',
    label: 'Design & Creative',
    icon: '🎨',
    remoteAllowed: true,
    specialties: ['Logo Designer', 'Graphic Designer', 'Video Editor', 'Photographer', 'Motion Designer', 'Brand Identity']
  },
  {
    id: 'education',
    label: 'Education & Tutoring',
    icon: '📚',
    remoteAllowed: true,
    specialties: ['Math Tutor', 'Physics Tutor', 'English Teacher', 'Arabic Teacher', 'French Teacher', 'CV Review', 'Translation']
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    icon: '🔧',
    remoteAllowed: false,   // ← cannot be remote
    specialties: ['Pipe Repair', 'Leak Detection', 'Water Heater', 'Bathroom Installation', 'Kitchen Plumbing']
  },
  {
    id: 'electrical',
    label: 'Electrical',
    icon: '⚡',
    remoteAllowed: false,
    specialties: ['Wiring', 'Circuit Breaker', 'Lighting Installation', 'Solar Panels', 'Home Automation']
  },
  {
    id: 'construction',
    label: 'Construction & Carpentry',
    icon: '🏗️',
    remoteAllowed: false,
    specialties: ['Carpentry', 'Masonry', 'Painting', 'Tiling', 'False Ceiling', 'Flooring']
  },
  {
    id: 'cleaning',
    label: 'Cleaning & Maintenance',
    icon: '🧹',
    remoteAllowed: false,
    specialties: ['Home Cleaning', 'Office Cleaning', 'Deep Cleaning', 'AC Maintenance', 'Appliance Repair']
  },
  {
    id: 'business',
    label: 'Business & Finance',
    icon: '📊',
    remoteAllowed: true,
    specialties: ['Accounting', 'Tax Consulting', 'Business Plan', 'Market Research', 'Legal Consulting']
  },
  {
    id: 'driver',
    label: 'Driving & Transport',
    icon: '🚗',
    remoteAllowed: false,
    specialties: ['Taxi Driver', 'Personal Chauffeur', 'Delivery Driver', 'Truck Driver', 'Ambulance Driver']
  },
  {
    id: 'doctor',
    label: 'Medical & Healthcare',
    icon: '🩺',
    remoteAllowed: true,
    specialties: ['General Practitioner', 'Pediatrician', 'Cardiologist', 'Dermatologist', 'Psychiatrist', 'Consulting Doctor']
  },
  {
    id: 'deliveryman',
    label: 'Delivery & Logistics',
    icon: '📦',
    remoteAllowed: false,
    specialties: ['Food Delivery', 'Courier', 'Parcel Delivery', 'Grocery Shopper', 'Express Shipping']
  },
];

// ─── Sub-schemas ──────────────────────────────────────────────────────────────
const slotSchema = new mongoose.Schema({
  start: String,  // "09:00"
  end: String,    // "17:00"
}, { _id: false });

const availabilitySchema = new mongoose.Schema({
  day: String,    // "monday" | "tuesday" | ... | "2026-05-20" (specific date)
  slots: [slotSchema],
}, { _id: false });

// Each profession pairs a job family with its specialties for this provider.
const professionSchema = new mongoose.Schema({
  family: { type: String, required: true },           // e.g. "software"
  specialties: { type: [String], default: [] },       // e.g. ["React Developer"]
}, { _id: false });

// ─── Provider schema ──────────────────────────────────────────────────────────
const providerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Feature 1 — Job family + specialty (multi-family support)
  professions: { type: [professionSchema], default: [] }, // [{family, specialties}, ...]
  jobFamilies: { type: [String], default: [] },           // flat list of family ids
  jobFamily: { type: String, default: '' },               // first family — kept for backwards compat
  specialty: { type: String, default: '' },               // first specialty — kept for backwards compat
  specialties: { type: [String], default: [] },           // flat list across all families
  skills: [String],                                       // extra tags, free-form

  // Feature 2 — Location (GeoJSON point + human city label)
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  city: { type: String, default: '' },               // "Ariana", "Tunis", etc.

  // Feature 3 — Availability (weekly schedule)
  availability: [availabilitySchema],

  // Feature 4 — Phone / WhatsApp (only shown after accepted booking)
  phone: { type: String, default: '' },

  // Feature 5 — Remote/In-person flag (forced 'in-person' for non-remote families)
  workMode: { type: String, enum: ['in-person', 'remote', 'both'], default: 'in-person' },

  hourlyRate: { type: Number, default: 0 },
  currency: { type: String, default: 'TND' },
  rating: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  cvPath: { type: String, default: '' },
}, { timestamps: true });

providerSchema.index({ location: '2dsphere' });
providerSchema.index({ jobFamily: 1, specialty: 1 });
providerSchema.index({ jobFamilies: 1 });
providerSchema.index({ 'professions.family': 1, 'professions.specialties': 1 });
providerSchema.index({ skills: 1 });
providerSchema.index({ 'availability.day': 1 });

export default mongoose.model('Provider', providerSchema);
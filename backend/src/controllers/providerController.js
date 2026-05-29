import Provider, { JOB_FAMILIES } from '../models/Provider.js';
import JobFamily from '../models/JobFamily.js';
import { callAiChain } from '../utils/ai.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer config for CV uploads
const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/cvs'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cv_${req.user._id}_${Date.now()}${ext}`);
  }
});

const cvFileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

export const uploadCvMiddleware = multer({
  storage: cvStorage,
  fileFilter: cvFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('cv');

// GET /api/providers/job-families — return taxonomy for frontend dynamically
export const getJobFamilies = async (req, res) => {
  try {
    let families = await JobFamily.find({}).sort({ createdAt: 1 }).lean();
    if (families.length === 0) {
      // Seed initial families
      await JobFamily.insertMany(JOB_FAMILIES);
      families = await JobFamily.find({}).sort({ createdAt: 1 }).lean();
    }
    res.json(families);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/providers — list all (with optional filters)
// Job-family filter is treated as the primary axis; specialty filter narrows
// inside (or across) the matched families.
export const getProviders = async (req, res) => {
  try {
    const { skill, family, specialty } = req.query;
    const conds = [];

    if (family) {
      conds.push({
        $or: [
          { jobFamily: family },
          { jobFamilies: family },
          { 'professions.family': family },
        ],
      });
    }
    if (specialty) {
      conds.push({
        $or: [
          { specialty: specialty },
          { specialties: specialty },
          { 'professions.specialties': specialty },
        ],
      });
    }
    if (skill) {
      conds.push({ skills: { $in: [new RegExp(skill, 'i')] } });
    }

    const filter = conds.length === 0 ? {} : (conds.length === 1 ? conds[0] : { $and: conds });

    const providers = await Provider.find(filter)
      .populate('user', 'name email phone')
      .lean();

    // Sort family-first: providers matching the family filter come before
    // providers that only matched on specialty/skill.
    if (family) {
      providers.sort((a, b) => {
        const aHas = a.jobFamily === family
          || (a.jobFamilies || []).includes(family)
          || (a.professions || []).some(p => p.family === family);
        const bHas = b.jobFamily === family
          || (b.jobFamilies || []).includes(family)
          || (b.professions || []).some(p => p.family === family);
        return (bHas === true) - (aHas === true);
      });
    }

    res.json(providers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/providers/:id — get a single provider profile
export const getProviderById = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate('user', 'name email phone')
      .lean();
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/providers/me
export const getMyProfile = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id })
      .populate('user', 'name email phone')
      .lean();
    if (!provider) return res.status(404).json({ message: 'Provider profile not found' });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/providers/me — save full profile
export const updateMyProfile = async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can update a provider profile' });
    }

    const {
      jobFamily,
      specialty,
      specialties,
      professions,
      skills,
      city,
      coordinates,
      workMode,
      hourlyRate,
      currency,
      phone,
    } = req.body;

    // Normalize multi-family input. Accept the new `professions` array, or fall
    // back to the legacy `jobFamily` + `specialties` single-family payload.
    let normalizedProfessions = [];
    if (Array.isArray(professions) && professions.length > 0) {
      normalizedProfessions = professions
        .filter(p => p && p.family)
        .map(p => ({
          family: String(p.family),
          specialties: Array.isArray(p.specialties)
            ? p.specialties.map(String).filter(Boolean)
            : [],
        }));
    } else if (jobFamily) {
      normalizedProfessions = [{
        family: String(jobFamily),
        specialties: Array.isArray(specialties) ? specialties.map(String).filter(Boolean) : [],
      }];
    }

    const familyIds = normalizedProfessions.map(p => p.family);
    const flatSpecialties = [...new Set(normalizedProfessions.flatMap(p => p.specialties))];

    // Feature 5: enforce workMode='in-person' if NONE of the chosen families
    // allow remote work.
    let resolvedWorkMode = workMode || 'in-person';
    if (familyIds.length > 0) {
      const dbFamilies = await JobFamily.find({ id: { $in: familyIds } }).lean();
      const fallbackFamilies = JOB_FAMILIES.filter(f => familyIds.includes(f.id));
      const allFamilyDefs = [...dbFamilies, ...fallbackFamilies.filter(f => !dbFamilies.some(d => d.id === f.id))];
      const anyRemoteAllowed = allFamilyDefs.some(f => f.remoteAllowed !== false);
      if (!anyRemoteAllowed) resolvedWorkMode = 'in-person';
    }

    // Feature 4: save phone on the User record too
    if (phone) {
      await req.user.constructor.findByIdAndUpdate(req.user._id, { phone });
    }

    const updateData = {
      professions: normalizedProfessions,
      jobFamilies: familyIds,
      jobFamily: familyIds[0] || '',
      specialties: flatSpecialties,
      specialty: flatSpecialties[0] || specialty || '',
      skills: skills || [],
      city: city || '',
      workMode: resolvedWorkMode,
      hourlyRate: Number(hourlyRate) || 0,
      currency: currency || 'TND',
      phone: phone || '',
    };

    // Feature 2: set GeoJSON location if coordinates provided
    if (coordinates && coordinates.length === 2) {
      updateData.location = {
        type: 'Point',
        coordinates: [Number(coordinates[1]), Number(coordinates[0])], // [lng, lat]
      };
    }

    const updated = await Provider.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, upsert: true, runValidators: true }
    ).populate('user', 'name email phone');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/providers/me/availability — Feature 3: save weekly schedule
export const updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    // availability = [{ day: "monday", slots: [{start:"09:00", end:"17:00"}] }, ...]
    const updated = await Provider.findOneAndUpdate(
      { user: req.user._id },
      { availability },
      { new: true, upsert: true }
    );
    res.json({ availability: updated.availability });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/providers/me/cv — upload CV file
export const uploadCv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Allowed types: PDF, DOC, DOCX (max 5MB).' });
    }

    const cvPath = `/uploads/cvs/${req.file.filename}`;

    const updated = await Provider.findOneAndUpdate(
      { user: req.user._id },
      { cvPath },
      { new: true }
    ).populate('user', 'name email phone');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/providers/job-families/suggest — dynamically suggest/create custom job family using AI
export const suggestAndCreateJobFamily = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'Query is required.' });
    }

    const cleanQuery = query.trim();

    // Check if a family with a similar name already exists to avoid duplicates
    const slug = cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const existing = await JobFamily.findOne({ id: slug });
    if (existing) {
      return res.json(existing);
    }

    // Build the AI Prompt
    const systemPrompt = `You are a taxonomy and categorisation expert for "AIOps Khadamni", a freelance platform in Tunisia.
The user wants to register for a new job or service field: "${cleanQuery}".
Your task is to classify this service and generate a structured JSON object representing a new Job Family for the platform.

Respond with ONLY a raw, valid JSON object matching the following structure:
{
  "id": "lowercase-slugified-family-name-matching-slug",
  "label": "A capitalized, professional, friendly label for the job family (e.g. Gardening & Landscaping, Delivery & Logistics, driving-related tags, medical tags)",
  "icon": "A single suitable emoji representing this job family (e.g. 🚗, 🩺, 📦, 🌿, 🛠️, 📷, 🐶)",
  "remoteAllowed": false or true (boolean; set to false if the job strictly requires in-person physical presence, e.g. driving, gardening, cleaning, delivery, etc., or true if the service can be done online/remotely, e.g. design, writing, consulting, tele-health, etc.),
  "specialties": ["Specialty 1", "Specialty 2", "Specialty 3", "Specialty 4"] (an array of 3 to 6 specific freelance job roles/specialties related to this field, including the requested job itself)
}

RULES:
1. "id" MUST be exactly: "${slug}"
2. Output ONLY the JSON block. Do not wrap in markdown \`\`\`json blocks, and do not write any additional explanation.
3. Be professional and accurate.`;

    let familyData = null;

    try {
      const aiReply = await callAiChain(systemPrompt, `Generate the Job Family for: ${cleanQuery}`);
      // Clean up potential markdown formatting in AI response
      const jsonText = aiReply.replace(/```json/g, '').replace(/```/g, '').trim();
      familyData = JSON.parse(jsonText);
    } catch (err) {
      console.error('AI Suggestion failed, using fallback:', err.message);
      // Fallback local categorizer
      const lowerQuery = cleanQuery.toLowerCase();
      const inPersonKeywords = ['driver', 'delivery', 'taxi', 'doctor', 'physio', 'clean', 'plumb', 'garden', 'dog', 'pet', 'repair', 'car', 'mechanic', 'paint'];
      const isRemote = !inPersonKeywords.some(keyword => lowerQuery.includes(keyword));

      // Guess emoji
      let emoji = '💼';
      if (lowerQuery.includes('drive') || lowerQuery.includes('taxi') || lowerQuery.includes('car')) emoji = '🚗';
      else if (lowerQuery.includes('doctor') || lowerQuery.includes('med') || lowerQuery.includes('health') || lowerQuery.includes('nurse')) emoji = '🩺';
      else if (lowerQuery.includes('deliver') || lowerQuery.includes('courier') || lowerQuery.includes('food')) emoji = '📦';
      else if (lowerQuery.includes('garden') || lowerQuery.includes('plant') || lowerQuery.includes('landscap')) emoji = '🌿';
      else if (lowerQuery.includes('photo') || lowerQuery.includes('cam') || lowerQuery.includes('video')) emoji = '📷';
      else if (lowerQuery.includes('pet') || lowerQuery.includes('dog') || lowerQuery.includes('cat')) emoji = '🐶';

      familyData = {
        id: slug,
        label: cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1) + ' Services',
        icon: emoji,
        remoteAllowed: isRemote,
        specialties: [
          cleanQuery,
          cleanQuery + ' Specialist',
          'General ' + cleanQuery,
          'Senior ' + cleanQuery
        ]
      };
    }

    // Ensure the ID is set correctly
    familyData.id = slug;
    familyData.isCustom = true;

    // Save in DB
    const newFamily = await JobFamily.findOneAndUpdate(
      { id: slug },
      familyData,
      { new: true, upsert: true }
    );

    res.json(newFamily);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
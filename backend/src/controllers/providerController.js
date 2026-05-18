import Provider, { JOB_FAMILIES } from '../models/Provider.js';

// GET /api/providers/job-families — return taxonomy for frontend
export const getJobFamilies = async (req, res) => {
  res.json(JOB_FAMILIES);
};

// GET /api/providers — list all (with optional filters)
export const getProviders = async (req, res) => {
  try {
    const { skill, family, specialty } = req.query;
    const filter = {};
    if (family) filter.jobFamily = family;
    if (specialty) filter.specialty = specialty;
    if (skill) filter.skills = { $in: [new RegExp(skill, 'i')] };

    const providers = await Provider.find(filter)
      .populate('user', 'name email phone')
      .lean();
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

    const { jobFamily, specialty, skills, city, coordinates, workMode, hourlyRate, currency, phone } = req.body;

    // Feature 5: enforce workMode='in-person' for non-remote families
    const family = JOB_FAMILIES.find(f => f.id === jobFamily);
    const resolvedWorkMode = family?.remoteAllowed === false ? 'in-person' : (workMode || 'in-person');

    // Feature 4: save phone on the User record too
    if (phone) {
      await req.user.constructor.findByIdAndUpdate(req.user._id, { phone });
    }

    const updateData = {
      jobFamily: jobFamily || '',
      specialty: specialty || '',
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
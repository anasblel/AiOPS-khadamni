import Provider from '../models/Provider.js';

// GET /api/providers — list all providers (with optional skill filter)
export const getProviders = async (req, res) => {
  try {
    const { skill } = req.query;
    const filter = skill ? { skills: { $in: [new RegExp(skill, 'i')] } } : {};

    const providers = await Provider.find(filter)
      .populate('user', 'name email')
      .lean();

    res.json(providers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/providers/me — get the logged-in provider's own profile
export const getMyProfile = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id }).lean();
    if (!provider) return res.status(404).json({ message: 'Provider profile not found' });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/providers/me — save/update provider profile
export const updateMyProfile = async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can update a provider profile' });
    }

    const { skills, isRemote, hourlyRate, currency } = req.body;

    const updated = await Provider.findOneAndUpdate(
      { user: req.user._id },
      { skills, isRemote, hourlyRate, currency },
      { new: true, upsert: true, runValidators: true }
    ).populate('user', 'name email');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
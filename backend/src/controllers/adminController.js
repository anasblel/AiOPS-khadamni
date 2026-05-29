import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Booking from '../models/Booking.js';
import JobFamily from '../models/JobFamily.js';

// GET /api/admin/users — list all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/users/:id — delete a user and cascade cleanups
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent admin from self-deletion
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (userToDelete.role === 'provider') {
      const provider = await Provider.findOne({ user: userId });
      if (provider) {
        // Delete all bookings associated with this provider
        await Booking.deleteMany({ provider: provider._id });
        // Delete the provider profile
        await Provider.deleteOne({ _id: provider._id });
      }
    } else if (userToDelete.role === 'client') {
      // Delete all bookings associated with this client
      await Booking.deleteMany({ client: userId });
    }

    // Delete the user record
    await User.deleteOne({ _id: userId });

    res.json({ message: 'User and all associated profiles/bookings deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/job-families — create a new job family
export const createJobFamily = async (req, res) => {
  try {
    const { label, icon, remoteAllowed, specialties } = req.body;
    if (!label || !icon) {
      return res.status(400).json({ message: 'Label and icon are required.' });
    }

    // Generate clean slug for ID
    const id = label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // Check if it already exists
    const existing = await JobFamily.findOne({ id });
    if (existing) {
      return res.status(400).json({ message: `A service with the name "${label}" already exists.` });
    }

    const newFamily = await JobFamily.create({
      id,
      label,
      icon,
      remoteAllowed: remoteAllowed !== undefined ? remoteAllowed : true,
      specialties: specialties || [],
      isCustom: true
    });

    res.status(201).json(newFamily);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/job-families/:id — update a job family
export const updateJobFamily = async (req, res) => {
  try {
    const { label, icon, remoteAllowed, specialties } = req.body;
    const familyId = req.params.id; // DB _id or dynamic slug string

    // Find by either Mongoose ObjectId or id slug
    const query = familyId.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: familyId } 
      : { id: familyId };

    const family = await JobFamily.findOne(query);
    if (!family) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    if (label) family.label = label;
    if (icon) family.icon = icon;
    if (remoteAllowed !== undefined) family.remoteAllowed = remoteAllowed;
    if (specialties) family.specialties = specialties;

    await family.save();
    res.json(family);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/job-families/:id — delete a job family
export const deleteJobFamily = async (req, res) => {
  try {
    const familyId = req.params.id;

    const query = familyId.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: familyId } 
      : { id: familyId };

    const family = await JobFamily.findOne(query);
    if (!family) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    await JobFamily.deleteOne({ _id: family._id });
    res.json({ message: 'Service deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

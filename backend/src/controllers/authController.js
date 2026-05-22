import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Provider from '../models/Provider.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateTokens = (id) => ({
  accessToken: jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' }),
  refreshToken: jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }),
});

export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role, phone: phone || '', address: address || '' });

    if (role === 'provider') {
      await Provider.create({ user: user._id, city: address || '' });
    }

    const tokens = generateTokens(user._id);
    res.status(201).json({ user: { id: user._id, name, email, role }, ...tokens });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const tokens = generateTokens(user._id);
    res.json({ user: { id: user._id, name: user.name, email, role: user.role }, ...tokens });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// GET /api/auth/me — get current user profile
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/auth/me — update current user profile (phone, name, address, coordinates)
export const updateMe = async (req, res) => {
  try {
    const { phone, name, address, coordinates } = req.body;
    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (coordinates && coordinates.length === 2) {
      updates.location = {
        type: 'Point',
        coordinates: [Number(coordinates[1]), Number(coordinates[0])], // [lng, lat]
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');

    if (user.role === 'provider') {
      const providerUpdates = {};
      if (address !== undefined) providerUpdates.city = address;
      if (coordinates && coordinates.length === 2) {
        providerUpdates.location = {
          type: 'Point',
          coordinates: [Number(coordinates[1]), Number(coordinates[0])],
        };
      }
      await Provider.findOneAndUpdate({ user: user._id }, providerUpdates);
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/users/:id — get any user public details
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email role phone address');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/google — sign in or sign up with Google
export const googleAuth = async (req, res) => {
  try {
    const { credential, role } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Credential (ID Token) is required' });
    }

    // Verify token
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      return res.status(400).json({ message: 'Invalid ID token: ' + err.message });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Check if user exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // User doesn't exist. If role is provided, create user. Otherwise ask for role.
      if (!role) {
        return res.json({
          isNewUser: true,
          email,
          name,
          googleId,
        });
      }

      if (!['client', 'provider'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      // Create new Google user
      user = await User.create({
        name,
        email,
        googleId,
        role,
      });

      if (role === 'provider') {
        await Provider.create({ user: user._id, city: '' });
      }
    } else {
      // User exists. Update googleId if not already set.
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    }

    // Generate tokens and log in
    const tokens = generateTokens(user._id);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
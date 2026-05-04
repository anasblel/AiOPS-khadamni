import Booking from '../models/Booking.js';
import Provider from '../models/Provider.js';

// POST /api/bookings — client creates a booking
export const createBooking = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can create bookings' });
    }

    const { providerId, skill, date, timeFrom, budget } = req.body;

    const provider = await Provider.findById(providerId);
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    const booking = await Booking.create({
      client: req.user._id,
      provider: providerId,
      skill,
      date,
      timeFrom,
      budget,
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/bookings/me — returns bookings for the current user (client or provider)
export const getMyBookings = async (req, res) => {
  try {
    let bookings;

    if (req.user.role === 'client') {
      bookings = await Booking.find({ client: req.user._id })
        .populate({ path: 'provider', populate: { path: 'user', select: 'name email' } })
        .sort({ createdAt: -1 })
        .lean();
    } else {
      // Provider: find their Provider doc first, then query bookings
      const provider = await Provider.findOne({ user: req.user._id });
      if (!provider) return res.json([]);

      bookings = await Booking.find({ provider: provider._id })
        .populate('client', 'name email')
        .sort({ createdAt: -1 })
        .lean();
    }

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/bookings/:id/status — provider accepts or rejects
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, providerMessage } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findById(req.params.id).populate('provider');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Make sure the logged-in provider owns this booking
    if (String(booking.provider.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    booking.status = status;
    if (providerMessage) booking.providerMessage = providerMessage;
    await booking.save();

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
import Booking from '../models/Booking.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket.js';

// POST /api/bookings
export const createBooking = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can create bookings' });
    }
    const { providerId, skill, date, timeFrom, budget, clientLocation } = req.body;
    const provider = await Provider.findById(providerId).populate('user', 'name email phone');
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    const bookingData = {
      client: req.user._id,
      provider: providerId,
      skill, date, timeFrom, budget,
    };

    // Store client location if provided
    if (clientLocation) {
      bookingData.clientLocation = {
        coordinates: clientLocation.coordinates || undefined,
        address: clientLocation.address || '',
      };
    }

    const booking = await Booking.create(bookingData);

    // Create notification for provider — new booking request
    const providerNotif = await Notification.create({
      user: provider.user._id,
      type: 'booking_created',
      booking: booking._id,
      title: 'New Booking Request',
      message: `${req.user.name} wants to book you for ${skill} on ${date}${timeFrom ? ' at ' + timeFrom : ''}.`,
      bookingDetails: {
        skill,
        date,
        timeFrom,
        budget,
        clientName: req.user.name,
        providerName: provider.user.name,
      },
      location: clientLocation ? {
        coordinates: clientLocation.coordinates,
        address: clientLocation.address || '',
      } : undefined,
    });

    // Emit real-time notification via socket
    getIO().to(String(provider.user._id)).emit('notification', providerNotif);
    getIO().to(String(provider.user._id)).emit('booking_update', { action: 'created', bookingId: booking._id });
    getIO().to(String(req.user._id)).emit('booking_update', { action: 'created', bookingId: booking._id });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/bookings/me
export const getMyBookings = async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'client') {
      bookings = await Booking.find({ client: req.user._id })
        .populate({
          path: 'provider',
          populate: { path: 'user', select: 'name email phone' }
        })
        .sort({ createdAt: -1 })
        .lean();
    } else {
      const provider = await Provider.findOne({ user: req.user._id });
      if (!provider) return res.json([]);
      bookings = await Booking.find({ provider: provider._id })
        .populate('client', 'name email phone')  // Feature 4: include phone
        .sort({ createdAt: -1 })
        .lean();
    }
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/bookings/:id/status
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, providerMessage } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const booking = await Booking.findById(req.params.id)
      .populate('provider')
      .populate('client', 'name email phone');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const providerDoc = await Provider.findById(booking.provider._id).populate('user', 'name email phone');
    if (String(providerDoc.user._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    booking.status = status;
    if (providerMessage) booking.providerMessage = providerMessage;
    await booking.save();

    if (status === 'accepted') {
      // Notify CLIENT: booking accepted + provider phone
      const clientNotif = await Notification.create({
        user: booking.client._id,
        type: 'booking_accepted',
        booking: booking._id,
        title: 'Booking Accepted! 🎉',
        message: `${providerDoc.user.name} accepted your booking for ${booking.skill} on ${booking.date}${booking.timeFrom ? ' at ' + booking.timeFrom : ''}.`,
        contactPhone: providerDoc.user.phone || providerDoc.phone || '',
        bookingDetails: {
          skill: booking.skill,
          date: booking.date,
          timeFrom: booking.timeFrom,
          budget: booking.budget,
          providerName: providerDoc.user.name,
          clientName: booking.client.name,
        },
      });

      // Notify PROVIDER: booking confirmed + client phone
      const providerNotif = await Notification.create({
        user: providerDoc.user._id,
        type: 'booking_accepted',
        booking: booking._id,
        title: 'Booking Confirmed',
        message: `You accepted the booking from ${booking.client.name} for ${booking.skill} on ${booking.date}${booking.timeFrom ? ' at ' + booking.timeFrom : ''}.`,
        contactPhone: booking.client.phone || '',
        bookingDetails: {
          skill: booking.skill,
          date: booking.date,
          timeFrom: booking.timeFrom,
          budget: booking.budget,
          providerName: providerDoc.user.name,
          clientName: booking.client.name,
        },
        location: booking.clientLocation ? {
          coordinates: booking.clientLocation.coordinates,
          address: booking.clientLocation.address || '',
        } : undefined,
      });

      // Emit real-time notifications
      getIO().to(String(booking.client._id)).emit('notification', clientNotif);
      getIO().to(String(providerDoc.user._id)).emit('notification', providerNotif);

      // Emit booking update real-time
      getIO().to(String(booking.client._id)).emit('booking_update', { action: 'status_changed', bookingId: booking._id, status: 'accepted' });
      getIO().to(String(providerDoc.user._id)).emit('booking_update', { action: 'status_changed', bookingId: booking._id, status: 'accepted' });
    } else if (status === 'rejected') {
      const clientNotif = await Notification.create({
        user: booking.client._id,
        type: 'booking_rejected',
        booking: booking._id,
        title: 'Booking Declined',
        message: `${providerDoc.user.name} was unable to accept your booking for ${booking.skill} on ${booking.date}.${providerMessage ? ' Note: "' + providerMessage + '"' : ''}`,
        bookingDetails: {
          skill: booking.skill,
          date: booking.date,
          timeFrom: booking.timeFrom,
          budget: booking.budget,
          providerName: providerDoc.user.name,
          clientName: booking.client.name,
        },
      });
      getIO().to(String(booking.client._id)).emit('notification', clientNotif);

      // Emit booking update real-time
      getIO().to(String(booking.client._id)).emit('booking_update', { action: 'status_changed', bookingId: booking._id, status: 'rejected' });
      getIO().to(String(providerDoc.user._id)).emit('booking_update', { action: 'status_changed', bookingId: booking._id, status: 'rejected' });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/bookings/:id
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Check authorization: must be either the client or the provider's user
    const providerDoc = await Provider.findById(booking.provider);
    const isClient = String(booking.client) === String(req.user._id);
    const isProvider = providerDoc && String(providerDoc.user) === String(req.user._id);

    if (!isClient && !isProvider) {
      return res.status(403).json({ message: 'Not authorized to delete this booking' });
    }

    await Booking.findByIdAndDelete(req.params.id);

    // Notify the other party about the cancellation/deletion
    const targetUserId = isClient ? (providerDoc ? providerDoc.user : null) : booking.client;
    if (targetUserId) {
      const cancelNotif = await Notification.create({
        user: targetUserId,
        type: 'booking_deleted',
        title: 'Booking Cancelled',
        message: `${req.user.name} cancelled the booking for ${booking.skill} on ${booking.date}.`,
      });
      getIO().to(String(targetUserId)).emit('notification', cancelNotif);
    }

    // Emit booking update real-time
    getIO().to(String(req.user._id)).emit('booking_update', { action: 'deleted', bookingId: booking._id });
    if (targetUserId) {
      getIO().to(String(targetUserId)).emit('booking_update', { action: 'deleted', bookingId: booking._id });
    }

    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/bookings/:id/complete
export const completeBooking = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can complete bookings' });
    }
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating is required and must be between 1 and 5' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (String(booking.client) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the client who booked can complete it' });
    }

    if (booking.status !== 'accepted') {
      return res.status(400).json({ message: 'Only accepted active bookings can be completed' });
    }

    booking.status = 'completed';
    booking.rating = rating;
    booking.review = review || '';
    await booking.save();

    // Recalculate average rating & totalBookings for the provider
    const provider = await Provider.findById(booking.provider).populate('user', 'name');
    if (provider) {
      // Find all completed bookings for this provider
      const completedBookings = await Booking.find({
        provider: provider._id,
        status: 'completed'
      });

      const totalBookings = completedBookings.length;
      const sumRatings = completedBookings.reduce((sum, b) => sum + (b.rating || 0), 0);
      const avgRating = totalBookings > 0 ? Number((sumRatings / totalBookings).toFixed(1)) : 0;

      provider.rating = avgRating;
      provider.totalBookings = totalBookings;
      await provider.save();
    }

    // Create notification for provider
    const providerNotif = await Notification.create({
      user: provider.user._id,
      type: 'booking_completed',
      booking: booking._id,
      title: 'Job Completed & Rated! ⭐',
      message: `${req.user.name} marked the job for ${booking.skill} as completed and left a ${rating}-star rating.`,
      bookingDetails: {
        skill: booking.skill,
        date: booking.date,
        timeFrom: booking.timeFrom,
        budget: booking.budget,
        clientName: req.user.name,
        providerName: provider.user.name,
      },
    });

    // Emit real-time notification via socket
    getIO().to(String(provider.user._id)).emit('notification', providerNotif);
    
    // Emit booking update real-time
    getIO().to(String(booking.client)).emit('booking_update', { action: 'status_changed', bookingId: booking._id, status: 'completed' });
    getIO().to(String(provider.user._id)).emit('booking_update', { action: 'status_changed', bookingId: booking._id, status: 'completed' });

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
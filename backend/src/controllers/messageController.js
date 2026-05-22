import Message from '../models/Message.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';

// GET /api/messages/conversations — list unique conversations for current user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all unique users this person has messaged with
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ createdAt: -1 }).lean();

    // Build unique conversation partners
    const seen = new Set();
    const conversations = [];
    for (const msg of messages) {
      const partnerId = String(msg.sender) === String(userId)
        ? String(msg.receiver)
        : String(msg.sender);
      if (!seen.has(partnerId)) {
        seen.add(partnerId);
        const unreadCount = await Message.countDocuments({
          sender: partnerId,
          receiver: userId,
          read: false
        });
        conversations.push({
          partnerId,
          lastMessage: msg,
          unreadCount,
        });
      }
    }

    // Populate partner details
    const partnerIds = conversations.map(c => c.partnerId);
    const users = await User.find({ _id: { $in: partnerIds } }).select('name email role').lean();
    const userMap = {};
    users.forEach(u => { userMap[String(u._id)] = u; });

    const result = conversations.map(c => ({
      ...c,
      partner: userMap[c.partnerId] || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/messages/:userId — get messages between current user and another user
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const partnerId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: partnerId },
        { sender: partnerId, receiver: userId },
      ]
    }).sort({ createdAt: 1 }).lean();

    // Mark received messages as read
    await Message.updateMany(
      { sender: partnerId, receiver: userId, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/messages — send a message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ message: 'receiverId and content are required' });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      content: content.trim(),
    });

    // Emit via socket for real-time delivery
    getIO().to(String(receiverId)).emit('direct_message', {
      ...message.toObject(),
      senderName: req.user.name,
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

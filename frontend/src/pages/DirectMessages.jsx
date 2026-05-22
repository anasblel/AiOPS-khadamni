import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function DirectMessages() {
  const { user } = useAuth();
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimer = useRef(null);
  const selectedPartnerRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    selectedPartnerRef.current = selectedPartner;
  }, [selectedPartner]);

  // Fetch conversations on mount
  useEffect(() => {
    api.get('/messages/conversations')
      .then(r => setConversations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Handle partnerId changes to sync active conversation
  useEffect(() => {
    if (loading) return;
    if (!partnerId) {
      setSelectedPartner(null);
      setMessages([]);
      return;
    }

    if (selectedPartner && String(selectedPartner._id) === partnerId) {
      return;
    }

    const existing = conversations.find(
      c => c.partnerId === partnerId || (c.partner && c.partner._id === partnerId)
    );

    if (existing) {
      setSelectedPartner(existing.partner);
      setMessages([]);
      setIsTyping(false);
      api.get(`/messages/${partnerId}`)
        .then(res => {
          setMessages(res.data);
          setConversations(prev =>
            prev.map(c => c.partnerId === partnerId ? { ...c, unreadCount: 0 } : c)
          );
        })
        .catch(() => {});
    } else {
      // Fetch user details for new chat partner
      api.get(`/auth/users/${partnerId}`)
        .then(res => {
          const newPartner = res.data;
          const tempConv = {
            partnerId: newPartner._id,
            partner: newPartner,
            lastMessage: null,
            unreadCount: 0,
            isTemp: true
          };
          setConversations(prev => {
            if (prev.some(c => c.partnerId === partnerId)) return prev;
            return [tempConv, ...prev];
          });
          setSelectedPartner(newPartner);
          setMessages([]);
          setIsTyping(false);
        })
        .catch(() => {});
    }
  }, [partnerId, conversations.length, loading]);

  // Socket connection
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(
      import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
    );
    socketRef.current = socket;
    socket.emit('join', user.id);

    socket.on('direct_message', (msg) => {
      const partner = selectedPartnerRef.current;
      const senderId = String(msg.sender);
      const myId = String(user.id);

      // Add to thread if viewing this conversation
      if (
        partner &&
        (senderId === String(partner._id) || senderId === myId)
      ) {
        setMessages(prev => [...prev, msg]);
      }

      // Update conversation preview
      const partnerId = senderId === myId ? String(msg.receiver) : senderId;
      setConversations(prev =>
        prev.map(c =>
          c.partnerId === partnerId
            ? {
                ...c,
                lastMessage: msg,
                unreadCount:
                  senderId !== myId && String(partner?._id) !== partnerId
                    ? c.unreadCount + 1
                    : c.unreadCount,
              }
            : c
        )
      );
    });

    socket.on('user_typing', ({ senderId }) => {
      if (String(senderId) === String(selectedPartnerRef.current?._id)) {
        setIsTyping(true);
      }
    });

    socket.on('user_stop_typing', ({ senderId }) => {
      if (String(senderId) === String(selectedPartnerRef.current?._id)) {
        setIsTyping(false);
      }
    });

    return () => socket.disconnect();
  }, [user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const selectConversation = (partner) => {
    navigate(`/messages/${partner._id}`);
  };

  const emitTyping = () => {
    if (!selectedPartner || !socketRef.current) return;
    socketRef.current.emit('typing', { receiverId: selectedPartner._id, senderId: user.id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { receiverId: selectedPartner._id, senderId: user.id });
    }, 1500);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedPartner || sendingMsg) return;
    setSendingMsg(true);
    const text = input.trim();
    setInput('');
    socketRef.current?.emit('stop_typing', { receiverId: selectedPartner._id, senderId: user.id });
    try {
      const { data } = await api.post('/messages', {
        receiverId: selectedPartner._id,
        content: text,
      });
      setMessages(prev => [...prev, data]);
      setConversations(prev =>
        prev.map(c =>
          c.partnerId === String(selectedPartner._id)
            ? { ...c, lastMessage: data }
            : c
        )
      );
    } catch {}
    setSendingMsg(false);
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (d) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div
      style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}
      className="min-h-screen bg-[#0a0a0f] text-white flex flex-col"
    >
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <Navbar />

      <div className="relative z-10 flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>
        {/* ── Sidebar ────────────────────────────────────── */}
        <aside className="w-80 border-r border-white/5 flex flex-col shrink-0 bg-[#0c0c14]">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-sm text-white/70 uppercase tracking-wider">
              Direct Messages
            </h2>
            {totalUnread > 0 && (
              <span className="w-5 h-5 bg-indigo-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-white/30 text-sm">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-sm">
                <div className="text-4xl mb-3">💬</div>
                <p className="font-medium">No conversations yet</p>
                <p className="text-xs mt-1 text-white/20">
                  Start one from a provider's profile or booking.
                </p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.partnerId}
                  onClick={() => conv.partner && selectConversation(conv.partner)}
                  className={`w-full text-left px-5 py-3.5 border-b border-white/5 hover:bg-white/[0.03] transition-colors flex items-center gap-3 ${
                    selectedPartner?._id === conv.partnerId
                      ? 'bg-indigo-500/[0.07] border-l-2 border-l-indigo-500'
                      : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {conv.partner?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white truncate">
                        {conv.partner?.name || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-white/25 shrink-0 ml-2">
                        {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-white/40 truncate max-w-[160px]">
                        {conv.lastMessage?.content || 'No messages'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-indigo-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white shrink-0 ml-2">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/20 capitalize">{conv.partner?.role}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Message thread ──────────────────────────────── */}
        <div className="flex-1 flex flex-col">
          {selectedPartner ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 shrink-0 bg-[#0a0a0f]/80 backdrop-blur-md">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {selectedPartner.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-semibold text-sm">{selectedPartner.name}</div>
                  <div className="text-xs text-white/40 capitalize">{selectedPartner.role}</div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-1 max-w-2xl mx-auto">
                  {messages.map((msg, i) => {
                    const isMine = String(msg.sender) === String(user.id);
                    const prevMsg = messages[i - 1];
                    const showDate =
                      !prevMsg || formatDate(msg.createdAt) !== formatDate(prevMsg.createdAt);
                    const showAvatar = !isMine && (!prevMsg || String(prevMsg.sender) !== String(msg.sender));

                    return (
                      <div key={msg._id || i}>
                        {showDate && (
                          <div className="text-center my-5">
                            <span className="text-[10px] text-white/25 bg-white/[0.04] border border-white/5 px-3 py-1 rounded-full">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                          {!isMine && (
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0 mb-0.5 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                              {selectedPartner.name?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div
                            className={`max-w-[65%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              isMine
                                ? 'bg-indigo-600/25 border border-indigo-500/30 text-white rounded-br-sm'
                                : 'bg-white/[0.06] border border-white/10 text-white/85 rounded-bl-sm'
                            }`}
                          >
                            {msg.content}
                            <div className={`text-[10px] mt-1.5 ${isMine ? 'text-indigo-300/40 text-right' : 'text-white/20'}`}>
                              {formatTime(msg.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex items-end gap-2 justify-start mb-1">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {selectedPartner.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                        <span className="flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-white/5 px-6 py-4 shrink-0 bg-[#0a0a0f]/60 backdrop-blur-md">
                <div className="flex gap-3 max-w-2xl mx-auto">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => { setInput(e.target.value); emitTyping(); }}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={`Message ${selectedPartner.name}…`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sendingMsg}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all px-5 py-3 rounded-xl font-semibold text-sm shrink-0 flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-4xl mx-auto mb-5">
                  💬
                </div>
                <h3 className="font-bold text-lg text-white/60 mb-1">Your Messages</h3>
                <p className="text-sm text-white/30">Select a conversation from the sidebar to start chatting.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

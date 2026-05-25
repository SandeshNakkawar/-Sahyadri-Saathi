import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Chat.css';

export default function Chat() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);

  // 1. Fetch conversations & check active bookingId context on mount
  useEffect(() => {
    fetchConversations();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [bookingId]);

  const fetchConversations = async () => {
    try {
      // Get all active chats
      const res = await api.get('/conversations/me');
      const list = res.data.data.conversations || [];
      setConversations(list);

      // If a booking ID is provided in route context, get or create that chat
      if (bookingId) {
        const activeRes = await api.get(`/conversations/booking/${bookingId}`);
        const activeItem = activeRes.data.data.conversation;
        
        setActiveConv(activeItem);
        setMessages(activeItem.messages || []);
        
        // Add to active list if not already there
        if (!list.some(c => c._id === activeItem._id)) {
          setConversations(prev => [activeItem, ...prev]);
        }
        
        // Start polling messages for active conversation
        startPolling(activeItem._id);
      }
    } catch (err) {
      console.error('Failed to load chat data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Poll active conversation for new messages
  const startPolling = (convId) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await api.get('/conversations/me');
        const list = res.data.data.conversations || [];
        setConversations(list);
        
        const matched = list.find(c => c._id === convId);
        if (matched) {
          setMessages(matched.messages || []);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
  };

  // 3. Switch active conversation manually from sidebar
  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    setMessages(conv.messages || []);
    startPolling(conv._id);
    // Mark messages as read
    api.patch(`/conversations/${conv._id}/read`).catch(() => {});
    navigate(`/chat/${conv.booking?._id || ''}`);
  };

  // 4. Send new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;
    
    setSending(true);
    const textToSend = newMessage.trim();
    setNewMessage('');
    
    try {
      const res = await api.post(`/conversations/${activeConv._id}/message`, {
        text: textToSend
      });
      const savedMsg = res.data.data.message;
      setMessages(prev => [...prev, savedMsg]);
      scrollToBottom();
      
      // Update sidebar last message snippet
      setConversations(prev => prev.map(c => {
        if (c._id === activeConv._id) {
          return {
            ...c,
            messages: [...(c.messages || []), savedMsg],
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      }));
    } catch (err) {
      alert('Failed to send message.');
      setNewMessage(textToSend); // restore
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper: Find other participant profile info
  const getOtherParticipant = (conv) => {
    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
    return conv.participants?.find(p => p._id !== currentUserId) || { name: 'Chat Member', photo: 'default.jpg' };
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <p>Loading your secure chat workspace...</p>
      </div>
    );
  }

  return (
    <div className="chat-layout container section animate-fade-in">
      <div className="chat-container card card-glass">
        
        {/* Conversations Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3>Treks & Chats</h3>
          </div>
          <div className="chat-conversations-list">
            {conversations.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '2rem 1rem' }}>
                <span style={{ fontSize: '2rem' }}>🥾</span>
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>No active trek chats available.</p>
              </div>
            ) : (
              conversations.map(c => {
                const other = getOtherParticipant(c);
                const isActive = activeConv?._id === c._id;
                const lastMsg = c.messages?.[c.messages.length - 1];
                return (
                  <div 
                    key={c._id}
                    onClick={() => handleSelectConv(c)}
                    className={`conv-item ${isActive ? 'active' : ''}`}
                  >
                    <img 
                      src={`/img/users/${other.photo || 'default.jpg'}`} 
                      onError={(e) => { e.target.src = '/img/users/default.jpg'; }} 
                      alt={other.name} 
                      className="conv-avatar"
                    />
                    <div className="conv-info">
                      <div className="flex flex-between">
                        <span className="conv-name">{other.name}</span>
                        <span className="conv-date">{c.booking ? new Date(c.booking.startDate).toLocaleDateString() : ''}</span>
                      </div>
                      <span className="conv-trek">{c.booking?.place ? c.booking.place.name : 'Sahyadri Trek'}</span>
                      {lastMsg && (
                        <p className="conv-last-msg">{lastMsg.text}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Messaging Box */}
        <div className="chat-msgbox">
          {activeConv ? (
            <>
              {/* Header */}
              <div className="chat-msgbox-header">
                <img 
                  src={`/img/users/${getOtherParticipant(activeConv).photo || 'default.jpg'}`} 
                  onError={(e) => { e.target.src = '/img/users/default.jpg'; }}
                  alt={getOtherParticipant(activeConv).name} 
                  className="chat-header-avatar"
                />
                <div>
                  <h4>{getOtherParticipant(activeConv).name}</h4>
                  <p className="text-muted text-sm">{activeConv.booking?.place ? activeConv.booking.place.name : 'Trek Guide'}</p>
                </div>
              </div>

              {/* Messages Board */}
              <div className="chat-messages-board">
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <span>💬</span>
                    <p>Start conversation with {getOtherParticipant(activeConv).name}</p>
                    <span className="text-sm text-muted">Agree on meeting point details, gear, and start timing.</span>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
                    const isMe = (m.sender?._id || m.sender) === currentUserId;
                    return (
                      <div key={idx} className={`message-row ${isMe ? 'me' : 'other'}`}>
                        {!isMe && (
                          <img 
                            src={`/img/users/${getOtherParticipant(activeConv).photo || 'default.jpg'}`} 
                            onError={(e) => { e.target.src = '/img/users/default.jpg'; }}
                            alt="avatar" 
                            className="message-avatar"
                          />
                        )}
                        <div className="message-bubble">
                          <p>{m.text}</p>
                          <span className="message-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Footer */}
              <form onSubmit={handleSendMessage} className="chat-msgbox-footer">
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="chat-input"
                  required
                />
                <button type="submit" className="btn btn-accent btn-sm" disabled={sending}>
                  {sending ? 'Sending...' : 'Send 🚀'}
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty-state" style={{ height: '100%', justifyContent: 'center' }}>
              <span style={{ fontSize: '4.5rem' }}>🧭</span>
              <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', marginTop: '1rem' }}>
                Select a conversation
              </h2>
              <p className="text-muted" style={{ maxWidth: '320px', margin: '0.5rem auto' }}>
                Pick an ongoing or accepted booking chat from the left sidebar to coordinate your Maharashtra fort experience.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

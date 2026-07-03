import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, MessageSquare, User } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function ChatInbox() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNumber, setActiveNumber] = useState(null);
  const [activeName, setActiveName] = useState('');
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch active conversations list
  const fetchConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/chats/conversations`);
      setConversations(response.data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch chronological message thread
  const fetchMessages = async (phoneNumber) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/chats/conversations/${phoneNumber}/messages`);
      setMessages(response.data);
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  // Mark conversation messages as read
  const markAsRead = async (phoneNumber) => {
    try {
      await axios.patch(`${BACKEND_URL}/chats/conversations/${phoneNumber}/read`);
      // Update unread count locally in list
      setConversations(prev => prev.map(c => c.phone_number === phoneNumber ? { ...c, unread_count: 0 } : c));
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, []);

  // Poll conversations and active messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
      if (activeNumber) {
        fetchMessages(activeNumber);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeNumber]);

  // Scroll messages to bottom on update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle clicking a conversation thread
  const handleSelectConversation = (phone, name) => {
    setActiveNumber(phone);
    setActiveName(name);
    fetchMessages(phone);
    markAsRead(phone);
  };

  // Send a manual reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sending) return;

    setSending(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/chats/conversations/${activeNumber}/send`, {
        messageText: replyText.trim()
      });
      // Append newly sent message to thread
      setMessages(prev => [...prev, response.data]);
      setReplyText('');
      // Refresh list to show updated preview
      fetchConversations(true);
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Failed to send message: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="loading-state card">
        <div className="spinner"></div>
        <p>Loading inbox...</p>
      </div>
    );
  }

  return (
    <div className="inbox-layout card">
      <div className="inbox-split-pane">
        
        {/* Left Side: Conversation Threads List */}
        <div className="inbox-conversations-list">
          <div className="inbox-list-header">
            <h3>Recent Chats</h3>
          </div>
          
          {conversations.length === 0 ? (
            <div className="inbox-empty-conversations">
              <MessageSquare size={32} />
              <p>No active conversations yet.</p>
            </div>
          ) : (
            <div className="inbox-threads-container">
              {conversations.map((chat) => (
                <div 
                  key={chat.phone_number} 
                  className={`inbox-thread-card ${activeNumber === chat.phone_number ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(chat.phone_number, chat.contact_name)}
                >
                  <div className="thread-avatar">
                    <User size={18} />
                  </div>
                  <div className="thread-details">
                    <div className="thread-header-row">
                      <span className="thread-name" title={chat.contact_name}>
                        {chat.contact_name}
                      </span>
                      <span className="thread-time">
                        {new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="thread-preview-row">
                      <span className="thread-preview-text">
                        {chat.last_message_direction === 'outgoing' ? 'You: ' : ''}{chat.last_message}
                      </span>
                      {chat.unread_count > 0 && (
                        <span className="thread-unread-badge">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Conversation Chat Pane */}
        <div className="inbox-chat-pane">
          {activeNumber ? (
            <div className="chat-window-wrapper">
              
              {/* Chat Header */}
              <div className="chat-window-header">
                <div className="chat-header-avatar">
                  <User size={20} />
                </div>
                <div className="chat-header-info">
                  <h4>{activeName}</h4>
                  <span className="chat-header-sub">+{activeNumber}</span>
                </div>
              </div>

              {/* Chat Messages Log */}
              <div className="chat-messages-log">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`message-bubble-wrapper ${msg.direction === 'outgoing' ? 'outgoing' : 'incoming'}`}
                  >
                    <div className="message-bubble">
                      <p className="message-bubble-text">{msg.message_text}</p>
                      <span className="message-bubble-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Compose panel */}
              <form onSubmit={handleSendReply} className="chat-compose-footer">
                <input 
                  type="text" 
                  className="chat-input-field" 
                  placeholder="Type a message..." 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={sending}
                  required
                />
                <button 
                  type="submit" 
                  className="btn btn-primary btn-chat-send"
                  disabled={sending || !replyText.trim()}
                >
                  <Send size={16} />
                </button>
              </form>

            </div>
          ) : (
            <div className="chat-window-placeholder">
              <MessageSquare size={48} />
              <h3>Select a Conversation</h3>
              <p>Choose a contact from the left list to view thread details and reply in real-time.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default ChatInbox;

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, MessageSquare, User, Bot } from 'lucide-react';

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

  // Active chat automation states
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [tags, setTags] = useState([]);

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

  // Poll conversations and active messages
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeNumber) return;
    const interval = setInterval(() => {
      fetchMessages(activeNumber);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeNumber]);

  // Scroll messages to bottom on update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keep active conversation automation details synced with polled data
  useEffect(() => {
    if (!activeNumber) return;
    const activeChat = conversations.find(c => c.phone_number === activeNumber);
    if (activeChat) {
      setIsAiEnabled(activeChat.is_ai_enabled);
      setIsManualOverride(activeChat.is_manual_override);
      setTags(activeChat.tags || []);
    }
  }, [conversations, activeNumber]);

  // Handle clicking a conversation thread
  const handleSelectConversation = (chat) => {
    setActiveNumber(chat.phone_number);
    setActiveName(chat.contact_name);
    setIsAiEnabled(chat.is_ai_enabled);
    setIsManualOverride(chat.is_manual_override);
    setTags(chat.tags || []);
    fetchMessages(chat.phone_number);
    markAsRead(chat.phone_number);
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
      // Force manual override state locally as backend sets it to true automatically
      setIsManualOverride(true);
      fetchConversations(true);
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Failed to send message: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  // Toggle AI bot replies
  const handleToggleAi = async () => {
    try {
      const newVal = !isAiEnabled;
      await axios.patch(`${BACKEND_URL}/chats/conversations/${activeNumber}/ai`, {
        isAiEnabled: newVal
      });
      setIsAiEnabled(newVal);
      setConversations(prev => prev.map(c => c.phone_number === activeNumber ? { ...c, is_ai_enabled: newVal } : c));
    } catch (err) {
      console.error('Error toggling AI status:', err);
      alert('Failed to toggle AI chatbot status.');
    }
  };

  // Toggle Manual Override mode
  const handleToggleOverride = async () => {
    try {
      const newVal = !isManualOverride;
      await axios.patch(`${BACKEND_URL}/chats/conversations/${activeNumber}/override`, {
        isManualOverride: newVal
      });
      setIsManualOverride(newVal);
      setConversations(prev => prev.map(c => c.phone_number === activeNumber ? { ...c, is_manual_override: newVal } : c));
    } catch (err) {
      console.error('Error toggling manual override:', err);
      alert('Failed to toggle manual override.');
    }
  };

  // Add Tag
  const handleAddTag = async (tagText) => {
    if (!tagText.trim()) return;
    const cleanTag = tagText.trim();
    if (tags.includes(cleanTag)) return;

    try {
      const newTags = [...tags, cleanTag];
      await axios.patch(`${BACKEND_URL}/chats/conversations/${activeNumber}/tags`, {
        tags: newTags
      });
      setTags(newTags);
      setConversations(prev => prev.map(c => c.phone_number === activeNumber ? { ...c, tags: newTags } : c));
    } catch (err) {
      console.error('Error adding tag:', err);
    }
  };

  // Remove Tag
  const handleRemoveTag = async (tagToRemove) => {
    try {
      const newTags = tags.filter(t => t !== tagToRemove);
      await axios.patch(`${BACKEND_URL}/chats/conversations/${activeNumber}/tags`, {
        tags: newTags
      });
      setTags(newTags);
      setConversations(prev => prev.map(c => c.phone_number === activeNumber ? { ...c, tags: newTags } : c));
    } catch (err) {
      console.error('Error removing tag:', err);
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
          <div className="inbox-list-header" style={{ textAlign: 'left' }}>
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
                  onClick={() => handleSelectConversation(chat)}
                >
                  <div className="thread-avatar">
                    <User size={18} />
                  </div>
                  <div className="thread-details" style={{ textAlign: 'left' }}>
                    <div className="thread-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="thread-name" title={chat.contact_name} style={{ fontWeight: 600 }}>
                        {chat.contact_name}
                      </span>
                      <span className="thread-time" style={{ fontSize: '11px' }}>
                        {new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Inline list tags preview */}
                    {chat.tags && chat.tags.length > 0 && (
                      <div className="thread-tags-preview" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {chat.tags.map(t => (
                          <span 
                            key={t} 
                            style={{ 
                              fontSize: '9px', 
                              padding: '1px 5px', 
                              borderRadius: '4px', 
                              backgroundColor: t.includes('High Priority') ? '#ffebeb' : t.includes('Agent') ? '#e8f4fd' : 'var(--bg-primary)',
                              color: t.includes('High Priority') ? '#d93025' : t.includes('Agent') ? '#1a73e8' : 'var(--text-secondary)',
                              fontWeight: 600
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="thread-preview-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span className="thread-preview-text" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {chat.last_message_direction === 'outgoing' ? 'You: ' : ''}{chat.last_message}
                      </span>
                      
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {chat.is_ai_enabled && (
                          <span title="AI Auto-Reply Active" style={{ color: '#1a73e8', display: 'flex', alignItems: 'center' }}>
                            <Bot size={12} />
                          </span>
                        )}
                        {chat.is_manual_override && (
                          <span title="Manual Override Active" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', fontSize: '9px', fontWeight: 600, border: '1px solid var(--border-color)', padding: '1px 3px', borderRadius: '3px' }}>
                            MANUAL
                          </span>
                        )}
                        {chat.unread_count > 0 && (
                          <span className="thread-unread-badge">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
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
              
              {/* Chat Header with Status Toggles */}
              <div className="chat-window-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="chat-header-avatar">
                    <User size={20} />
                  </div>
                  <div className="chat-header-info" style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: 0 }}>{activeName}</h4>
                    <span className="chat-header-sub">+{activeNumber}</span>
                  </div>
                </div>

                {/* Control Badges & Toggles */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  
                  {/* Mode Switch (Manual / Bot Auto) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mode:</span>
                    <button 
                      onClick={handleToggleOverride}
                      style={{
                        background: isManualOverride ? '#7f8c8d' : '#2ecc71',
                        color: '#fff',
                        border: 'none',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {isManualOverride ? '👤 Manual' : '⚡ Bot Auto'}
                    </button>
                  </div>

                  {/* AI Auto-reply Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <Bot size={13} style={{ color: isAiEnabled ? '#1a73e8' : 'var(--text-secondary)' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>AI Reply:</span>
                    <button 
                      onClick={handleToggleAi}
                      style={{
                        background: isAiEnabled ? '#1a73e8' : '#e0e0e0',
                        color: isAiEnabled ? '#fff' : 'var(--text-secondary)',
                        border: 'none',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {isAiEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                </div>
              </div>

              {/* Tags Editor Bar */}
              <div className="chat-tags-editor-bar" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', padding: '6px 20px', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tags:</span>
                {tags.map(t => (
                  <span 
                    key={t}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: t.includes('High Priority') ? '#ffebeb' : t.includes('Agent') ? '#e8f4fd' : 'rgba(0, 0, 0, 0.05)',
                      color: t.includes('High Priority') ? '#d93025' : t.includes('Agent') ? '#1a73e8' : 'var(--text-primary)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {t}
                    <button 
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', fontWeight: 'bold' }}
                    >
                      &times;
                    </button>
                  </span>
                ))}
                
                {/* Add Tag Inline Input */}
                <input 
                  type="text"
                  placeholder="+ Add tag"
                  style={{
                    border: '1px dashed var(--border-color)',
                    background: 'none',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    outline: 'none',
                    width: '75px',
                    color: 'var(--text-primary)'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTag(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
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

              {/* Chat Input Compose Footer */}
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

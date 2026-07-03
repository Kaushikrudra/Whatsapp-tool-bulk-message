import React, { useState } from 'react';
import { Home, Smartphone, Users, Power, Search, FileText, Send, Settings, Activity, MessageSquare } from 'lucide-react';

function Sidebar({ activeTab, setActiveTab, status, handleLogout, actionLoading }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Define nav links structurally for dynamic filtering
  const navSections = [
    {
      label: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'inbox', label: 'Chat Inbox', icon: MessageSquare }
      ]
    },
    {
      label: 'WHATSAPP',
      items: [
        { id: 'connection', label: 'Connection', icon: Smartphone },
        { id: 'contacts', label: 'Contact Manager', icon: Users },
        { id: 'templates', label: 'Templates', icon: FileText },
        { id: 'campaigns', label: 'Campaigns', icon: Send },
        { id: 'logs', label: 'System Logs', icon: Activity },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  // Filter sections and items based on search query
  const filteredSections = navSections
    .map(section => {
      const filteredItems = section.items.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return {
        ...section,
        items: filteredItems
      };
    })
    .filter(section => section.items.length > 0);

  return (
    <aside className="sidebar">
      {/* Sidebar Logo */}
      <div className="sidebar-logo">
        <span className="logo-icon">🚀</span>
        <h2>Bulk Sender</h2>
      </div>

      {/* Active Search Bar */}
      <div className="sidebar-search">
        <div className="search-wrapper">
          <Search className="search-icon" size={16} />
          <input 
            type="text" 
            placeholder="Search menu..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="sidebar-nav">
        {filteredSections.map(section => (
          <React.Fragment key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map(item => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <IconComponent className="nav-icon" size={18} />
                  {item.label}
                </button>
              );
            })}
          </React.Fragment>
        ))}
        {filteredSections.length === 0 && (
          <div className="sidebar-no-results">No menu items found</div>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        {status === 'connected' && (
          <button
            className="nav-item btn-sidebar-logout"
            onClick={handleLogout}
            disabled={actionLoading}
          >
            <Power className="nav-icon" size={16} />
            {actionLoading ? 'Disconnecting...' : 'Disconnect WhatsApp'}
          </button>
        )}
        <div className="version-tag">Version 1.0 (Production Ready)</div>
      </div>
    </aside>
  );
}

export default Sidebar;

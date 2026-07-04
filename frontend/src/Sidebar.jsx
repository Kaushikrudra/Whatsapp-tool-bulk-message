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
        <svg className="logo-icon" width="38" height="38" viewBox="30 40 140 120" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}>
          <path d="M35,70 L100,45 L100,155 L35,130 Z" fill="#4A6FA5"/>
          <path d="M100,45 L165,70 L165,130 L100,155 Z" fill="#8FB3E0"/>
          <path d="M112,80 Q135,100 112,120" fill="none" stroke="#EAF1FB" stroke-width="7" stroke-linecap="round"/>
        </svg>
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
      <div className="sidebar-footer" style={{ padding: '16px 8px 8px 8px' }}>
        {status !== 'connected' ? (
          <button
            className="btn-sidebar-connect"
            onClick={() => setActiveTab('connection')}
          >
            <Power size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Connect WhatsApp
          </button>
        ) : (
          <button
            className="btn-sidebar-logout"
            onClick={handleLogout}
            disabled={actionLoading}
          >
            <Power size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {actionLoading ? 'Disconnecting...' : 'Disconnect WhatsApp'}
          </button>
        )}
        <div className="version-tag">Version 1.0 Copyright © 2026</div>
      </div>
    </aside>
  );
}

export default Sidebar;

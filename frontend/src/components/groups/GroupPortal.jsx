import React, { useState } from 'react';
import { MemberCard } from './MemberCard.jsx';
import { GroupEvents } from './GroupEvents.jsx';
import { GroupNewsroom } from './GroupNewsroom.jsx';
import './GroupPortal.css';

const navItems = [
  { id: 'members', label: 'Members', icon: 'groups' },
  { id: 'events', label: 'Events', icon: 'event' },
  { id: 'newsroom', label: 'Newsroom', icon: 'newspaper' },
  { id: 'contact', label: 'Contact Book', icon: 'contact_page' }
];

export function GroupPortal({ group, isAdmin, currentUserId, onEdit, onInvite }) {
  const [activeTab, setActiveTab] = useState('members');

  if (!group) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center bg-[#fbfcfe]">
        <div className="max-w-sm">
          <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">group_work</span>
          <p className="text-slate-400 text-lg">Select a group to view its portal and connect with members.</p>
        </div>
      </div>
    );
  }

  const isCreator = String(group.createdBy || "") === String(currentUserId || "");
  const canManage = isAdmin || isCreator || group.source === 'chat';
  const members = group.members || [];

  return (
    <div className="group-portal-container">
      <header className="group-portal-header">
        <div className="group-header-info">
          <div className="group-portal-avatar">
            {group.name?.charAt(0).toUpperCase()}
          </div>
          <div className="group-header-copy">
            <h2>{group.name}</h2>
            <p>{group.description || "No description provided."}</p>
            <div className="group-header-meta">
              <span>
                <span className="material-symbols-outlined">group</span>
                {group.memberCount} Members
              </span>
              <span>
                <span className="material-symbols-outlined">calendar_today</span>
                Created on {new Date(group.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="group-header-actions">
          <button className="button primary" onClick={onInvite}>
            <span className="material-symbols-outlined">person_add</span>
            Invite Members
          </button>
          {canManage && (
            <button className="button outline" onClick={onEdit}>
              <span className="material-symbols-outlined">settings</span>
              Settings
            </button>
          )}
        </div>
      </header>

      <nav className="group-portal-nav">
        {navItems.map(tab => (
          <button
            className={`portal-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="material-symbols-outlined">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="group-portal-content">

        {activeTab === "members" && (
          <div className="group-members-view">
             <div className="group-portal-section-header">
              <h2>Members</h2>
              <div className="member-filters-row">
                 {/* Search & Filter would go here */}
              </div>
            </div>
            <div className="group-member-grid">
              {(group.members || []).map((member) => (
                <MemberCard 
                  key={member.id || member._id} 
                  member={member} 
                  isCreator={String(group.createdBy || "") === String(member.id || member._id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "events" && (
          <GroupEvents groupId={group.id || group._id} canManage={canManage} />
        )}

        {activeTab === "newsroom" && (
          <GroupNewsroom groupId={group.id || group._id} canManage={canManage} />
        )}

        {activeTab === "contact" && (
          <div className="portal-empty-state">
            <span className="material-symbols-outlined">
              {navItems.find(n => n.id === activeTab)?.icon}
            </span>
            <h3>{navItems.find(n => n.id === activeTab)?.label} Coming Soon</h3>
            <p>We're working on bringing {navItems.find(n => n.id === activeTab)?.label.toLowerCase()} to this group portal.</p>
          </div>
        )}
      </main>
    </div>
  );
}

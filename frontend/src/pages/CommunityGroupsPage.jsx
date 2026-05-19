import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PortalSegmentedTabs } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import {
  createCommunityGroup,
  deleteCommunityGroup,
  fetchAlumni,
  fetchCommunityGroups,
  updateCommunityGroup,
  fetchAlumniConversations,
  createAlumniConversationRequest,
  sendAlumniConversationMessage,
  joinCommunityGroup
} from "../lib/api.js";

import { GroupPortal } from "../components/groups/GroupPortal.jsx";
import "../styles/Groups.css";
import "../styles/GroupPortalLegacy.css";


const initialForm = {
  name: "",
  description: "",
  groupType: "interest",
  audienceLabel: "",
  memberUserIds: []
};

const tabItems = [
  { value: "my_groups", label: "My Groups" },
  { value: "interest", label: "Interest Groups" },
  { value: "class", label: "Class Groups" },
  { value: "year", label: "Year Groups" },
  { value: "chapter", label: "Chapter Groups" }
];

function getGroupTypeLabel(groupType) {
  if (groupType === "interest") return "Interest Group";
  if (groupType === "class") return "Class Group";
  if (groupType === "year") return "Year Group";
  return "Chapter Group";
}

function getAudiencePlaceholder(groupType, tenant) {
  if (groupType === "interest") return "e.g. Entrepreneurship, AI, Design";
  if (groupType === "class") {
    return tenant.institutionType === "school" ? "e.g. Class 10A, Science House" : "e.g. Computer Science, MBA A";
  }
  if (groupType === "chapter") return "e.g. Mumbai Chapter, USA East Coast";

  return tenant.institutionType === "school" ? "e.g. Leaving Year 2018" : "e.g. Batch of 2020";
}

function formatTime(value) {
  if (!value) return "";

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatListDate(value) {
  if (!value) return "";

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function getGroupInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function CommunityGroupsPage() {
  const auth = useAuth();
  const tenant = useTenantContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("my_groups");
  const [search, setSearch] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [searchParams, setSearchParams] = useSearchParams();

  const deferredSearch = useDeferredValue(search);
  const isAdmin = auth.hasPermission("manage_groups");
  const currentUserId = String(auth.user?._id || auth.user?.id || "");

  const groupsQuery = useQuery({
    queryKey: ["community-groups"],
    queryFn: fetchCommunityGroups,
    enabled: tenant?.featureFlags?.enableGroups !== false
  });
  const alumniQuery = useQuery({
    queryKey: ["alumni"],
    queryFn: fetchAlumni,
    enabled: !!auth.user?.id || !!auth.user?._id
  });

  const conversationsQuery = useQuery({
    queryKey: ["alumni-conversations"],
    queryFn: fetchAlumniConversations,
    enabled: tenant?.featureFlags?.enableFriendship !== false
  });

  const groups = groupsQuery.data || [];
  const conversations = conversationsQuery.data || [];
  const alumni = alumniQuery.data || [];


  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateCommunityGroup(id, payload) : createCommunityGroup(payload)),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["community-groups"] });
      setSelectedGroupId(group._id);
      setEditingGroupId(null);
      setIsComposerOpen(false);
      setForm(initialForm);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCommunityGroup,
    onSuccess: (_, deletedGroupId) => {
      queryClient.invalidateQueries({ queryKey: ["community-groups"] });
      if (selectedGroupId === deletedGroupId) {
        setSelectedGroupId(null);
      }
      if (editingGroupId === deletedGroupId) {
        setEditingGroupId(null);
        setIsComposerOpen(false);
        setForm(initialForm);
      }
    }
  });

  const sendInviteMutation = useMutation({
    mutationFn: async ({ person, group }) => {
      // 1. Resolve Recipient User ID (The Account ID)
      const currentUserId = String(auth.user?._id || auth.user?.id || "");
      const recipientId = String(
        (person.userId?._id ? person.userId._id : person.userId) || 
        person._id || 
        ""
      );
      
      if (!recipientId || recipientId === "undefined") {
        throw new Error("Missing recipient account ID.");
      }

      if (recipientId === currentUserId) {
        throw new Error("You cannot invite yourself!");
      }

      // 2. Find or create conversation
      const existing = conversations.find(c => 
        c.conversationType === 'direct' && 
        c.members?.some(m => String(m.id || m._id) === recipientId)
      );

      let convoId = existing?.id || existing?._id;

      if (!convoId) {
        // The backend expects 'recipientUserId' and a 'message' field
        const newConvo = await createAlumniConversationRequest({
          recipientUserId: recipientId,
          message: `Hello! I would like to invite you to join our community group: ${group.name}. Hope to see you there!`
        });
        convoId = newConvo.id || newConvo._id;
      }

      // 3. Send the invite message with link
      const gid = group.id || group._id || group.id;
      console.log("[Invite] Generating link for group:", group.name, "ID:", gid);
      const joinLink = `${window.location.origin}/portal/groups?join=${gid}`;
      await sendAlumniConversationMessage(convoId, {
        content: `Hey! I'd love for you to join our group "${group.name}". You can join using this link: ${joinLink}`,
        contentType: 'group_invite',
        groupData: { id: group.id || group._id, name: group.name }
      });

      return { person, convoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alumni-conversations"] });
      alert(`Invite successfully sent to ${data.person.name || "Alumni"}!`);
      setIsInviteModalOpen(false);
    },
    onError: (error) => {
      alert(`Failed to send invite: ${error.message}`);
    }
  });

  useEffect(() => {
    const joinGroupId = searchParams.get("join");
    const selectGroupId = searchParams.get("id");

    if (joinGroupId) {
      const runJoin = async () => {
        try {
          await joinCommunityGroup(joinGroupId);
          queryClient.invalidateQueries({ queryKey: ["community-groups"] });
          setSelectedGroupId(joinGroupId);
          searchParams.delete("join");
          setSearchParams(searchParams);
        } catch (err) {
          console.error("Failed to join group from URL:", err);
        }
      };
      runJoin();
    } else if (selectGroupId) {
      setSelectedGroupId(selectGroupId);
    }
  }, [searchParams, queryClient, setSearchParams]);



  const filteredGroups = useMemo(() => {
    const currentUserId = String(auth.user?._id || auth.user?.id || "");
    
    // Normalize Community Groups
    const normalizedCommunityGroups = groups.map(g => ({
      ...g,
      id: g._id,
      source: 'community'
    }));

    // Normalize Chat Groups (only where conversationType is 'group')
    const chatGroups = conversations
      .filter(c => c.conversationType === 'group')
      .map(c => ({
        ...c,
        id: c._id,
        name: c.groupName,
        source: 'chat',
        memberCount: c.members?.length || 0,
        groupType: 'chat'
      }));

    const allGroups = [...normalizedCommunityGroups, ...chatGroups];

    const visibleGroups = allGroups.filter((group) => {
      if (activeTab === "my_groups") {
        return (group.members || []).some((member) => {
          const mId = typeof member === 'string' ? member : (member.id || member._id);
          return String(mId) === currentUserId;
        });
      }

      return group.groupType === activeTab;
    });

    if (!deferredSearch.trim()) {
      return visibleGroups;
    }

    const query = deferredSearch.trim().toLowerCase();
    return visibleGroups.filter((group) => {
      const haystack = [
        group.name,
        group.audienceLabel,
        group.description,
        ...(group.members || []).map((member) => member.name)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeTab, auth.user?.id, deferredSearch, groups, conversations]);


  useEffect(() => {
    if (!filteredGroups.length) {
      setSelectedGroupId(null);
      return;
    }

    if (!selectedGroupId || !filteredGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(filteredGroups[0].id);
    }

  }, [filteredGroups, selectedGroupId]);

  const selectedGroup = filteredGroups.find((group) => group.id === selectedGroupId) || null;

  const availableMembers = useMemo(
    () =>
      alumni.filter((profile) => {
        const userId = profile.userId?._id || profile.userId;
        const isApproved = profile.registrationReviewStatus === "approved";
        return Boolean(userId) && (profile.isActive || isApproved);
      }),
    [alumni]
  );

  const tabBadges = useMemo(
    () => {
      const currentUserId = String(auth.user?._id || auth.user?.id || "");
      return tabItems.reduce((accumulator, item) => {

        accumulator[item.value] =
          item.value === "my_groups"
            ? (groups.filter((group) => (group.members || []).some((member) => String(member.id || member._id) === currentUserId)).length +
               conversations.filter(c => c.conversationType === 'group' && (c.members || []).some(m => String(m.id || m._id) === currentUserId)).length)
            : groups.filter((group) => group.groupType === item.value).length;

        return accumulator;
      }, {});
    },
    [auth.user?._id, auth.user?.id, groups, conversations]
  );

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openCreateComposer(groupType = "interest") {
    setEditingGroupId(null);
    setForm({ ...initialForm, groupType });
    setIsComposerOpen(true);
  }

  function openEditComposer(group) {
    setEditingGroupId(group.id || group._id);
    setForm({
      name: group.name || "",
      description: group.description || "",
      groupType: group.groupType || "interest",
      audienceLabel: group.audienceLabel || "",
      memberUserIds: (group.members || []).map(m => m.id || m._id).filter(Boolean)
    });
    setIsComposerOpen(true);
  }

  function toggleMember(userId) {
    const normalizedUserId = String(userId);
    setForm((current) => ({
      ...current,
      memberUserIds: current.memberUserIds.includes(normalizedUserId)
        ? current.memberUserIds.filter((id) => id !== normalizedUserId)
        : [...current.memberUserIds, normalizedUserId]
    }));
  }

  function openCreateComposer(groupType = "interest") {
    setEditingGroupId(null);
    setForm({
      ...initialForm,
      groupType
    });
    setIsComposerOpen(true);
  }

  function handleEdit(group) {
    setEditingGroupId(group._id);
    setForm({
      name: group.name || "",
      description: group.description || "",
      groupType: group.groupType,
      audienceLabel: group.audienceLabel || "",
      memberUserIds: (group.members || []).map((member) => String(member.id))
    });
    setIsComposerOpen(true);
  }

  function handleSubmit(event) {
    event.preventDefault();
    saveMutation.mutate({
      id: editingGroupId,
      payload: {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        audienceLabel: form.audienceLabel.trim(),
        memberUserIds: form.memberUserIds
      }
    });
  }



  if (tenant.featureFlags.enableGroups === false) {
    return (
      <SectionCard title="Groups" subtitle="Portal Access">
        <p className="muted">Groups are disabled for this portal.</p>
      </SectionCard>
    );
  }

  if (isAdmin && isComposerOpen) {
    return (
      <div className="community-groups-page">
        <SectionCard
          title={editingGroupId ? "Edit Group" : "Create Group"}
          subtitle={`${getGroupTypeLabel(form.groupType)} | Managed by ${tenant.communityLabels.adminLabel}`}
        >
          <form className="community-groups-composer" onSubmit={handleSubmit}>
            <input name="name" onChange={handleFormChange} placeholder="Group name" value={form.name} />
            <select className="select" name="groupType" onChange={handleFormChange} value={form.groupType}>
              <option value="interest">Interest Group</option>
              <option value="class">Class Group</option>
              <option value="year">Year Group</option>
              <option value="chapter">Chapter Group</option>
            </select>
            <input
              name="audienceLabel"
              onChange={handleFormChange}
              placeholder={getAudiencePlaceholder(form.groupType, tenant)}
              value={form.audienceLabel}
            />
            <textarea
              className="textarea"
              name="description"
              onChange={handleFormChange}
              placeholder="Describe the purpose of this group"
              rows="4"
              value={form.description}
            />

            <div className="community-groups-member-picker">
              <strong>Select Members</strong>
              <div className="community-groups-member-grid">
                {availableMembers.map((profile) => {
                  const userId = String(profile.userId?._id || profile.userId);
                  const secondaryLabel =
                    profile.designation ||
                    profile.department ||
                    profile.lastClassAttended ||
                    profile.company ||
                    "Community Member";
                  const tertiaryLabel =
                    profile.company ||
                    profile.batch ||
                    profile.leavingYear ||
                    profile.location ||
                    "";
                  const isSelected = form.memberUserIds.includes(userId);

                  return (
                    <label
                      className={`community-groups-member-option${isSelected ? " selected" : ""}`}
                      key={profile._id}
                    >
                      <div className="community-groups-member-option-main">
                        <div className="community-groups-member-avatar" aria-hidden="true">
                          {profile.name?.slice(0, 1) || "A"}
                        </div>
                        <div className="community-groups-member-copy">
                          <strong>{profile.name}</strong>
                          <span>{secondaryLabel}</span>
                          {tertiaryLabel ? <small>{tertiaryLabel}</small> : null}
                        </div>
                      </div>
                      <input checked={isSelected} onChange={() => toggleMember(userId)} type="checkbox" />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="inline-actions">
              <button
                className="button primary"
                disabled={saveMutation.isPending || !form.name.trim() || !form.memberUserIds.length}
                type="submit"
              >
                {saveMutation.isPending ? "Saving..." : editingGroupId ? "Update Group" : "Create Group"}
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setEditingGroupId(null);
                  setIsComposerOpen(false);
                  setForm(initialForm);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
          {saveMutation.isError ? <p className="error-text">{saveMutation.error.message}</p> : null}
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="community-groups-page">
      <PortalSegmentedTabs
        activeValue={activeTab}
        ariaLabel="Community group categories"
        className="community-groups-tabs"
        items={tabItems.map((item) => ({
          ...item,
          badge: tabBadges[item.value] || null
        }))}
        onChange={setActiveTab}
      />

      <div className="group-portal-shell community-groups-portal-section">
        <aside className="group-portal-sidebar">

          <div className="messages-sidebar-header">
            <div className="messages-sidebar-topline">
              <h2>Groups Hub</h2>
            </div>

            <div className="group-sidebar-search">
              <span className="material-symbols-outlined">search</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search groups, members..."
                type="search"
                value={search}
              />
            </div>
          </div>

          <div className="sidebar-group-section">
            <h3 className="sidebar-section-title">MY GROUPS</h3>
            <div className="group-list">
              {filteredGroups.filter(g => (g.members || []).some(m => String(m.id || m._id) === currentUserId)).map((group) => (
                <button
                  className={`group-list-item ${group.id === selectedGroupId ? "active" : ""}`}
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  type="button"
                >
                  <div className="group-item-avatar">{getGroupInitials(group.name)}</div>
                  <div className="group-item-content">
                    <strong>{group.name}</strong>
                    <div className="group-item-meta-simple">
                      {group.memberCount} members
                    </div>
                  </div>
                </button>
              ))}
              <button className="sidebar-action-link">
                View all my groups
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="sidebar-group-section">
            <h3 className="sidebar-section-title">BROWSE GROUPS</h3>
            <div className="browse-category-list">
              {[
                { id: 'interest', label: 'Interest Groups', icon: 'favorite' },
                { id: 'class', label: 'Class Groups', icon: 'school' },
                { id: 'year', label: 'Year Groups', icon: 'calendar_today' },
                { id: 'chapter', label: 'Chapter Groups', icon: 'location_on' }
              ].map(cat => (
                <button 
                  className={`browse-cat-item ${activeTab === cat.id ? 'active' : ''}`}
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                >
                  <span className="material-symbols-outlined">{cat.icon}</span>
                  {cat.label}
                  <span className="material-symbols-outlined chevron">chevron_right</span>
                </button>
              ))}
            </div>
          </div>

          <div className="group-sidebar-promo">
            <div className="promo-icon-circle">
               <span className="material-symbols-outlined">groups_3</span>
            </div>
            <h4>Connect. Share. Grow.</h4>
            <p>Engage with alumni and expand your network.</p>
            <button className="group-promo-btn">
              <span className="material-symbols-outlined">send</span>
              Invite Alumni
            </button>
          </div>


        </aside>

        <section className="group-portal-pane flex-1 min-w-0">
          {selectedGroup ? (
            <GroupPortal
              group={selectedGroup}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              onEdit={() => openEditComposer(selectedGroup)}
              onInvite={() => setIsInviteModalOpen(true)}
              onBack={() => setSelectedGroupId(null)}
            />
          ) : (
            <div className="group-browse-view">
              <div className="group-portal-section-header">
                <h2>
                  <span className="material-symbols-outlined">
                    {tabItems.find(t => t.value === activeTab)?.icon || 'groups'}
                  </span>
                  {tabItems.find(t => t.value === activeTab)?.label || 'Browse Groups'}
                </h2>
                {activeTab === 'interest' && (
                  <button className="button primary" onClick={() => openCreateComposer("interest")}>
                    <span className="material-symbols-outlined">add</span>
                    Create Interest Group
                  </button>
                )}
                {isAdmin && activeTab !== 'interest' && activeTab !== 'my_groups' && (
                  <button className="button primary" onClick={() => openCreateComposer(activeTab)}>
                    <span className="material-symbols-outlined">add</span>
                    Create {tabItems.find(t => t.value === activeTab)?.label.replace(' Groups', '')}
                  </button>
                )}
              </div>

              <div className="group-browse-grid">
                {filteredGroups.length === 0 ? (
                  <div className="portal-empty-state">
                    <span className="material-symbols-outlined">search_off</span>
                    <h3>No Groups Found</h3>
                    <p>We couldn't find any groups in this category. Why not start one?</p>
                  </div>
                ) : (
                  filteredGroups.map(group => (
                    <div className="group-browse-card" key={group.id || group._id}>
                      <div className="group-browse-card-avatar">
                        {getGroupInitials(group.name)}
                      </div>
                      <div className="group-browse-card-content">
                        <h3>{group.name}</h3>
                        <p>{group.description || "A community space for alumni to connect and collaborate."}</p>
                        <div className="group-browse-card-footer">
                          <span>{group.memberCount || (group.members || []).length} members</span>
                          <button 
                            className="button secondary compact"
                            onClick={() => setSelectedGroupId(group.id || group._id)}
                          >
                            View Portal
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {deleteMutation.isError ? <p className="error-text">{deleteMutation.error.message}</p> : null}
        </section>

      </div>

      {isComposerOpen && (
        <div className="group-composer-overlay">
          <div className="group-composer-modal">
            <header className="group-composer-header">
              <h2>{editingGroupId ? "Edit Group" : "Create New Group"}</h2>
              <button className="close-btn" onClick={() => setIsComposerOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ id: editingGroupId, payload: form }); }}>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  name="name"
                  onChange={handleFormChange}
                  placeholder="e.g. AI Builders Circle"
                  required
                  value={form.name}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  onChange={handleFormChange}
                  placeholder="Tell people what this group is about..."
                  rows={3}
                  value={form.description}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select 
                  name="groupType" 
                  onChange={handleFormChange} 
                  value={form.groupType}
                  disabled={!isAdmin}
                >
                  <option value="interest">Interest Group</option>
                  {isAdmin && (
                    <>
                      <option value="class">Class Group</option>
                      <option value="year">Year Group</option>
                      <option value="chapter">Chapter Group</option>
                    </>
                  )}
                </select>
                {!isAdmin && <p className="form-help">Alumni can only create Interest Groups. Others are managed by the institute.</p>}
              </div>

              <div className="form-group">
                <label>Members ({form.memberUserIds.length} selected)</label>
                <div className="member-picker-grid">
                  {availableMembers.map((person) => {
                    const userId = String(person.userId?._id || person.userId || person._id);
                    const isSelected = form.memberUserIds.includes(userId);
                    const name = person.name || person.userId?.name || "Alumni Member";
                    
                    return (
                      <button
                        className={`member-picker-item ${isSelected ? "selected" : ""}`}
                        key={person._id}
                        onClick={() => toggleMember(userId)}
                        type="button"
                      >
                        <div className="member-picker-avatar">
                          {name[0].toUpperCase()}
                        </div>
                        <span>{name}</span>
                        {isSelected && <span className="material-symbols-outlined check">check_circle</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-actions">
                <button className="button secondary" onClick={() => setIsComposerOpen(false)} type="button" style={{ border: '1px solid #e2e8f0' }}>
                  Cancel
                </button>
                <button 
                  className="button primary" 
                  disabled={saveMutation.isPending || !form.name.trim() || form.memberUserIds.length === 0} 
                  type="submit"
                >
                  {saveMutation.isPending ? "Saving..." : editingGroupId ? "Update Group" : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isInviteModalOpen && (
        <div className="group-composer-overlay">
          <div className="group-composer-modal invite-modal">
            <header className="group-composer-header">
              <h2>Invite Alumni to {selectedGroup?.name}</h2>
              <button className="close-btn" onClick={() => setIsInviteModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="invite-modal-content">
               <div className="invite-search-bar">
                  <span className="material-symbols-outlined">search</span>
                  <input placeholder="Search alumni by name, batch..." type="text" />
               </div>

               <div className="alumni-invite-list">
                  {availableMembers.map((person) => {
                    const fullName = person.name || 
                                     person.userId?.name ||
                                     (person.firstName ? `${person.firstName} ${person.lastName || ""}` : "") ||
                                     (person.userId?.firstName ? `${person.userId.firstName} ${person.userId.lastName || ""}` : "") ||
                                     "Alumni Member";
                    
                    const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                    const profilePic = person.profilePicture || person.userId?.profilePicture;
                    const recipientId = String((person.userId?._id || person.userId) || person._id || "");

                    return (
                      <div className="alumni-invite-item" key={person._id}>
                        <div className="alumni-info">
                          <div className="alumni-avatar-small">
                            {profilePic ? (
                              <img src={profilePic} alt={fullName} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <strong>{fullName}</strong>
                            <p>{person.graduationYear || person.batch ? `Batch of ${person.graduationYear || person.batch}` : "Alumni"}</p>
                          </div>
                        </div>
                        <button 
                          className="invite-action-btn"
                          disabled={sendInviteMutation.isPending || recipientId === currentUserId}
                          onClick={() => sendInviteMutation.mutate({ person, group: selectedGroup })}
                        >
                          {sendInviteMutation.isPending ? "Sending..." : "Invite"}
                        </button>
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunityGroupsPage;

import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
  sendCommunityGroupMessage,
  updateCommunityGroup
} from "../lib/api.js";

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
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [form, setForm] = useState(initialForm);
  const deferredSearch = useDeferredValue(search);
  const isAdmin = auth.user?.role === "institute_admin";

  const groupsQuery = useQuery({
    queryKey: ["community-groups"],
    queryFn: fetchCommunityGroups,
    enabled: tenant.featureFlags.enableGroups !== false
  });
  const alumniQuery = useQuery({
    queryKey: ["alumni"],
    queryFn: fetchAlumni,
    enabled: isAdmin
  });

  const groups = groupsQuery.data || [];
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

  const messageMutation = useMutation({
    mutationFn: ({ id, content }) => sendCommunityGroupMessage(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-groups"] });
      setDraftMessage("");
    }
  });

  const filteredGroups = useMemo(() => {
    const currentUserId = String(auth.user?.id || "");
    const visibleGroups = groups.filter((group) => {
      if (activeTab === "my_groups") {
        return (group.members || []).some((member) => String(member.id) === currentUserId);
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
        ...(group.members || []).map((member) => member.name),
        group.canViewChat ? group.latestMessage?.content || "" : ""
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeTab, auth.user?.id, deferredSearch, groups]);

  useEffect(() => {
    if (!filteredGroups.length) {
      setSelectedGroupId(null);
      return;
    }

    if (!selectedGroupId || !filteredGroups.some((group) => group._id === selectedGroupId)) {
      setSelectedGroupId(filteredGroups[0]._id);
    }
  }, [filteredGroups, selectedGroupId]);

  const selectedGroup = filteredGroups.find((group) => group._id === selectedGroupId) || null;
  const availableMembers = useMemo(
    () =>
      alumni.filter((profile) => {
        const userId = profile.userId?._id || profile.userId;
        return Boolean(userId) && profile.isActive;
      }),
    [alumni]
  );

  const tabBadges = useMemo(
    () =>
      tabItems.reduce((accumulator, item) => {
        accumulator[item.value] =
          item.value === "my_groups"
            ? groups.filter((group) => (group.members || []).some((member) => String(member.id) === String(auth.user?.id || ""))).length
            : groups.filter((group) => group.groupType === item.value).length;
        return accumulator;
      }, {}),
    [auth.user?.id, groups]
  );

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
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

  function handleSendMessage() {
    if (!selectedGroup || !draftMessage.trim()) {
      return;
    }

    messageMutation.mutate({
      id: selectedGroup._id,
      content: draftMessage.trim()
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

      <div className="messages-page community-groups-messages-page">
        <aside className="messages-sidebar community-groups-sidebar-pane">
          <div className="messages-sidebar-header">
            <div className="messages-sidebar-topline">
              <h1>Groups</h1>
              {isAdmin ? (
                <button className="button primary compact" onClick={() => openCreateComposer(activeTab === "my_groups" ? "interest" : activeTab)} type="button">
                  New Group
                </button>
              ) : null}
            </div>

            <label className="messages-search">
              <span aria-hidden="true">S</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                type="search"
                value={search}
              />
            </label>
          </div>

          {groupsQuery.isLoading ? <p>Loading groups...</p> : null}
          {groupsQuery.isError ? <p className="error-text">{groupsQuery.error.message}</p> : null}
          {!groupsQuery.isLoading && !filteredGroups.length ? <p className="muted">No groups found in this view.</p> : null}

          <div className="messages-conversation-list">
            {filteredGroups.map((group) => (
              <button
                className={group._id === selectedGroup?._id ? "messages-thread active" : "messages-thread"}
                key={group._id}
                onClick={() => setSelectedGroupId(group._id)}
                type="button"
              >
                <div className="messages-thread-avatar group">{getGroupInitials(group.name)}</div>
                <div className="messages-thread-copy">
                  <div className="messages-thread-head">
                    <strong>{group.name}</strong>
                    <span>{formatListDate(group.updatedAt)}</span>
                  </div>
                  <p>{group.canViewChat ? group.latestMessage?.content || group.description || "No messages yet." : "Members only conversation"}</p>
                  <span className="messages-thread-meta">
                    {group.memberCount} members | {getGroupTypeLabel(group.groupType)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="messages-panel community-groups-chat-pane">
          {selectedGroup ? (
            <>
              <header className="messages-panel-header">
                <div className="messages-panel-profile">
                  <div className="messages-panel-avatar group">{getGroupInitials(selectedGroup.name)}</div>
                  <div>
                    <strong>{selectedGroup.name}</strong>
                    <p>
                      {selectedGroup.canViewChat
                        ? `${selectedGroup.memberCount} members online in spirit`
                        : "Private group chat for members only"}
                    </p>
                  </div>
                </div>

                <div className="messages-panel-actions">
                  <button type="button">Call</button>
                  <button type="button">Video</button>
                  <button type="button">Info</button>
                  {isAdmin ? (
                    <button className="community-groups-admin-link" onClick={() => handleEdit(selectedGroup)} type="button">
                      Edit
                    </button>
                  ) : null}
                </div>
              </header>

              {selectedGroup.canViewChat ? (
                <>
                  <div className="messages-group-summary">
                    <strong>{selectedGroup.audienceLabel || getGroupTypeLabel(selectedGroup.groupType)}</strong>
                    <div className="messages-group-member-chips">
                      {(selectedGroup.members || []).slice(0, 8).map((member) => (
                        <span className="messages-group-chip" key={member.id}>
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="messages-panel-body">
                    <span className="messages-day-pill">TODAY</span>

                    {selectedGroup.messages?.length ? (
                      selectedGroup.messages.map((message) => {
                        const isOutgoing = String(message.sender?.id || "") === String(auth.user?.id || "");
                        return (
                          <div className={`messages-bubble-row ${isOutgoing ? "outgoing" : "incoming"}`} key={message._id}>
                            {!isOutgoing ? (
                              <div className="messages-bubble-avatar">
                                {message.sender?.name?.slice(0, 1) || "M"}
                              </div>
                            ) : null}
                            <div className="messages-bubble-wrap">
                              {!isOutgoing ? (
                                <strong className="messages-bubble-sender">{message.sender?.name || "Member"}</strong>
                              ) : null}
                              <div className={`messages-bubble ${isOutgoing ? "outgoing" : "incoming"}`}>{message.content}</div>
                              <span className="messages-bubble-time">{formatTime(message.sentAt)}</span>
                            </div>
                            {isOutgoing ? (
                              <div className="messages-bubble-avatar self">{auth.user?.name?.slice(0, 1) || "Y"}</div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <p className="muted">No messages yet. Start the conversation.</p>
                    )}
                  </div>

                  <footer className="messages-composer">
                    <button className="messages-composer-icon" type="button">
                      +
                    </button>
                    <button className="messages-composer-icon" type="button">
                      :)
                    </button>
                    <input
                      onChange={(event) => setDraftMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      value={draftMessage}
                    />
                    <button
                      className="messages-send"
                      disabled={messageMutation.isPending || !draftMessage.trim()}
                      onClick={handleSendMessage}
                      type="button"
                    >
                      {messageMutation.isPending ? "Sending..." : "Send"}
                    </button>
                  </footer>
                </>
              ) : (
                <div className="community-groups-locked-state">
                  <div className="community-groups-locked-card">
                    <h2>{selectedGroup.name}</h2>
                    <p>This group chat is private. Only group members can view messages and participate.</p>
                    <div className="messages-group-member-chips">
                      {(selectedGroup.members || []).slice(0, 8).map((member) => (
                        <span className="messages-group-chip" key={member.id}>
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <p className="muted">Select a group to continue.</p>
            </div>
          )}

          {deleteMutation.isError ? <p className="error-text">{deleteMutation.error.message}</p> : null}
          {messageMutation.isError ? <p className="error-text">{messageMutation.error.message}</p> : null}
        </section>
      </div>
    </div>
  );
}

export default CommunityGroupsPage;

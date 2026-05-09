import { PortalSearchField } from "../PortalPrimitives.jsx";

export function ConnectionsSidebar({
  search,
  setSearch,
  conversations,
  activeId,
  setActiveId,
  isMobileViewport,
  setIsMobileThreadListOpen,
  setIsCreateGroupOpen,
  getThreadStatus,
  getInitials,
  activeFilter,
  setActiveFilter,
}) {
  return (
    <aside className="member-messages-sidebar">
      <div className="member-messages-sidebar-header">
        <h2>Chats</h2>
        <button
          className="member-sidebar-icon-button"
          onClick={() => setIsCreateGroupOpen(true)}
          title="New chat"
          type="button"
        >
          <span className="material-symbols-outlined">edit_square</span>
        </button>
        <button
          className="member-sidebar-icon-button"
          title="Filter chats"
          type="button"
        >
          <span className="material-symbols-outlined">tune</span>
        </button>
      </div>

      <div className="member-messages-sidebar-search">
        <PortalSearchField
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats or contacts..."
          value={search}
        />
      </div>

      <div className="member-chat-filter-pills" aria-label="Chat filters">
        <button
          className={activeFilter === "all" ? "active" : ""}
          onClick={() => setActiveFilter("all")}
          type="button"
        >
          All
        </button>
        <button
          className={activeFilter === "unread" ? "active" : ""}
          onClick={() => setActiveFilter("unread")}
          type="button"
        >
          Unread
        </button>
        <button
          className={activeFilter === "groups" ? "active" : ""}
          onClick={() => setActiveFilter("groups")}
          type="button"
        >
          Groups
        </button>
      </div>

      <div className="member-messages-thread-list">
        {!conversations.length ? (
          <div className="member-messages-empty-state">
            <span className="material-symbols-outlined">forum</span>
            <p>{search ? "No matches found." : "No alumni chats yet."}</p>
          </div>
        ) : (
          conversations.map((item) => {
            const status = getThreadStatus(item);
            const isActive = item._id === activeId;

            return (
              <button
                key={item._id}
                className={`member-thread-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveId(item._id);
                  if (isMobileViewport) {
                    setIsMobileThreadListOpen(false);
                  }
                }}
                type="button"
              >
                <div className="member-thread-avatar">
                  {item.type === "group" ? (
                    <span className="material-symbols-outlined">groups</span>
                  ) : (
                    getInitials(item.name)
                  )}
                  {item.online && (
                    <span className="member-thread-online-indicator" />
                  )}
                </div>
                <div className="member-thread-copy">
                  <div className="member-thread-head">
                    <strong>{item.name}</strong>
                    <span className="member-thread-meta">
                      {item.isUnread ? (
                        <span className="member-thread-unread-pill">New</span>
                      ) : null}
                      <span>{item.when}</span>
                    </span>
                  </div>
                  <p>
                    {item.preview === "Encrypted message" && (
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "0.9rem",
                          verticalAlign: "middle",
                          marginRight: "4px",
                          color: "var(--chat-muted)",
                        }}
                      >
                        lock
                      </span>
                    )}
                    {item.preview}
                  </p>
                  <div className="member-thread-foot">
                    <span className={`member-status-pill ${status.className}`}>
                      {status.label}
                    </span>
                    {item.unreadCount > 0 ? (
                      <span className="member-thread-count-pill">
                        {item.unreadCount > 9 ? "9+" : item.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

import { PortalSearchField } from "../PortalPrimitives.jsx";

export function MentorshipSidebar({
  search,
  setSearch,
  conversations,
  activeId,
  setActiveId,
  isMobileViewport,
  setIsMobileThreadListOpen,
  setIsCreateGroupOpen,
  getThreadStatus,
  getInitials
}) {
  return (
    <aside className="member-messages-sidebar">
      <div className="member-messages-sidebar-header">
        <h2>Messages</h2>
        <button
          className="button primary compact icon-only"
          onClick={() => setIsCreateGroupOpen(true)}
          title="Create group"
          type="button"
        >
          <span className="material-symbols-outlined">group_add</span>
        </button>
      </div>

      <div className="member-messages-sidebar-search">
        <PortalSearchField
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          value={search}
        />
      </div>

      <div className="member-messages-thread-list">
        {!conversations.length ? (
          <div className="member-messages-empty-state">
            <span className="material-symbols-outlined">forum</span>
            <p>{search ? "No matches found." : "No messages yet."}</p>
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
                  {item.online && <span className="member-thread-online-indicator" />}
                </div>
                <div className="member-thread-copy">
                  <div className="member-thread-head">
                    <strong>{item.name}</strong>
                    <span>{item.when}</span>
                  </div>
                  <p>{item.preview}</p>
                  <div className="member-thread-foot">
                    <span className={`member-status-pill ${status.className}`}>
                      {status.label}
                    </span>
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

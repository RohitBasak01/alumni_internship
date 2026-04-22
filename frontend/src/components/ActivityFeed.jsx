import { formatRelativeTime } from "../utils/formatters.js";

export function ActivityFeed({ items }) {
  return (
    <div className="member-feed-list">
      {items.map((item, index) => (
        <article className="member-feed-item" key={`${item.type}-${item.id || index}`}>
          <div className={`member-feed-icon ${item.type || "announcement"}`}>UP</div>
          <div className="member-feed-copy">
            <strong>{item.title}</strong>
            <p>{item.description}</p>
            <span>{formatRelativeTime(item.createdAt || new Date())}</span>
          </div>
        </article>
      ))}
      {!items.length && <p className="muted">No recent activity yet.</p>}
    </div>
  );
}

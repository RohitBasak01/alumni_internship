import { formatRelativeTime, truncateText } from "../utils/formatters.js";

export function FeedPostCard({
  post,
  isSchool,
  memberFallback,
  expanded,
  commentDraft,
  onToggleComments,
  onCommentDraftChange,
  onCommentSubmit,
  onLike,
  onViewFull,
  onReport,
  pendingLike,
  pendingComment,
  pendingReport
}) {
  return (
    <article className="alumni-post-card">
      <header className="alumni-post-card-header">
        <div className="alumni-post-author">
          <div className="alumni-post-avatar">{post.author?.initials || "AN"}</div>
          <div className="alumni-post-author-copy">
            <strong>{post.author?.name || memberFallback}</strong>
            <p>
              {[
                isSchool ? post.author?.occupation || post.author?.designation : post.author?.designation,
                isSchool ? post.author?.currentInstitution || post.author?.company : post.author?.company
              ]
                .filter(Boolean)
                .join(" at ") || memberFallback}
            </p>
            <span>
              {[
                isSchool
                  ? (post.author?.leavingYear || post.author?.batch) ? `Leaving Year ${post.author?.leavingYear || post.author?.batch}` : ""
                  : post.author?.batch ? `Batch ${post.author.batch}` : "",
                post.author?.location
              ]
                .filter(Boolean)
                .join(" | ") || formatRelativeTime(post.createdAt)}
            </span>
          </div>
        </div>
        <span className="member-status-pill status-active">{formatRelativeTime(post.createdAt)}</span>
      </header>

      <div className="alumni-post-content">
        {post.title ? <h3>{post.title}</h3> : null}
        <p>{truncateText(post.content, 280)}</p>

        {post.attachments?.length > 0 && (
          <div className="alumni-post-attachments mt-4 flex flex-wrap gap-2">
            {post.attachments.map((file, idx) => (
              <a 
                key={idx} 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-xl text-xs font-bold text-brand-700 hover:bg-brand-100 transition-all no-underline"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                <span className="truncate max-w-[150px]">{file.name}</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="alumni-post-stats">
        <span>{post.likeCount} likes</span>
        <span>{post.commentCount} comments</span>
      </div>

      <div className="alumni-post-actions">
        <button
          className={`button ${post.likedByCurrentUser ? "primary" : "secondary"}`}
          type="button"
          onClick={() => onLike(post)}
          disabled={pendingLike}
        >
          <span className="material-symbols-outlined">thumb_up</span>
          {post.likedByCurrentUser ? "Liked" : "Like"}
        </button>
        <button className="button secondary" type="button" onClick={() => onToggleComments(post._id)}>
          <span className="material-symbols-outlined">comment</span>
          Comment
        </button>
        <button className="button ghost alumni-post-inline-button" type="button" onClick={() => onViewFull(post._id)}>
          View full post
        </button>
        <button
          className="button ghost alumni-post-inline-button"
          type="button"
          onClick={() => onReport(post)}
          disabled={pendingReport || post.reportedByCurrentUser}
        >
          {post.reportedByCurrentUser ? "Reported" : "Report"}
        </button>
      </div>

      {expanded ? (
        <div className="alumni-post-comments">
          <div className="alumni-post-comment-list">
            {post.comments?.length ? (
              post.comments.map((comment) => (
                <article className="alumni-post-comment" key={comment._id}>
                  <div className="alumni-post-comment-avatar">{comment.author?.initials || "AN"}</div>
                  <div className="alumni-post-comment-body">
                    <div className="alumni-post-comment-meta">
                      <strong>{comment.author?.name || memberFallback}</strong>
                      <span>{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <p>{comment.content}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="muted">No comments yet. Start the conversation.</p>
            )}
          </div>

          <form
            className="alumni-post-comment-form"
            onSubmit={(event) => {
              event.preventDefault();
              onCommentSubmit(post._id);
            }}
          >
            <textarea
              className="textarea"
              rows="3"
              value={commentDraft}
              onChange={(event) => onCommentDraftChange(post._id, event.target.value)}
              placeholder="Write a thoughtful comment..."
            />
            <div className="alumni-post-comment-actions">
              <button className="button primary" type="submit" disabled={pendingComment}>
                Post comment
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </article>
  );
}

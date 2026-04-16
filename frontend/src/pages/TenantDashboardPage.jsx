import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { PortalMetricCard, PortalMetricGrid, PortalPageHeader } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";
import {
  addAlumniPostComment,
  createAlumniPost,
  fetchAlumni,
  fetchAlumniPost,
  fetchAlumniPosts,
  fetchAnnouncements,
  fetchEvents,
  fetchFeed,
  fetchJobs,
  fetchMentorshipRequests,
  fetchMyAlumniProfile,
  fetchNotificationSummary,
  reportAlumniPost,
  toggleAlumniPostLike
} from "../lib/api.js";

function formatCardDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diffMs = Date.now() - timestamp;
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;

  if (diffMs < minute) {
    return "Just now";
  }

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes} min ago`;
  }

  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return `${hours} hr ago`;
  }

  if (diffMs < day * 2) {
    return "Yesterday";
  }

  if (diffMs < week) {
    const days = Math.max(2, Math.floor(diffMs / day));
    return `${days} days ago`;
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function truncateText(value, maxLength = 260) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function countWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function isSafePreviewLink(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function renderInlinePreviewMarkdown(value, keyPrefix) {
  const text = String(value || "");
  const tokenRegex = /(\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\)|<u>[^<]+<\/u>|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex).filter(Boolean);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (/^\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\)$/.test(part)) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (!match) {
        return part;
      }

      const [, label, url] = match;
      if (!isSafePreviewLink(url)) {
        return label;
      }

      return (
        <a key={key} href={url} rel="noreferrer" target="_blank">
          {label}
        </a>
      );
    }

    if (/^<u>[^<]+<\/u>$/.test(part)) {
      return <u key={key}>{part.slice(3, -4)}</u>;
    }

    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (/^\*[^*]+\*$/.test(part)) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

function renderComposerPreviewBlocks(value) {
  const lines = String(value || "").split(/\r?\n/);
  const blocks = [];
  let paragraphLines = [];
  let bulletItems = [];
  let orderedItems = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    const text = paragraphLines.join(" ");
    blocks.push(
      <p key={`p-${blocks.length}`}>{renderInlinePreviewMarkdown(text, `p-${blocks.length}`)}</p>
    );
    paragraphLines = [];
  };

  const flushBulletList = () => {
    if (!bulletItems.length) {
      return;
    }

    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {bulletItems.map((item, index) => (
          <li key={`li-${blocks.length}-${index}`}>
            {renderInlinePreviewMarkdown(item, `li-${blocks.length}-${index}`)}
          </li>
        ))}
      </ul>
    );
    bulletItems = [];
  };

  const flushOrderedList = () => {
    if (!orderedItems.length) {
      return;
    }

    blocks.push(
      <ol key={`ol-${blocks.length}`}>
        {orderedItems.map((item, index) => (
          <li key={`oli-${blocks.length}-${index}`}>
            {renderInlinePreviewMarkdown(item, `oli-${blocks.length}-${index}`)}
          </li>
        ))}
      </ol>
    );
    orderedItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushBulletList();
      flushOrderedList();
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushBulletList();
      flushOrderedList();
      const headingText = trimmed.slice(2).trim();
      blocks.push(
        <h3 key={`h1-${blocks.length}`}>{renderInlinePreviewMarkdown(headingText, `h1-${blocks.length}`)}</h3>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushBulletList();
      flushOrderedList();
      const headingText = trimmed.slice(3).trim();
      blocks.push(
        <h4 key={`h2-${blocks.length}`}>{renderInlinePreviewMarkdown(headingText, `h2-${blocks.length}`)}</h4>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushBulletList();
      flushOrderedList();
      const headingText = trimmed.slice(4).trim();
      blocks.push(
        <h5 key={`h3-${blocks.length}`}>{renderInlinePreviewMarkdown(headingText, `h3-${blocks.length}`)}</h5>
      );
      return;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushBulletList();
      flushOrderedList();
      const quoteText = trimmed.slice(2).trim();
      blocks.push(
        <blockquote key={`q-${blocks.length}`}>
          {renderInlinePreviewMarkdown(quoteText, `q-${blocks.length}`)}
        </blockquote>
      );
      return;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      flushOrderedList();
      bulletItems.push(trimmed.slice(2).trim());
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      flushBulletList();
      orderedItems.push(trimmed.replace(/^\d+\.\s/, "").trim());
      return;
    }

    flushBulletList();
    flushOrderedList();
    paragraphLines.push(trimmed);
  });

  flushParagraph();
  flushBulletList();
  flushOrderedList();

  return blocks;
}

const composerFormatOptions = [
  { value: "paragraph", label: "Paragraph" },
  { value: "heading-1", label: "Heading" },
  { value: "heading-2", label: "Sub Heading" },
  { value: "heading-3", label: "Small Heading" },
  { value: "quote", label: "Quote" },
  { value: "underline", label: "Underline" }
];

const composerFontSizeOptions = [
  { value: "paragraph", label: "Body" },
  { value: "heading-1", label: "Large" },
  { value: "heading-2", label: "Medium" },
  { value: "heading-3", label: "Small" }
];

const composerToolbarTools = [
  { id: "bold", label: "Bold", icon: "format_bold" },
  { id: "italic", label: "Italic", icon: "format_italic" },
  { id: "underline", label: "Underline", icon: "format_underlined" },
  { id: "bullet", label: "Bullets", icon: "format_list_bulleted" },
  { id: "numbered", label: "Numbered list", icon: "format_list_numbered" },
  { id: "quote", label: "Quote", icon: "format_quote" },
  { id: "link", label: "Link", icon: "link" }
];

function FeedPostCard({
  post,
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
            <strong>{post.author?.name || "Alumni Member"}</strong>
            <p>
              {[post.author?.designation, post.author?.company].filter(Boolean).join(" at ") || "Alumni member"}
            </p>
            <span>
              {[post.author?.batch ? `Batch ${post.author.batch}` : "", post.author?.location].filter(Boolean).join(" | ") || formatRelativeTime(post.createdAt)}
            </span>
          </div>
        </div>
        <span className="member-status-pill status-active">{formatRelativeTime(post.createdAt)}</span>
      </header>

      <div className="alumni-post-content">
        {post.title ? <h3>{post.title}</h3> : null}
        <p>{truncateText(post.content, 280)}</p>
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
                      <strong>{comment.author?.name || "Alumni Member"}</strong>
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

function TenantDashboardPage() {
  const tenant = useTenantContext();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isAlumni = auth.user?.role === "alumni";
  const [composer, setComposer] = useState({ title: "", content: "" });
  const [composerMode, setComposerMode] = useState("write");
  const [composerDraftSavedAt, setComposerDraftSavedAt] = useState("");
  const [composerDraftNotice, setComposerDraftNotice] = useState("");
  const [composerFormatValue, setComposerFormatValue] = useState("paragraph");
  const [composerFontSizeValue, setComposerFontSizeValue] = useState("paragraph");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const composerTextareaRef = useRef(null);
  const restoredDraftRef = useRef(false);

  const alumniQuery = useQuery({ queryKey: ["alumni"], queryFn: fetchAlumni });
  const announcementsQuery = useQuery({ queryKey: ["announcements"], queryFn: fetchAnnouncements });
  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const jobsQuery = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const feedQuery = useQuery({ queryKey: ["feed"], queryFn: fetchFeed });
  const notificationsQuery = useQuery({ queryKey: ["notification-summary"], queryFn: fetchNotificationSummary });
  const postsQuery = useQuery({
    queryKey: ["alumni-posts"],
    queryFn: fetchAlumniPosts,
    enabled: isAlumni
  });
  const profileQuery = useQuery({
    queryKey: ["my-alumni-profile"],
    queryFn: fetchMyAlumniProfile,
    enabled: isAlumni
  });
  const mentorshipQuery = useQuery({
    queryKey: ["mentorship-requests"],
    queryFn: fetchMentorshipRequests,
    enabled: isAlumni
  });
  const fullPostQuery = useQuery({
    queryKey: ["alumni-post", selectedPostId],
    queryFn: () => fetchAlumniPost(selectedPostId),
    enabled: Boolean(selectedPostId)
  });

  const createPostMutation = useMutation({
    mutationFn: createAlumniPost,
    onSuccess: () => {
      setComposer({ title: "", content: "" });
      setComposerDraftSavedAt("");
      setComposerDraftNotice("Published");
      localStorage.removeItem(composerDraftKey);
      queryClient.invalidateQueries({ queryKey: ["alumni-posts"] });
    }
  });

  const likeMutation = useMutation({
    mutationFn: toggleAlumniPostLike,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni-posts"] });
      if (selectedPostId) {
        queryClient.invalidateQueries({ queryKey: ["alumni-post", selectedPostId] });
      }
    }
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, payload }) => addAlumniPostComment(id, payload),
    onSuccess: (_, variables) => {
      setCommentDrafts((current) => ({ ...current, [variables.id]: "" }));
      queryClient.invalidateQueries({ queryKey: ["alumni-posts"] });
      queryClient.invalidateQueries({ queryKey: ["alumni-post", variables.id] });
    }
  });

  const reportMutation = useMutation({
    mutationFn: ({ id, payload }) => reportAlumniPost(id, payload),
    onSuccess: () => {
      setReportReason("");
      setReportTarget(null);
      queryClient.invalidateQueries({ queryKey: ["alumni-posts"] });
      if (selectedPostId) {
        queryClient.invalidateQueries({ queryKey: ["alumni-post", selectedPostId] });
      }
    }
  });

  const alumni = alumniQuery.data || [];
  const jobs = jobsQuery.data || [];
  const events = eventsQuery.data || [];
  const announcements = announcementsQuery.data || [];
  const feedItems = feedQuery.data || [];
  const posts = postsQuery.data || [];
  const profile = profileQuery.data;
  const mentorshipRequests = mentorshipQuery.data || [];
  const dashboardName = auth.user?.name || "Portal User";
  const firstName = dashboardName.split(" ")[0] || "Member";
  const locationLabel = profile?.location || "Location not set";
  const roleLabel = profile?.designation || profile?.occupation || tenant.communityLabels.memberSingular;
  const companyLabel = profile?.company || profile?.currentInstitution || tenant.displayName;
  const composerDraftKey = useMemo(
    () => `alumni-composer-draft:${tenant.slug || tenant.displayName}:${auth.user?.id || "guest"}`,
    [auth.user?.id, tenant.displayName, tenant.slug]
  );
  const composerWordCount = useMemo(() => countWords(composer.content), [composer.content]);
  const composerReadTime = Math.max(1, Math.ceil(composerWordCount / 200));
  const sameBatchCount = alumni.filter((item) => item.batch === profile?.batch).length;
  const sameCompanyCount = alumni.filter(
    (item) => item.company && profile?.company && item.company === profile.company
  ).length;
  const recommendedConnections = alumni.filter((item) => item.userId !== auth.user?.id).slice(0, 4);
  const activityFeed = [
    ...feedItems.slice(0, 2),
    ...events.slice(0, 1).map((item) => ({
      id: item._id,
      type: "event",
      title: item.title,
      description: `${item.location || "Campus venue"} - ${formatCardDate(item.eventDate)}`,
      createdAt: item.createdAt
    })),
    ...jobs.slice(0, 1).map((item) => ({
      id: item._id,
      type: "job",
      title: item.title,
      description: `${item.company} - Career opportunity`,
      createdAt: item.createdAt
    }))
  ].slice(0, 4);

  useEffect(() => {
    if (!isAlumni || restoredDraftRef.current) {
      return;
    }

    try {
      const stored = localStorage.getItem(composerDraftKey);
      if (!stored) {
        restoredDraftRef.current = true;
        return;
      }

      const parsed = JSON.parse(stored);
      const nextTitle = String(parsed?.title || "");
      const nextContent = String(parsed?.content || "");

      if (!nextTitle && !nextContent) {
        restoredDraftRef.current = true;
        return;
      }

      setComposer({ title: nextTitle, content: nextContent });
      setComposerDraftSavedAt(String(parsed?.updatedAt || ""));
      setComposerDraftNotice("Draft restored");
    } catch {
      setComposerDraftNotice("Draft could not be restored");
    } finally {
      restoredDraftRef.current = true;
    }
  }, [composerDraftKey, isAlumni]);

  useEffect(() => {
    if (!composerDraftNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setComposerDraftNotice(""), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [composerDraftNotice]);

  const trendingTopics = useMemo(() => {
    const tokens = new Map();

    posts.forEach((post) => {
      `${post.title || ""} ${post.content || ""}`
        .toLowerCase()
        .split(/[^a-z0-9+#]+/i)
        .filter((value) => value.length >= 5)
        .forEach((value) => {
          tokens.set(value, (tokens.get(value) || 0) + 1);
        });
    });

    return [...tokens.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([token]) => token);
  }, [posts]);

  function handleComposerChange(field, value) {
    setComposer((current) => ({ ...current, [field]: value }));
  }

  function updateComposerContent(value, nextSelectionStart, nextSelectionEnd) {
    setComposer((current) => ({ ...current, content: value }));
    window.requestAnimationFrame(() => {
      if (!composerTextareaRef.current) {
        return;
      }

      composerTextareaRef.current.focus();
      composerTextareaRef.current.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
  }

  function applyComposerLinePrefix(prefix) {
    if (!composerTextareaRef.current) {
      return;
    }

    const input = composerTextareaRef.current;
    const value = composer.content;
    const selectionStart = input.selectionStart;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEndIndex = value.indexOf("\n", selectionStart);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const line = value.slice(lineStart, lineEnd);
    const normalizedLine = line.replace(/^(## |> |- )/, "");
    const nextLine = `${prefix}${normalizedLine}`;
    const nextValue = `${value.slice(0, lineStart)}${nextLine}${value.slice(lineEnd)}`;
    const cursorOffset = prefix.length + Math.max(0, selectionStart - lineStart - (line.length - normalizedLine.length));
    const nextCursor = lineStart + Math.min(nextLine.length, cursorOffset);

    updateComposerContent(nextValue, nextCursor, nextCursor);
  }

  function wrapComposerSelection(before, after = before, fallback = "") {
    if (!composerTextareaRef.current) {
      return;
    }

    const input = composerTextareaRef.current;
    const value = composer.content;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    const selected = value.slice(selectionStart, selectionEnd);
    const replacement = `${before}${selected || fallback}${after}`;
    const nextValue = `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`;
    const contentStart = selectionStart + before.length;
    const contentEnd = contentStart + (selected || fallback).length;

    updateComposerContent(nextValue, contentStart, contentEnd);
  }

  function handleComposerFormat(type) {
    if (!composerTextareaRef.current) {
      return;
    }

    const input = composerTextareaRef.current;
    const value = composer.content;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    const selected = value.slice(selectionStart, selectionEnd);

    if (type === "bold") {
      wrapComposerSelection("**", "**", "bold text");
      return;
    }

    if (type === "italic") {
      wrapComposerSelection("*", "*", "italic text");
      return;
    }

    if (type === "underline") {
      wrapComposerSelection("<u>", "</u>", "underlined text");
      return;
    }

    if (type === "link") {
      const replacement = `[${selected || "link text"}](https://)`;
      const nextValue = `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`;
      const cursorStart = selectionStart + replacement.indexOf("https://");
      const cursorEnd = cursorStart + "https://".length;
      updateComposerContent(nextValue, cursorStart, cursorEnd);
      return;
    }

    const linePrefix =
      type === "heading-1"
        ? "# "
        : type === "heading-2"
          ? "## "
          : type === "heading-3"
            ? "### "
            : type === "quote"
              ? "> "
              : type === "bullet"
                ? "- "
                : type === "numbered"
                  ? "1. "
                  : "";
    applyComposerLinePrefix(linePrefix);
  }

  function handleComposerFormatMenuChange(event) {
    const nextValue = event.target.value;
    setComposerFormatValue(nextValue);
    if (nextValue === "paragraph") {
      applyComposerLinePrefix("");
      return;
    }

    handleComposerFormat(nextValue);
  }

  function handleComposerFontSizeChange(event) {
    const nextValue = event.target.value;
    setComposerFontSizeValue(nextValue);
    if (nextValue === "paragraph") {
      applyComposerLinePrefix("");
      return;
    }

    handleComposerFormat(nextValue);
  }

  function handleSaveComposerDraft() {
    try {
      const payload = {
        title: composer.title,
        content: composer.content,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(composerDraftKey, JSON.stringify(payload));
      setComposerDraftSavedAt(payload.updatedAt);
      setComposerDraftNotice("Draft saved");
    } catch {
      setComposerDraftNotice("Draft could not be saved");
    }
  }

  function handleCreatePost(event) {
    event.preventDefault();
    const title = composer.title.trim();
    const content = composer.content.trim();

    if (content.length < 10) {
      return;
    }

    createPostMutation.mutate({
      title,
      content
    });
  }

  function handleComposerKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      handleCreatePost(event);
    }
  }

  function handleToggleComments(postId) {
    setExpandedComments((current) => ({
      ...current,
      [postId]: !current[postId]
    }));
  }

  function handleCommentDraftChange(postId, value) {
    setCommentDrafts((current) => ({
      ...current,
      [postId]: value
    }));
  }

  function handleCommentSubmit(postId) {
    const content = (commentDrafts[postId] || "").trim();

    if (!content) {
      return;
    }

    commentMutation.mutate({
      id: postId,
      payload: { content }
    });
  }

  function handleReportSubmit(event) {
    event.preventDefault();

    if (!reportTarget || !reportReason.trim()) {
      return;
    }

    reportMutation.mutate({
      id: reportTarget._id,
      payload: { reason: reportReason.trim() }
    });
  }

  if (isAlumni) {
    const fullPost = fullPostQuery.data;

    return (
      <div className="member-home alumni-feed-page">
        <PortalPageHeader
          title={`Welcome back, ${firstName}`}
          subtitle="Your alumni home now works like a professional community feed, with conversations, reactions, and thoughtful updates from people across your network."
          actions={
            <>
              <Link className="button secondary" to="/portal/alumni">
                Discover alumni
              </Link>
              <Link className="button primary" to="/portal/profile?mode=edit">
                Refine profile
              </Link>
            </>
          }
        />

        <PortalMetricGrid>
          <PortalMetricCard icon="FD" title="Feed Posts" trend="Live" value={posts.length} />
          <PortalMetricCard icon="NW" title="Network Size" trend="Growing" value={alumni.length} />
          <PortalMetricCard icon="BT" title="Same Batch" trend="Relevant" value={sameBatchCount} />
          <PortalMetricCard
            icon="RQ"
            title="Accepted Mentorships"
            trend="Active"
            value={mentorshipRequests.filter((item) => item.status === "accepted").length}
          />
        </PortalMetricGrid>

        <section className="alumni-feed-layout">
          <div className="alumni-feed-main">
            <SectionCard
              title="Share an update"
              subtitle="Post wins, reflections, opportunities, or questions to the alumni community."
            >
              <form className="alumni-composer" onSubmit={handleCreatePost}>
                <div className="member-profile-spotlight-top alumni-composer-head">
                  <div className="member-profile-avatar-large alumni-composer-avatar">{dashboardName.slice(0, 1)}</div>
                  <div>
                    <strong>{dashboardName}</strong>
                    <p className="muted">{roleLabel} at {companyLabel}</p>
                  </div>
                </div>
                <div className="alumni-editor-shell">
                  <div className="alumni-editor-topbar">
                    <div className="alumni-editor-topbar-copy">
                      <strong>Post editor</strong>
                      <span>Document-style composer with quick formatting controls.</span>
                    </div>
                    <div className="alumni-editor-mode-tabs" role="tablist" aria-label="Composer mode">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={composerMode === "write"}
                        className={composerMode === "write" ? "alumni-editor-tab active" : "alumni-editor-tab"}
                        onClick={() => setComposerMode("write")}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={composerMode === "preview"}
                        className={composerMode === "preview" ? "alumni-editor-tab active" : "alumni-editor-tab"}
                        onClick={() => setComposerMode("preview")}
                      >
                        Preview
                      </button>
                    </div>
                  </div>

                  {composerMode === "write" ? (
                    <>
                      <div className="alumni-editor-toolbar" role="toolbar" aria-label="Formatting tools">
                        <div className="alumni-editor-toolbar-group">
                          <label className="alumni-editor-menu">
                            <span className="alumni-editor-menu-label">Formats</span>
                            <select className="alumni-editor-select alumni-editor-select-menu" onChange={handleComposerFormatMenuChange} value={composerFormatValue}>
                              {composerFormatOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="alumni-editor-menu">
                            <span className="alumni-editor-menu-label">Font Sizes</span>
                            <select className="alumni-editor-select alumni-editor-select-menu" onChange={handleComposerFontSizeChange} value={composerFontSizeValue}>
                              {composerFontSizeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="alumni-editor-toolbar-divider" />

                        <div className="alumni-editor-toolbar-group">
                          {composerToolbarTools.map((tool) => (
                            <button
                              key={tool.id}
                              className="alumni-editor-tool icon-only"
                              type="button"
                              onClick={() => handleComposerFormat(tool.id)}
                              title={tool.label}
                              aria-label={tool.label}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">{tool.icon}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="alumni-editor-document">
                        <div className="alumni-editor-document-meta">
                          <span>Untitled post</span>
                          <span>{composerWordCount} words</span>
                        </div>
                        <input
                          className="alumni-editor-title"
                          value={composer.title}
                          onChange={(event) => handleComposerChange("title", event.target.value)}
                          placeholder="Optional headline"
                        />

                        <textarea
                          ref={composerTextareaRef}
                          className="textarea alumni-composer-textarea"
                          value={composer.content}
                          onChange={(event) => handleComposerChange("content", event.target.value)}
                          onKeyDown={handleComposerKeydown}
                          placeholder="Start writing your update here. Use the toolbar to format it like a document."
                          rows="10"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="alumni-editor-preview" role="region" aria-label="Post preview">
                      {composer.title ? <h3>{composer.title}</h3> : null}
                      {composer.content.trim() ? (
                        <div className="alumni-editor-preview-markdown">{renderComposerPreviewBlocks(composer.content)}</div>
                      ) : (
                        <p className="muted">Nothing to preview yet. Start writing in the editor.</p>
                      )}
                    </div>
                  )}

                  <div className="alumni-composer-actions alumni-editor-statusbar">
                    <div className="alumni-editor-status-copy">
                      <span>{composerWordCount} words</span>
                      <span>{composerReadTime} min read</span>
                      <span>{composerDraftSavedAt ? `Saved ${formatRelativeTime(composerDraftSavedAt)}` : "Draft not saved"}</span>
                      {composerDraftNotice ? <span>{composerDraftNotice}</span> : null}
                    </div>
                    <div className="alumni-editor-cta-group">
                      <button className="button secondary" type="button" onClick={handleSaveComposerDraft}>
                        Save draft
                      </button>
                      <button
                        className="button primary"
                        type="submit"
                        disabled={createPostMutation.isPending || composer.content.trim().length < 10}
                      >
                        {createPostMutation.isPending ? "Publishing..." : "Publish post"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </SectionCard>

            <SectionCard
              title="Alumni feed"
              subtitle="Updates, questions, wins, and opportunities posted by your community."
              action={<button className="button ghost" type="button" onClick={() => postsQuery.refetch()}>Refresh</button>}
            >
              <div className="alumni-post-stack">
                {posts.map((post) => (
                  <FeedPostCard
                    key={post._id}
                    post={post}
                    expanded={Boolean(expandedComments[post._id])}
                    commentDraft={commentDrafts[post._id] || ""}
                    onToggleComments={handleToggleComments}
                    onCommentDraftChange={handleCommentDraftChange}
                    onCommentSubmit={handleCommentSubmit}
                    onLike={() => likeMutation.mutate(post._id)}
                    onViewFull={setSelectedPostId}
                    onReport={setReportTarget}
                    pendingLike={likeMutation.isPending}
                    pendingComment={commentMutation.isPending}
                    pendingReport={reportMutation.isPending}
                  />
                ))}

                {!posts.length && !postsQuery.isLoading ? (
                  <div className="alumni-feed-empty">
                    <span className="material-symbols-outlined">forum</span>
                    <strong>No alumni posts yet</strong>
                    <p>Be the first person to kick off the conversation for {tenant.displayName}.</p>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <aside className="alumni-feed-sidebar">
            <SectionCard title="Your spotlight" subtitle="Profile summary">
              <div className="alumni-feed-sidebar-card">
                <div className="member-profile-avatar alumni-feed-sidebar-avatar">{dashboardName.slice(0, 1)}</div>
                <div className="alumni-feed-sidebar-copy">
                  <strong>{dashboardName}</strong>
                  <p>{roleLabel}</p>
                  <span>{locationLabel}</span>
                </div>
              </div>
              <div className="member-profile-meta-grid alumni-feed-sidebar-meta">
                <article>
                  <span>Organization</span>
                  <strong>{companyLabel}</strong>
                </article>
                <article>
                  <span>Department</span>
                  <strong>{profile?.department || "Not set"}</strong>
                </article>
              </div>
            </SectionCard>

            <SectionCard title="Trending topics" subtitle="What people are discussing">
              <div className="member-chip-cloud">
                {trendingTopics.length ? (
                  trendingTopics.map((topic) => <span className="member-chip-pill" key={topic}>#{topic}</span>)
                ) : (
                  <p className="muted">Trending topics will appear once alumni start posting more often.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Recommended connections" subtitle="People to reconnect with">
              <div className="member-people-list">
                {recommendedConnections.map((item) => (
                  <article className="member-person-card alumni-feed-sidebar-person" key={item._id}>
                    <div className="member-person-avatar">{item.name.slice(0, 1)}</div>
                    <div className="member-person-copy">
                      <strong>{item.name}</strong>
                      <p>{item.designation || tenant.communityLabels.memberSingular}</p>
                      <span>{item.company || item.location || tenant.displayName}</span>
                    </div>
                  </article>
                ))}
                {!recommendedConnections.length ? <p className="muted">No recommendations available yet.</p> : null}
              </div>
            </SectionCard>

            <SectionCard title="Community pulse" subtitle="Quick highlights">
              <div className="member-feed-list">
                <article className="member-feed-item">
                  <div className="member-feed-icon">EV</div>
                  <div className="member-feed-copy">
                    <strong>{events.filter((item) => item.isRegistered).length} upcoming RSVP(s)</strong>
                    <p>Your saved events stay visible here.</p>
                    <span>{events.length} event(s) published</span>
                  </div>
                </article>
                <article className="member-feed-item">
                  <div className="member-feed-icon">RQ</div>
                  <div className="member-feed-copy">
                    <strong>{notificationsQuery.data?.pendingMentorshipRequests || 0} pending request(s)</strong>
                    <p>Respond quickly to keep the network warm.</p>
                    <span>{mentorshipRequests.length} mentorship thread(s)</span>
                  </div>
                </article>
              </div>
            </SectionCard>
          </aside>
        </section>

        {selectedPostId ? (
          <div className="member-dialog-backdrop" role="presentation" onClick={() => setSelectedPostId("") }>
            <div className="member-dialog alumni-post-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="member-dialog-header alumni-post-dialog-header">
                <div>
                  <span className="eyebrow">Full post</span>
                  <h3>{fullPost?.title || "Post details"}</h3>
                </div>
                <button className="member-dialog-close" type="button" onClick={() => setSelectedPostId("") }>
                  Close
                </button>
              </div>

              {fullPostQuery.isLoading ? (
                <p className="muted">Loading post...</p>
              ) : fullPost ? (
                <>
                  <div className="alumni-post-author alumni-post-dialog-author">
                    <div className="alumni-post-avatar">{fullPost.author?.initials || "AN"}</div>
                    <div className="alumni-post-author-copy">
                      <strong>{fullPost.author?.name || "Alumni Member"}</strong>
                      <p>
                        {[fullPost.author?.designation, fullPost.author?.company].filter(Boolean).join(" at ") || "Alumni member"}
                      </p>
                      <span>{formatRelativeTime(fullPost.createdAt)}</span>
                    </div>
                  </div>
                  <div className="alumni-post-dialog-body">
                    <p>{fullPost.content}</p>
                  </div>
                  <div className="alumni-post-stats">
                    <span>{fullPost.likeCount} likes</span>
                    <span>{fullPost.commentCount} comments</span>
                  </div>
                  <div className="alumni-post-dialog-comments">
                    <strong>Comments</strong>
                    {fullPost.comments?.length ? (
                      <div className="alumni-post-comment-list">
                        {fullPost.comments.map((comment) => (
                          <article className="alumni-post-comment" key={comment._id}>
                            <div className="alumni-post-comment-avatar">{comment.author?.initials || "AN"}</div>
                            <div className="alumni-post-comment-body">
                              <div className="alumni-post-comment-meta">
                                <strong>{comment.author?.name || "Alumni Member"}</strong>
                                <span>{formatRelativeTime(comment.createdAt)}</span>
                              </div>
                              <p>{comment.content}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">No comments yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="muted">Unable to load this post right now.</p>
              )}
            </div>
          </div>
        ) : null}

        {reportTarget ? (
          <div className="member-dialog-backdrop" role="presentation" onClick={() => setReportTarget(null)}>
            <form className="member-dialog alumni-post-dialog alumni-report-dialog" onSubmit={handleReportSubmit} onClick={(event) => event.stopPropagation()}>
              <div className="member-dialog-header alumni-post-dialog-header">
                <div>
                  <span className="eyebrow">Report post</span>
                  <h3>{reportTarget.title || "Help us review this post"}</h3>
                </div>
                <button className="member-dialog-close" type="button" onClick={() => setReportTarget(null)}>
                  Close
                </button>
              </div>
              <p className="muted">Tell the institute team why this post should be reviewed.</p>
              <textarea
                className="textarea alumni-composer-textarea"
                rows="5"
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                placeholder="Example: Spam, harmful content, harassment, or misleading opportunity"
              />
              <div className="alumni-composer-actions">
                <span className="muted">Reports are private and only visible to moderators.</span>
                <button className="button primary" type="submit" disabled={reportMutation.isPending || reportReason.trim().length < 5}>
                  {reportMutation.isPending ? "Sending..." : "Submit report"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <PortalPageHeader
        title="Institute Overview"
        subtitle="A calmer, cleaner summary of registrations, jobs, events, and member activity across your portal."
      />

      <PortalMetricGrid>
        <PortalMetricCard icon="AL" title="Total Alumni" trend="Growing" value={alumni.length.toLocaleString()} />
        <PortalMetricCard icon="NR" title="Pending Registrations" trend="Action" value={notificationsQuery.data?.pendingAlumniInvites || 0} />
        <PortalMetricCard icon="JB" title="Active Jobs" trend="Current" value={jobs.length} />
        <PortalMetricCard icon="EV" title="Upcoming Events" trend="Scheduled" value={events.length} />
      </PortalMetricGrid>

      <section className="member-content-grid">
        <SectionCard title="Recent activity" subtitle="Portal feed">
          <div className="member-feed-list">
            {feedItems.slice(0, 5).map((item, index) => (
              <article className="member-feed-item" key={`${item.type}-${item.id || index}`}>
                <div className={`member-feed-icon ${item.type || "announcement"}`}>UP</div>
                <div className="member-feed-copy">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <span>{formatRelativeTime(item.createdAt || new Date())}</span>
                </div>
              </article>
            ))}
            {!feedItems.length ? <p className="muted">No recent activity yet.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Current highlights" subtitle="At a glance">
          <div className="member-profile-meta-grid admin-highlights-grid">
            <article>
              <span>Announcements</span>
              <strong>{announcements.length}</strong>
            </article>
            <article>
              <span>Upcoming events</span>
              <strong>{events.length}</strong>
            </article>
            <article>
              <span>Open jobs</span>
              <strong>{jobs.length}</strong>
            </article>
            <article>
              <span>Tenant</span>
              <strong>{tenant.displayName}</strong>
            </article>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

export default TenantDashboardPage;

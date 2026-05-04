/**
 * Shared utility functions for the alumni chat portal.
 * Centralizes helpers previously duplicated across MentorshipChat, MessageBubble, and MentorshipPage.
 */

/**
 * Converts a full name to 1-2 uppercase initials.
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??"
  );
}

/**
 * Returns a human-friendly date label for a given timestamp.
 * Used for intra-stream date separators.
 * @param {Date|string} date
 * @returns {string} e.g. "Today", "Yesterday", "Apr 30"
 */
export function formatChatDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const messageDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (messageDay.getTime() === todayStart.getTime()) return "Today";
  if (messageDay.getTime() === yesterdayStart.getTime()) return "Yesterday";

  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Annotates a flat list of messages with grouping metadata.
 * Consecutive messages from the same sender within 5 minutes are "grouped",
 * meaning they share the same avatar/name block — only the first shows it.
 *
 * @param {Array<object>} messages
 * @returns {Array<object>} Same messages with added `isGroupStart`, `isGroupEnd`, `dateLabel` fields.
 */
export function groupConsecutiveMessages(messages) {
  if (!messages || !messages.length) return [];

  return messages.map((message, index) => {
    const prev = messages[index - 1] || null;
    const next = messages[index + 1] || null;

    const senderId = String(
      message.sender?._id || message.senderId?._id || message.senderId || ""
    );
    const prevSenderId = prev
      ? String(prev.sender?._id || prev.senderId?._id || prev.senderId || "")
      : null;
    const nextSenderId = next
      ? String(next.sender?._id || next.senderId?._id || next.senderId || "")
      : null;

    const messageTime = new Date(message.sentAt || message.createdAt || 0).getTime();
    const prevTime = prev
      ? new Date(prev.sentAt || prev.createdAt || 0).getTime()
      : 0;
    const nextTime = next
      ? new Date(next.sentAt || next.createdAt || 0).getTime()
      : 0;

    const FIVE_MINUTES = 5 * 60 * 1000;

    // A message is the start of a group if the previous message was from
    // a different sender OR more than 5 minutes ago.
    const isGroupStart =
      !prev ||
      prevSenderId !== senderId ||
      messageTime - prevTime > FIVE_MINUTES;

    // A message is the end of a group if the next message is from
    // a different sender OR more than 5 minutes later.
    const isGroupEnd =
      !next ||
      nextSenderId !== senderId ||
      nextTime - messageTime > FIVE_MINUTES;

    // Date separator: show a separator before this message if it's a different
    // calendar day from the previous message.
    const messageDate = formatChatDate(messageTime);
    const prevDate = prev ? formatChatDate(prevTime) : null;
    const dateLabel = !prev || messageDate !== prevDate ? messageDate : null;

    return { ...message, isGroupStart, isGroupEnd, dateLabel };
  });
}

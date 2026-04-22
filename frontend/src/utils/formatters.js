export function formatCardDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";

  const diffMs = Date.now() - timestamp;
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} min ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))} hr ago`;
  if (diffMs < day * 2) return "Yesterday";
  if (diffMs < week) return `${Math.max(2, Math.floor(diffMs / day))} days ago`;

  return formatCardDate(value);
}

export function truncateText(value, maxLength = 260) {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

export function countWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

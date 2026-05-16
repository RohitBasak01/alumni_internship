import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBirthdays, fetchWorkAnniversaries, sendCelebrationWish } from "../lib/api.js";

/* ── Styles (scoped) ─────────────────────────────────── */
const S = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  card: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "1rem 1.25rem 0.75rem",
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "#0f172a",
  },
  cardHeaderIcon: {
    fontSize: 20,
    borderRadius: "8px",
    padding: "0.3rem",
    color: "white",
  },
  scrollRow: {
    display: "flex",
    gap: "0.75rem",
    padding: "0 1.25rem 1.25rem",
    overflowX: "auto",
    scrollbarWidth: "none",
  },
  personCard: {
    minWidth: "150px",
    maxWidth: "150px",
    background: "#f8fafc",
    border: "1px solid #f1f5f9",
    borderRadius: "12px",
    padding: "1rem 0.75rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    textAlign: "center",
    flexShrink: 0,
  },
  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  avatarPlaceholder: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: "1.1rem",
    color: "white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  name: {
    fontWeight: 700,
    fontSize: "0.82rem",
    color: "#1e293b",
    lineHeight: 1.3,
  },
  sub: {
    fontSize: "0.7rem",
    color: "#94a3b8",
    fontWeight: 600,
  },
  wishBtn: {
    padding: "0.3rem 0.6rem",
    borderRadius: "8px",
    border: "none",
    fontSize: "0.7rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    transition: "all 120ms",
    fontFamily: "inherit",
  },
  emptyText: {
    padding: "0.75rem 1.25rem 1.25rem",
    fontSize: "0.82rem",
    color: "#94a3b8",
    fontStyle: "italic",
  },
  todayHighlight: {
    background: "linear-gradient(135deg, #fef3c7, #fffbeb)",
    border: "1px solid #fde68a",
  },
};

const AVATAR_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6"];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatBirthday(dob) {
  if (!dob) return "";
  const d = new Date(dob);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PersonChip({ person, type, onWish, wished }) {
  const initial = (person.name || "?")[0].toUpperCase();
  const bg = getColor(person.name);

  return (
    <div style={{ ...S.personCard, ...(type === "today" ? S.todayHighlight : {}) }}>
      {person.profilePhotoUrl ? (
        <img src={person.profilePhotoUrl} alt={person.name} style={S.avatar} />
      ) : (
        <div style={{ ...S.avatarPlaceholder, background: bg }}>{initial}</div>
      )}
      <div style={S.name}>{person.name}</div>
      <div style={S.sub}>
        {type === "birthday" || type === "today"
          ? `🎂 ${formatBirthday(person.dateOfBirth)}`
          : `🎉 ${person.years} year${person.years !== 1 ? "s" : ""}`
        }
        {person.batch ? ` · Batch ${person.batch}` : ""}
      </div>
      <button
        style={{
          ...S.wishBtn,
          background: wished ? "#e2e8f0" : type === "anniversary" ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "linear-gradient(135deg, #f59e0b, #d97706)",
          color: wished ? "#64748b" : "white",
        }}
        onClick={() => onWish(person, type === "anniversary" ? "anniversary" : "birthday")}
        disabled={wished}
      >
        {wished ? "✓ Sent" : "🎉 Send Wish"}
      </button>
    </div>
  );
}

export default function CelebrationWidget() {
  const queryClient = useQueryClient();
  const [wishedIds, setWishedIds] = useState(new Set());

  const birthdayQuery = useQuery({
    queryKey: ["celebrations-birthdays"],
    queryFn: fetchBirthdays,
    staleTime: 5 * 60 * 1000,
  });

  const anniversaryQuery = useQuery({
    queryKey: ["celebrations-anniversaries"],
    queryFn: fetchWorkAnniversaries,
    staleTime: 5 * 60 * 1000,
  });

  const wishMut = useMutation({
    mutationFn: sendCelebrationWish,
    onSuccess: (_, variables) => {
      setWishedIds(prev => new Set(prev).add(variables.recipientId));
    }
  });

  function handleWish(person, type) {
    wishMut.mutate({ recipientId: person.userId, type });
  }

  const todayBirthdays = birthdayQuery.data?.today || [];
  const upcomingBirthdays = birthdayQuery.data?.upcoming || [];
  const anniversaries = anniversaryQuery.data || [];

  const hasBirthdays = todayBirthdays.length > 0 || upcomingBirthdays.length > 0;
  const hasAnniversaries = anniversaries.length > 0;

  if (!hasBirthdays && !hasAnniversaries) return null;

  return (
    <div style={S.root}>
      {/* Today's Birthdays */}
      {todayBirthdays.length > 0 && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span className="material-symbols-outlined" style={{ ...S.cardHeaderIcon, background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>cake</span>
            Today's Birthdays 🎂
          </div>
          <div style={S.scrollRow}>
            {todayBirthdays.map(p => (
              <PersonChip key={p._id} person={p} type="today" onWish={handleWish} wished={wishedIds.has(p.userId)} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Birthdays */}
      {upcomingBirthdays.length > 0 && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span className="material-symbols-outlined" style={{ ...S.cardHeaderIcon, background: "linear-gradient(135deg, #ec4899, #be185d)" }}>calendar_today</span>
            Upcoming Birthdays
          </div>
          <div style={S.scrollRow}>
            {upcomingBirthdays.map(p => (
              <PersonChip key={p._id} person={p} type="birthday" onWish={handleWish} wished={wishedIds.has(p.userId)} />
            ))}
          </div>
        </div>
      )}

      {/* Work Anniversaries */}
      {hasAnniversaries && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span className="material-symbols-outlined" style={{ ...S.cardHeaderIcon, background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>workspace_premium</span>
            Work Anniversaries This Month
          </div>
          <div style={S.scrollRow}>
            {anniversaries.map(p => (
              <PersonChip key={p._id} person={p} type="anniversary" onWish={handleWish} wished={wishedIds.has(p.userId)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

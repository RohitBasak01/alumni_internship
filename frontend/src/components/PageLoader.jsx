const shimmerKeyframes = `
@keyframes page-loader-shimmer {
  0% { opacity: 0.45; }
  50% { opacity: 0.85; }
  100% { opacity: 0.45; }
}
`;

const barStyle = (width, height = "1rem", delay = "0s") => ({
  width,
  height,
  borderRadius: "8px",
  background: "rgba(20,33,61,0.07)",
  animation: `page-loader-shimmer 1.6s ease-in-out ${delay} infinite`,
});

function PageLoader({ label = "Loading..." }) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        width: "min(720px, 100%)",
        margin: "3rem auto",
        padding: "2.5rem 2rem",
        display: "grid",
        gap: "1.8rem",
      }}
    >
      <style>{shimmerKeyframes}</style>

      {/* Header skeleton */}
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <div style={barStyle("35%", "0.65rem")} />
        <div style={barStyle("55%", "1.75rem")} />
        <div style={barStyle("42%", "0.85rem", "0.15s")} />
      </div>

      {/* Metric cards skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              padding: "1.25rem",
              borderRadius: "18px",
              border: "1px solid rgba(20,33,61,0.06)",
              background: "rgba(255,255,255,0.9)",
              display: "grid",
              gap: "0.6rem",
            }}
          >
            <div style={barStyle("50%", "0.6rem", `${i * 0.1}s`)} />
            <div style={barStyle("70%", "1.4rem", `${i * 0.1 + 0.05}s`)} />
            <div style={barStyle("40%", "0.55rem", `${i * 0.1 + 0.1}s`)} />
          </div>
        ))}
      </div>

      {/* Content block skeleton */}
      <div
        style={{
          padding: "1.5rem",
          borderRadius: "18px",
          border: "1px solid rgba(20,33,61,0.06)",
          background: "rgba(255,255,255,0.9)",
          display: "grid",
          gap: "0.7rem",
        }}
      >
        <div style={barStyle("30%", "0.7rem")} />
        <div style={barStyle("100%", "0.6rem", "0.1s")} />
        <div style={barStyle("92%", "0.6rem", "0.15s")} />
        <div style={barStyle("85%", "0.6rem", "0.2s")} />
        <div style={barStyle("60%", "0.6rem", "0.25s")} />
      </div>

      {/* Screen reader text */}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default PageLoader;

function SectionCard({ title, subtitle, children, action, className = "", ...props }) {
  return (
    <section className={`section-card ${className}`.trim()} {...props}>
      <div className="section-card-header">
        <div>
          {subtitle ? <p className="section-card-eyebrow">{subtitle}</p> : null}
          <h3 className="section-card-title">{title}</h3>
        </div>
        {action}
      </div>
      <div className="section-card-body">{children}</div>
    </section>
  );
}

export default SectionCard;

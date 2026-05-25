import PropTypes from "prop-types";

function SectionCard({
  title,
  subtitle,
  children,
  action,
  tone = "brand",
  variant = "default",
  className = "",
  ...props
}) {
  return (
    <section className={`section-card section-card--${variant} section-card--${tone} ${className}`.trim()} {...props}>
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

SectionCard.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  children: PropTypes.node.isRequired,
  action: PropTypes.node,
  tone: PropTypes.oneOf(["brand", "violet", "teal", "coral", "amber", "cyan", "emerald", "rose"]),
  variant: PropTypes.oneOf(["default", "vibrant", "flat"]),
  className: PropTypes.string,
};

export default SectionCard;

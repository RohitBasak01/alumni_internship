import PropTypes from "prop-types";

function PortalPageHeader({
  title,
  subtitle,
  actions = null,
  eyebrow = "Workspace",
  tone = "brand",
  className = "",
}) {
  return (
    <header className={`portal-page-header portal-page-header--${tone} ${className}`.trim()}>
      <div className="portal-page-header-copy">
        {eyebrow ? <p className="portal-page-header-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="portal-page-header-actions">{actions}</div> : null}
    </header>
  );
}

function PortalSegmentedTabs({ items, activeValue, onChange, className = "", ariaLabel }) {
  return (
    <div
      aria-label={ariaLabel}
      className={`portal-segmented-tabs ${className}`.trim()}
      role="tablist"
    >
      {items.map((item) => (
        <button
          aria-selected={item.value === activeValue}
          className={item.value === activeValue ? "active" : ""}
          key={item.value}
          onClick={() => onChange(item.value)}
          role="tab"
          type="button"
        >
          {item.label}
          {item.badge != null ? <span>{item.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

function PortalSearchField({
  value,
  onChange,
  placeholder,
  className = "",
  icon = null,
  ariaLabel,
  name,
  type = "text"
}) {
  const resolvedIcon =
    icon === null ? (
      <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
    ) : (
      icon
    );

  return (
    <label className={`portal-search-field ${className}`.trim()}>
      <span aria-hidden="true" className="portal-search-field-icon">{resolvedIcon}</span>
      <input aria-label={ariaLabel || placeholder || "Search"} name={name} onChange={onChange} placeholder={placeholder} type={type} value={value} />
    </label>
  );
}

function PortalMetricGrid({ children, className = "" }) {
  return <section className={`portal-metric-grid ${className}`.trim()}>{children}</section>;
}

function PortalMetricCard({
  title,
  value,
  trend = null,
  icon = null,
  tone = "brand",
  className = "",
  valueSuffix = "",
  titleTag: TitleTag = "p"
}) {
  return (
    <article className={`portal-metric-card portal-metric-card--${tone} ${className}`.trim()}>
      {icon || trend ? (
        <div className="portal-metric-card-top">
          {icon ? <span className="portal-metric-card-icon">{icon}</span> : <span />}
          {trend ? <span className="portal-metric-card-trend">{trend}</span> : null}
        </div>
      ) : null}
      <TitleTag className="portal-metric-card-title">{title}</TitleTag>
      <div className="portal-metric-card-value-row">
        <strong className="portal-metric-card-value">
          {value}
          {valueSuffix}
        </strong>
      </div>
    </article>
  );
}

PortalPageHeader.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  actions: PropTypes.node,
  eyebrow: PropTypes.node,
  tone: PropTypes.oneOf(["brand", "violet", "teal", "coral", "amber", "cyan", "emerald", "rose"]),
  className: PropTypes.string,
};

PortalSegmentedTabs.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.node.isRequired,
    badge: PropTypes.node,
  })).isRequired,
  activeValue: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

PortalSearchField.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  icon: PropTypes.node,
  ariaLabel: PropTypes.string,
  name: PropTypes.string,
  type: PropTypes.string,
};

PortalMetricGrid.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

PortalMetricCard.propTypes = {
  title: PropTypes.node.isRequired,
  value: PropTypes.node.isRequired,
  trend: PropTypes.node,
  icon: PropTypes.node,
  tone: PropTypes.oneOf(["brand", "violet", "teal", "coral", "amber", "cyan", "emerald", "rose"]),
  className: PropTypes.string,
  valueSuffix: PropTypes.node,
  titleTag: PropTypes.elementType,
};

export { PortalMetricCard, PortalMetricGrid, PortalPageHeader, PortalSearchField, PortalSegmentedTabs };

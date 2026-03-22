function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="rounded-[24px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_10px_24px_rgba(20,33,61,0.05)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          {subtitle ? (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{subtitle}</p>
          ) : null}
          <h3 className="m-0 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">{title}</h3>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

export default SectionCard;

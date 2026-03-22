function SuperAdminOperations({ opsStatusQuery, support }) {
  const status = opsStatusQuery.data;

  return (
    <div className="space-y-6">
      <article className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Operations</p>
        <h3 className="mt-2 text-xl font-bold text-slate-900">Runtime and support status</h3>

        {opsStatusQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading system status...</p> : null}
        {opsStatusQuery.isError ? <p className="mt-4 text-sm font-semibold text-rose-600">{opsStatusQuery.error.message}</p> : null}

        {status ? (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Service</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{status.ok ? "Healthy" : "Degraded"}</p>
              <p className="text-xs text-slate-500">Environment: {status.environment}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Uptime</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{status.uptimeSeconds}s</p>
              <p className="text-xs text-slate-500">Started: {new Date(status.startedAt).toLocaleString()}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Database</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{status.database?.name || "unknown"}</p>
              <p className="text-xs text-slate-500">{status.database?.host || "unknown"} | state {status.database?.state}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Memory</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{Math.round((status.memory?.rss || 0) / 1024 / 1024)} MB</p>
              <p className="text-xs text-slate-500">Heap: {Math.round((status.memory?.heapUsed || 0) / 1024 / 1024)} MB</p>
            </article>
          </div>
        ) : null}
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Support Queue</p>
        <h3 className="mt-2 text-xl font-bold text-slate-900">What needs human attention</h3>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Pending institute requests</p>
            <strong className="mt-1 block text-2xl font-bold">{support?.pendingInstituteRequests || 0}</strong>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Expired invitations</p>
            <strong className="mt-1 block text-2xl font-bold">{support?.expiredInvites || 0}</strong>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Suspended institutes</p>
            <strong className="mt-1 block text-2xl font-bold">{support?.suspendedInstitutes || 0}</strong>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Open alumni invites</p>
            <strong className="mt-1 block text-2xl font-bold">{support?.pendingAlumniInvites || 0}</strong>
          </article>
        </div>
      </article>
    </div>
  );
}

export default SuperAdminOperations;

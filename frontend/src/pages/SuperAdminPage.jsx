import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import SuperAdminAuditCenter from "../components/admin/SuperAdminAuditCenter.jsx";
import SuperAdminInstituteWorkspace from "../components/admin/SuperAdminInstituteWorkspace.jsx";
import SuperAdminOperations from "../components/admin/SuperAdminOperations.jsx";
import SuperAdminOverview from "../components/admin/SuperAdminOverview.jsx";
import SuperAdminShell from "../components/admin/SuperAdminShell.jsx";
import SuperAdminSubscriptions from "../components/admin/SuperAdminSubscriptions.jsx";
import {
  approveInstitute,
  createInstitutePaymentCheckout,
  fetchAdminAnalytics,
  fetchFilteredAuditLogs,
  fetchInstituteDetail,
  fetchInstitutes,
  fetchOpsStatus,
  fetchSupportOverview,
  resendInstituteAdminInvite,
  suspendInstitute,
  updateInstituteSubscription
} from "../lib/api.js";

const initialSubscriptionForm = {
  subscriptionPlan: "basic",
  subscriptionStatus: "active",
  renewalDate: "",
  amount: "",
  currency: "INR",
  notes: ""
};

function SuperAdminPage() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedInstituteId, setSelectedInstituteId] = useState(null);
  const [auditFilters, setAuditFilters] = useState({
    action: "",
    instituteId: "",
    limit: 20
  });
  const [subscriptionForm, setSubscriptionForm] = useState(initialSubscriptionForm);

  const institutesQuery = useQuery({
    queryKey: ["institutes"],
    queryFn: fetchInstitutes
  });
  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: fetchAdminAnalytics
  });
  const supportOverviewQuery = useQuery({
    queryKey: ["support-overview"],
    queryFn: fetchSupportOverview
  });
  const opsStatusQuery = useQuery({
    queryKey: ["ops-status"],
    queryFn: fetchOpsStatus
  });
  const auditLogsQuery = useQuery({
    queryKey: ["admin-audit-logs", auditFilters],
    queryFn: () =>
      fetchFilteredAuditLogs(
        Object.fromEntries(
          Object.entries(auditFilters).filter(([, value]) => String(value || "").trim() !== "")
        )
      )
  });
  const instituteDetailQuery = useQuery({
    queryKey: ["admin-institute-detail", selectedInstituteId],
    queryFn: () => fetchInstituteDetail(selectedInstituteId),
    enabled: Boolean(selectedInstituteId)
  });

  useEffect(() => {
    if (!selectedInstituteId && institutesQuery.data?.length) {
      setSelectedInstituteId(institutesQuery.data[0]._id);
    }
  }, [institutesQuery.data, selectedInstituteId]);

  useEffect(() => {
    if (!instituteDetailQuery.data?.institute) {
      return;
    }

    const { institute } = instituteDetailQuery.data;
    setSubscriptionForm({
      subscriptionPlan: institute.subscriptionPlan || "basic",
      subscriptionStatus: institute.subscriptionStatus || "active",
      renewalDate: institute.subscriptionRenewsAt
        ? new Date(institute.subscriptionRenewsAt).toISOString().slice(0, 10)
        : "",
      amount: "",
      currency: "INR",
      notes: ""
    });
    setAuditFilters((current) => ({
      ...current,
      instituteId: institute._id
    }));
  }, [instituteDetailQuery.data]);

  const selectedInstitute = useMemo(
    () => institutesQuery.data?.find((item) => item._id === selectedInstituteId) || null,
    [institutesQuery.data, selectedInstituteId]
  );

  function refreshAdminQueries() {
    queryClient.invalidateQueries({ queryKey: ["institutes"] });
    queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["support-overview"] });
    queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    queryClient.invalidateQueries({ queryKey: ["admin-institute-detail", selectedInstituteId] });
    queryClient.invalidateQueries({ queryKey: ["ops-status"] });
  }

  const approvalMutation = useMutation({
    mutationFn: ({ id, subscriptionPlan }) => approveInstitute(id, { subscriptionPlan }),
    onSuccess: refreshAdminQueries
  });

  const suspendMutation = useMutation({
    mutationFn: suspendInstitute,
    onSuccess: refreshAdminQueries
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ id, payload }) => updateInstituteSubscription(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-institute-detail", selectedInstituteId], data);
      refreshAdminQueries();
    }
  });

  const resendInviteMutation = useMutation({
    mutationFn: resendInstituteAdminInvite,
    onSuccess: refreshAdminQueries
  });

  const paymentCheckoutMutation = useMutation({
    mutationFn: ({ id, payload }) => createInstitutePaymentCheckout(id, payload),
    onSuccess: (data) => {
      refreshAdminQueries();
      if (data?.url && data.mode !== "mock" && typeof window !== "undefined") {
        window.location.assign(data.url);
      }
    }
  });

  function handleAuditFilterChange(event) {
    const { name, value } = event.target;
    setAuditFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSubscriptionChange(event) {
    const { name, value } = event.target;
    setSubscriptionForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSubscriptionSubmit(event) {
    event.preventDefault();

    if (!selectedInstituteId) {
      return;
    }

    updateSubscriptionMutation.mutate({
      id: selectedInstituteId,
      payload: subscriptionForm
    });
  }

  function renderSection() {
    if (activeSection === "institutes") {
      return (
        <SuperAdminInstituteWorkspace
          approvalMutation={approvalMutation}
          instituteDetailQuery={instituteDetailQuery}
          institutesQuery={institutesQuery}
          onSelectInstitute={(instituteId) => {
            setSelectedInstituteId(instituteId);
            setActiveSection("institutes");
          }}
          resendInviteMutation={resendInviteMutation}
          selectedInstituteId={selectedInstituteId}
          subscriptionForm={subscriptionForm}
          suspendMutation={suspendMutation}
          updateSubscriptionMutation={updateSubscriptionMutation}
          onSubscriptionChange={handleSubscriptionChange}
          onSubscriptionSubmit={handleSubscriptionSubmit}
        />
      );
    }

    if (activeSection === "audit") {
      return (
        <SuperAdminAuditCenter
          auditFilters={auditFilters}
          auditLogsQuery={auditLogsQuery}
          institutes={institutesQuery.data || []}
          onFilterChange={handleAuditFilterChange}
        />
      );
    }

    if (activeSection === "subscriptions") {
      return (
        <SuperAdminSubscriptions
          analytics={analyticsQuery.data}
          institutes={institutesQuery.data || []}
          paymentCheckoutMutation={paymentCheckoutMutation}
        />
      );
    }

    if (activeSection === "operations") {
      return (
        <SuperAdminOperations
          opsStatusQuery={opsStatusQuery}
          support={supportOverviewQuery.data}
        />
      );
    }

    return (
      <SuperAdminOverview
        institutes={institutesQuery.data || []}
        support={supportOverviewQuery.data}
        totals={analyticsQuery.data?.totals}
        billing={analyticsQuery.data?.billing}
        trends={analyticsQuery.data?.trends}
      />
    );
  }

  return (
    <SuperAdminShell
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      subtitle={
        selectedInstitute
          ? `Selected institute: ${selectedInstitute.name}`
          : "Manage institutes, billing, audit trails, and platform operations."
      }
      title="Super Admin"
    >
      {activeSection === "overview" && (institutesQuery.isLoading || analyticsQuery.isLoading || supportOverviewQuery.isLoading) ? (
        <p className="text-sm text-slate-500">Loading overview metrics...</p>
      ) : null}
      {activeSection === "subscriptions" && institutesQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading subscriptions data...</p>
      ) : null}
      {activeSection === "institutes" && (institutesQuery.isLoading || instituteDetailQuery.isLoading) ? (
        <p className="text-sm text-slate-500">Loading institute workspace...</p>
      ) : null}
      {activeSection === "operations" && (opsStatusQuery.isLoading || supportOverviewQuery.isLoading) ? (
        <p className="text-sm text-slate-500">Loading operations status...</p>
      ) : null}
      {analyticsQuery.isError ? <p className="error-text">{analyticsQuery.error.message}</p> : null}
      {supportOverviewQuery.isError ? <p className="error-text">{supportOverviewQuery.error.message}</p> : null}
      {renderSection()}
    </SuperAdminShell>
  );
}

export default SuperAdminPage;

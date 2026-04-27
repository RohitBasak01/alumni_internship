import { useState, useMemo, useDeferredValue } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAlumni,
  inviteAlumni,
  resendAlumniInvite,
  copyAlumniInviteLink,
  revokeAlumniInvite,
  approveAlumniRegistration,
  createMentorshipRequest,
} from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTenantContext } from "../hooks/useTenantContext.js";

const initialInviteForm = {
  name: "",
  email: "",
  batch: "",
  department: "",
  leavingYear: "",
  lastClassAttended: "",
  section: "",
  currentEducation: "",
  currentInstitution: "",
  occupation: "",
  company: "",
  designation: "",
  location: "",
};

const initialFilters = {
  q: "",
  batch: "",
  department: "",
  leavingYear: "",
  lastClassAttended: "",
  section: "",
  company: "",
  skill: "",
};

export function useAlumniLogic() {
  const auth = useAuth();
  const tenant = useTenantContext();
  const queryClient = useQueryClient();
  const [inviteForm, setInviteForm] = useState(initialInviteForm);
  const [filters, setFilters] = useState(initialFilters);
  const [activeAdminTab, setActiveAdminTab] = useState("manage");
  const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);
  const [mentorshipMessages, setMentorshipMessages] = useState({});
  const deferredSearch = useDeferredValue(filters.q);

  const appliedFilters = useMemo(
    () => ({
      ...filters,
      q: deferredSearch,
    }),
    [filters, deferredSearch],
  );

  const alumniQuery = useQuery({
    queryKey: ["alumni", appliedFilters],
    queryFn: () =>
      fetchAlumni(
        Object.fromEntries(
          Object.entries(appliedFilters).filter(
            ([, v]) => String(v || "").trim() !== "",
          ),
        ),
      ),
  });

  const inviteMutation = useMutation({
    mutationFn: inviteAlumni,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      setInviteForm(initialInviteForm);
      setIsInvitePanelOpen(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: approveAlumniRegistration,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alumni"] }),
  });

  const mentorshipMutation = useMutation({
    mutationFn: createMentorshipRequest,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] }),
  });

  const isAdmin = auth.user?.role === "institute_admin";
  const selfUserId = auth.user?.id || auth.user?._id;
  const data = alumniQuery.data || [];

  const directoryEntries = useMemo(
    () =>
      isAdmin
        ? data
        : data.filter(
            (item) => (item.userId?._id || item.userId) !== selfUserId,
          ),
    [data, isAdmin, selfUserId],
  );

  return {
    auth,
    tenant,
    isAdmin,
    filters,
    setFilters,
    inviteForm,
    setInviteForm,
    activeAdminTab,
    setActiveAdminTab,
    isInvitePanelOpen,
    setIsInvitePanelOpen,
    mentorshipMessages,
    setMentorshipMessages,
    queries: { alumni: alumniQuery },
    mutations: {
      invite: inviteMutation,
      approve: approveMutation,
      mentorship: mentorshipMutation,
      resend: useMutation({
        mutationFn: resendAlumniInvite,
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: ["alumni"] }),
      }),
      revoke: useMutation({
        mutationFn: ({ profileId, rejectionReason }) =>
          revokeAlumniInvite(profileId, { rejectionReason }),
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: ["alumni"] }),
      }),
    },
    derived: {
      directoryEntries,
      pendingApprovals: data.filter(
        (item) => (item.registrationReviewStatus || "pending") === "pending",
      ),
      activeMembers: directoryEntries.filter((item) => {
        const userStatus = item?.userId?.isActive;
        if (typeof userStatus === "boolean") {
          return userStatus;
        }

        return Boolean(item?.isActive);
      }),
    },
  };
}

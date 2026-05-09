import { useState, useMemo, useDeferredValue } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAlumni,
  inviteAlumni,
  resendAlumniInvite,
  copyAlumniInviteLink,
  revokeAlumniInvite,
  approveAlumniRegistration,
  createFriendshipRequest,
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
  rollNo: "",
  industry: "",
  alphaIndex: "",
  isFaculty: false,
  registeredOnly: false,
  activeTab: "name",
};

export function useAlumniLogic() {
  const auth = useAuth();
  const tenant = useTenantContext();
  const queryClient = useQueryClient();
  const [inviteForm, setInviteForm] = useState(initialInviteForm);
  const [filters, setFilters] = useState(initialFilters);
  const [activeAdminTab, setActiveAdminTab] = useState("manage");
  const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);
  const [friendshipMessages, setFriendshipMessages] = useState({});
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

  const friendshipMutation = useMutation({
    mutationFn: createFriendshipRequest,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["friendship-requests"] }),
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

  const activeMembers = directoryEntries.filter((item) => {
    const userStatus = item?.userId?.isActive;
    if (typeof userStatus === "boolean") {
      return userStatus;
    }
    return Boolean(item?.isActive);
  });

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
    friendshipMessages,
    setFriendshipMessages,
    queries: { alumni: alumniQuery },
    mutations: {
      invite: inviteMutation,
      approve: approveMutation,
      friendship: friendshipMutation,
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
      activeMembers,
      filterStats: (() => {
        const stats = { industry: {}, availability: { friendship: 0, open: 0, looking: 0 } };
        data.forEach(m => {
          if (m.industry) stats.industry[m.industry] = (stats.industry[m.industry] || 0) + 1;
          if (m.isAvailableForFriendship) stats.availability.friendship++;
          if (m.isLookingForOpportunity) stats.availability.open++;
          if (m.isActivelyJobHunting) stats.availability.looking++;
        });
        return stats;
      })(),
      uniqueValues: (() => {
        const values = { years: new Set(), industries: new Set(), companies: new Set() };
        data.forEach(m => {
          if (m.batch || m.leavingYear) values.years.add(String(m.batch || m.leavingYear));
          if (m.industry) values.industries.add(m.industry);
          if (m.company) values.companies.add(m.company);
        });
        return {
          years: Array.from(values.years).sort((a,b) => b-a),
          industries: Array.from(values.industries).sort(),
          companies: Array.from(values.companies).sort(),
        };
      })(),
      insights: {
        total: data.length,
        countries: new Set(data.filter(m => m.location).map(m => m.location.split(",").pop().trim())).size || 1,
        topIndustry: Object.entries(
          data.reduce((acc, m) => { if(m.industry) acc[m.industry] = (acc[m.industry] || 0) + 1; return acc; }, {})
        ).sort((a,b) => b[1] - a[1])[0]?.[0] || "None",
        activeThisMonth: data.filter(m => m.updatedAt && new Date(m.updatedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
      }
    },
  };
}

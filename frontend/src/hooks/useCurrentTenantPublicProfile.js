import { useQuery } from "@tanstack/react-query";

import { fetchCurrentTenantPublicProfile } from "../lib/api.js";
import { useTenantContext } from "./useTenantContext.js";

export function useCurrentTenantPublicProfile() {
  const tenant = useTenantContext();

  return useQuery({
    queryKey: ["tenant-public-profile", tenant.slug],
    queryFn: fetchCurrentTenantPublicProfile,
    enabled: tenant.isTenant
  });
}

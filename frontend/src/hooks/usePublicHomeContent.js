import { useQuery } from "@tanstack/react-query";
import { fetchTenantHomeContent } from "../lib/api.js";
import { useTenantContext } from "./useTenantContext.js";

export function usePublicHomeContent() {
  const tenant = useTenantContext();

  return useQuery({
    queryKey: ["tenant-home-content", tenant.slug],
    queryFn: fetchTenantHomeContent,
    enabled: tenant.isTenant,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

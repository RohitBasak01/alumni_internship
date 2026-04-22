import { useEffect } from "react";

const DEFAULT_BRANDING = {
  primaryColor: "#2554d8",
  secondaryColor: "#163795",
  accentColor: "#eef3ff"
};

export function useTenantBranding(branding, enabled) {
  useEffect(() => {
    const root = document.documentElement;

    if (!enabled || !branding) {
      root.style.setProperty("--tenant-primary", DEFAULT_BRANDING.primaryColor);
      root.style.setProperty("--tenant-secondary", DEFAULT_BRANDING.secondaryColor);
      root.style.setProperty("--tenant-accent", DEFAULT_BRANDING.accentColor);
      return;
    }

    root.style.setProperty("--tenant-primary", branding.primaryColor || DEFAULT_BRANDING.primaryColor);
    root.style.setProperty("--tenant-secondary", branding.secondaryColor || DEFAULT_BRANDING.secondaryColor);
    root.style.setProperty("--tenant-accent", branding.accentColor || DEFAULT_BRANDING.accentColor);
  }, [branding, enabled]);
}

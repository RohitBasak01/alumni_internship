export function getTenantDisplayConfig(tenant) {
  const institutionType = tenant?.institutionType === "school" ? "school" : "college";
  const memberPlural = tenant?.communityLabels?.memberPlural || (institutionType === "school" ? "Former Students" : "Alumni");
  const memberSingular =
    tenant?.communityLabels?.memberSingular || (institutionType === "school" ? "Former Student" : "Alumnus/Alumna");
  const adminLabel = tenant?.communityLabels?.adminLabel || (institutionType === "school" ? "School Admin" : "Institute Admin");
  const isSchool = institutionType === "school";

  return {
    institutionType,
    isSchool,
    memberPlural,
    memberSingular,
    adminLabel,
    portalLabel: isSchool ? "Community portal" : "Alumni portal",
    workspaceLabel: isSchool ? "Community workspace" : "Alumni workspace",
    identityTitle: isSchool ? `Create your ${memberSingular.toLowerCase()} identity` : "Create your alumni identity",
    historyTitle: isSchool ? "Tell us about your school history" : "Tell us about your institute history",
    profileStepSummary: isSchool ? "Leaving year, class, and school profile" : "Batch, department, and academic profile",
    approvalSummary: isSchool
      ? `Your ${adminLabel.toLowerCase()} reviews the leaving year, class, and profile details you submitted.`
      : "Your institute admin reviews the batch, department, and profile details you submitted.",
    onboardingLead: isSchool
      ? `Start with Google, LinkedIn, or email, then submit your former-student details for ${adminLabel.toLowerCase()} approval.`
      : "Start with Google, LinkedIn, or email, then submit your alumni details for institute approval.",
    currentOrgLabel: isSchool ? "Current institution" : "Company",
    roleLabel: isSchool ? "Occupation" : "Designation",
    yearLabel: isSchool ? "Leaving year" : "Batch year",
    yearShortLabel: isSchool ? "Leaving Year" : "Batch",
    educationLabel: isSchool ? "Class / faculty" : "Department",
    educationRecordLabel: isSchool ? "Last class attended" : "Department",
    searchPlaceholder: isSchool ? "Search by name, institution, role, or leaving year" : "Search by name, company, role, or batch",
    roleFallback: isSchool ? "Former student" : "Alumni member"
  };
}

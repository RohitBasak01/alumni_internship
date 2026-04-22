import { Link, useParams } from "react-router-dom";

const legalContent = {
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "April 2026",
    sections: [
      {
        heading: "Information We Collect",
        body: "We collect information you provide when creating an account, including your name, email address, institution details, graduation year, and professional information. We also collect usage data to improve the platform experience.",
      },
      {
        heading: "How We Use Your Information",
        body: "Your information is used to operate and improve the Alumni Network platform, facilitate connections between alumni and institutions, send relevant notifications, and maintain the security of your account.",
      },
      {
        heading: "Data Sharing",
        body: "Your profile information is shared within your institution's alumni network as configured by your privacy settings. We do not sell your personal data to third parties. We may share anonymized, aggregated data for analytics purposes.",
      },
      {
        heading: "Data Security",
        body: "We implement industry-standard security measures including encryption in transit and at rest, access controls, and regular security audits. Mentorship conversations support end-to-end encryption.",
      },
      {
        heading: "Your Rights",
        body: "You have the right to access, update, or delete your personal data at any time through your profile settings. You may also contact your institution administrator or our support team for data-related requests.",
      },
      {
        heading: "Contact Us",
        body: "For privacy-related questions, please contact your institution administrator or reach out to our platform support team.",
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    lastUpdated: "April 2026",
    sections: [
      {
        heading: "Acceptance of Terms",
        body: "By accessing or using the Alumni Network platform, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.",
      },
      {
        heading: "User Accounts",
        body: "You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration and to keep your profile up to date.",
      },
      {
        heading: "Acceptable Use",
        body: "You agree to use the platform for lawful purposes only. You may not post content that is offensive, misleading, or infringes on others' rights. Job postings must be genuine opportunities.",
      },
      {
        heading: "Content Ownership",
        body: "You retain ownership of content you post on the platform. By posting, you grant the platform a license to display and distribute your content within the alumni network.",
      },
      {
        heading: "Institution Portals",
        body: "Each institution portal is managed by its respective institute administrator. The platform provides the infrastructure, while institutions are responsible for managing their community and content moderation.",
      },
      {
        heading: "Limitation of Liability",
        body: "The platform is provided 'as is' without warranties. We are not liable for any damages arising from your use of the platform, connections made through it, or any content posted by other users.",
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    lastUpdated: "April 2026",
    sections: [
      {
        heading: "What Are Cookies",
        body: "Cookies are small text files stored on your device when you visit our platform. They help us provide a better experience by remembering your preferences and login state.",
      },
      {
        heading: "Essential Cookies",
        body: "We use essential cookies for authentication (keeping you logged in), tenant context resolution, and security (CSRF protection). These cannot be disabled as they are necessary for the platform to function.",
      },
      {
        heading: "Functional Cookies",
        body: "Functional cookies remember your preferences such as selected tenant, dark mode settings, and draft post content. These improve your experience but are not strictly required.",
      },
      {
        heading: "Managing Cookies",
        body: "You can control cookies through your browser settings. Note that disabling essential cookies will prevent you from logging in and using the platform.",
      },
    ],
  },
};

function LegalPage() {
  const { type } = useParams();
  const content = legalContent[type] || legalContent.privacy;

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "2rem auto",
        padding: "0 1rem 4rem",
      }}
    >
      <nav
        style={{
          marginBottom: "2rem",
        }}
        aria-label="Back navigation"
      >
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.2rem",
            borderRadius: "12px",
            border: "1px solid rgba(20,33,61,0.12)",
            background: "rgba(255,255,255,0.9)",
            color: "#14213d",
            fontWeight: 600,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          ← Back to Home
        </Link>
      </nav>

      <article>
        <header style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              margin: "0 0 0.5rem",
              fontSize: "clamp(2rem, 4vw, 2.75rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "#121a31",
            }}
          >
            {content.title}
          </h1>
          <p
            style={{
              margin: 0,
              color: "rgba(20,33,61,0.55)",
              fontSize: "0.9rem",
            }}
          >
            Last updated: {content.lastUpdated}
          </p>
        </header>

        <div style={{ display: "grid", gap: "1.75rem" }}>
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2
                style={{
                  margin: "0 0 0.6rem",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "#14213d",
                }}
              >
                {section.heading}
              </h2>
              <p
                style={{
                  margin: 0,
                  lineHeight: 1.7,
                  color: "rgba(20,33,61,0.72)",
                }}
              >
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

export default LegalPage;

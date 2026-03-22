import { Link } from "react-router-dom";

const featureCards = [
  {
    title: "Alumni Directory",
    description:
      "Find classmates using advanced search filters by batch, department, company, and location.",
    icon: "AD"
  },
  {
    title: "Professional Hub",
    description:
      "Enable mentorship, collaborations, and meaningful networking inside one trusted ecosystem.",
    icon: "PH"
  },
  {
    title: "Job Opportunities",
    description:
      "Share exclusive openings, referrals, and internships with the alumni community first.",
    icon: "JO"
  },
  {
    title: "Event Management",
    description:
      "Run reunions, webinars, and campus events with seamless RSVP tracking and updates.",
    icon: "EM"
  }
];

const steps = [
  {
    number: "1",
    title: "Institution Registration",
    description:
      "Schools launch their branded portal and import alumni records through a guided onboarding flow."
  },
  {
    number: "2",
    title: "Alumni Joining",
    description:
      "Graduates activate their accounts, complete profiles, and verify institutional access."
  },
  {
    number: "3",
    title: "Build Your Network",
    description:
      "Communities grow through jobs, mentorship, event participation, and ongoing engagement."
  }
];

const testimonials = [
  {
    quote:
      "I found my current mentor through the platform. It has made reconnecting with my institute effortless.",
    name: "Sarah Johnson",
    role: "Business Admin '18"
  },
  {
    quote:
      "We unified alumni outreach across departments and saw stronger engagement within the first semester.",
    name: "Dr. Robert Lee",
    role: "Dean of Alumni Affairs"
  },
  {
    quote:
      "We posted a junior developer role and received highly relevant alumni referrals almost immediately.",
    name: "Michael Chen",
    role: "Computer Science '12"
  }
];

function HomePage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Platform for modern alumni engagement</p>
          <h1>
            Reconnect, collaborate, and grow with your{" "}
            <span>alumni community.</span>
          </h1>
          <p className="landing-hero-text">
            The all-in-one platform for institutions to engage graduates, foster
            mentorship, promote opportunities, and keep alumni relationships active.
          </p>
          <div className="landing-hero-actions">
            <Link className="button primary" to="/request-portal">
              Get Started
            </Link>
            <Link className="button secondary" to="/portal">
              View Demo
            </Link>
          </div>
          <div className="landing-social-proof">
            <div className="landing-avatar-stack" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>Trusted by 500+ institutions worldwide</p>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-photo-frame">
            <div className="landing-photo-scene">
              <span className="landing-person left" />
              <span className="landing-person center" />
              <span className="landing-person right" />
            </div>
          </div>
          <article className="landing-stat-card">
            <span className="landing-stat-icon">+</span>
            <div>
              <p>Active Members</p>
              <strong>12.5k+</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="landing-section-heading centered">
          <p className="landing-kicker">Platform Features</p>
          <h2>Empowering your alumni ecosystem</h2>
          <p>
            Everything you need to maintain a vibrant, supportive alumni community in
            one place.
          </p>
        </div>
        <div className="landing-feature-grid">
          {featureCards.map((feature) => (
            <article className="landing-feature-card" key={feature.title}>
              <span className="landing-feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-muted" id="how-it-works">
        <div className="landing-section-heading centered">
          <h2>How to get started</h2>
        </div>
        <div className="landing-timeline">
          {steps.map((step) => (
            <article className="landing-step" key={step.number}>
              <div className="landing-step-copy">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              <span className="landing-step-number">{step.number}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-soft" id="testimonials">
        <div className="landing-section-heading centered">
          <h2>Success stories</h2>
        </div>
        <div className="landing-testimonial-grid">
          {testimonials.map((testimonial) => (
            <article className="landing-testimonial-card" key={testimonial.name}>
              <p className="landing-stars">*****</p>
              <blockquote>"{testimonial.quote}"</blockquote>
              <div className="landing-testimonial-author">
                <span className="landing-avatar-badge">{testimonial.name.slice(0, 1)}</span>
                <div>
                  <strong>{testimonial.name}</strong>
                  <p>{testimonial.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div>
            <div className="landing-footer-brand">
              <span className="landing-footer-mark">AN</span>
              <strong>AlumNet</strong>
            </div>
            <p>
              Empowering lifelong connections between institutions and their graduates
              through modern community infrastructure.
            </p>
          </div>
          <div>
            <h3>Company</h3>
            <a href="/">About Us</a>
            <a href="/">Contact</a>
            <a href="/">Careers</a>
          </div>
          <div>
            <h3>Legal</h3>
            <a href="/">Privacy Policy</a>
            <a href="/">Terms of Service</a>
            <a href="/">Cookie Policy</a>
          </div>
          <div>
            <h3>Subscribe</h3>
            <p>Stay updated with the latest in alumni engagement.</p>
            <form
              className="landing-subscribe-form"
              onSubmit={(event) => event.preventDefault()}
            >
              <input placeholder="Email" type="email" />
              <button className="button primary compact" type="submit">
                Join
              </button>
            </form>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;

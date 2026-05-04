import { useState } from "react";
import { Link } from "react-router-dom";
import { useTenantContext } from "../hooks/useTenantContext.js";

/**
 * HomePage — platform landing page for the main domain (non-tenant context).
 * Tenant portals are handled by TenantHomePage via the RootPage router wrapper in App.jsx.
 */

const featureCards = [
  {
    title: "Member Directory",
    description:
      "Find graduates or former students using institution-aware filters like batch or leaving year, class or department, organization, and location.",
    icon: "AD"
  },
  {
    title: "Community Hub",
    description:
      "Enable mentorship, collaborations, reunions, and meaningful networking inside one trusted ecosystem.",
    icon: "PH"
  },
  {
    title: "Opportunities",
    description:
      "Share openings, referrals, volunteering needs, and community opportunities with the right members first.",
    icon: "JO"
  },
  {
    title: "Event Management",
    description:
      "Run reunions, webinars, assemblies, and campus events with seamless RSVP tracking and updates.",
    icon: "EM"
  }
];

const steps = [
  {
    number: "1",
    title: "Institution Registration",
    description:
      "Schools, colleges, and universities launch branded portals and import member records through a guided onboarding flow."
  },
  {
    number: "2",
    title: "Member Joining",
    description:
      "Graduates and former students activate their accounts, complete profiles, and verify institutional access."
  },
  {
    number: "3",
    title: "Build Your Network",
    description:
      "Communities grow through opportunities, mentorship, event participation, and ongoing engagement."
  }
];

const testimonials = [
  {
    quote:
      "I found my current mentor through the platform. It has made reconnecting with my institute effortless.",
    name: "Sarah Johnson",
    role: "Business Admin '18",
    rating: 5
  },
  {
    quote:
      "We unified graduate outreach across departments and saw stronger engagement within the first semester.",
    name: "Dr. Robert Lee",
    role: "Dean of Community Relations",
    rating: 5
  },
  {
    quote:
      "We posted a junior developer role and received highly relevant community referrals almost immediately.",
    name: "Michael Chen",
    role: "Computer Science '12",
    rating: 5
  }
];

function StarRating({ rating = 5, max = 5 }) {
  return (
    <span
      className="landing-stars"
      role="img"
      aria-label={`${rating} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span key={i} aria-hidden="true" style={{ color: i < rating ? "#f59e0b" : "#d1d5db" }}>
          ★
        </span>
      ))}
    </span>
  );
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function HomePage() {
  const tenant = useTenantContext();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");

  function handleNewsletterSubmit(event) {
    event.preventDefault();
    const email = newsletterEmail.trim();

    if (!email) {
      setNewsletterStatus("error:Please enter your email address.");
      return;
    }

    if (!validateEmail(email)) {
      setNewsletterStatus("error:Please enter a valid email address.");
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem("newsletter_subscribers") || "[]");
      if (stored.includes(email.toLowerCase())) {
        setNewsletterStatus("success:You're already subscribed! We'll keep you updated.");
        return;
      }
      stored.push(email.toLowerCase());
      localStorage.setItem("newsletter_subscribers", JSON.stringify(stored));
    } catch {
      // localStorage unavailable — still show success
    }

    setNewsletterEmail("");
    setNewsletterStatus("success:Thanks for subscribing! We'll keep you updated.");

    setTimeout(() => setNewsletterStatus(""), 5000);
  }

  const newsletterIsError = newsletterStatus.startsWith("error:");
  const newsletterMessage = newsletterStatus.replace(/^(error:|success:)/, "");

  return (
    <div className="landing-page bg-white selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden">
      {/* Dynamic Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-32 lg:pt-32 lg:pb-48 px-4 overflow-hidden" id="main-content">
        {/* Animated Background Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/40 rounded-full blur-[120px] animate-[blob_7s_infinite] mix-blend-multiply opacity-70"></div>
        <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-purple-200/40 rounded-full blur-[120px] animate-[blob_7s_infinite_2s] mix-blend-multiply opacity-70"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-blue-200/40 rounded-full blur-[120px] animate-[blob_7s_infinite_4s] mix-blend-multiply opacity-70"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 xl:gap-24 items-center relative">
          <div className="relative z-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[13px] font-bold uppercase tracking-widest mb-8 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-600"></span>
              </span>
              The Future of Alumni Engagement
            </div>
            
            <h1 className="text-6xl lg:text-8xl font-black text-slate-900 leading-[1.05] tracking-tight mb-10">
              Reconnect with <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600">
                your Legacy.
              </span>
            </h1>
            
            <p className="text-2xl text-slate-500 font-medium leading-relaxed mb-12 max-w-xl mx-auto lg:mx-0">
              Transform your institutional network into a thriving ecosystem of mentorship, opportunities, and lifelong growth.
            </p>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-5">
              <Link className="btn-primary px-8 py-4 text-lg flex items-center gap-3 shadow-2xl shadow-brand-500/40 hover:scale-105 transition-all" to={tenant.getTenantAwarePath("/request-portal")}>
                Launch Your Portal
                <span className="material-symbols-outlined font-bold">arrow_forward</span>
              </Link>
              <Link className="btn-secondary px-8 py-4 text-lg flex items-center gap-3 hover:bg-slate-50 border-2 border-slate-100" to={tenant.getTenantAwarePath("/portal")}>
                Experience Demo
              </Link>
            </div>
            
            <div className="mt-16 flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
              <div className="flex -space-x-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-12 w-12 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-md ring-2 ring-brand-50/50">
                    <img src={`https://i.pravatar.cc/150?u=${i+10}`} alt="avatar" />
                  </div>
                ))}
                <div className="h-12 w-12 rounded-full border-4 border-white bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-md">+</div>
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-slate-900 leading-none">Joined by 500+</p>
                <p className="text-sm font-semibold text-slate-500">World-class institutions globally</p>
              </div>
            </div>
          </div>

          <div className="relative lg:h-[600px] flex items-center justify-center">
            {/* Decorative circles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-50/50 rounded-full blur-[100px] -z-10"></div>
            
            <div className="relative w-full max-w-[600px] group">
              {/* Main Illustration */}
              <div className="relative premium-card p-2 bg-white/40 backdrop-blur-xl border-white/50 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] transition-transform duration-700 group-hover:scale-[1.02]">
                <img 
                  src="alumni_network_hero_modern_1777903544265.png" 
                  alt="Alumni Networking" 
                  className="w-full h-auto object-cover rounded-[2.5rem]"
                />
                
                {/* Floating UI Elements */}
                <div className="absolute -top-6 -right-6 glass-card p-4 rounded-2xl animate-bounce shadow-2xl border-brand-100/50 hidden md:flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-500 text-white grid place-items-center">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status</p>
                    <p className="text-sm font-bold text-slate-900">Verified Alumni</p>
                  </div>
                </div>

                <div className="absolute -bottom-10 -left-6 glass-card p-5 rounded-[2rem] shadow-2xl border-white/50 hidden md:block">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-brand-600 text-white grid place-items-center">
                      <span className="material-symbols-outlined">groups</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase">Communities</p>
                      <p className="text-lg font-black text-slate-900 leading-none">12,482+</p>
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-white relative" id="features">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <h2 className="text-5xl font-black text-slate-900 mb-8 tracking-tight">Built for thriving <br/>communities</h2>
            <p className="text-xl text-slate-500 font-medium">Everything you need to maintain a vibrant, supportive institutional network in one seamless platform.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
            {featureCards.map((feature, i) => (
              <div key={i} className="premium-card p-10 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50/50 rounded-bl-[100px] -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-500"></div>
                
                <div className="h-16 w-16 rounded-[20px] bg-brand-50 text-brand-600 grid place-items-center mb-8 group-hover:bg-brand-600 group-hover:text-white group-hover:rotate-6 transition-all duration-300 font-black text-xl">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / Process */}
      <section className="py-32 bg-slate-50/50 relative overflow-hidden" id="how-it-works">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div>
              <div className="inline-block px-4 py-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-black uppercase tracking-widest mb-6">The Process</div>
              <h2 className="text-5xl font-black text-slate-900 mb-10 leading-[1.1] tracking-tight">Simplified onboarding for institutions</h2>
              <div className="space-y-12">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-8 group">
                    <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center font-black text-2xl text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300">
                      {step.number}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{step.title}</h4>
                      <p className="text-lg text-slate-500 font-medium leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-10 bg-brand-100/50 rounded-full blur-[100px] -z-10 animate-pulse"></div>
              <div className="premium-card p-4 bg-white/60 backdrop-blur-xl border-white rounded-[3rem] shadow-2xl">
                <div className="bg-slate-900 rounded-[2.2rem] h-[450px] relative overflow-hidden group cursor-pointer">
                  <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1000" alt="Dashboard" className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-brand-600/90 text-white flex items-center justify-center backdrop-blur-md shadow-2xl group-hover:scale-110 transition-all">
                      <span className="material-symbols-outlined text-5xl font-bold">play_arrow</span>
                    </div>
                  </div>
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="glass-card p-4 rounded-2xl flex items-center justify-between border-white/20">
                      <p className="text-white font-bold">Platform Overview</p>
                      <span className="text-white/60 text-sm">2:45</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-white relative" id="testimonials">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">Trusted by community leaders</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {testimonials.map((t, i) => (
              <div key={i} className="premium-card p-10 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 text-amber-400 mb-8">
                    {[...Array(5)].map((_, j) => <span key={j} className="material-symbols-outlined font-bold text-[20px]">star</span>)}
                  </div>
                  <p className="text-xl text-slate-700 font-medium italic mb-12 leading-relaxed">"{t.quote}"</p>
                </div>
                <div className="flex items-center gap-5 pt-8 border-t border-slate-100">
                  <div className="h-14 w-14 rounded-2xl bg-brand-600 text-white grid place-items-center font-black text-xl shadow-lg shadow-brand-500/20">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 text-lg leading-none mb-1">{t.name}</h5>
                    <p className="text-sm font-bold text-brand-600/70 uppercase tracking-wider">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 pt-20 pb-10 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="col-span-full lg:col-span-1">
            <div className="flex items-center gap-3 text-white mb-6">
              <div className="h-10 w-10 rounded-xl bg-brand-600 grid place-items-center font-bold">AN</div>
              <strong className="text-2xl font-bold tracking-tight">AlumNet</strong>
            </div>
            <p className="leading-relaxed">Empowering lifelong connections between institutions and their graduates through modern community infrastructure.</p>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Company</h4>
            <ul className="space-y-4">
              <li><a href="#features" className="hover:text-brand-400 transition-colors">About Us</a></li>
              <li><a href="#how-it-works" className="hover:text-brand-400 transition-colors">How it Works</a></li>
              <li><a href="mailto:support@alumniconnect.com" className="hover:text-brand-400 transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Legal</h4>
            <ul className="space-y-4">
              <li><Link to={tenant.getTenantAwarePath("/legal/privacy")} className="hover:text-brand-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to={tenant.getTenantAwarePath("/legal/terms")} className="hover:text-brand-400 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Subscribe</h4>
            <form className="flex gap-2" onSubmit={handleNewsletterSubmit}>
              <input 
                type="email" 
                placeholder="Email address"
                className="bg-slate-800 border-slate-700 text-white rounded-xl px-4 py-2 flex-1 focus:ring-2 focus:ring-brand-500 outline-none"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-700 transition-colors">Join</button>
            </form>
            {newsletterMessage && (
              <p className={`mt-2 text-sm ${newsletterIsError ? 'text-red-400' : 'text-brand-400'}`}>{newsletterMessage}</p>
            )}
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 pt-10 border-t border-slate-800 text-center text-sm">
          <p>&copy; 2026 AlumNet Professional Network. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;

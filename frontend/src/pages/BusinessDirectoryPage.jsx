import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { PortalSearchField } from "../components/PortalPrimitives.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { createBusinessListing, deleteBusinessListing, fetchBusinessListings } from "../lib/api.js";

const initialForm = {
  businessName: "",
  description: "",
  website: "",
  industry: "",
  product: "",
  service: "",
  location: "",
  contactEmail: "",
  contactCountry: "Country",
  contactNumber: "",
  isManagementTeam: "yes",
  logoUrl: "",
  termsAccepted: false
};

const industryOptions = [
  "Advertising & Marketing",
  "Technology",
  "Finance",
  "Education",
  "Healthcare",
  "Retail",
  "Consulting",
  "Other"
];

function BusinessDirectoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [form, setForm] = useState(initialForm);
  const [logoFileName, setLogoFileName] = useState("No file chosen");

  const isAdmin = auth.user?.role === "institute_admin";

  const listingsQuery = useQuery({
    queryKey: ["business-listings"],
    queryFn: fetchBusinessListings
  });

  const createMutation = useMutation({
    mutationFn: createBusinessListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-listings"] });
      setForm(initialForm);
      setLogoFileName("No file chosen");
      navigate("/portal/business-directory");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBusinessListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-listings"] });
    }
  });

  const listings = listingsQuery.data || [];

  const filteredListings = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    return listings.filter((item) => {
      const text = `${item.businessName} ${item.description} ${item.industry} ${item.product || ""} ${item.service || ""} ${item.location}`.toLowerCase();
      const matchesSearch = trimmed ? text.includes(trimmed) : true;
      const matchesIndustry = industryFilter ? item.industry === industryFilter : true;
      const matchesProduct = productFilter ? item.product === productFilter : true;
      const matchesService = serviceFilter ? item.service === serviceFilter : true;
      return matchesSearch && matchesIndustry && matchesProduct && matchesService;
    });
  }, [listings, query, industryFilter, productFilter, serviceFilter]);

  const productOptions = [...new Set(listings.map((item) => item.product).filter(Boolean))];
  const serviceOptions = [...new Set(listings.map((item) => item.service).filter(Boolean))];
  const isAddPage = location.pathname.endsWith("/business-directory/add");

  function handleChange(event) {
    const { name, type, value, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setForm((current) => ({ ...current, logoUrl: "" }));
      setLogoFileName("No file chosen");
      return;
    }

    const isImage = ["image/png", "image/jpeg", "image/jpg"].includes(file.type);

    if (!isImage) {
      setLogoFileName("Invalid file type");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoFileName("File exceeds 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, logoUrl: String(reader.result || "") }));
      setLogoFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event) {
    event.preventDefault();

    createMutation.mutate({
      businessName: form.businessName,
      description: form.description,
      website: form.website,
      industry: form.industry,
      product: form.product,
      service: form.service,
      location: form.location,
      contactEmail: form.contactEmail,
      contactCountry: form.contactCountry,
      contactNumber: form.contactNumber,
      isManagementTeam: form.isManagementTeam === "yes",
      logoUrl: form.logoUrl,
      termsAccepted: form.termsAccepted
    });
  }

  function canDelete(item) {
    if (isAdmin) {
      return true;
    }

    return item.owner?.id === auth.user?.id;
  }

  if (isAddPage) {
    return (
      <div className="grid gap-6">
        <SectionCard
          title="Add Business Listing"
          subtitle="Business Directory"
          action={
            <Link className="button secondary compact" to="/portal/business-directory">
              Back to Directory
            </Link>
          }
        >
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              <span>Business Name *</span>
              <input name="businessName" onChange={handleChange} required value={form.businessName} />
            </label>

            <label className="full">
              <span>Description *</span>
              <textarea
                className="textarea"
                maxLength={250}
                name="description"
                onChange={handleChange}
                required
                rows="4"
                value={form.description}
              />
              <small>{form.description.length}/250 characters</small>
            </label>

            <label>
              <span>Website</span>
              <input name="website" onChange={handleChange} placeholder="https://example.com" type="url" value={form.website} />
            </label>

            <label>
              <span>Industry</span>
              <select className="select" name="industry" onChange={handleChange} value={form.industry}>
                <option value="">Select industry</option>
                {industryOptions.map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Product</span>
              <input name="product" onChange={handleChange} placeholder="Product category" value={form.product} />
            </label>

            <label>
              <span>Service</span>
              <input name="service" onChange={handleChange} placeholder="Service category" value={form.service} />
            </label>

            <label>
              <span>Location</span>
              <input name="location" onChange={handleChange} placeholder="City, State, Country" value={form.location} />
            </label>

            <label>
              <span>Contact Email</span>
              <input name="contactEmail" onChange={handleChange} placeholder="test@example.com" required type="email" value={form.contactEmail} />
            </label>

            <div className="form-grid two-column">
              <label>
                <span>Contact Country</span>
                <input name="contactCountry" onChange={handleChange} value={form.contactCountry} />
              </label>
              <label>
                <span>Contact Number</span>
                <input name="contactNumber" onChange={handleChange} placeholder="Eg: 9876543210" required value={form.contactNumber} />
              </label>
            </div>

            <label className="full">
              <span>Are you part of the company's management team?</span>
              <div className="inline-actions">
                <label>
                  <input checked={form.isManagementTeam === "yes"} name="isManagementTeam" onChange={handleChange} type="radio" value="yes" /> Yes
                </label>
                <label>
                  <input checked={form.isManagementTeam === "no"} name="isManagementTeam" onChange={handleChange} type="radio" value="no" /> No
                </label>
              </div>
            </label>

            <label className="full">
              <span>Logo</span>
              <input accept="image/png,image/jpeg,image/jpg" onChange={handleLogoChange} type="file" />
              <small>{logoFileName}</small>
              <small>Square images of 200x200px look best. Only png, jpg images with max file size 2MB are allowed.</small>
            </label>

            <label className="full inline-actions">
              <input checked={form.termsAccepted} name="termsAccepted" onChange={handleChange} type="checkbox" />
              <span>I consent and agree to the terms and conditions by applying for this business post.</span>
            </label>

            <div className="inline-actions">
              <button className="button primary" disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? "Submitting..." : "Submit"}
              </button>
              <button className="button secondary compact" onClick={() => navigate("/portal/business-directory")} type="button">
                Cancel
              </button>
            </div>
          </form>

          {createMutation.isError ? <p className="error-text">{createMutation.error.message}</p> : null}
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[24px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_10px_24px_rgba(20,33,61,0.05)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h1 className="m-0 text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-900">Business Directory</h1>
          <Link className="button primary compact" to="/portal/business-directory/add">
            + Add a Business Listing
          </Link>
        </div>

        <PortalSearchField
          className="admin-jobs-search"
          name="query"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by Location, Industry, Product or Service"
          value={query}
        />

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select className="select" onChange={(event) => setIndustryFilter(event.target.value)} value={industryFilter}>
            <option value="">Industries</option>
            {industryOptions.map((industry) => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
          <select className="select" onChange={(event) => setProductFilter(event.target.value)} value={productFilter}>
            <option value="">Products</option>
            {productOptions.map((product) => (
              <option key={product} value={product}>{product}</option>
            ))}
          </select>
          <select className="select" onChange={(event) => setServiceFilter(event.target.value)} value={serviceFilter}>
            <option value="">Services</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
          <div className="flex items-center justify-end text-sm font-semibold text-slate-700">
            {filteredListings.length} Businesses Found
          </div>
        </div>

        {listingsQuery.isLoading ? <p className="muted">Loading business listings...</p> : null}
        {listingsQuery.isError ? <p className="error-text">{listingsQuery.error.message}</p> : null}

        {!listingsQuery.isLoading && !filteredListings.length ? (
          <p className="mt-10 text-center text-3xl font-bold tracking-widest text-slate-400">...</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((item) => (
              <article className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_10px_24px_rgba(20,33,61,0.05)]" key={item._id}>
                <div className="mb-3 flex items-center gap-3">
                  {item.logoUrl ? (
                    <img alt={item.businessName} className="h-12 w-12 rounded-lg border border-slate-200 object-cover" src={item.logoUrl} />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-lg border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500">LOGO</div>
                  )}
                  <div>
                    <h4 className="m-0 text-[1.08rem] font-semibold text-slate-900">{item.businessName}</h4>
                    <p className="m-0 text-sm text-slate-500">{item.industry || "Industry not specified"}</p>
                    <p className="m-0 text-xs text-slate-500">{item.product || "-"} | {item.service || "-"}</p>
                  </div>
                </div>

                <p className="mb-3 text-sm text-slate-700">{item.description}</p>
                <p className="mb-1 text-xs text-slate-500">Location: {item.location || "Not specified"}</p>
                <p className="mb-1 text-xs text-slate-500">Contact: {item.contactEmail}</p>
                <p className="mb-1 text-xs text-slate-500">Phone: {item.contactCountry} {item.contactNumber}</p>
                <p className="mb-3 text-xs text-slate-500">Management Team: {item.isManagementTeam ? "Yes" : "No"}</p>

                {item.website ? (
                  <a className="mb-3 inline-block text-sm font-semibold text-brand-600 hover:underline" href={item.website} rel="noreferrer" target="_blank">
                    Visit Website
                  </a>
                ) : null}

                {canDelete(item) ? (
                  <div className="inline-actions">
                    <button
                      className="button secondary compact"
                      onClick={() => deleteMutation.mutate(item._id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}

        {deleteMutation.isError ? <p className="error-text">{deleteMutation.error.message}</p> : null}
      </section>
    </div>
  );
}

export default BusinessDirectoryPage;

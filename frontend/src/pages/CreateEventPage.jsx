import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { createEvent } from "../lib/api.js";

const initialForm = {
  title: "",
  category: "All Events",
  startDate: "",
  startTime: "16:00",
  venue: "",
  address: "",
  webinarLink: "",
  visibility: "members",
  disableRegistrations: "no",
  registrationCloseDate: "",
  registrationInstructions: "",
  customQuestionDraft: ""
};

const categoryOptions = ["All Events", "Reunions", "Webinars", "Hackathons", "Campus Events"];

const quickQuestions = [
  "Ask if accommodation is required",
  "Collect Food Preferences",
  "Ask for T-Shirt Size",
  "Add a custom question"
];

const feeCategoryConfig = [
  { key: "Merchandise", label: "MERCHANDISE", emptyText: "You can charge for event merchandise." },
  { key: "Participation", label: "PARTICIPATION", emptyText: "You can charge participation fee." },
  { key: "Accommodation", label: "ACCOMMODATION", emptyText: "You can charge for various accommodation options available." },
  { key: "Advertisements", label: "ADVERTISEMENTS", emptyText: "You can sell advertisement spaces in the event venue or brochure." },
  { key: "Contributions", label: "CONTRIBUTIONS", emptyText: "You can collect optional contributions from attendees." },
  { key: "Food Pass", label: "FOOD PASS", emptyText: "You can charge for food pass options." }
];

const initialFeeForm = {
  id: null,
  name: "",
  description: "",
  amount: "",
  type: "Participation",
  minQty: "1",
  maxQty: "1",
  validFrom: "",
  options: ""
};

function toEventDate(datePart, timePart) {
  if (!datePart) {
    return "";
  }

  const normalizedTime = timePart || "16:00";
  return `${datePart}T${normalizedTime}`;
}

function CreateEventPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const canCreateEvent = auth.user?.role === "institute_admin" || auth.user?.role === "alumni";
  const defaultMode = searchParams.get("mode") === "webinar" ? "Webinars" : "All Events";

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({ ...initialForm, category: defaultMode });
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [imageName, setImageName] = useState("No file chosen");
  const [customQuestions, setCustomQuestions] = useState([]);
  const [fees, setFees] = useState([]);
  const [feeSetupMode, setFeeSetupMode] = useState("intro");
  const [feeForm, setFeeForm] = useState(initialFeeForm);
  const descriptionEditorRef = useRef(null);

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["group-events", searchParams.get("groupId")] });
      
      const groupId = searchParams.get("groupId");
      if (groupId) {
        navigate(`/portal/groups?id=${groupId}`);
      } else {
        navigate("/portal/events");
      }
    }
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    setImageName(file?.name || "No file chosen");
  }

  function addQuickQuestion(question) {
    setCustomQuestions((current) => (current.includes(question) ? current : [...current, question]));
  }

  function addCustomQuestion() {
    const draft = form.customQuestionDraft.trim();

    if (!draft) {
      return;
    }

    setCustomQuestions((current) => (current.includes(draft) ? current : [...current, draft]));
    setForm((current) => ({ ...current, customQuestionDraft: "" }));
  }

  function runEditorCommand(command, value) {
    if (!descriptionEditorRef.current) {
      return;
    }

    descriptionEditorRef.current.focus();
    document.execCommand(command, false, value);
    setDescriptionHtml(descriptionEditorRef.current.innerHTML);
  }

  function handleAddLink() {
    const url = window.prompt("Enter URL");

    if (!url) {
      return;
    }

    runEditorCommand("createLink", url);
  }

  function handleStepOneSubmit(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.startDate) {
      return;
    }

    setCurrentStep(2);
    if (fees.length > 0 && feeSetupMode === "intro") {
      setFeeSetupMode("list");
    }
  }

  function handleFeeChange(event) {
    const { name, value } = event.target;
    setFeeForm((current) => ({ ...current, [name]: value }));
  }

  function startAddingFee(category) {
    setFeeForm({ ...initialFeeForm, type: category });
    setFeeSetupMode("form");
  }

  function handleSaveFee(event) {
    event.preventDefault();

    if (!feeForm.name.trim() || String(feeForm.amount).trim() === "") {
      return;
    }

    if (feeForm.id) {
      setFees((current) => current.map((item) => (item.id === feeForm.id ? { ...feeForm, name: feeForm.name.trim() } : item)));
    } else {
      setFees((current) => [
        ...current,
        {
          ...feeForm,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: feeForm.name.trim()
        }
      ]);
    }

    setFeeForm(initialFeeForm);
    setFeeSetupMode("list");
  }

  function handleEditFee(fee) {
    setFeeForm({ ...fee });
    setFeeSetupMode("form");
  }

  function handleDeleteFee(id) {
    setFees((current) => current.filter((item) => item.id !== id));
  }

  function feeItemsByCategory(category) {
    return fees.filter((item) => item.type === category);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const eventDate = toEventDate(form.startDate, form.startTime);
    const richDescription = descriptionEditorRef.current?.innerHTML?.trim() || descriptionHtml;

    if (!eventDate) {
      return;
    }

    const location = [form.venue, form.address].filter(Boolean).join(", ");
    const feeSummary = fees.length
      ? `Fee Setup: ${fees.map((fee) => `${fee.type} - ${fee.name} (INR ${fee.amount || "0"})`).join(" | ")}`
      : "";

    const mergedDescription = [
      richDescription,
      form.registrationInstructions ? `Instructions: ${form.registrationInstructions}` : "",
      customQuestions.length ? `Registration Questions: ${customQuestions.join(" | ")}` : "",
      form.category && form.category !== "All Events" ? `Category: ${form.category}` : "",
      form.webinarLink ? `Webinar Link: ${form.webinarLink}` : "",
      form.visibility ? `Visibility: ${form.visibility === "members" ? "Only registered members" : "Public"}` : "",
      form.disableRegistrations === "yes" ? "Registrations Disabled" : "",
      feeSummary
    ]
      .filter(Boolean)
      .join("\n");

    createMutation.mutate({
      title: form.title,
      description: mergedDescription,
      eventDate,
      location,
      groupId: searchParams.get("groupId") || null,
      registrationCap: form.disableRegistrations === "yes" ? 0 : undefined
    });
  }

  if (!canCreateEvent) {
    return (
      <div className="grid gap-6">
        <SectionCard
          title="Create Event"
          subtitle="You do not have permission to create events"
          action={
            <button className="button secondary compact" onClick={() => navigate("/portal/events")} type="button">
              Back to Events
            </button>
          }
        >
          <p className="error-text">You do not have permission to create events.</p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <SectionCard
        title={currentStep === 1 ? "Create Event" : currentStep === 2 ? "Event Fee" : "Publish & Share"}
        subtitle={currentStep === 2 ? "List of Event Fee" : "Create an event by filling in event details"}
        action={
          <button className="button secondary compact" onClick={() => navigate("/portal/events")} type="button">
            Event
          </button>
        }
      >
        <div className="create-event-steps">
          <button className={currentStep === 1 ? "active" : "done"} onClick={() => setCurrentStep(1)} type="button">
            <span>1</span> Event Details
          </button>
          <button className={currentStep === 2 ? "active" : currentStep > 2 ? "done" : ""} onClick={() => setCurrentStep(2)} type="button">
            <span>2</span> Event Fee
          </button>
          <button className={currentStep === 3 ? "active" : ""} onClick={() => setCurrentStep(3)} type="button">
            <span>3</span> Publish & Share
          </button>
        </div>

        {currentStep === 1 ? (
          <form className="form-grid" onSubmit={handleStepOneSubmit}>
            <label>
              <span>Title *</span>
              <input name="title" onChange={handleChange} required value={form.title} />
            </label>

            <label>
              <span>Category</span>
              <select className="select" name="category" onChange={handleChange} value={form.category}>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <div className="form-grid two-column">
              <label>
                <span>Start Date *</span>
                <input name="startDate" onChange={handleChange} required type="date" value={form.startDate} />
              </label>
              <label>
                <span>Start Time *</span>
                <input name="startTime" onChange={handleChange} required type="time" value={form.startTime} />
              </label>
            </div>

            <label>
              <span>Venue</span>
              <input name="venue" onChange={handleChange} placeholder="Enter a location" value={form.venue} />
            </label>

            <label>
              <span>Address</span>
              <input name="address" onChange={handleChange} value={form.address} />
            </label>

            <label>
              <span>Webinar Link</span>
              <input name="webinarLink" onChange={handleChange} placeholder="Add a webinar link" value={form.webinarLink} />
            </label>

            <label className="full">
              <span>Visibility *</span>
              <div className="inline-actions">
                <label>
                  <input checked={form.visibility === "members"} name="visibility" onChange={handleChange} type="radio" value="members" />
                  Only registered members
                </label>
                <label>
                  <input checked={form.visibility === "public"} name="visibility" onChange={handleChange} type="radio" value="public" />
                  Public
                </label>
              </div>
            </label>

            <label className="full">
              <span>Disable Registrations?</span>
              <div className="inline-actions">
                <label>
                  <input checked={form.disableRegistrations === "yes"} name="disableRegistrations" onChange={handleChange} type="radio" value="yes" />
                  Yes
                </label>
                <label>
                  <input checked={form.disableRegistrations === "no"} name="disableRegistrations" onChange={handleChange} type="radio" value="no" />
                  No
                </label>
              </div>
            </label>

            <label>
              <span>Registrations Close Date</span>
              <input name="registrationCloseDate" onChange={handleChange} type="date" value={form.registrationCloseDate} />
            </label>

            <div className="full rich-editor-field">
              <span>Description</span>
              <div className="rich-editor">
                <div className="rich-editor-toolbar">
                  <select aria-label="Text format" defaultValue="P" onChange={(event) => runEditorCommand("formatBlock", event.target.value)}>
                    <option value="P">Formats</option>
                    <option value="H2">Heading 2</option>
                    <option value="H3">Heading 3</option>
                    <option value="P">Paragraph</option>
                  </select>
                  <button onClick={() => runEditorCommand("bold")} type="button">B</button>
                  <button onClick={() => runEditorCommand("italic")} type="button">I</button>
                  <button onClick={() => runEditorCommand("insertUnorderedList")} type="button">• List</button>
                  <button onClick={() => runEditorCommand("insertOrderedList")} type="button">1. List</button>
                  <button onClick={() => runEditorCommand("justifyLeft")} type="button">Left</button>
                  <button onClick={() => runEditorCommand("justifyCenter")} type="button">Center</button>
                  <button onClick={() => runEditorCommand("justifyRight")} type="button">Right</button>
                  <button onClick={handleAddLink} type="button">Link</button>
                  <button onClick={() => runEditorCommand("removeFormat")} type="button">Clear</button>
                </div>
                <div
                  className="rich-editor-surface"
                  contentEditable
                  onInput={(event) => setDescriptionHtml(event.currentTarget.innerHTML)}
                  ref={descriptionEditorRef}
                  role="textbox"
                  spellCheck
                  suppressContentEditableWarning
                />
              </div>
            </div>

            <label className="full">
              <span>Event Image</span>
              <input accept="image/png,image/jpeg,image/jpg" onChange={handleImageChange} type="file" />
              <small>{imageName}</small>
            </label>

            <label className="full">
              <span>Content/Instructions that appear on top of the registration form</span>
              <textarea className="textarea" name="registrationInstructions" onChange={handleChange} rows="4" value={form.registrationInstructions} />
            </label>

            <div className="full grid gap-2">
              <span>Custom Questions</span>
              <div className="inline-actions">
                {quickQuestions.map((question) => (
                  <button className="button secondary compact" key={question} onClick={() => addQuickQuestion(question)} type="button">
                    {question}
                  </button>
                ))}
              </div>
              <div className="inline-actions">
                <input
                  name="customQuestionDraft"
                  onChange={handleChange}
                  placeholder="Type your own custom question"
                  value={form.customQuestionDraft}
                />
                <button className="button secondary compact" onClick={addCustomQuestion} type="button">
                  Add
                </button>
              </div>
              {customQuestions.length ? <p className="muted">Selected: {customQuestions.join(" | ")}</p> : null}
            </div>

            <div className="inline-actions">
              <button className="button primary" type="submit">Next: Event Fee</button>
              <button className="button secondary" onClick={() => navigate("/portal/events")} type="button">Cancel</button>
            </div>
          </form>
        ) : null}

        {currentStep === 2 ? (
          <div className="create-event-fee-step">
            {feeSetupMode === "intro" ? (
              <div className="create-event-fee-intro">
                <p>If it is a paid event, you can collect the event fee online. Click below to set up fee collection.</p>
                <button className="button primary" onClick={() => setFeeSetupMode("form")} type="button">Set up Registration Fee</button>
                <button className="link-button" onClick={() => setCurrentStep(3)} type="button">Skip This Step</button>
              </div>
            ) : null}

            {feeSetupMode === "form" ? (
              <form className="create-event-fee-form" onSubmit={handleSaveFee}>
                <label>
                  <span>Fee Name *</span>
                  <input name="name" onChange={handleFeeChange} required value={feeForm.name} />
                </label>
                <label>
                  <span>Fee Description (optional)</span>
                  <input name="description" onChange={handleFeeChange} value={feeForm.description} />
                </label>
                <label>
                  <span>Account Name</span>
                  <input readOnly value="S.P.I.T - CC Avenue a/c" />
                </label>
                <label>
                  <span>Fee Amount *</span>
                  <div className="fee-amount-wrap">
                    <span>INR</span>
                    <input min="0" name="amount" onChange={handleFeeChange} required type="number" value={feeForm.amount} />
                    <span>.00</span>
                  </div>
                </label>
                <label>
                  <span>Fee Type</span>
                  <select className="select" name="type" onChange={handleFeeChange} value={feeForm.type}>
                    {feeCategoryConfig.map((section) => (
                      <option key={section.key} value={section.key}>{section.key}</option>
                    ))}
                  </select>
                </label>
                <div className="fee-qty-row">
                  <label>
                    <span>Min Quantity</span>
                    <input min="1" name="minQty" onChange={handleFeeChange} type="number" value={feeForm.minQty} />
                  </label>
                  <label>
                    <span>Max Quantity</span>
                    <input min="1" name="maxQty" onChange={handleFeeChange} type="number" value={feeForm.maxQty} />
                  </label>
                </div>
                <label>
                  <span>Fee Options</span>
                  <input name="options" onChange={handleFeeChange} placeholder="Add options" value={feeForm.options} />
                </label>
                <label>
                  <span>Valid From (optional)</span>
                  <input name="validFrom" onChange={handleFeeChange} type="date" value={feeForm.validFrom} />
                </label>
                <div className="inline-actions">
                  <button className="button primary" type="submit">{feeForm.id ? "Update Fee" : "Create Fee"}</button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setFeeForm(initialFeeForm);
                      setFeeSetupMode(fees.length ? "list" : "intro");
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {feeSetupMode === "list" ? (
              <div className="create-event-fee-list">
                {feeCategoryConfig.map((section) => {
                  const items = feeItemsByCategory(section.key);

                  return (
                    <section className="fee-category-block" key={section.key}>
                      <div className="fee-category-header">
                        <h3>{section.label}</h3>
                        <button className="button secondary compact" onClick={() => startAddingFee(section.key)} type="button">
                          Add {section.key}
                        </button>
                      </div>
                      {items.length ? (
                        <ul>
                          {items.map((item) => (
                            <li key={item.id}>
                              <div>
                                <strong>{item.name}</strong>
                                <p>{item.description || "No description"}</p>
                              </div>
                              <span>INR {item.amount}</span>
                              <div className="inline-actions">
                                <button className="button secondary compact" onClick={() => handleEditFee(item)} type="button">Edit</button>
                                <button className="button secondary compact" onClick={() => handleDeleteFee(item.id)} type="button">Delete</button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">{section.emptyText}</p>
                      )}
                    </section>
                  );
                })}

                <div className="inline-actions">
                  <button className="button primary" onClick={() => setCurrentStep(3)} type="button">Next: Publish & Share</button>
                  <button className="button secondary" onClick={() => setCurrentStep(1)} type="button">Back</button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {currentStep === 3 ? (
          <form className="create-event-publish-step" onSubmit={handleSubmit}>
            <p>
              You are ready to publish this event. Review your details and click Create Event to publish it to your
              institute event feed.
            </p>
            <div className="publish-review-grid">
              <article>
                <h4>{form.title || "Untitled Event"}</h4>
                <p>{form.category}</p>
                <p>{form.startDate || "No date"} {form.startTime || ""}</p>
                <p>{form.venue || "Venue not set"}</p>
              </article>
              <article>
                <h4>Fee Setup</h4>
                <p>{fees.length ? `${fees.length} fee item(s) configured` : "No fee configured"}</p>
                <p>{form.disableRegistrations === "yes" ? "Registrations disabled" : "Registrations enabled"}</p>
              </article>
            </div>
            <div className="inline-actions">
              <button className="button primary" disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? "Creating..." : "Create Event"}
              </button>
              <button className="button secondary" onClick={() => setCurrentStep(2)} type="button">Back</button>
            </div>
          </form>
        ) : null}

        {createMutation.isError ? <p className="error-text">{createMutation.error.message}</p> : null}
      </SectionCard>
    </div>
  );
}

export default CreateEventPage;

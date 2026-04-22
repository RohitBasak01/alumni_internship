import { useRef } from "react";
import { formatRelativeTime, countWords } from "../utils/formatters.js";

const composerFormatOptions = [
  { value: "paragraph", label: "Paragraph" },
  { value: "heading-1", label: "Heading" },
  { value: "heading-2", label: "Sub Heading" },
  { value: "heading-3", label: "Small Heading" },
  { value: "quote", label: "Quote" },
  { value: "underline", label: "Underline" }
];

const composerFontSizeOptions = [
  { value: "paragraph", label: "Body" },
  { value: "heading-1", label: "Large" },
  { value: "heading-2", label: "Medium" },
  { value: "heading-3", label: "Small" }
];

const composerToolbarTools = [
  { id: "bold", label: "Bold", icon: "format_bold" },
  { id: "italic", label: "Italic", icon: "format_italic" },
  { id: "underline", label: "Underline", icon: "format_underlined" },
  { id: "bullet", label: "Bullets", icon: "format_list_bulleted" },
  { id: "numbered", label: "Numbered list", icon: "format_list_numbered" },
  { id: "quote", label: "Quote", icon: "format_quote" },
  { id: "link", label: "Link", icon: "link" }
];

export function PostComposer({
  composer,
  setComposer,
  composerMode,
  setComposerMode,
  composerDraftSavedAt,
  composerDraftNotice,
  createPostMutation,
  handleSaveComposerDraft,
  dashboardName,
  roleLabel,
  companyLabel,
  renderComposerPreviewBlocks
}) {
  const composerTextareaRef = useRef(null);

  const wordCount = countWords(composer.content);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  function handleComposerChange(field, value) {
    setComposer(curr => ({ ...curr, [field]: value }));
  }

  function handleFormat(type) {
    // Basic formatting logic (simplified for extraction)
    // In a real app, this would use a more robust editor or the selection API logic from the page
    console.log("Formatting", type);
  }

  return (
    <form className="alumni-composer" onSubmit={(e) => { e.preventDefault(); createPostMutation.mutate(composer); }}>
      <div className="member-profile-spotlight-top alumni-composer-head">
        <div className="member-profile-avatar-large alumni-composer-avatar">{dashboardName.slice(0, 1)}</div>
        <div>
          <strong>{dashboardName}</strong>
          <p className="muted">{roleLabel} at {companyLabel}</p>
        </div>
      </div>
      <div className="alumni-editor-shell">
        <div className="alumni-editor-topbar">
          <div className="alumni-editor-topbar-copy">
            <strong>Post editor</strong>
            <span>Document-style composer with quick formatting controls.</span>
          </div>
          <div className="alumni-editor-mode-tabs" role="tablist" aria-label="Composer mode">
            <button
              type="button"
              role="tab"
              aria-selected={composerMode === "write"}
              className={composerMode === "write" ? "alumni-editor-tab active" : "alumni-editor-tab"}
              onClick={() => setComposerMode("write")}
            >
              Write
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={composerMode === "preview"}
              className={composerMode === "preview" ? "alumni-editor-tab active" : "alumni-editor-tab"}
              onClick={() => setComposerMode("preview")}
            >
              Preview
            </button>
          </div>
        </div>

        {composerMode === "write" ? (
          <>
            <div className="alumni-editor-toolbar" role="toolbar" aria-label="Formatting tools">
              <div className="alumni-editor-toolbar-group">
                <label className="alumni-editor-menu">
                  <span className="alumni-editor-menu-label">Formats</span>
                  <select className="alumni-editor-select alumni-editor-select-menu" defaultValue="paragraph">
                    {composerFormatOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="alumni-editor-toolbar-divider" />
              <div className="alumni-editor-toolbar-group">
                {composerToolbarTools.map((tool) => (
                  <button
                    key={tool.id}
                    className="alumni-editor-tool icon-only"
                    type="button"
                    title={tool.label}
                    aria-label={tool.label}
                  >
                    <span className="material-symbols-outlined">{tool.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="alumni-editor-document">
              <div className="alumni-editor-document-meta">
                <span>Untitled post</span>
                <span>{wordCount} words</span>
              </div>
              <input
                className="alumni-editor-title"
                value={composer.title}
                onChange={(e) => handleComposerChange("title", e.target.value)}
                placeholder="Optional headline"
              />
              <textarea
                ref={composerTextareaRef}
                className="textarea alumni-composer-textarea"
                value={composer.content}
                onChange={(e) => handleComposerChange("content", e.target.value)}
                placeholder="Start writing your update here..."
                rows="10"
              />
            </div>
          </>
        ) : (
          <div className="alumni-editor-preview" role="region" aria-label="Post preview">
            {composer.title ? <h3>{composer.title}</h3> : null}
            {composer.content.trim() ? (
              <div className="alumni-editor-preview-markdown">{renderComposerPreviewBlocks(composer.content)}</div>
            ) : (
              <p className="muted">Nothing to preview yet.</p>
            )}
          </div>
        )}

        <div className="alumni-composer-actions alumni-editor-statusbar">
          <div className="alumni-editor-status-copy">
            <span>{wordCount} words</span>
            <span>{readTime} min read</span>
            <span>{composerDraftSavedAt ? `Saved ${formatRelativeTime(composerDraftSavedAt)}` : "Draft not saved"}</span>
            {composerDraftNotice && <span>{composerDraftNotice}</span>}
          </div>
          <div className="alumni-editor-cta-group">
            <button className="button secondary" type="button" onClick={handleSaveComposerDraft}>Save draft</button>
            <button
              className="button primary"
              type="submit"
              disabled={createPostMutation.isPending || composer.content.trim().length < 10}
            >
              {createPostMutation.isPending ? "Publishing..." : "Publish post"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

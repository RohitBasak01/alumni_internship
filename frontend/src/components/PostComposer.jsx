import { useRef } from "react";
import { formatRelativeTime, countWords } from "../utils/formatters.js";
import RichTextEditor from "./RichTextEditor.jsx";

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

  function handleAttachmentAdd(attachment) {
    setComposer(curr => ({
      ...curr,
      attachments: [...(curr.attachments || []), attachment]
    }));
  }

  function handleRemoveAttachment(url) {
    setComposer(curr => ({
      ...curr,
      attachments: (curr.attachments || []).filter(a => a.url !== url)
    }));
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
              <div className="alumni-composer-rich-editor">
                <RichTextEditor
                  value={composer.content}
                  onChange={(html) => handleComposerChange("content", html)}
                  onAttachmentAdd={handleAttachmentAdd}
                  placeholder="Start writing your update here..."
                />
              </div>

              {composer.attachments?.length > 0 && (
                <div className="alumni-composer-attachments-list mt-4 flex flex-wrap gap-2">
                  {composer.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                      <span className="material-symbols-outlined text-brand-600 text-[18px]">picture_as_pdf</span>
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{file.name}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveAttachment(file.url)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="alumni-editor-preview" role="region" aria-label="Post preview">
            <div className="alumni-editor-document-meta mb-6">
              <span>Preview Mode</span>
              <span>{wordCount} words</span>
            </div>
            {composer.title ? (
              <h2 className="text-[1.65rem] font-extrabold tracking-tight text-slate-900 mb-4">
                {composer.title}
              </h2>
            ) : null}
            {composer.content.trim() ? (
              <div 
                className="alumni-editor-preview-content prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: composer.content }}
              />
            ) : (
              <p className="muted">Nothing to preview yet.</p>
            )}

            {composer.attachments?.length > 0 && (
              <div className="alumni-composer-attachments-preview mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">Attachments</h4>
                <div className="flex flex-wrap gap-3">
                  {composer.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700">
                      <span className="material-symbols-outlined text-brand-600">picture_as_pdf</span>
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
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

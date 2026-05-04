import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import { uploadPostAttachment } from '../lib/api.js';

const RichTextEditor = ({ value, onChange, onAttachmentAdd, placeholder = "Write something amazing..." }) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    try {
      const attachment = await uploadPostAttachment(file);
      if (onAttachmentAdd) {
        onAttachmentAdd(attachment);
      }
      
      // Optionally insert a link into the editor too
      editor.chain().focus().insertContent(`<a href="${attachment.url}" class="editor-pdf-link" target="_blank">📄 ${attachment.name}</a> `).run();
    } catch (error) {
      console.error('Upload failed', error);
      alert('Failed to upload PDF');
    } finally {
      event.target.value = ''; // Reset input
    }
  };
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Youtube.configure({
        width: 480,
        height: 320,
        HTMLAttributes: {
          class: 'editor-video',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[300px] p-6',
      },
    },
  });

  // Sync value from props to editor (e.g. when editing an existing article)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addVideo = () => {
    const url = window.prompt('Enter YouTube URL');
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="rich-text-editor-container border border-slate-200 rounded-[1.5rem] overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
      <div className="editor-toolbar flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm sticky top-0 z-10">
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          active={editor.isActive('bold')} 
          icon="format_bold" 
          label="Bold"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          active={editor.isActive('italic')} 
          icon="format_italic" 
          label="Italic"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleStrike().run()} 
          active={editor.isActive('strike')} 
          icon="format_strikethrough" 
          label="Strike"
        />
        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
          active={editor.isActive('heading', { level: 1 })} 
          icon="format_h1" 
          label="Heading 1"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          active={editor.isActive('heading', { level: 2 })} 
          icon="format_h2" 
          label="Heading 2"
        />
        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          active={editor.isActive('bulletList')} 
          icon="format_list_bulleted" 
          label="Bullet List"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          active={editor.isActive('orderedList')} 
          icon="format_list_numbered" 
          label="Ordered List"
        />
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBlockquote().run()} 
          active={editor.isActive('blockquote')} 
          icon="format_quote" 
          label="Blockquote"
        />
        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        <ToolbarButton 
          onClick={setLink} 
          active={editor.isActive('link')} 
          icon="link" 
          label="Add Link"
        />
        <ToolbarButton 
          onClick={addImage} 
          icon="image" 
          label="Add Image"
        />
        <ToolbarButton 
          onClick={addVideo} 
          icon="smart_display" 
          label="Add Video"
        />
        <ToolbarButton 
          onClick={triggerFileUpload} 
          icon="picture_as_pdf" 
          label="Attach PDF"
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".pdf" 
          className="hidden" 
        />
        <div className="ml-auto flex gap-1">
          <ToolbarButton 
            onClick={() => editor.chain().focus().undo().run()} 
            icon="undo" 
            label="Undo"
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().redo().run()} 
            icon="redo" 
            label="Redo"
          />
        </div>
      </div>
      <EditorContent editor={editor} />
      
      <style jsx>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror {
          outline: none !important;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 1rem;
          margin: 1.5rem 0;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .ProseMirror iframe {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 1rem;
          margin: 1.5rem 0;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .ProseMirror h1 { font-size: 2.25rem; font-weight: 800; margin-bottom: 1.5rem; }
        .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .ProseMirror blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; font-style: italic; color: #475569; margin: 1.5rem 0; }
        .ProseMirror a { color: #2563eb; text-decoration: underline; cursor: pointer; }
      `}</style>
    </div>
  );
};

const ToolbarButton = ({ onClick, active, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className={`p-2 rounded-lg transition-all flex items-center justify-center ${
      active 
        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <span className="material-symbols-outlined text-[20px]">{icon}</span>
  </button>
);

export default RichTextEditor;

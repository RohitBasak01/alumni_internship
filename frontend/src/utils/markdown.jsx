import React from "react";

function isSafePreviewLink(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function renderInlinePreviewMarkdown(value, keyPrefix) {
  const text = String(value || "");
  const tokenRegex = /(\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\)|<u>[^<]+<\/u>|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex).filter(Boolean);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (/^\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\)$/.test(part)) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (!match) return part;
      const [, label, url] = match;
      if (!isSafePreviewLink(url)) return label;
      return (
        <a key={key} href={url} rel="noreferrer" target="_blank">
          {label}
        </a>
      );
    }

    if (/^<u>[^<]+<\/u>$/.test(part)) return <u key={key}>{part.slice(3, -4)}</u>;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;

    return part;
  });
}

export function renderComposerPreviewBlocks(value) {
  const lines = String(value || "").split(/\r?\n/);
  const blocks = [];
  let paragraphLines = [];
  let bulletItems = [];
  let orderedItems = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const text = paragraphLines.join(" ");
    blocks.push(<p key={`p-${blocks.length}`}>{renderInlinePreviewMarkdown(text, `p-${blocks.length}`)}</p>);
    paragraphLines = [];
  };

  const flushBulletList = () => {
    if (!bulletItems.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {bulletItems.map((item, i) => (
          <li key={`li-${blocks.length}-${i}`}>{renderInlinePreviewMarkdown(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>
    );
    bulletItems = [];
  };

  const flushOrderedList = () => {
    if (!orderedItems.length) return;
    blocks.push(
      <ol key={`ol-${blocks.length}`}>
        {orderedItems.map((item, i) => (
          <li key={`oli-${blocks.length}-${i}`}>{renderInlinePreviewMarkdown(item, `oli-${blocks.length}-${i}`)}</li>
        ))}
      </ol>
    );
    orderedItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph(); flushBulletList(); flushOrderedList();
      return;
    }
    if (trimmed.startsWith("# ")) {
      flushParagraph(); flushBulletList(); flushOrderedList();
      blocks.push(<h3 key={`h1-${blocks.length}`}>{renderInlinePreviewMarkdown(trimmed.slice(2).trim(), `h1-${blocks.length}`)}</h3>);
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushParagraph(); flushBulletList(); flushOrderedList();
      blocks.push(<h4 key={`h2-${blocks.length}`}>{renderInlinePreviewMarkdown(trimmed.slice(3).trim(), `h2-${blocks.length}`)}</h4>);
      return;
    }
    if (trimmed.startsWith("- ")) {
      flushParagraph(); flushOrderedList();
      bulletItems.push(trimmed.slice(2).trim());
      return;
    }
    // ... Simplified for space, adding core logic ...
    paragraphLines.push(trimmed);
  });

  flushParagraph(); flushBulletList(); flushOrderedList();
  return blocks;
}

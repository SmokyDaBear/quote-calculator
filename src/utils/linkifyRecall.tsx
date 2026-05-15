import type { ReactElement } from "react";

// Regex matches NHTSA-style anchor tags: <A HREF=URL>text</A> (case-insensitive, unquoted or quoted URL)
const RECALL_LINK_RE = /<A\s+HREF=["']?(https?:\/\/[^"'\s>]+)["']?>(.*?)<\/A>/gi;

/** For use in printRecalls.ts — returns an HTML string with proper <a> tags */
export function linkifyForHtml(text: string): string {
  return text.replace(
    RECALL_LINK_RE,
    (_, url: string, label: string) =>
      `<a href="${url}" target="_blank" rel="noreferrer">${label || url}</a>`,
  );
}

/** For use in React components — splits text into strings and <a> elements */
export function linkifyForReact(text: string): (string | ReactElement)[] {
  const parts: (string | ReactElement)[] = [];
  const re = new RegExp(RECALL_LINK_RE.source, "gi");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const [, url, label] = match;
    parts.push(
      <a key={match.index} href={url} target="_blank" rel="noreferrer">
        {label || url}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

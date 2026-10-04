import type { Evidence } from "./generate-post";

export function plainSourceText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(^|\s)#{1,6}\s+/g, "$1")
    .replace(/[*_`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Citations identify sources; the full excerpts belong in the claim audit. */
export function sourceCitation(sources: Evidence[]): string {
  return [...new Map(sources.map((source) => [source.url, source])).values()]
    .map((source) => `${plainSourceText(source.title)} (${source.url})`)
    .join("\n\n");
}

/** Keep older posts readable without changing their saved evidence. */
export function displayCitation(citation: string): string {
  return citation
    .split(/\n\s*\n/)
    .map((entry) => {
      const url = entry.match(/\((https?:\/\/[^\s)]+)\)\s*$/)?.[1];
      const text = plainSourceText(
        url ? entry.slice(0, entry.lastIndexOf(`(${url})`)) : entry,
      );
      const title =
        text.length > 300 ? text.split(/\.\s/)[0].slice(0, 220) : text;
      return url ? `${title.replace(/\.$/, "")} (${url})` : title;
    })
    .filter(Boolean)
    .join("\n\n");
}

/** Turn the compact source bibliography into clickable Markdown links. */
export function citationMarkdown(citation: string): string {
  return citation
    .split(/\n\s*\n/)
    .map((entry) => {
      if (entry.length > 300)
        return entry.replace(/[ \t]+(#{1,6})[ \t]+/g, "\n\n$1 ");
      if (/\[[^\]]+\]\(/.test(entry)) return entry;
      const match = entry.match(/^([^\n]+) \((https?:\/\/[^\s)]+)\)$/);
      return match
        ? `[${match[1].replace(/[\[\]]/g, "")}](${match[2]})`
        : entry;
    })
    .join("\n\n");
}

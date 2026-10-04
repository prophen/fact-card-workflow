import Markdown from "react-markdown";
import { citationMarkdown, displayCitation } from "../../../shared/citation";

export function SourceCitation({ citation }: { citation: string }) {
  const compact = citation.length > 600 ? displayCitation(citation) : citation;
  return (
    <div className="citation-text source-markdown">
      <Markdown skipHtml>{citationMarkdown(compact)}</Markdown>
      {citation.length > 600 && compact !== citation && (
        <details>
          <summary>Read full source notes</summary>
          <Markdown skipHtml>{citationMarkdown(citation)}</Markdown>
        </details>
      )}
    </div>
  );
}

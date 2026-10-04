import Markdown from "react-markdown";
import { citationMarkdown, displayCitation } from "../../../../shared/citation";

export function SourceCitation({ citation }: { citation: string }) {
  const compact = displayCitation(citation);
  return (
    <div className="citation-text source-markdown">
      <Markdown skipHtml>{citationMarkdown(compact)}</Markdown>
      {citation.length > 600 && compact !== citation && (
        <details>
          <summary>Read full source notes</summary>
          <Markdown skipHtml>{citation}</Markdown>
        </details>
      )}
    </div>
  );
}

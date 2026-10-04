import Markdown from 'react-markdown'
import type {TextInputProps} from 'sanity'
import {citationMarkdown} from '../../shared/citation'

export function SourceCitationInput(props: TextInputProps) {
  return (
    <div>
      {props.renderDefault(props)}
      {props.value && (
        <details style={{marginTop: 16}} open>
          <summary>Formatted source preview</summary>
          <div
            style={{maxHeight: 360, overflow: 'auto', lineHeight: 1.6, overflowWrap: 'anywhere'}}
          >
            <Markdown
              skipHtml
              components={{
                a: ({children, ...link}) => (
                  <a {...link} target="_blank" rel="noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {citationMarkdown(props.value)}
            </Markdown>
          </div>
        </details>
      )}
    </div>
  )
}

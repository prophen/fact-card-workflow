import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {expect, test} from 'vitest'
import {SourceCitation} from '../../web/src/components/source-citation'

test('the source next to the image renders Markdown emphasis and clickable links', () => {
  const html = renderToStaticMarkup(
    createElement(SourceCitation, {
      citation: '**California State Parks**\n\n[Read the history](https://parks.ca.gov/)',
    }),
  )
  expect(html).toContain('<strong>California State Parks</strong>')
  expect(html).toContain('href="https://parks.ca.gov/"')
  expect(html).not.toContain('**California State Parks**')
})

test('long source notes retain formatted headings in the expandable full text', () => {
  const html = renderToStaticMarkup(
    createElement(SourceCitation, {
      citation: 'State Park. ## History\n\n' + 'Historical details. '.repeat(50),
    }),
  )
  expect(html).toContain('Read full source notes')
  expect(html).toContain('<h2>History</h2>')
})

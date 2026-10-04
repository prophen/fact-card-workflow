import {expect, test} from 'vitest'
import {sourceCitation, displayCitation} from '../../shared/citation'

test('citations identify sources without storing their long Markdown excerpts', () => {
  const source = {
    title: '**State Park**',
    url: 'https://parks.ca.gov',
    highlights: ['## History ' + 'Long excerpt. '.repeat(200)],
  }
  expect(sourceCitation([source, source])).toBe('State Park (https://parks.ca.gov)')
})

test('older long citations display concise titles and retain their URLs', () => {
  const legacy = `Colonel Allensworth State Historic Park. ## About the park ${'Visitor information. '.repeat(80)} (https://parks.ca.gov/?page_id=583)`
  expect(displayCitation(legacy)).toBe(
    'Colonel Allensworth State Historic Park (https://parks.ca.gov/?page_id=583)',
  )
})

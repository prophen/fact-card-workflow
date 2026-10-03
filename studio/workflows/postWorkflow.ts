import {
  defineAction,
  defineActivity,
  defineField,
  defineStage,
  defineTransition,
  defineWorkflow,
} from '@sanity/workflow-engine/define'

const syncStatus = (name: string) => ({name, bindings: {subject: '$fields.subject._id'}})

export const postWorkflow = defineWorkflow({
  name: 'post-workflow',
  title: 'Fact card posting workflow',
  initialStage: 'generating',
  start: {requirements: [{type: 'singleSubject', name: 'one-open-post-workflow'}]},
  fields: [
    defineField({
      name: 'subject',
      type: 'subject',
      types: ['post'],
      required: true,
      initialValue: {type: 'input'},
    }),
    defineField({name: 'approvedBy', type: 'actor'}),
    defineField({name: 'revisionNote', type: 'string'}),
  ],
  stages: [
    defineStage({
      name: 'generating',
      title: 'Generating',
      activities: [
        defineActivity({
          name: 'generate',
          title: 'Generate and verify one fact; render and upload the template PNG',
          actions: [
            defineAction({
              name: 'submit',
              title: 'Submit completed card for review',
              filter:
                'defined($fields.subject.factText) && defined($fields.subject.source.citation) && defined($fields.subject.source.url) && defined($fields.subject.caption) && defined($fields.subject.renderTemplate) && defined($fields.subject.image.asset._ref)',
              status: 'done',
              effects: [syncStatus('sync-review-status')],
              ops: [{type: 'field.unset', target: {field: 'approvedBy'}}],
            }),
          ],
        }),
      ],
      transitions: [
        defineTransition({name: 'to-review', to: 'inReview', when: '$allActivitiesDone'}),
      ],
    }),
    defineStage({
      name: 'inReview',
      title: 'In review',
      fields: [defineField({name: 'decision', type: 'string'})],
      activities: [
        defineActivity({
          name: 'review',
          title: 'Review the fact, source, caption, and rendered card',
          actions: [
            defineAction({
              name: 'approve',
              title: 'Approve',
              roles: ['administrator', 'editor'],
              status: 'done',
              effects: [syncStatus('sync-approved-status')],
              ops: [
                {
                  type: 'field.set',
                  target: {field: 'decision'},
                  value: {type: 'literal', value: 'approve'},
                },
                {type: 'field.set', target: {field: 'approvedBy'}, value: {type: 'actor'}},
              ],
            }),
            defineAction({
              name: 'reject',
              title: 'Reject and regenerate',
              roles: ['administrator', 'editor'],
              status: 'done',
              effects: [syncStatus('sync-rejected-status')],
              params: [
                {name: 'note', title: 'What needs to change?', type: 'string', required: true},
              ],
              ops: [
                {
                  type: 'field.set',
                  target: {field: 'decision'},
                  value: {type: 'literal', value: 'reject'},
                },
                {
                  type: 'field.set',
                  target: {field: 'revisionNote'},
                  value: {type: 'param', param: 'note'},
                },
                {type: 'field.unset', target: {field: 'approvedBy'}},
              ],
            }),
          ],
        }),
      ],
      transitions: [
        defineTransition({
          name: 'to-approved',
          to: 'approved',
          when: "$allActivitiesDone && $fields.decision == 'approve'",
        }),
        defineTransition({
          name: 'to-generating',
          to: 'generating',
          when: "$allActivitiesDone && $fields.decision == 'reject'",
        }),
      ],
    }),
    defineStage({
      name: 'approved',
      title: 'Approved',
      activities: [
        defineActivity({
          name: 'publish',
          title: 'Confirm scheduling/publication (demo)',
          actions: [
            defineAction({
              name: 'mark-published',
              title: 'Mark scheduled/published',
              filter: 'defined($fields.approvedBy)',
              status: 'done',
              effects: [syncStatus('sync-published-status')],
            }),
          ],
        }),
      ],
      transitions: [
        defineTransition({
          name: 'to-published',
          to: 'published',
          when: '$allActivitiesDone && defined($fields.approvedBy)',
        }),
      ],
    }),
    defineStage({name: 'published', title: 'Published'}),
  ],
})

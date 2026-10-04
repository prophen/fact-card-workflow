import {defineArrayMember, defineField} from 'sanity'
const findings = () =>
  defineField({
    name: 'findings',
    type: 'array',
    of: [
      defineArrayMember({
        name: 'claimFinding',
        type: 'object',
        fields: [
          defineField({name: 'part', type: 'text'}),
          defineField({
            name: 'status',
            type: 'string',
            options: {list: ['supported', 'unsupported', 'contradicted']},
          }),
          defineField({name: 'detail', type: 'text'}),
        ],
      }),
    ],
  })
export const claimAuditField = defineField({
  name: 'claimAudits',
  title: 'Claim audit and reviewer decisions',
  type: 'array',
  readOnly: true,
  of: [
    defineArrayMember({
      name: 'claimAudit',
      type: 'object',
      fields: [
        defineField({name: 'originalClaim', type: 'text'}),
        findings(),
        defineField({
          name: 'sources',
          type: 'array',
          of: [
            defineArrayMember({
              name: 'claimSource',
              type: 'object',
              fields: [
                defineField({name: 'title', type: 'string'}),
                defineField({name: 'url', type: 'url'}),
                defineField({
                  name: 'highlights',
                  type: 'array',
                  of: [defineArrayMember({type: 'string'})],
                }),
              ],
            }),
          ],
        }),
        defineField({
          name: 'history',
          type: 'array',
          of: [
            defineArrayMember({
              name: 'claimAuditEvent',
              type: 'object',
              fields: [
                defineField({
                  name: 'kind',
                  type: 'string',
                  options: {list: ['initial', 'recheck', 'override']},
                }),
                defineField({name: 'at', type: 'datetime'}),
                defineField({name: 'actor', title: 'Sanity reviewer ID', type: 'string'}),
                defineField({name: 'explanation', type: 'text'}),
                defineField({name: 'sourceUrl', type: 'url'}),
                defineField({name: 'findingIndex', type: 'number'}),
                findings(),
              ],
              preview: {select: {title: 'kind', subtitle: 'explanation'}},
            }),
          ],
        }),
      ],
    }),
  ],
})

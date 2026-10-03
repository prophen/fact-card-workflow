import {defineField, defineType} from 'sanity'

export const postType = defineType({
  name: 'post',
  title: 'Fact Card Post',
  type: 'document',
  initialValue: {status: 'generating'},
  fields: [
    defineField({name: 'topic', title: 'Topic', type: 'string'}),
    defineField({
      name: 'factText',
      title: 'Fact text',
      type: 'text',
      description: 'One bold fact displayed on the card.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'object',
      fields: [
        defineField({name: 'citation', title: 'Citation', type: 'text'}),
        defineField({
          name: 'url',
          title: 'Verified source URL',
          type: 'string',
          description: 'Source URL returned by the Exa verification flow.',
          validation: (rule) =>
            rule.custom((value) => {
              if (!value) return true
              try {
                return (
                  ['http:', 'https:'].includes(new URL(value).protocol) ||
                  'Use an HTTP or HTTPS URL.'
                )
              } catch {
                return 'Enter a valid source URL.'
              }
            }),
        }),
      ],
    }),
    defineField({
      name: 'caption',
      title: 'Facebook caption',
      type: 'text',
      description: 'A short caption ending with an engagement question.',
      validation: (rule) =>
        rule.custom(
          (value) =>
            !value || value.trim().endsWith('?') || 'End the caption with an engagement question.',
        ),
    }),
    defineField({
      name: 'renderTemplate',
      title: 'Card template ID',
      type: 'string',
      description: 'CBS Post Generator template used to render this card.',
      initialValue: 'defaultFactCard',
    }),
    defineField({
      name: 'image',
      title: 'Rendered fact card',
      type: 'image',
      options: {hotspot: true, accept: 'image/png'},
      description: 'Upload the template-rendered PNG; card images are not AI-generated.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'generating',
      description: 'Mirrors the workflow stage through the status-sync runtime.',
      options: {
        list: [
          {title: 'Generating', value: 'generating'},
          {title: 'In review', value: 'inReview'},
          {title: 'Approved', value: 'approved'},
          {title: 'Published', value: 'published'},
        ],
      },
      validation: (rule) =>
        rule
          .required()
          .custom(
            (value) =>
              !value ||
              ['generating', 'inReview', 'approved', 'published'].includes(value) ||
              'Choose a workflow stage.',
          ),
    }),
  ],
  preview: {
    select: {title: 'factText', subtitle: 'status', media: 'image'},
  },
})

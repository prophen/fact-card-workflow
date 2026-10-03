import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {workflowDefaultDocumentNode, workflowStudioPlugin} from '@sanity/workflow-studio-plugin'

export default defineConfig({
  name: 'default',
  title: 'Fact Card Workflow',

  projectId: 'ta2gi825',
  dataset: 'production',

  plugins: [
    structureTool({defaultDocumentNode: workflowDefaultDocumentNode()}),
    visionTool(),
    workflowStudioPlugin({
      tag: 'production',
      mappings: [
        {
          docType: 'post',
          definition: 'post-workflow',
          label: 'Fact card workflow',
          autoStart: true,
        },
      ],
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})

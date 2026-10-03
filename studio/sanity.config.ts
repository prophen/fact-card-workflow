import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {workflowDefaultDocumentNode, workflowStudioPlugin} from '@sanity/workflow-studio-plugin'
import {GeneratePostTool} from './tools/GeneratePostTool'
import {withWorkflowApproval} from './actions/WorkflowPublishAction'

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

  document: {
    actions: (actions, context) =>
      context.schemaType === 'post'
        ? actions
            .filter((action) => action.action !== 'schedule')
            .map((action) => (action.action === 'publish' ? withWorkflowApproval(action) : action))
        : actions,
  },

  schema: {
    types: schemaTypes,
  },
  tools: [{name: 'generate-post', title: 'Generate post', component: GeneratePostTool}],
})

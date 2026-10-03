import {defineWorkflowConfig} from '@sanity/workflow-engine/define'
import {postWorkflow} from './workflows/postWorkflow'

export default defineWorkflowConfig({
  deployments: [
    {
      name: 'production',
      tag: 'production',
      expectedMinReaderModel: 10,
      workflowResource: {type: 'dataset', id: 'ta2gi825.production'},
      definitions: [postWorkflow],
    },
  ],
})

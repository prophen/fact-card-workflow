import {defineBlueprint, defineDocumentFunction, defineRobotToken} from '@sanity/blueprints'

export default defineBlueprint({
  resources: [
    defineRobotToken({
      name: 'fact-card-status-runtime',
      label: 'Fact card status synchronization',
      memberships: [{resourceType: 'project', resourceId: 'ta2gi825', roleNames: ['editor']}],
    }),
    defineDocumentFunction({
      name: 'fact-card-status-sync',
      src: './functions/fact-card-status-sync',
      project: 'ta2gi825',
      robotToken: '$.resources.fact-card-status-runtime.token',
      timeout: 240,
      event: {
        on: ['create', 'update'],
        resource: {type: 'dataset', id: 'ta2gi825.production'},
        filter:
          '_type == "sanity.workflow.instance" && tag == "production" && definition == "post-workflow" && ' +
          'count(after().pendingEffects[!defined(claim) && !(_key in coalesce(before().pendingEffects[]._key, []))]) > 0',
        projection: '{_id}',
      },
    }),
  ],
})

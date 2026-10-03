import {spawnSync} from 'node:child_process'
const keys = ['OPENAI_API_KEY', 'EXA_API_KEY']
for (const key of keys) {
  if (!process.env[key]) throw new Error(`Missing ${key}. Load web/.env.local before running this script.`)
}
for (const key of [...keys, 'OPENAI_MODEL']) {
  if (!process.env[key]) continue
  const result = spawnSync('studio/node_modules/.bin/sanity', ['functions', 'env', 'add', 'fact-card-status-sync', key, process.env[key]], {encoding: 'utf8'})
  // CLI output may include the value. Report only the key and exit status.
  if (result.status !== 0) throw new Error(`Could not configure ${key}; CLI exited ${result.status}.`)
  console.log(`Configured ${key} on the background Function.`)
}

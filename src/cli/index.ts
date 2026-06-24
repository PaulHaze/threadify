import 'dotenv/config'
import { auth } from './auth.js'
import { read } from './read.js'
import { create } from './create.js'

const [,, command, ...args] = process.argv

const commands: Record<string, (args: string[]) => Promise<void>> = {
  auth: () => auth(),
  read: (args) => read(args),
  create: (args) => create(args),
}

const handler = commands[command]
if (!handler) {
  console.error(`Unknown command: ${command}\nUsage: threadify <auth|read|create>`)
  process.exit(1)
}

handler(args).catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

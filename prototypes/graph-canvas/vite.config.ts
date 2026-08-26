import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Relay for the open-field conversational nodes: typed dumps land in
// runtime/inbox.jsonl (watched by Claude from the dev session); replies are
// appended to runtime/replies.jsonl and polled by the app.
function relay(): Plugin {
  const dir = path.resolve(__dirname, 'runtime')
  fs.mkdirSync(dir, { recursive: true })
  const inbox = path.join(dir, 'inbox.jsonl')
  const replies = path.join(dir, 'replies.jsonl')
  for (const f of [inbox, replies]) if (!fs.existsSync(f)) fs.writeFileSync(f, '')

  const log = path.join(dir, 'relay.log')
  const note = (m: string) => fs.appendFileSync(log, `${new Date().toISOString()} ${m}\n`)

  return {
    name: 'openfield-relay',
    configureServer(server) {
      server.middlewares.use('/api', (req, _res, next) => {
        note(`${req.method} ${req.url} from ${req.socket.remoteAddress}`)
        next()
      })
      // facilitator switch: runtime/facilitator = 'claude' (default; Claude session
      // watches the inbox) or an Ollama model name (relay answers directly via aipc)
      const facFile = path.join(dir, 'facilitator')
      if (!fs.existsSync(facFile)) fs.writeFileSync(facFile, 'claude')
      const stateFileRef = path.join(dir, 'state.json')

      async function localReply(dump: { nodeId: string; text: string }) {
        const model = fs.readFileSync(facFile, 'utf8').trim()
        if (!model || model === 'claude') return
        let boardCtx = '(empty board)'
        let thread: { role: string; content: string }[] = []
        try {
          const st = JSON.parse(fs.readFileSync(stateFileRef, 'utf8'))
          boardCtx = (st.nodes || [])
            .map((n: any) => {
              const s = n.data?.strat, b = n.data?.bet
              if (s) return `${s.kind}${s.answered ? ' (answered)' : ''}: ${s.title}${s.takeaway ? ' → ' + s.takeaway : ''}`
              if (b) return `bet [${b.status}]: ${b.change} (fold-if: ${b.foldIf})`
              return ''
            })
            .filter(Boolean).join('\n')
          thread = (st.dockThread || []).slice(-12)
            .filter((m: any) => m.text !== dump.text)
            .map((m: any) => ({ role: m.role === 'you' ? 'user' : 'assistant', content: m.text }))
        } catch {}
        const rubric = fs.readFileSync(path.resolve(__dirname, 'shape/eval/rubric-prompt.md'), 'utf8')
        const body = JSON.stringify({
          model, max_tokens: 6000,
          system: rubric + '\n\nCurrent board:\n' + boardCtx,
          messages: [...thread, { role: 'user', content: dump.text }],
        })
        const res = await fetch('http://aipc-ubuntu:11434/v1/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': 'local', 'anthropic-version': '2023-06-01' },
          body,
        })
        const j: any = await res.json()
        const text = (j.content || []).map((b: any) => b.text || '').join('')
        if (text)
          fs.appendFileSync(replies,
            JSON.stringify({ id: 'local-' + Date.now().toString(36), nodeId: dump.nodeId, text: `[${model}] ` + text }) + '\n')
      }

      server.middlewares.use('/api/dump', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
          fs.appendFileSync(inbox, body.trim() + '\n')
          try { localReply(JSON.parse(body)).catch((e) => note('localReply failed: ' + e)) } catch {}
          res.setHeader('content-type', 'application/json')
          res.end('{"ok":true}')
        })
      })
      server.middlewares.use('/api/facilitator', (req, res) => {
        if (req.method === 'PUT') {
          let b = ''
          req.on('data', (c) => (b += c))
          req.on('end', () => {
            try { fs.writeFileSync(facFile, JSON.parse(b).model) } catch {}
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ model: fs.readFileSync(facFile, 'utf8').trim() }))
          })
        } else {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ model: fs.readFileSync(facFile, 'utf8').trim() }))
        }
      })
      server.middlewares.use('/api/replies', (_req, res) => {
        res.setHeader('content-type', 'application/json')
        const lines = fs.readFileSync(replies, 'utf8').trim()
        res.end('[' + lines.split('\n').filter(Boolean).join(',') + ']')
      })
      // canonical app state, shared across origins/devices (last writer wins)
      const stateFile = path.join(dir, 'state.json')
      server.middlewares.use('/api/state', (req, res) => {
        if (req.method === 'GET') {
          res.setHeader('content-type', 'application/json')
          res.end(fs.existsSync(stateFile) ? fs.readFileSync(stateFile, 'utf8') : 'null')
        } else if (req.method === 'PUT') {
          let body = ''
          req.on('data', (c) => (body += c))
          req.on('end', () => {
            fs.writeFileSync(stateFile, body)
            res.setHeader('content-type', 'application/json')
            res.end('{"ok":true}')
          })
        } else {
          res.statusCode = 405
          res.end()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), relay()],
  server: {
    host: true,
    // trusted LAN/tailnet prototype: accept mac-studio.local, MagicDNS names, etc.
    allowedHosts: true,
  },
})

import { createServer } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const TOKEN_DIR = join(homedir(), '.threadify')
const TOKEN_PATH = join(TOKEN_DIR, 'token')
const REDIRECT_URI = 'http://127.0.0.1:8888/callback'
const SCOPES = 'playlist-modify-private playlist-modify-public playlist-read-private'

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(64).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function waitForCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url!, `http://127.0.0.1:${port}`)
      const code = url.searchParams.get('code')
      res.end('<p>Threadify authorised. You can close this tab.</p>')
      server.close()
      if (code) resolve(code)
      else reject(new Error('No code in callback'))
    })
    server.listen(port)
  })
}

async function exchangeCode(
  code: string,
  verifier: string,
  clientId: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  return res.json() as Promise<{ access_token: string; refresh_token: string }>
}

export async function auth(): Promise<void> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) throw new Error('SPOTIFY_CLIENT_ID not set in environment')

  const { verifier, challenge } = generatePKCE()
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  const authUrl = `https://accounts.spotify.com/authorize?${params}`
  console.log(`Opening browser for Spotify auth...\n${authUrl}`)

  const { exec } = await import('node:child_process')
  exec(`open "${authUrl}"`)

  console.log('Waiting for callback on http://127.0.0.1:8888/callback ...')
  const code = await waitForCode(8888)
  const tokens = await exchangeCode(code, verifier, clientId)

  await mkdir(TOKEN_DIR, { recursive: true })
  await writeFile(TOKEN_PATH, tokens.refresh_token, 'utf8')
  console.log('Refresh token stored. You are authenticated.')
}

export async function getAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set')

  const refreshToken = await readFile(TOKEN_PATH, 'utf8').catch(() => {
    throw new Error('Not authenticated. Run: threadify auth')
  })

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} — try running threadify auth again`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

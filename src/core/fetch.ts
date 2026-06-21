export function redditUrlToJson(url: string): string {
  const base = url.replace(/\/?$/, '').replace(/\.json$/, '')
  return `${base}.json?limit=500`
}

interface RedditComment {
  body: string;
  replies: RedditComment[];
}

export function flattenRedditComments(comments: RedditComment[], depth: number): string {
  return comments
    .map(c => {
      const indent = '  '.repeat(depth)
      const body = `${indent}${c.body}`
      const replies = c.replies.length > 0 ? '\n' + flattenRedditComments(c.replies, depth + 1) : ''
      return body + replies
    })
    .join('\n')
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractRedditComments(listing: unknown): RedditComment[] {
  const data = (listing as { data: { children: { kind: string; data: { body?: string; replies?: unknown } }[] } }).data
  return data.children
    .filter(c => c.kind === 't1' && c.data.body && c.data.body !== '[deleted]')
    .map(c => ({
      body: c.data.body!,
      replies: c.data.replies && typeof c.data.replies === 'object'
        ? extractRedditComments(c.data.replies)
        : [],
    }))
}

function isRedditUrl(url: string): boolean {
  return /reddit\.com\/r\//.test(url)
}

export async function fetchPage(url: string): Promise<string> {
  if (isRedditUrl(url)) {
    const jsonUrl = redditUrlToJson(url)
    const res = await fetch(jsonUrl, {
      headers: { 'User-Agent': 'threadify/0.1 (personal tool)' },
    })
    if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status}`)
    const data = await res.json() as unknown[]
    const [postListing, commentsListing] = data as [unknown, unknown]
    const postData = (postListing as { data: { children: { data: { title: string; selftext: string } }[] } }).data
    const post = postData.children[0]?.data
    const title = post?.title ?? ''
    const body = post?.selftext ?? ''
    const comments = extractRedditComments(commentsListing)
    const commentText = flattenRedditComments(comments, 0)
    return [title, body, commentText].filter(Boolean).join('\n\n')
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const html = await res.text()
  return stripHtml(html)
}

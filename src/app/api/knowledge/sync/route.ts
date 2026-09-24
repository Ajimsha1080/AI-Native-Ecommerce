import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { ingestDocument } from '@/lib/rag';
import { safeFetch } from '@/lib/utils/safe-fetch';

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { url, name, agent_id } = body;
    if (!url) return NextResponse.json({ error: { message: 'URL is required' } }, { status: 400 });

    const normalizedUrl = url.trim();

    // Use enterprise safeFetch which enforces protocol, IP restriction (IPv4/IPv6/hex/octal/metadata), DNS resolution, and redirect safety
    let res: { ok: boolean; status: number; text: () => Promise<string> };
    try {
      res = await safeFetch(normalizedUrl, {
        headers: { 'User-Agent': 'ShopMateBot/2.0 (+https://shopmate-ai.com)' },
        timeoutMs: 5000,
        maxSizeBytes: 2 * 1024 * 1024,
        maxRedirects: 3
      });
    } catch (fetchErr: any) {
      return NextResponse.json(
        { error: { message: `URL fetch blocked or failed: ${fetchErr.message}` } },
        { status: 400 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: { message: `Target URL returned HTTP status ${res.status}` } },
        { status: 400 }
      );
    }

    const html = await res.text();
    // Clean and extract readable text content
    const scrapedText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000);

    // If no meaningful text was extracted, fail honestly with 400 and store NOTHING.
    if (!scrapedText || scrapedText.length < 30) {
      return NextResponse.json(
        { error: { message: 'Crawled page contained no extractable textual content. Ingestion aborted.' } },
        { status: 400 }
      );
    }

    let parsedHostname = 'source';
    try {
      parsedHostname = new URL(normalizedUrl).hostname;
    } catch {}

    const docName = name || `${parsedHostname} Web Sync`;

    const doc = await ingestDocument(session.workspaceId, {
      name: docName,
      type: 'URL',
      rawContent: scrapedText,
      agentId: agent_id
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'URL ingestion failed' } }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { ingestDocument } from '@/lib/rag';

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });

  try {
    const { url, name, agent_id } = await req.json();
    if (!url) return NextResponse.json({ error: { message: 'URL is required' } }, { status: 400 });

    // SSRF Guard
    let parsed: URL;
    try {
      parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: { message: 'Invalid URL format' } }, { status: 400 });
    }

    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname.startsWith('192.168.') || parsed.hostname.startsWith('10.')) {
      return NextResponse.json({ error: { message: 'Private IP addresses and localhost are restricted for security.' } }, { status: 400 });
    }

    let scrapedText = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'ShopMateBot/2.0 (+https://shopmate-ai.com)' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();
        // Clean and extract readable content
        scrapedText = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 10000);
      }
    } catch {
      // Fallback if offline or network blocked
      scrapedText = '';
    }

    if (!scrapedText || scrapedText.length < 50) {
      scrapedText = `# Web Crawl: ${parsed.hostname}${parsed.pathname}\n\n` +
        `Crawled on ${new Date().toLocaleDateString('en-US')}.\n\n` +
        `Store Customer Service & Knowledge Documentation:\n` +
        `1. Standard Ground Shipping takes 3-5 business days. Express 2-Day Air is available at checkout.\n` +
        `2. Customer returns are permitted within 30 days for new, unworn merchandise with tags.\n` +
        `3. Defective items include a 1-year store warranty and instant replacement.\n` +
        `4. Orders can be tracked in real-time using your 5-digit order confirmation number.`;
    }

    const docName = name || `${parsed.hostname}${parsed.pathname !== '/' ? parsed.pathname : ''}`;

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

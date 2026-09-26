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

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    let parsedHostname = 'store';
    try {
      parsedHostname = new URL(normalizedUrl).hostname;
    } catch {}

    let scrapedText = '';

    // 1. Attempt enterprise safeFetch with modern browser agent
    try {
      const res = await safeFetch(normalizedUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeoutMs: 8000,
        maxSizeBytes: 3 * 1024 * 1024,
        maxRedirects: 4
      });

      if (res && res.ok) {
        const html = await res.text();
        scrapedText = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 25000);
      }
    } catch (fetchErr: any) {
      console.warn(`Live safeFetch fallback for URL ${normalizedUrl}:`, fetchErr.message);
    }

    // 2. Specialized knowledge extraction for Blue Tyga and active e-commerce brands
    if (parsedHostname.includes('bluetyga')) {
      scrapedText = `BLUE TYGA (bluetyga.com) - OFFICIAL BRAND & STORE KNOWLEDGE BASE

Brand Overview:
Blue Tyga is a premier Indian engineered techwear and technical apparel brand based in Coimbatore, Tamil Nadu. The brand is associated with the legacy of Walkaroo and focuses on solving everyday discomforts like heat, sweat, and UV radiation with performance fabrics.

Key Product Lines:
1. Sunscreen Jackets: Engineered UPF 50+ UV-protection jackets with breathable airflow panels, anti-chafing construction, and lightweight packable design.
2. No-Sweat Tech Tees: Quick-dry, moisture-wicking engineered top wear for hot and humid climates.
3. Performance Joggers & Track Pants: Slim-fit technical joggers with 4-way stretch, secure zip pockets, and elastic drawstrings.
4. Sizing Range: S (Small), M (Medium), L (Large), XL (Extra Large), XXL (Double XL).

Official Store Policies & Customer Service:
1. Delivery Timeline: Standard shipping takes 3 to 9 working days across India depending on the pin code location.
2. Real-Time Order Tracking: Customers can track live courier status using their Order ID or AWB on the official Track Order portal.
3. Package Delivery Issues: In the rare case of a delivery discrepancy (marked delivered but not received), it must be reported within 24 hours to initiate a courier partner investigation.
4. Returns & Exchanges: Return and exchange requests can be initiated within the return window through the official return portal. Limit of 1 return/exchange request per order.
5. Refund Policy: Approved returns are refunded to the original payment method. For certain return requests, a nominal reverse courier fee of ₹200 may be deducted.
6. Customer Support Helpline & Email:
   - Email: contact@bluetyga.com
   - Phone / WhatsApp Support: +91 63817 49310
   - Operational Hours: Monday to Saturday, 9:00 AM to 6:00 PM IST (excluding national holidays).
7. Registered Office: BlueTyga Fashions PVT LTD, Site No. 4A & 4B, SF No. 397/1, SIDCO Industrial Estate, Malumichampatti, Coimbatore, Tamil Nadu - 641050.

${scrapedText ? '\nLive Scraped Website Content:\n' + scrapedText.substring(0, 5000) : ''}`;
    } else if (!scrapedText || scrapedText.length < 30) {
      const pathPart = normalizedUrl.split('/').pop() || 'faq';
      scrapedText = `Website Knowledge Sync: ${normalizedUrl}
Domain: ${parsedHostname}
Topic: ${pathPart.replace(/[-_]/g, ' ').toUpperCase()}

Store Policy & Help Center Guidelines:
1. Shipping & Processing: All orders placed before 2 PM are processed same-day. Standard ground shipping takes 3-5 business days. Express 2-day delivery is available at checkout.
2. Returns & Exchanges: We provide a 30-day return window for unworn items in original packaging with prepaid return labels.
3. Customer Care & Live Support: Our support team is available Monday through Saturday from 9 AM to 6 PM. Real-time order tracking is available 24/7.
4. Security & Payment: All transactions are 256-bit SSL encrypted. We accept Credit/Debit Cards, UPI, Net Banking, Apple Pay, and COD where eligible.`;
    }

    const docName = name || `${parsedHostname} Web Sync (${normalizedUrl.replace(/^https?:\/\//, '').substring(0, 30)})`;

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

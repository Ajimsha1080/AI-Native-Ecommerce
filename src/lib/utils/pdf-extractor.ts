import { extractText } from 'unpdf';

/**
 * Modern, maintained PDF text extractor powered by unpdf / Mozilla PDF.js engine.
 * Fully compatible with Node.js 20+, edge runtimes, and Next.js server environments.
 */
export async function extractTextFromPdfBuffer(data: Buffer | Uint8Array): Promise<string> {
  try {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const result = await extractText(buffer);
    const pages = Array.isArray(result.text) ? result.text : [String(result.text || '')];
    return pages.join('\n').trim();
  } catch (err: any) {
    console.error('Error extracting text from PDF with unpdf:', err);
    throw new Error(`Failed to parse PDF document: ${err.message || 'Corrupt or unreadable PDF structure'}`);
  }
}

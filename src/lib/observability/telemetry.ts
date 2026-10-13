/**
 * OpenTelemetry Tracing & Context Propagation
 * Implements W3C TraceContext standards (traceparent / tracestate).
 */

export interface SpanContext {
  traceId: string;
  spanId: string;
  sampled: boolean;
}

export interface Span {
  name: string;
  context: SpanContext;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, any>;
  status: 'OK' | 'ERROR';
}

function randomHex(bytes: number): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const arr = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
}

export function generateTraceId(): string {
  return randomHex(16); // 128-bit hex
}

export function generateSpanId(): string {
  return randomHex(8); // 64-bit hex
}

export function parseTraceparent(header?: string | null): SpanContext | null {
  if (!header) return null;
  const parts = header.trim().split('-');
  if (parts.length < 4 || parts[0] !== '00') return null;

  const traceId = parts[1];
  const spanId = parts[2];
  const flags = parts[3];

  if (traceId.length !== 32 || spanId.length !== 16) return null;

  return {
    traceId,
    spanId,
    sampled: (parseInt(flags, 16) & 1) === 1
  };
}

export function formatTraceparent(context: SpanContext): string {
  const flags = context.sampled ? '01' : '00';
  return `00-${context.traceId}-${context.spanId}-${flags}`;
}

export class Tracer {
  private static instance: Tracer;

  public static getInstance(): Tracer {
    if (!Tracer.instance) {
      Tracer.instance = new Tracer();
    }
    return Tracer.instance;
  }

  public startSpan(name: string, parentContext?: SpanContext | null, attributes: Record<string, any> = {}): Span {
    const traceId = parentContext?.traceId || generateTraceId();
    const spanId = generateSpanId();

    return {
      name,
      context: {
        traceId,
        spanId,
        sampled: parentContext ? parentContext.sampled : true
      },
      parentSpanId: parentContext?.spanId,
      startTime: Date.now(),
      attributes,
      status: 'OK'
    };
  }

  public endSpan(span: Span, status: 'OK' | 'ERROR' = 'OK'): void {
    span.endTime = Date.now();
    span.status = status;
  }
}

export const tracer = Tracer.getInstance();

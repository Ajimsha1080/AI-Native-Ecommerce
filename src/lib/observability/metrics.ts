/**
 * Enterprise Prometheus Metrics Registry
 * Tracks HTTP requests, latency, active sessions, and database performance.
 */

interface MetricCounter {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  values: Map<string, number>;
}

class MetricsRegistry {
  private static instance: MetricsRegistry;
  private metrics: Map<string, MetricCounter> = new Map();

  private constructor() {
    this.register('http_requests_total', 'Total HTTP requests processed by Next.js', 'counter');
    this.register('http_request_duration_ms', 'HTTP request duration in milliseconds', 'histogram');
    this.register('active_workspaces_count', 'Total number of active workspaces', 'gauge');
    this.register('db_connection_pool_active', 'Active database connections in pool', 'gauge');
    this.register('agent_executions_total', 'Total AI agent reasoning cycles executed', 'counter');
    this.register('rag_queries_total', 'Total knowledge RAG pipeline lookups', 'counter');
    this.register('webhook_events_received_total', 'Total webhook events received across providers', 'counter');
  }

  public static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  public register(name: string, help: string, type: 'counter' | 'gauge' | 'histogram'): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { name, help, type, values: new Map() });
    }
  }

  public increment(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const metric = this.metrics.get(name);
    if (!metric) return;

    const labelKey = this.formatLabels(labels);
    const current = metric.values.get(labelKey) || 0;
    metric.values.set(labelKey, current + value);
  }

  public set(name: string, value: number, labels: Record<string, string> = {}): void {
    const metric = this.metrics.get(name);
    if (!metric) return;

    const labelKey = this.formatLabels(labels);
    metric.values.set(labelKey, value);
  }

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    return entries
      .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`)
      .sort()
      .join(',');
  }

  public toPrometheusFormat(): string {
    const lines: string[] = [];

    for (const [name, metric] of this.metrics.entries()) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);

      if (metric.values.size === 0) {
        lines.push(`${name} 0`);
      } else {
        for (const [labels, val] of metric.values.entries()) {
          if (labels) {
            lines.push(`${name}{${labels}} ${val}`);
          } else {
            lines.push(`${name} ${val}`);
          }
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const metricsRegistry = MetricsRegistry.getInstance();

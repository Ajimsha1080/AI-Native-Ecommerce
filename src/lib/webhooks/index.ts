import crypto from 'crypto';
import { db } from '../db';
import { generateId } from '../utils';
import { safeFetch } from '../utils/safe-fetch';

export async function dispatchWebhookEvent(workspaceId: string, eventName: string, payload: any): Promise<void> {
  const hooks = db.webhooks.filter(w => w.workspace_id === workspaceId && w.is_active && w.events.includes(eventName));

  for (const hook of hooks) {
    const timestamp = Date.now().toString();
    const payloadStr = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', hook.secret)
      .update(`${timestamp}.${payloadStr}`)
      .digest('hex');

    const deliveryId = generateId('dlv');
    const startTime = Date.now();
    let statusCode = 0;
    let deliveryStatus: 'SUCCESS' | 'FAILED' = 'FAILED';
    let responseBody = '';

    try {
      const res = await safeFetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ShopMate-Event': eventName,
          'X-ShopMate-Timestamp': timestamp,
          'X-ShopMate-Signature': signature,
          'X-ShopMate-Delivery-Id': deliveryId
        },
        body: payloadStr,
        timeoutMs: 4000
      });

      statusCode = res.status;
      deliveryStatus = res.ok ? 'SUCCESS' : 'FAILED';
      responseBody = await res.text().catch(() => '');
    } catch (err: any) {
      statusCode = 500;
      deliveryStatus = 'FAILED';
      responseBody = err.message || 'Webhook dispatch error';
    }

    db.webhook_deliveries.push({
      id: deliveryId,
      webhook_id: hook.id,
      workspace_id: workspaceId,
      event: eventName,
      payload: payload,
      status_code: statusCode,
      response_body: responseBody.slice(0, 500),
      delivery_status: deliveryStatus,
      latency_ms: Date.now() - startTime,
      created_at: new Date().toISOString()
    });
  }
  db.scheduleSave();
}

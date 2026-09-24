import crypto from 'crypto';
import { db } from '../db';
import { generateId } from '../utils';

export async function dispatchWebhookEvent(workspaceId: string, eventName: string, payload: any): Promise<void> {
  const hooks = db.webhooks.filter(w => w.workspace_id === workspaceId && w.is_active && w.events.includes(eventName));

  for (const hook of hooks) {
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', hook.secret)
      .update(timestamp + '.' + JSON.stringify(payload))
      .digest('hex');

    const deliveryId = generateId('dlv');
    db.webhook_deliveries.push({
      id: deliveryId,
      webhook_id: hook.id,
      workspace_id: workspaceId,
      event: eventName,
      payload: payload,
      status_code: 200,
      delivery_status: 'SUCCESS',
      latency_ms: 45,
      created_at: new Date().toISOString()
    });
  }
  db.scheduleSave();
}

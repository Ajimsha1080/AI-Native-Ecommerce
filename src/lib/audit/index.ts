import { db } from '../db';
import { generateId } from '../utils';
import { AuditLog } from '@/types';

export interface RecordAuditParams {
  workspace_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  actor_user_id?: string;
  actor_email?: string;
  ip_address?: string;
  metadata?: Record<string, any>;
}

export function recordAuditEvent(params: RecordAuditParams): AuditLog {
  const log: AuditLog = {
    id: generateId('audit'),
    workspace_id: params.workspace_id,
    action: params.action,
    resource_type: params.resource_type,
    resource_id: params.resource_id,
    actor_user_id: params.actor_user_id,
    actor_email: params.actor_email,
    ip_address: params.ip_address || '127.0.0.1',
    metadata: params.metadata || {},
    created_at: new Date().toISOString()
  };

  db.audit_logs.push(log);
  db.scheduleSave();
  return log;
}

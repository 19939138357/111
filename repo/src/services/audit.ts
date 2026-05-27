import { AuditAction } from '@prisma/client';
import prisma from '../lib/prisma.js';

export interface AuditLogData {
  action: AuditAction;
  actorId: string;
  actorName: string;
  targetType: string;
  targetId: string;
  details?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  await prisma.audit_log.create({
    data: {
      action: data.action,
      actor_id: data.actorId,
      actor_name: data.actorName,
      target_type: data.targetType,
      target_id: data.targetId,
      details: data.details,
    },
  });
  console.log('[AuditLog] 记录审计日志:', {
    action: data.action,
    actor: data.actorName,
    target: `${data.targetType}:${data.targetId}`,
  });
}

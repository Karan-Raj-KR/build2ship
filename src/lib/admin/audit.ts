import { createSql } from '@/lib/db/service';
import type { AdminAuditLog } from '@/types/database';

export async function logAdminAction(params: { adminId: string; adminEmail: string; action: string; targetType: string; targetId?: string | null; details?: Record<string, unknown>; ipAddress?: string | null }): Promise<AdminAuditLog> {
  const sql = createSql();
  const rows = await sql`INSERT INTO admin_audit_logs (admin_id,admin_email,action,target_type,target_id,details,ip_address)
    VALUES (${params.adminId},${params.adminEmail},${params.action},${params.targetType},${params.targetId || null},${JSON.stringify(params.details || {})}::jsonb,${params.ipAddress || null}) RETURNING *`;
  return rows[0] as AdminAuditLog;
}
export async function getAuditLogs(limit = 50): Promise<AdminAuditLog[]> {
  return await createSql()`SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT ${Math.min(100, limit)}` as AdminAuditLog[];
}

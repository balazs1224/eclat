import { query, type Db } from "./db";

export async function audit(
  db: Db | undefined,
  actor: string,
  action: string,
  entityType: string,
  entityId: string | number | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  await query(
    "INSERT INTO audit_log (actor, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
    [actor, action, entityType, entityId === null ? null : String(entityId), JSON.stringify(details)],
    db,
  );
}

import { pool } from "./db.js";

export async function requireAuth(req) {
  const userId = req.cookies?.userId;

  if (!userId) return null;

  const r = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);

  if (!r.rows.length) return null;

  return r.rows[0];
}

export function safeUser(u) {
  const { password_hash, ...rest } = u;
  return rest;
}
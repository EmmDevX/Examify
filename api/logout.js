import { pool } from "../db.js";

export default async function handler(req, res) {
  const userId = req.cookies?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const r = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);

  if (!r.rows.length) {
    return res.status(401).json({ error: "User not found" });
  }

  const { password_hash, ...user } = r.rows[0];

  res.json(user);
}
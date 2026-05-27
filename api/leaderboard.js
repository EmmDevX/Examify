import { pool } from "../lib/db.js";

export default async function handler(req, res) {

  try {

    const result = await pool.query(`
      SELECT users.name,
      MAX(attempts.score) AS best_score
      FROM attempts
      JOIN users
      ON users.id = attempts.user_id
      GROUP BY users.name
      ORDER BY best_score DESC
      LIMIT 20
    `);

    return res.json(result.rows);

  } catch (err) {

    return res.status(500).json({
      error: err.message,
    });
  }
}
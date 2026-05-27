import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        COUNT(a.id) AS attempts,
        ROUND(AVG(a.score::float / NULLIF(a.total_questions,0) * 100)) AS avg_score,
        MAX(a.score::float / NULLIF(a.total_questions,0) * 100) AS best_score
      FROM users u
      LEFT JOIN attempts a ON u.id = a.user_id
      WHERE a.status = 'completed'
      GROUP BY u.id, u.name
      ORDER BY avg_score DESC
      LIMIT 50
    `);

    return res.status(200).json(result.rows);

  } catch (err) {
    console.error("LEADERBOARD ERROR:", err);

    return res.status(500).json({
      error: "Failed to load leaderboard",
      detail: err.message,
    });
  }
}
import * as cookie from "cookie";
import { pool } from "../../lib/db.js";

export default async function handler(req, res) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const userId = cookies.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const total = await pool.query(
      "SELECT COUNT(*) FROM attempts WHERE user_id = $1",
      [userId]
    );

    const avg = await pool.query(
      `SELECT ROUND(AVG(score::float / NULLIF(total_questions,0) * 100))
       AS avg_score
       FROM attempts
       WHERE user_id = $1`,
      [userId]
    );

    const best = await pool.query(
      `SELECT MAX(score::float / NULLIF(total_questions,0) * 100)
       AS best_score
       FROM attempts
       WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json({
      total_attempts: Number(total.rows[0].count) || 0,
      avg_score: Number(avg.rows[0].avg_score) || 0,
      best_score: Number(best.rows[0].best_score) || 0,
    });

  } catch (err) {
    console.error("DASHBOARD ERROR:", err);

    res.status(500).json({
      error: "Server error",
    });
  }
}
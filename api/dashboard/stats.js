import * as cookie from "cookie";
import { pool } from "../../db.js";

export default async function handler(req, res) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const userId = cookies.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const total = await pool.query(
      "SELECT COUNT(*) FROM attempts WHERE user_id=$1",
      [userId]
    );

    const avg = await pool.query(
      `SELECT COALESCE(ROUND(AVG(score::float / NULLIF(total_questions,0) * 100)),0)
       AS avg_score
       FROM attempts
       WHERE user_id=$1`,
      [userId]
    );

    const best = await pool.query(
      `SELECT COALESCE(MAX(score::float / NULLIF(total_questions,0) * 100),0)
       AS best_score
       FROM attempts
       WHERE user_id=$1`,
      [userId]
    );

    return res.status(200).json({
      total_attempts: parseInt(total.rows[0].count || 0),
      avg_score: parseInt(avg.rows[0].avg_score || 0),
      best_score: parseInt(best.rows[0].best_score || 0),
      subject_scores: [],
      recent_attempts: [],
      weekly_streak: 0,
    });

  } catch (err) {
    console.error("STATS ERROR:", err);

    return res.status(500).json({
      error: "Server error",
      detail: err.message,
    });
  }
}
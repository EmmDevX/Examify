import jwt from "jsonwebtoken";
import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const totals = await pool.query(
      `
      SELECT
        COUNT(*) AS total_attempts,

        COALESCE(
          ROUND(
            AVG(
              CASE
                WHEN total_questions > 0
                THEN ((score::decimal / total_questions) * 100)
                ELSE NULL
              END
            )::numeric,
            1
          ),
          0
        ) AS avg_score,

        COALESCE(
          ROUND(
            MAX(
              CASE
                WHEN total_questions > 0
                THEN ((score::decimal / total_questions) * 100)
                ELSE NULL
              END
            )::numeric,
            1
          ),
          0
        ) AS best_score

      FROM attempts
      WHERE user_id = $1
      AND status = 'completed'
      `,
      [userId]
    );

    const recentAttempts = await pool.query(
      `
      SELECT
        a.id,
        a.score,
        a.total_questions,
        a.completed_at,
        q.title,
        COALESCE(s.name, 'General') AS subject

      FROM attempts a
      JOIN quizzes q ON a.quiz_id = q.id
      LEFT JOIN subjects s ON q.subject_id = s.id

      WHERE a.user_id = $1
      AND a.status = 'completed'

      ORDER BY a.completed_at DESC
      LIMIT 5
      `,
      [userId]
    );

    const subjectScores = await pool.query(
      `
      SELECT
        COALESCE(s.name, 'General') AS subject,

        ROUND(
          AVG(
            CASE
              WHEN a.total_questions > 0
              THEN ((a.score::decimal / a.total_questions) * 100)
              ELSE NULL
            END
          )::numeric,
          1
        ) AS score

      FROM attempts a
      JOIN quizzes q ON a.quiz_id = q.id
      LEFT JOIN subjects s ON q.subject_id = s.id

      WHERE a.user_id = $1
      AND a.status = 'completed'

      GROUP BY s.name
      ORDER BY score DESC
      `,
      [userId]
    );

    const streakQuery = await pool.query(
      `
      SELECT
        COUNT(DISTINCT DATE(completed_at)) AS streak
      FROM attempts
      WHERE user_id = $1
      AND completed_at IS NOT NULL
      AND completed_at >= NOW() - INTERVAL '7 days'
      `,
      [userId]
    );

    return res.json({
      total_attempts: Number(totals.rows[0].total_attempts) || 0,
      avg_score: Number(totals.rows[0].avg_score) || 0,
      best_score: Number(totals.rows[0].best_score) || 0,
      weekly_streak: Number(streakQuery.rows[0].streak) || 0,
      subject_scores: subjectScores.rows || [],
      recent_attempts: recentAttempts.rows || []
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message
    });
  }
}
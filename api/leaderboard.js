import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  try {

    const result = await pool.query(`
      SELECT
        users.id,
        users.name,
        users.email,
        users.school,

        COUNT(attempts.id) AS attempts,

        ROUND(
          AVG(
            CASE
              WHEN attempts.total_questions > 0
              THEN (attempts.score::decimal / attempts.total_questions) * 100
              ELSE 0
            END
          )
        ) AS avg_score,

        ROUND(
          MAX(
            CASE
              WHEN attempts.total_questions > 0
              THEN (attempts.score::decimal / attempts.total_questions) * 100
              ELSE 0
            END
          )
        ) AS best_score

      FROM users

      LEFT JOIN attempts
      ON attempts.user_id = users.id
      AND attempts.status = 'completed'

      GROUP BY
        users.id,
        users.name,
        users.email,
        users.school

      ORDER BY
        best_score DESC NULLS LAST,
        avg_score DESC NULLS LAST

      LIMIT 20
    `);

    return res.json(result.rows);

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
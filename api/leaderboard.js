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

        ROUND(AVG(attempts.score), 1) AS avg_score,

        MAX(attempts.score) AS best_score

      FROM users

      LEFT JOIN attempts
      ON attempts.user_id = users.id

      GROUP BY
        users.id,
        users.name,
        users.email,
        users.school

      ORDER BY
        MAX(attempts.score) DESC NULLS LAST,
        AVG(attempts.score) DESC NULLS LAST

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
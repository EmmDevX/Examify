import { pool } from "../lib/db.js";

export default async function handler(req, res) {

  try {

    const attempts = await pool.query(
      "SELECT COUNT(*) FROM attempts"
    );

    const quizzes = await pool.query(
      "SELECT COUNT(*) FROM quizzes"
    );

    const users = await pool.query(
      "SELECT COUNT(*) FROM users"
    );

    return res.json({
      total_attempts: attempts.rows[0].count,
      total_quizzes: quizzes.rows[0].count,
      total_users: users.rows[0].count,
    });

  } catch (err) {

    return res.status(500).json({
      error: err.message,
    });
  }
}
import { pool } from "../../lib/db.js";

export default async function handler(req, res) {
  try {
    const users = await pool.query("SELECT COUNT(*) FROM users");
    const quizzes = await pool.query("SELECT COUNT(*) FROM quizzes");
    const attempts = await pool.query("SELECT COUNT(*) FROM attempts");

    res.status(200).json({
      total_users: users.rows[0].count,
      total_quizzes: quizzes.rows[0].count,
      total_attempts: attempts.rows[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
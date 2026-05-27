import { pool } from "../../lib/db.js";

export default async function handler(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM quizzes ORDER BY id DESC"
    );

    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
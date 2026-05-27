import { pool } from "../../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { quiz_id, user_id } = req.body;

    const result = await pool.query(
      `INSERT INTO attempts (quiz_id, user_id, score, total_questions)
       VALUES ($1, $2, 0, 0)
       RETURNING *`,
      [quiz_id, user_id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id, quiz_id, score, total_questions } = req.body;

    if (!user_id || !quiz_id) {
      return res.status(400).json({ error: "Missing fields" });
    }

    await pool.query(
      `INSERT INTO attempts (user_id, quiz_id, score, total_questions)
       VALUES ($1, $2, $3, $4)`,
      [user_id, quiz_id, score, total_questions]
    );

    res.status(200).json({ message: "Attempt saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

const { pool } = require("../lib/db");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { quiz_id } = req.body;

      const qr = await pool.query(
        "SELECT total_questions FROM quizzes WHERE id=$1",
        [quiz_id]
      );

      if (!qr.rows.length) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      const result = await pool.query(
        `INSERT INTO attempts (user_id, quiz_id, total_questions)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.session?.userId || 1, quiz_id, qr.rows[0].total_questions]
      );

      return res.json(result.rows[0]);
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
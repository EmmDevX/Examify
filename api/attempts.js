const { pool } = require("../lib/db");

module.exports = async function handler(req, res) {
  try {
    const { action, id } = req.query;

    // CREATE ATTEMPT
    if (req.method === "POST" && !action) {
      const { quiz_id } = req.body;

      const qr = await pool.query(
        "SELECT total_questions FROM quizzes WHERE id=$1",
        [quiz_id]
      );

      const result = await pool.query(
        `INSERT INTO attempts (user_id, quiz_id, total_questions)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [1, quiz_id, qr.rows[0].total_questions]
      );

      return res.json(result.rows[0]);
    }

    // SUBMIT ATTEMPT
    if (req.method === "POST" && action === "submit") {
      const { answers } = req.body;

      const attempt = await pool.query(
        "SELECT * FROM attempts WHERE id=$1",
        [id]
      );

      if (!attempt.rows.length) {
        return res.status(404).json({ error: "Attempt not found" });
      }

      let score = 0;

      for (const [qid, opt] of Object.entries(answers || {})) {
        const q = await pool.query(
          "SELECT correct_option FROM questions WHERE id=$1",
          [qid]
        );

        const correct = q.rows[0]?.correct_option === opt;

        if (correct) score++;

        await pool.query(
          `INSERT INTO answers (attempt_id, question_id, selected_option, is_correct)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT DO NOTHING`,
          [id, qid, opt, correct]
        );
      }

      const updated = await pool.query(
        `UPDATE attempts 
         SET score=$1, status='completed', completed_at=NOW()
         WHERE id=$2 RETURNING *`,
        [score, id]
      );

      return res.json(updated.rows[0]);
    }

    return res.status(405).json({ error: "Invalid request" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
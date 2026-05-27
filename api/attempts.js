import { pool } from "../lib/db.js";

export default async function handler(req, res) {

  const action = req.query.action;

  try {

    // CREATE ATTEMPT
    if (action === "create") {

      const { quiz_id } = req.body;

      const result = await pool.query(
        `INSERT INTO attempts(quiz_id)
         VALUES($1)
         RETURNING *`,
        [quiz_id]
      );

      return res.json(result.rows[0]);
    }

    // SUBMIT QUIZ
    if (action === "submit") {

      const id = req.query.id;

      const { answers } = req.body;

      const questions = await pool.query(
        "SELECT * FROM questions WHERE quiz_id=(SELECT quiz_id FROM attempts WHERE id=$1)",
        [id]
      );

      let score = 0;

      questions.rows.forEach((q) => {
        if (answers[q.id] === q.correct_option) {
          score++;
        }
      });

      await pool.query(
        "UPDATE attempts SET score=$1, completed_at=NOW() WHERE id=$2",
        [score, id]
      );

      return res.json({
        id,
        score,
      });
    }

    return res.status(404).json({
      error: "Invalid action",
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
import { pool } from "../../../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const attemptId = req.query.id;
    const { answers } = req.body;

    const attempt = await pool.query(
      "SELECT * FROM attempts WHERE id = $1",
      [attemptId]
    );

    const quizId = attempt.rows[0].quiz_id;

    const questions = await pool.query(
      "SELECT id, correct_option FROM questions WHERE quiz_id = $1",
      [quizId]
    );

    let score = 0;

    questions.rows.forEach(q => {
      if (answers[q.id] === q.correct_option) {
        score++;
      }
    });

    await pool.query(
      `UPDATE attempts
       SET score = $1, total_questions = $2
       WHERE id = $3`,
      [score, questions.rows.length, attemptId]
    );

    res.status(200).json({
      id: attemptId,
      score,
      total_questions: questions.rows.length
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
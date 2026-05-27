import { pool } from "../lib/db.js";

export default async function handler(req, res) {

  const action = req.query.action;

  try {

    // ALL QUIZZES
    if (!action) {

      const result = await pool.query(`
        SELECT quizzes.*, subjects.name AS subject_name,
        subjects.code AS subject_code
        FROM quizzes
        LEFT JOIN subjects
        ON subjects.id = quizzes.subject_id
        ORDER BY quizzes.id DESC
      `);

      return res.json(result.rows);
    }

    // SINGLE QUIZ
    if (action === "single") {

      const id = req.query.id;

      const result = await pool.query(
        "SELECT * FROM quizzes WHERE id=$1",
        [id]
      );

      return res.json(result.rows[0]);
    }

    // QUESTIONS
    if (action === "questions") {

      const id = req.query.id;

      const result = await pool.query(
        "SELECT * FROM questions WHERE quiz_id=$1",
        [id]
      );

      return res.json(result.rows);
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
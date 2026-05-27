import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  const type = req.query.type;

  try {
    if (type === "stats") {
      const users = await pool.query("SELECT COUNT(*) FROM users");

      const quizzes = await pool.query("SELECT COUNT(*) FROM quizzes");

      const attempts = await pool.query("SELECT COUNT(*) FROM attempts");

      const avg = await pool.query(
        "SELECT COALESCE(AVG(score),0) FROM attempts",
      );

      return res.json({
        users: users.rows[0].count,
        quizzes: quizzes.rows[0].count,
        attempts: attempts.rows[0].count,
        avg_score: Math.round(avg.rows[0].coalesce || avg.rows[0].avg || 0),
      });
    }

    if (type === "users") {
      const result = await pool.query(`
        SELECT 
          id,
          name,
          email,
          role,
          created_at,
          (
            SELECT COUNT(*) 
            FROM attempts a 
            WHERE a.user_id = users.id
          ) AS attempt_count
        FROM users
        ORDER BY id DESC
      `);

      return res.json(result.rows);
    }

    if (type === "quizzes") {
      const result = await pool.query(`
        SELECT 
          q.*,
          s.name AS subject_name,
          (
            SELECT COUNT(*) 
            FROM questions 
            WHERE quiz_id = q.id
          ) AS question_count
        FROM quizzes q
        LEFT JOIN subjects s ON q.subject_id = s.id
        ORDER BY q.id DESC
      `);

      return res.json(result.rows);
    }

    if (type === "createQuiz") {
      const {
        title,
        description,
        subject_id,
        duration_minutes,
        status,
        scheduled_at,
      } = req.body;

      const result = await pool.query(
        `INSERT INTO quizzes 
        (title, description, subject_id, duration_minutes, status, scheduled_at)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *`,
        [
          title,
          description,
          subject_id,
          duration_minutes,
          status,
          scheduled_at,
        ],
      );

      return res.json(result.rows[0]);
    }

    if (type === "updateQuiz") {
      const { id } = req.query;
      const {
        title,
        description,
        subject_id,
        duration_minutes,
        status,
        scheduled_at,
      } = req.body;

      const result = await pool.query(
        `UPDATE quizzes SET
          title=$1,
          description=$2,
          subject_id=$3,
          duration_minutes=$4,
          status=$5,
          scheduled_at=$6
        WHERE id=$7
        RETURNING *`,
        [
          title,
          description,
          subject_id,
          duration_minutes,
          status,
          scheduled_at,
          id,
        ],
      );

      return res.json(result.rows[0]);
    }

    if (type === "deleteQuiz") {
      const { id } = req.query;

      await pool.query("DELETE FROM quizzes WHERE id=$1", [id]);

      return res.json({ success: true });
    }

    if (type === "questions") {
      const { quiz_id } = req.query;

      const result = await pool.query(
        "SELECT * FROM questions WHERE quiz_id=$1 ORDER BY id ASC",
        [quiz_id],
      );

      return res.json(result.rows);
    }

    if (type === "addQuestion") {
      console.log("QUERY:", req.query);
      console.log("BODY:", req.body);
      const {
        quiz_id,
        text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        explanation,
      } = req.body;

      const result = await pool.query(
        `INSERT INTO questions 
        (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, explanation)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [
          quiz_id,
          text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option,
          explanation,
        ],
      );

      return res.json(result.rows[0]);
    }

    if (type === "deleteQuestion") {
      const { id } = req.query;

      await pool.query("DELETE FROM questions WHERE id=$1", [id]);

      return res.json({ success: true });
    }

    return res.status(404).json({
      error: "Invalid type",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}

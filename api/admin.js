import { pool } from "../lib/db.js";

export default async function handler(req, res) {

  const type = req.query.type;

  try {

    // STATS
    if (type === "stats") {

      const users = await pool.query(
        "SELECT COUNT(*) FROM users"
      );

      const quizzes = await pool.query(
        "SELECT COUNT(*) FROM quizzes"
      );

      return res.json({
        users: users.rows[0].count,
        quizzes: quizzes.rows[0].count,
      });
    }

    // USERS
    if (type === "users") {

      const result = await pool.query(
        "SELECT id,name,email,role FROM users ORDER BY id DESC"
      );

      return res.json(result.rows);
    }

    // QUIZZES
    if (type === "quizzes") {

      const result = await pool.query(
        "SELECT * FROM quizzes ORDER BY id DESC"
      );

      return res.json(result.rows);
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
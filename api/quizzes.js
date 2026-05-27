import { pool } from "../db.js";

export default async function handler(req, res) {
  try {
    const { subject_id } = req.query;

    let query = `
      SELECT qz.*, s.name AS subject_name, s.code AS subject_code
      FROM quizzes qz
      LEFT JOIN subjects s ON qz.subject_id = s.id
      WHERE qz.status = 'published'
    `;

    const params = [];

    if (subject_id) {
      params.push(subject_id);
      query += ` AND qz.subject_id = $${params.length}`;
    }

    query += " ORDER BY qz.created_at DESC";

    const result = await pool.query(query, params);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
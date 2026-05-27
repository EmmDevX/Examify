import { pool } from "../lib/db.js";

export default async function handler(req, res) {

  try {

    const result = await pool.query(
      "SELECT * FROM subjects ORDER BY name ASC"
    );

    return res.json(result.rows);

  } catch (err) {

    return res.status(500).json({
      error: err.message,
    });
  }
}
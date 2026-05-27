import { pool } from "../../lib/db.js";

export default async function handler(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM subjects ORDER BY name"
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
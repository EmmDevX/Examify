import bcrypt from "bcryptjs";
import { pool } from "../../lib/db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { name, email, password } = req.body;

    console.log("REGISTER HIT:", { name, email });

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const exists = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email.toLowerCase()]
    );

    if (exists.rows.length) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1,$2,$3,$4) RETURNING id, name, email, role`,
      [name, email.toLowerCase(), hash, "student"]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("REGISTER ERROR:", err);

    return res.status(500).json({
      error: "Register failed",
      detail: err.message,
    });
  }
}
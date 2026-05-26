import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { safeUser } from "../auth.js";

export default async function handler(req, res) {
  const { name, email, password } = req.body;

  const exists = await pool.query(
    "SELECT id FROM users WHERE email=$1",
    [email.toLowerCase()]
  );

  if (exists.rows.length) {
    return res.status(400).json({ error: "Email exists" });
  }

  const hash = await bcrypt.hash(password, 12);

  const r = await pool.query(
    "INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'student') RETURNING *",
    [name, email.toLowerCase(), hash]
  );

  res.setHeader("Set-Cookie", `userId=${r.rows[0].id}; Path=/; HttpOnly`);

  res.json(safeUser(r.rows[0]));
}
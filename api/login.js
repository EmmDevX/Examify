import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { safeUser } from "./auth/me.js";

export default async function handler(req, res) {
  const { email, password } = req.body;

  const r = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email.toLowerCase()]
  );

  if (!r.rows.length) {
    return res.status(401).json({ error: "Invalid login" });
  }

  const user = r.rows[0];

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ error: "Invalid login" });
  }

  res.setHeader("Set-Cookie", `userId=${user.id}; Path=/; HttpOnly`);

  res.json(safeUser(user));
}
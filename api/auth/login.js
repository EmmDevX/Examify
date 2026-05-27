import bcrypt from "bcryptjs";
import { pool } from "../../lib/db.js";
import * as cookie from "cookie";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.setHeader(
      "Set-Cookie",
      cookie.serialize("userId", String(user.id), {
        httpOnly: true,
        path: "/",
        sameSite: "none",
        secure: true,
        maxAge: 60 * 60 * 24 * 7,
      })
    );

    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      error: "Login failed",
      detail: err.message,
    });
  }
}
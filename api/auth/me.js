import { pool } from "../../lib/db.js";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const userId = cookies.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const result = await pool.query(
      "SELECT id, name, email, role, school FROM users WHERE id = $1",
      [userId]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "User not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("ME ERROR:", err); // IMPORTANT: check Vercel logs
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
}
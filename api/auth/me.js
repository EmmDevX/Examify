import pool from "../../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    // Example: you stored userId in cookie
    const userId = req.cookies.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const user = await pool.query(
      "SELECT id, email, name FROM users WHERE id = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    res.status(200).json(user.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}
import bcrypt from "bcryptjs";
import * as cookie from "cookie";
import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  const action = req.query.action;

  try {

    // REGISTER
    if (action === "register") {

      const { name, email, password } = req.body;

      const hash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users(name,email,password_hash)
         VALUES($1,$2,$3)
         RETURNING id,name,email,role`,
        [name, email.toLowerCase(), hash]
      );

      return res.status(201).json(result.rows[0]);
    }

    // LOGIN
    if (action === "login") {

      const { email, password } = req.body;

      const result = await pool.query(
        "SELECT * FROM users WHERE email=$1",
        [email.toLowerCase()]
      );

      if (!result.rows.length) {
        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      const user = result.rows[0];

      const valid = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!valid) {
        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      res.setHeader(
        "Set-Cookie",
        cookie.serialize("userId", String(user.id), {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        })
      );

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    }

    // ME
    if (action === "me") {

      const cookies = cookie.parse(
        req.headers.cookie || ""
      );

      const userId = cookies.userId;

      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }

      const result = await pool.query(
        "SELECT id,name,email,role FROM users WHERE id=$1",
        [userId]
      );

      if (!result.rows.length) {
        return res.status(401).json({
          error: "User not found",
        });
      }

      return res.json(result.rows[0]);
    }

    // LOGOUT
    if (action === "logout") {

      res.setHeader(
        "Set-Cookie",
        cookie.serialize("userId", "", {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          expires: new Date(0),
        })
      );

      return res.json({
        success: true,
      });
    }

    return res.status(404).json({
      error: "Invalid action",
    });

  } catch (err) {

    console.error("AUTH ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
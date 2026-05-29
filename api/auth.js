import bcrypt from "bcryptjs";
import * as cookie from "cookie";
import jwt from "jsonwebtoken";
import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  const action = req.query.action;

  try {

    if (action === "register") {

      const { name, email, password } = req.body;

      const existing = await pool.query(
        "SELECT id FROM users WHERE email=$1",
        [email.toLowerCase()]
      );

      if (existing.rows.length) {
        return res.status(409).json({
          error: "Email already exists",
        });
      }

      const hash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users(name,email,password_hash)
         VALUES($1,$2,$3)
         RETURNING id,name,email,role`,
        [name, email.toLowerCase(), hash]
      );

      return res.status(201).json(result.rows[0]);
    }

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

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.setHeader(
        "Set-Cookie",
        cookie.serialize("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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

    if (action === "me") {

      const cookies = cookie.parse(
        req.headers.cookie || ""
      );

      const token = cookies.token;

      if (!token) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }

      let decoded;

      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({
          error: "Invalid token",
        });
      }

      const userId = decoded.id;

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

    if (action === "logout") {

      res.setHeader(
        "Set-Cookie",
        cookie.serialize("token", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
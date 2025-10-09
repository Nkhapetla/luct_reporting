// =====================
// auth.js
// =====================
const express = require("express");
const bcrypt = require("bcrypt");
const db = require("./db"); // CommonJS, no .js extension

const router = express.Router();

// Allowed roles
const ALLOWED_ROLES = ["student", "lecturer", "prl", "pl"];

// =====================
// Register a new user
// =====================
router.post("/register", async (req, res) => {
  const { name, email, password, role, stream, class_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!ALLOWED_ROLES.includes(role.toLowerCase())) {
    return res.status(400).json({ error: "Invalid role" });
  }

  // Additional checks for specific roles
  if (role.toLowerCase() === "prl" && !stream) {
    return res.status(400).json({ error: "Stream is required for PRL" });
  }

  if (role.toLowerCase() === "student" && !class_id) {
    return res.status(400).json({ error: "Class selection is required for student" });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Build the INSERT query based on role
    let sql, params;

    if (role.toLowerCase() === "student") {
      sql = "INSERT INTO users (name, email, password, role, class_id) VALUES (?, ?, ?, ?, ?)";
      params = [name, email.toLowerCase(), hashedPassword, role.toLowerCase(), class_id];
    } else if (role.toLowerCase() === "prl") {
      sql = "INSERT INTO users (name, email, password, role, stream) VALUES (?, ?, ?, ?, ?)";
      params = [name, email.toLowerCase(), hashedPassword, role.toLowerCase(), stream];
    } else {
      sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
      params = [name, email.toLowerCase(), hashedPassword, role.toLowerCase()];
    }

    db.query(sql, params, (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "Email already exists" });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "User registered", id: result.insertId });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================
// Login user
// =====================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sql = "SELECT * FROM users WHERE LOWER(email) = LOWER(?)";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(400).json({ error: "User not found" });

    const user = results[0];

    try {
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ error: "Incorrect password" });

      // Ensure role is always lowercase and valid
      const role = user.role?.toLowerCase();
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: "Unknown role" });
      }

      // Build user object to send
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
      };

      if (role === "student") {
        userData.class_id = user.class_id;
      } else if (role === "prl") {
        userData.stream = user.stream;
      }

      res.json({
        message: "Login successful",
        user: userData,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
});

module.exports = router;

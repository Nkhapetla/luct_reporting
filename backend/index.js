// =====================
// index.js (COMPLETE WITH ALL APIS - CORRECTED)
// =====================
const ExcelJS = require('exceljs');
const express = require("express");
const cors = require("cors");
const db = require("./db");
require("dotenv").config();

const authRoutes = require("./auth");

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://luct-reporting-theta.vercel.app",
    "https://luct-reporting-cfvn.onrender.com"
  ],
  credentials: true
}));
app.use(express.json());

// =====================
// Request logging middleware
// =====================
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.body || '');
  next();
});

// =====================
// Helper middleware for role-based access
// =====================
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const role = (req.body && req.body.role) || req.headers["x-user-role"];
    console.log("🔐 Role check:", role, "Allowed:", allowedRoles);
    
    if (!role || !allowedRoles.includes(role.toLowerCase())) {
      return res.status(403).json({ error: "Access denied: insufficient role" });
    }
    next();
  };
}

// =====================
// Database Connection Test Endpoint
// =====================
app.get("/api/test-db", (req, res) => {
  console.log("🧪 Testing database connection...");
  db.query("SELECT 1 + 1 AS solution", (err, results) => {
    if (err) {
      console.error("❌ Database connection failed:", err.message);
      return res.status(500).json({ 
        error: "DB connection failed", 
        details: err.message 
      });
    }
    console.log("✅ Database connected successfully");
    res.json({ 
      message: "DB connected successfully", 
      result: results[0].solution 
    });
  });
});

// =====================
// Auth routes
// =====================
app.use("/api/auth", authRoutes);

// =====================
// Test route
// =====================
app.get("/", (req, res) => {
  res.send("Backend is working!");
});

// =====================
// LECTURER APIs: Get lecturer by ID
// =====================
app.get("/api/lecturer/:id", (req, res) => {
  const lecturerId = req.params.id;
  console.log("👨‍🏫 Fetching lecturer details:", lecturerId);

  const sql = `
    SELECT 
      id,
      name,
      email,
      faculty,
      stream
    FROM users 
    WHERE id = ? AND role = 'lecturer'
  `;

  db.query(sql, [lecturerId], (err, results) => {
    if (err) {
      console.error("❌ Lecturer fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (!results.length) {
      console.error("❌ Lecturer not found:", lecturerId);
      return res.status(404).json({ error: "Lecturer not found" });
    }
    
    console.log("✅ Lecturer found:", results[0].name);
    res.json(results[0]);
  });
});

// =====================
// LECTURERS APIs: Get all lecturers (PLURAL - FOR DROPDOWN) - ADDED THIS ENDPOINT
// =====================
app.get("/api/lecturers", (req, res) => {
  console.log("👨‍🏫 Fetching all lecturers for dropdown...");
  
  const sql = `
    SELECT 
      id, 
      name,
      email,
      faculty,
      stream
    FROM users 
    WHERE role = 'lecturer'
    ORDER BY name
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Lecturers fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} lecturers for dropdown`);
    res.json(results);
  });
});

// =====================
// STUDENTS APIs: Get all students
// =====================
app.get("/api/students", (req, res) => {
  console.log("👨‍🎓 Fetching all students...");
  
  const sql = `
    SELECT 
      id, 
      name,
      email,
      student_id,
      stream,
      class_id
    FROM users 
    WHERE role = 'student'
    ORDER BY name
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Students fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} students`);
    res.json(results);
  });
});

// =====================
// COURSES APIs
// =====================
app.get("/api/courses", (req, res) => {
  console.log("📦 Fetching all courses...");
  
  db.query(
    "SELECT id, course_code, course_name, stream, venue, scheduled_time, lecturer_id FROM courses",
    (err, results) => {
      if (err) {
        console.error("❌ Courses fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Found ${results.length} courses`);
      res.json(results);
    }
  );
});

app.post("/api/courses", requireRole(["pl"]), (req, res) => {
  const { course_code, course_name, stream, venue, scheduled_time, lecturer_id } = req.body;
  console.log("📝 Adding new course:", { course_code, course_name, stream, venue, scheduled_time, lecturer_id });
  
  if (!course_code || !course_name || !stream)
    return res.status(400).json({ error: "Course code, name, and stream are required" });

  const sql = "INSERT INTO courses (course_code, course_name, stream, venue, scheduled_time, lecturer_id) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [course_code, course_name, stream, venue || null, scheduled_time || null, lecturer_id || null], (err, result) => {
    if (err) {
      console.error("❌ Course creation error:", err.message);
      if (err.code === "ER_DUP_ENTRY")
        return res.status(400).json({ error: "Course code already exists" });
      return res.status(500).json({ error: err.message });
    }
    console.log("✅ Course added successfully, ID:", result.insertId);
    res.json({ message: "Course added", id: result.insertId });
  });
});

// =====================
// CLASSES APIs (USING CLASS_COURSES MAPPING)
// =====================
app.get("/api/classes", (req, res) => {
  console.log("🏫 Fetching all classes...");
  
  const sql = `
    SELECT 
      c.id, 
      c.class_name, 
      c.total_registered,
      c.faculty,
      GROUP_CONCAT(co.course_name) AS course_names,
      GROUP_CONCAT(co.course_code) AS course_codes
    FROM classes c
    LEFT JOIN class_courses cc ON c.id = cc.class_id
    LEFT JOIN courses co ON cc.course_id = co.id
    GROUP BY c.id, c.class_name, c.total_registered, c.faculty
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Classes fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} classes`);
    res.json(results);
  });
});

app.post("/api/classes", requireRole(["pl"]), (req, res) => {
  const { class_name, total_registered, faculty } = req.body;
  console.log("📝 Adding new class:", { class_name, total_registered, faculty });
  
  if (!class_name || !total_registered || !faculty)
    return res.status(400).json({ error: "Class name, total registered, and faculty are required" });

  const sql = `
    INSERT INTO classes (class_name, total_registered, faculty)
    VALUES (?, ?, ?)
  `;
  db.query(sql, [class_name, total_registered, faculty], (err, result) => {
    if (err) {
      console.error("❌ Class creation error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log("✅ Class added successfully, ID:", result.insertId);
    res.json({ message: "Class added", id: result.insertId });
  });
});

// =====================
// CLASS_COURSES Mapping APIs (THIS IS THE KEY!)
// =====================
app.get("/api/class-courses", (req, res) => {
  console.log("🔗 Fetching class-course mappings...");
  
  const sql = `
    SELECT 
      cc.id,
      cc.class_id,
      cc.course_id,
      c.class_name,
      c.faculty,
      co.course_code,
      co.course_name,
      co.lecturer_id
    FROM class_courses cc
    JOIN classes c ON cc.class_id = c.id
    JOIN courses co ON cc.course_id = co.id
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Class-courses fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} class-course mappings`);
    res.json(results);
  });
});

app.post("/api/classes_courses", requireRole(["pl"]), (req, res) => {
  const { class_id, course_id } = req.body;
  console.log("🔗 Linking class to course:", { class_id, course_id });
  
  if (!class_id || !course_id)
    return res.status(400).json({ error: "Class ID and Course ID are required" });

  const sql = "INSERT INTO class_courses (class_id, course_id) VALUES (?, ?)";
  db.query(sql, [class_id, course_id], (err, result) => {
    if (err) {
      console.error("❌ Class-course linking error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log("✅ Course assigned to class successfully");
    res.json({ message: "Course assigned to class", id: result.insertId });
  });
});

// =====================
// STUDENT APIs: Get courses of logged-in student (FIXED WITH CLASS_COURSES + DUPLICATES)
// =====================
app.get("/api/student/classes/:studentId", requireRole(["student"]), (req, res) => {
  const studentId = req.params.studentId;
  console.log("🎓 Fetching courses for student:", studentId);

  // Step 1: Get student's class_id
  const sqlGetClass = "SELECT class_id FROM users WHERE id = ?";
  db.query(sqlGetClass, [studentId], (err, classResult) => {
    if (err) {
      console.error("❌ Student class fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (!classResult.length || !classResult[0].class_id) {
      console.error("❌ Student or class not found for ID:", studentId);
      return res.status(404).json({ error: "Student or class not found" });
    }

    const classId = classResult[0].class_id;
    console.log("📚 Student belongs to class ID:", classId);

    // Step 2: FIXED QUERY - Get courses through class_courses mapping table WITH DISTINCT
    const sqlCourses = `
      SELECT DISTINCT
        co.id AS course_id,
        co.course_code,
        co.course_name,
        co.stream,
        co.venue,
        co.scheduled_time,
        c.id AS class_id,
        c.class_name,
        c.total_registered,
        u.name AS lecturer_name,
        IFNULL(a.present, 0) AS present
      FROM class_courses cc
      JOIN courses co ON cc.course_id = co.id
      JOIN classes c ON cc.class_id = c.id
      LEFT JOIN users u ON co.lecturer_id = u.id
      LEFT JOIN attendance a ON a.class_id = c.id AND a.student_id = ?
      WHERE cc.class_id = ?
    `;

    db.query(sqlCourses, [studentId, classId], (err, results) => {
      if (err) {
        console.error("❌ Student courses fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Found ${results.length} unique courses for student`);
      res.json(results);
    });
  });
});

// =====================
// STUDENT APIs: Mark Attendance
// =====================
app.post("/api/student/attendance", requireRole(["student"]), (req, res) => {
  const { student_id, class_id, present } = req.body;
  console.log("✅ Marking attendance:", { student_id, class_id, present });

  if (!student_id || !class_id || present === undefined)
    return res.status(400).json({ error: "Missing fields" });

  const sqlCheck = "SELECT id FROM users WHERE id = ? AND class_id = ?";
  db.query(sqlCheck, [student_id, class_id], (err, checkResult) => {
    if (err) {
      console.error("❌ Attendance validation error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (!checkResult.length) {
      console.error("❌ Student or class not found for attendance");
      return res.status(404).json({ error: "Student or class not found" });
    }

    const sql = `
      INSERT INTO attendance (student_id, class_id, present, date)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE present = ?;
    `;
    db.query(sql, [student_id, class_id, present, present], (err) => {
      if (err) {
        console.error("❌ Attendance update error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log("✅ Attendance recorded successfully");
      res.json({ message: "Attendance recorded" });
    });
  });
});

// =====================
// RATING APIs (FIXED FOR YOUR TABLE STRUCTURE)
// =====================

// Submit rating for lecturer
app.post("/api/student/rating", requireRole(["student"]), (req, res) => {
  const { student_id, lecturer_id, rating, comment } = req.body;
  
  console.log("⭐ Submitting rating:", { student_id, lecturer_id, rating, comment });

  // Validate required fields
  if (!student_id || !lecturer_id || !rating) {
    return res.status(400).json({ error: "Student ID, lecturer ID, and rating are required" });
  }

  // Validate rating range
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  // Check if student exists
  const checkStudentSql = "SELECT id FROM users WHERE id = ? AND role = 'student'";
  db.query(checkStudentSql, [student_id], (err, studentResult) => {
    if (err) {
      console.error("❌ Student check error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (!studentResult.length) {
      console.error("❌ Student not found:", student_id);
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if lecturer exists
    const checkLecturerSql = "SELECT id FROM users WHERE id = ? AND role = 'lecturer'";
    db.query(checkLecturerSql, [lecturer_id], (err, lecturerResult) => {
      if (err) {
        console.error("❌ Lecturer check error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!lecturerResult.length) {
        console.error("❌ Lecturer not found:", lecturer_id);
        return res.status(404).json({ error: "Lecturer not found" });
      }

      // Insert or update rating (allow only one rating per student per lecturer)
      const sql = `
        INSERT INTO rating (student_id, lecturer_id, rating, comment)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE rating = ?, comment = ?
      `;
      
      db.query(sql, [student_id, lecturer_id, rating, comment, rating, comment], (err, result) => {
        if (err) {
          console.error("❌ Rating submission error:", err.message);
          return res.status(500).json({ error: err.message });
        }
        
        console.log("✅ Rating submitted successfully");
        res.json({ 
          message: "Rating submitted successfully", 
          id: result.insertId,
          action: result.affectedRows === 1 ? 'created' : 'updated'
        });
      });
    });
  });
});

// Get student's previous ratings
app.get("/api/student/ratings/:studentId", requireRole(["student"]), (req, res) => {
  const studentId = req.params.studentId;
  console.log("📊 Fetching ratings for student:", studentId);

  const sql = `
    SELECT 
      r.id,
      r.lecturer_id,
      u.name AS lecturer_name,
      r.rating,
      r.comment
    FROM rating r
    JOIN users u ON r.lecturer_id = u.id
    WHERE r.student_id = ?
    ORDER BY r.id DESC
  `;
  
  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error("❌ Ratings fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} ratings for student`);
    res.json(results);
  });
});

// =====================
// LECTURER APIs: Get courses taught by lecturer
// =====================
app.get("/api/lecturer/courses/:lecturerId", requireRole(["lecturer"]), (req, res) => {
  const lecturerId = req.params.lecturerId;
  console.log("👨‍🏫 Fetching courses for lecturer:", lecturerId);

  const sql = `
    SELECT 
      id,
      course_code,
      course_name,
      stream,
      venue,
      scheduled_time
    FROM courses 
    WHERE lecturer_id = ?
    ORDER BY course_name
  `;

  db.query(sql, [lecturerId], (err, results) => {
    if (err) {
      console.error("❌ Lecturer courses fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} courses for lecturer`);
    res.json(results);
  });
});

// =====================
// LECTURER APIs: Get monitoring data for lecturer
// =====================
app.get("/api/lecturer/monitoring/:lecturerId", requireRole(["lecturer"]), (req, res) => {
  const lecturerId = req.params.lecturerId;
  console.log("📊 Fetching monitoring data for lecturer:", lecturerId);

  const sql = `
    SELECT 
      a.student_id,
      u.name AS student_name,
      c.id AS course_id,
      c.course_code,
      c.course_name,
      cls.class_name,
      c.venue,
      c.scheduled_time,
      a.present,
      a.date,
      a.class_id
    FROM attendance a
    JOIN classes cls ON a.class_id = cls.id
    JOIN class_courses cc ON cls.id = cc.class_id
    JOIN courses c ON cc.course_id = c.id
    JOIN users u ON a.student_id = u.id
    WHERE c.lecturer_id = ?
    ORDER BY a.date DESC, c.course_name, u.name
  `;

  db.query(sql, [lecturerId], (err, results) => {
    if (err) {
      console.error("❌ Lecturer monitoring data fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} attendance records for lecturer`);
    res.json(results);
  });
});

// =====================
// LECTURER CLASS RATING APIs
// =====================

// Get classes taught by lecturer for rating
app.get("/api/lecturer/classes/:lecturerId", requireRole(["lecturer"]), (req, res) => {
  const lecturerId = req.params.lecturerId;
  console.log("👨‍🏫 Fetching classes for lecturer:", lecturerId);

  const sql = `
    SELECT DISTINCT
      c.id AS class_id,
      c.class_name,
      c.faculty,
      co.id AS course_id,
      co.course_code,
      co.course_name,
      co.stream,
      co.venue,
      co.scheduled_time
    FROM courses co
    JOIN class_courses cc ON co.id = cc.course_id
    JOIN classes c ON cc.class_id = c.id
    WHERE co.lecturer_id = ?
    ORDER BY c.class_name, co.course_name
  `;

  db.query(sql, [lecturerId], (err, results) => {
    if (err) {
      console.error("❌ Lecturer classes fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} classes for lecturer`);
    res.json(results);
  });
});

// Submit class rating by lecturer
app.post("/api/lecturer/class-rating", requireRole(["lecturer"]), (req, res) => {
  const { lecturer_id, class_id, course_id, rating, comment } = req.body;
  
  console.log("⭐ Lecturer submitting class rating:", { lecturer_id, class_id, course_id, rating });

  // Validate required fields
  if (!lecturer_id || !class_id || !course_id || !rating) {
    return res.status(400).json({ error: "Lecturer ID, Class ID, Course ID, and rating are required" });
  }

  // Validate rating range
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  // Check if lecturer is actually teaching this class+course
  const checkSql = `
    SELECT 1 FROM courses co
    JOIN class_courses cc ON co.id = cc.course_id
    WHERE co.lecturer_id = ? AND cc.class_id = ? AND co.id = ?
  `;
  
  db.query(checkSql, [lecturer_id, class_id, course_id], (err, checkResult) => {
    if (err) {
      console.error("❌ Lecturer assignment check error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (!checkResult.length) {
      console.error("❌ Lecturer not assigned to this class/course");
      return res.status(403).json({ error: "You are not assigned to teach this class/course" });
    }

    // Insert or update rating in the lecturer_class_ratings table
    const sql = `
      INSERT INTO lecturer_class_ratings (lecturer_id, class_id, course_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE rating = ?, comment = ?, created_at = CURRENT_TIMESTAMP
    `;
    
    db.query(sql, [lecturer_id, class_id, course_id, rating, comment, rating, comment], (err, result) => {
      if (err) {
        console.error("❌ Lecturer class rating submission error:", err.message);
        return res.status(500).json({ error: err.message });
      }
      
      console.log("✅ Lecturer class rating submitted successfully");
      res.json({ 
        message: "Class rating submitted successfully", 
        id: result.insertId,
        action: result.affectedRows === 1 ? 'created' : 'updated'
      });
    });
  });
});

// Get lecturer's previous class ratings
app.get("/api/lecturer/class-ratings/:lecturerId", requireRole(["lecturer"]), (req, res) => {
  const lecturerId = req.params.lecturerId;
  console.log("📊 Fetching class ratings for lecturer:", lecturerId);

  const sql = `
    SELECT 
      lcr.id,
      lcr.class_id,
      lcr.course_id,
      lcr.rating,
      lcr.comment,
      lcr.created_at,
      c.class_name,
      co.course_code,
      co.course_name
    FROM lecturer_class_ratings lcr
    JOIN classes c ON lcr.class_id = c.id
    JOIN courses co ON lcr.course_id = co.id
    WHERE lcr.lecturer_id = ?
    ORDER BY lcr.created_at DESC
  `;
  
  db.query(sql, [lecturerId], (err, results) => {
    if (err) {
      console.error("❌ Lecturer class ratings fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} class ratings for lecturer`);
    res.json(results);
  });
});

// =====================
// PRL RATING APIs (NEW - FOR PRL RATINGS COMPONENT)
// =====================

// Get data from rating table for PRL
app.get("/api/prl/rating", requireRole(["pl"]), (req, res) => {
  try {
    const userStream = req.headers['x-user-stream'];
    const { startDate, endDate } = req.query;
    
    console.log("⭐ PRL fetching rating data for stream:", userStream);
    
    let query = `
      SELECT r.*, 
             l.name as lecturer_name, 
             l.email as lecturer_email,
             s.name as student_name,
             s.student_code,
             s.stream
      FROM rating r
      LEFT JOIN users l ON r.lecturer_id = l.id
      LEFT JOIN users s ON r.student_id = s.id
      WHERE s.stream = ?
    `;
    
    const params = [userStream];
    
    if (startDate) {
      query += ' AND DATE(r.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(r.created_at) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    db.query(query, params, (err, results) => {
      if (err) {
        console.error('❌ PRL rating fetch error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Found ${results.length} rating records for PRL`);
      res.json(results);
    });
  } catch (error) {
    console.error('❌ PRL rating endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get data from lecturer_class_ratings table for PRL
app.get("/api/prl/lecturer_class_ratings", requireRole(["pl"]), (req, res) => {
  try {
    const userStream = req.headers['x-user-stream'];
    const { startDate, endDate } = req.query;
    
    console.log("⭐ PRL fetching lecturer_class_ratings for stream:", userStream);
    
    let query = `
      SELECT lcr.*, 
             l.name as lecturer_name, 
             l.email as lecturer_email,
             c.course_name, 
             c.course_code,
             c.stream,
             cls.class_name
      FROM lecturer_class_ratings lcr
      LEFT JOIN users l ON lcr.lecturer_id = l.id
      LEFT JOIN courses c ON lcr.course_id = c.id
      LEFT JOIN classes cls ON lcr.class_id = cls.id
      WHERE c.stream = ?
    `;
    
    const params = [userStream];
    
    if (startDate) {
      query += ' AND DATE(lcr.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(lcr.created_at) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY lcr.created_at DESC';
    
    db.query(query, params, (err, results) => {
      if (err) {
        console.error('❌ PRL lecturer_class_ratings fetch error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Found ${results.length} lecturer_class_ratings records for PRL`);
      res.json(results);
    });
  } catch (error) {
    console.error('❌ PRL lecturer_class_ratings endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// LECTURER REPORTS APIs (NEW - FOR REPORTS COMPONENT)
// =====================

// Get classes taught by lecturer (FOR REPORTS)
app.get("/api/lecturer/:lecturerId/classes", requireRole(["lecturer"]), (req, res) => {
  const lecturerId = req.params.lecturerId;
  console.log("👨‍🏫 Fetching classes for lecturer (reports):", lecturerId);

  const sql = `
    SELECT DISTINCT
      c.id AS class_id,
      c.class_name,
      c.total_registered,
      c.faculty,
      co.id AS course_id,
      co.course_code,
      co.course_name,
      co.stream,
      co.venue,
      co.scheduled_time
    FROM courses co
    JOIN class_courses cc ON co.id = cc.course_id
    JOIN classes c ON cc.class_id = c.id
    WHERE co.lecturer_id = ?
    ORDER BY c.class_name, co.course_name
  `;

  db.query(sql, [lecturerId], (err, results) => {
    if (err) {
      console.error("❌ Lecturer classes fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} classes for lecturer ${lecturerId}`);
    res.json(results);
  });
});

// Get courses for selected class for logged-in lecturer (FOR REPORTS)
app.get("/api/lecturer/class/:classId/courses/:lecturerId", requireRole(["lecturer"]), (req, res) => {
  const { classId, lecturerId } = req.params;
  console.log("🔍 Fetching courses for class:", classId, "and lecturer:", lecturerId);

  const sql = `
    SELECT 
      co.id AS course_id,
      co.course_code,
      co.course_name,
      co.venue,
      co.scheduled_time,
      co.stream,
      c.total_registered,
      c.faculty
    FROM class_courses cc
    JOIN courses co ON cc.course_id = co.id
    JOIN classes c ON cc.class_id = c.id
    WHERE cc.class_id = ? AND co.lecturer_id = ?
  `;

  db.query(sql, [classId, lecturerId], (err, results) => {
    if (err) {
      console.error("❌ Fetch courses by class error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} courses for class ${classId}`);
    res.json(results);
  });
});

// =====================
// REPORTS API
// =====================
app.post("/api/reports", (req, res) => {
  const {
    faculty_name,
    class_name,
    week_of_reporting,
    date_of_lecture,
    course_name,
    course_code,
    lecturer_name,
    actual_students_present,
    total_students,
    venue,
    scheduled_time,
    topic,
    learning_outcomes,
    recommendations,
    stream
  } = req.body;

  console.log("📊 Submitting report");

  const sql = `
    INSERT INTO reports (
      faculty_name, class_name, week_of_reporting, date_of_lecture, 
      course_name, course_code, lecturer_name, actual_students_present, 
      total_students, venue, scheduled_time, topic, learning_outcomes, 
      recommendations, stream
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      faculty_name, class_name, week_of_reporting, date_of_lecture,
      course_name, course_code, lecturer_name, actual_students_present,
      total_students, venue, scheduled_time, topic, learning_outcomes,
      recommendations, stream
    ],
    (err, result) => {
      if (err) {
        console.error('❌ Report submission error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log("✅ Report submitted successfully, ID:", result.insertId);
      res.json({ message: 'Report submitted successfully', id: result.insertId });
    }
  );
});

// =====================
// PRL COURSES APIs
// =====================
app.get("/api/prl/courses", requireRole(["pl"]), (req, res) => {
  console.log("📚 PRL fetching all courses");
  
  const sql = `
    SELECT 
      c.id,
      c.course_code,
      c.course_name,
      c.stream,
      c.venue,
      c.scheduled_time,
      c.lecturer_id,
      u.name as lecturer_name
    FROM courses c
    LEFT JOIN users u ON c.lecturer_id = u.id
    ORDER BY c.stream, c.course_name
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ PRL courses fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} courses for PRL`);
    res.json(results);
  });
});

// =====================
// PRL REPORTS APIs
// =====================
app.get("/api/prl/reports", requireRole(["pl"]), (req, res) => {
  console.log("📊 PRL fetching all reports");
  
  const sql = `
    SELECT 
      r.*,
      u.name as lecturer_name,
      c.course_name,
      c.course_code,
      cls.class_name,
      cls.faculty
    FROM reports r
    JOIN users u ON r.lecturer_name = u.name
    JOIN courses c ON r.course_code = c.course_code
    JOIN classes cls ON r.class_name = cls.class_name
    ORDER BY r.date_of_lecture DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ PRL reports fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} reports for PRL`);
    res.json(results);
  });
});

// =====================
// PRL MONITORING APIs
// =====================
app.get("/api/prl/monitoring", requireRole(["pl"]), (req, res) => {
  console.log("👁️ PRL fetching monitoring data");
  
  const sql = `
    SELECT 
      a.student_id,
      u.name AS student_name,
      c.id AS course_id,
      c.course_code,
      c.course_name,
      cls.class_name,
      cls.faculty,
      c.stream,
      c.venue,
      c.scheduled_time,
      a.present,
      a.date,
      a.class_id,
      lect.name AS lecturer_name
    FROM attendance a
    JOIN classes cls ON a.class_id = cls.id
    JOIN class_courses cc ON cls.id = cc.class_id
    JOIN courses c ON cc.course_id = c.id
    JOIN users u ON a.student_id = u.id
    JOIN users lect ON c.lecturer_id = lect.id
    ORDER BY a.date DESC, c.course_name, u.name
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ PRL monitoring data fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} monitoring records for PRL`);
    res.json(results);
  });
});

// =====================
// PRL RATINGS APIs
// =====================
app.get("/api/prl/ratings", requireRole(["pl"]), (req, res) => {
  console.log("⭐ PRL fetching ratings summary");
  
  const sql = `
    SELECT 
      u.name as lecturer_name,
      c.course_name,
      c.course_code,
      c.stream,
      AVG(r.rating) as average_rating,
      COUNT(r.id) as total_ratings,
      MAX(r.comment) as recent_feedback
    FROM rating r
    JOIN users u ON r.lecturer_id = u.id
    JOIN courses c ON r.course_id = c.id
    GROUP BY u.name, c.course_name, c.course_code, c.stream
    ORDER BY average_rating DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ PRL ratings fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} rating summaries for PRL`);
    res.json(results);
  });
});

// =====================
// PRL FEEDBACK APIs
// =====================
app.post("/api/prl/feedback", requireRole(["pl"]), (req, res) => {
  const { report_id, feedback, prl_id } = req.body;
  
  console.log("💬 PRL submitting feedback:", { report_id, feedback, prl_id });

  if (!report_id || !feedback) {
    return res.status(400).json({ error: "Report ID and feedback are required" });
  }

  const sql = `
    INSERT INTO prl_feedback (report_id, prl_id, feedback, created_at)
    VALUES (?, ?, ?, NOW())
  `;
  
  db.query(sql, [report_id, prl_id, feedback], (err, result) => {
    if (err) {
      console.error("❌ PRL feedback submission error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log("✅ PRL feedback submitted successfully");
    res.json({ 
      message: "Feedback submitted successfully", 
      id: result.insertId 
    });
  });
});

// =====================
// PRL CLASSES APIs (using existing classes endpoint with filtering)
// =====================
app.get("/api/prl/classes", requireRole(["pl"]), (req, res) => {
  console.log("🏫 PRL fetching all classes");
  
  const sql = `
    SELECT 
      c.id,
      c.class_name,
      c.total_registered,
      c.faculty,
      GROUP_CONCAT(co.course_name) AS course_names,
      GROUP_CONCAT(co.course_code) AS course_codes
    FROM classes c
    LEFT JOIN class_courses cc ON c.id = cc.class_id
    LEFT JOIN courses co ON cc.course_id = co.id
    GROUP BY c.id, c.class_name, c.total_registered, c.faculty
    ORDER BY c.faculty, c.class_name
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ PRL classes fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} classes for PRL`);
    res.json(results);
  });
});

// =====================
// REPORTS APIs - CLEAN VERSION (NO DUPLICATES)
// =====================

// Get all reports
app.get("/api/reports", (req, res) => {
  console.log("📊 Fetching all reports...");
  
  const sql = "SELECT * FROM reports ORDER BY date_of_lecture DESC";
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Reports fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} reports`);
    res.json(results);
  });
});

// Get reports for PRL (filtered by stream)
app.get("/api/prl/reports", requireRole(["pl"]), (req, res) => {
  console.log("📊 PRL fetching reports...");
  
  const userStream = req.headers["x-user-stream"] || "All Streams";
  
  const sql = `
    SELECT 
      r.*,
      pf.feedback as prl_feedback,
      pf.created_at as feedback_date
    FROM reports r
    LEFT JOIN prl_feedback pf ON r.id = pf.report_id
    WHERE r.stream = ? OR ? = 'All Streams'
    ORDER BY r.date_of_lecture DESC
  `;
  
  db.query(sql, [userStream, userStream], (err, results) => {
    if (err) {
      console.error("❌ PRL reports fetch error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} reports for PRL stream: ${userStream}`);
    res.json(results);
  });
});

// Submit report
app.post("/api/reports", (req, res) => {
  const {
    faculty_name,
    class_name,
    week_of_reporting,
    date_of_lecture,
    course_name,
    course_code,
    lecturer_name,
    actual_students_present,
    total_students,
    venue,
    scheduled_time,
    topic,
    learning_outcomes,
    recommendations,
    stream
  } = req.body;

  console.log("📊 Submitting report");

  const sql = `
    INSERT INTO reports (
      faculty_name, class_name, week_of_reporting, date_of_lecture, 
      course_name, course_code, lecturer_name, actual_students_present, 
      total_students, venue, scheduled_time, topic, learning_outcomes, 
      recommendations, stream
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      faculty_name, class_name, week_of_reporting, date_of_lecture,
      course_name, course_code, lecturer_name, actual_students_present,
      total_students, venue, scheduled_time, topic, learning_outcomes,
      recommendations, stream
    ],
    (err, result) => {
      if (err) {
        console.error('❌ Report submission error:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      console.log("✅ Report submitted successfully, ID:", result.insertId);
      res.json({ message: 'Report submitted successfully', id: result.insertId });
    }
  );
});

// PRL feedback for reports
app.post("/api/prl/feedback", requireRole(["pl"]), (req, res) => {
  const { report_id, feedback, prl_id } = req.body;
  
  console.log("💬 PRL submitting feedback:", { report_id, feedback, prl_id });

  if (!report_id || !feedback) {
    return res.status(400).json({ error: "Report ID and feedback are required" });
  }

  const sql = `
    INSERT INTO prl_feedback (report_id, prl_id, feedback, created_at)
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE feedback = ?, created_at = NOW()
  `;
  
  db.query(sql, [report_id, prl_id, feedback, feedback], (err, result) => {
    if (err) {
      console.error("❌ PRL feedback submission error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log("✅ PRL feedback submitted successfully");
    res.json({ 
      message: "Feedback submitted successfully", 
      id: result.insertId 
    });
  });
});

// =====================
// DEBUG ENDPOINTS
// =====================

// Debug endpoint for lecturer classes
app.get("/api/debug/lecturer-classes/:lecturerId", (req, res) => {
  const lecturerId = req.params.lecturerId;
  console.log("🔍 Debug: Fetching classes for lecturer:", lecturerId);
  
  const sql = `
    SELECT DISTINCT
      c.id AS class_id,
      c.class_name,
      c.faculty,
      co.id AS course_id,
      co.course_code,
      co.course_name,
      co.stream,
      co.venue,
      co.scheduled_time
    FROM courses co
    JOIN class_courses cc ON co.id = cc.course_id
    JOIN classes c ON cc.class_id = c.id
    WHERE co.lecturer_id = ?
    ORDER BY c.class_name, co.course_name
  `;

  db.query(sql, [lecturerId], (err, results) => {
    if (err) {
      console.error("❌ Debug: Lecturer classes fetch error:", err.message);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    
    console.log(`🔍 Debug: Found ${results.length} classes for lecturer ${lecturerId}`);
    res.json({
      success: true,
      lecturerId: lecturerId,
      classes: results,
      count: results.length
    });
  });
});

// Debug endpoint: Check class_courses mappings
app.get("/api/debug/class-courses/:classId", (req, res) => {
  const classId = req.params.classId;
  console.log("🔍 Debugging class_courses for class:", classId);
  
  const sql = `
    SELECT 
      cc.class_id,
      cc.course_id,
      c.class_name,
      c.faculty,
      co.course_code,
      co.course_name,
      co.lecturer_id,
      u.name AS lecturer_name
    FROM class_courses cc
    JOIN classes c ON cc.class_id = c.id
    JOIN courses co ON cc.course_id = co.id
    LEFT JOIN users u ON co.lecturer_id = u.id
    WHERE cc.class_id = ?
  `;
  
  db.query(sql, [classId], (err, results) => {
    if (err) {
      console.error("❌ Debug query error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`🔍 Found ${results.length} course mappings for class ${classId}`);
    res.json(results);
  });
});
// =====================
// EXCEL DOWNLOAD ENDPOINTS - LECTURER
// =====================

// Download attendance Excel for lecturer
app.get("/api/lecturer/attendance/excel/:lecturerId", requireRole(["lecturer"]), async (req, res) => {
  const lecturerId = req.params.lecturerId;
  const { class_id, course_id } = req.query;
  
  console.log("📥 Generating attendance Excel for lecturer:", lecturerId, "class:", class_id, "course:", course_id);

  try {
    // Fetch attendance data
    const sql = `
      SELECT 
        a.student_id,
        u.name AS student_name,
        c.course_code,
        c.course_name,
        cls.class_name,
        cls.faculty,
        c.stream,
        c.venue,
        c.scheduled_time,
        a.present,
        a.date,
        lect.name AS lecturer_name
      FROM attendance a
      JOIN classes cls ON a.class_id = cls.id
      JOIN class_courses cc ON cls.id = cc.class_id
      JOIN courses c ON cc.course_id = c.id
      JOIN users u ON a.student_id = u.id
      JOIN users lect ON c.lecturer_id = lect.id
      WHERE c.lecturer_id = ?
      ${class_id ? ' AND cls.id = ?' : ''}
      ${course_id ? ' AND c.id = ?' : ''}
      ORDER BY a.date DESC, c.course_name, u.name
    `;

    const params = [lecturerId];
    if (class_id) params.push(class_id);
    if (course_id) params.push(course_id);

    db.query(sql, params, async (err, results) => {
      if (err) {
        console.error("❌ Attendance Excel fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      try {
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');

        // Add headers
        worksheet.addRow([
          'Student ID', 'Student Name', 'Course Code', 'Course Name', 
          'Class Name', 'Faculty', 'Stream', 'Venue', 'Scheduled Time',
          'Status', 'Date', 'Lecturer Name'
        ]);

        // Add data
        results.forEach(record => {
          worksheet.addRow([
            record.student_id,
            record.student_name,
            record.course_code,
            record.course_name,
            record.class_name,
            record.faculty,
            record.stream,
            record.venue,
            record.scheduled_time,
            record.present === 1 ? 'Present' : 'Absent',
            new Date(record.date).toLocaleDateString(),
            record.lecturer_name
          ]);
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${lecturerId}-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Send file
        await workbook.xlsx.write(res);
        console.log("✅ Attendance Excel generated successfully");

      } catch (excelError) {
        console.error("❌ Excel generation error:", excelError);
        res.status(500).json({ error: 'Failed to generate Excel file' });
      }
    });

  } catch (error) {
    console.error("❌ Attendance Excel endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Download report template Excel
app.get("/api/lecturer/report-template/excel", async (req, res) => {
  console.log("📥 Generating report template Excel");

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lecture Report Template');

    // Add headers
    worksheet.addRow([
      'Faculty Name', 'Class Name', 'Week of Reporting', 'Date of Lecture',
      'Course Name', 'Course Code', 'Lecturer Name', 'Actual Students Present',
      'Total Students', 'Venue', 'Scheduled Time', 'Topic Taught',
      'Learning Outcomes', 'Recommendations', 'Stream'
    ]);

    // Add example row
    worksheet.addRow([
      'Faculty of Computing', 'CS-2024-A', 'Week 1, Semester 1', '2024-01-15',
      'Advanced Programming', 'CS101', 'Dr. Smith', '45',
      '50', 'Room 101', '9:00 AM - 11:00 AM', 'Object-Oriented Programming',
      'Students understood inheritance and polymorphism', 'More practical examples needed', 'Information Systems'
    ]);

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Style example row (light gray)
    worksheet.getRow(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=lecture-report-template.xlsx');

    // Send file
    await workbook.xlsx.write(res);
    console.log("✅ Report template Excel generated successfully");

  } catch (error) {
    console.error("❌ Report template Excel error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Download lecturer's reports Excel
app.get("/api/lecturer/reports/excel/:lecturerId", requireRole(["lecturer"]), async (req, res) => {
  const lecturerId = req.params.lecturerId;
  console.log("📥 Generating lecturer reports Excel:", lecturerId);

  try {
    // Fetch lecturer's reports
    const sql = `
      SELECT 
        r.*,
        pf.feedback as prl_feedback,
        pf.created_at as feedback_date
      FROM reports r
      LEFT JOIN prl_feedback pf ON r.id = pf.report_id
      WHERE r.lecturer_name = (SELECT name FROM users WHERE id = ?)
      ORDER BY r.date_of_lecture DESC
    `;

    db.query(sql, [lecturerId], async (err, results) => {
      if (err) {
        console.error("❌ Lecturer reports fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Reports');

        // Add headers
        worksheet.addRow([
          'Report ID', 'Faculty', 'Class', 'Week', 'Date', 'Course', 
          'Course Code', 'Students Present', 'Total Students', 'Attendance Rate',
          'Venue', 'Time', 'Topic', 'Learning Outcomes', 'Recommendations',
          'Stream', 'PRL Feedback', 'Feedback Date'
        ]);

        // Add data
        results.forEach(report => {
          const attendanceRate = report.total_students > 0 
            ? ((report.actual_students_present / report.total_students) * 100).toFixed(1) + '%'
            : '0%';

          worksheet.addRow([
            report.id,
            report.faculty_name,
            report.class_name,
            report.week_of_reporting,
            new Date(report.date_of_lecture).toLocaleDateString(),
            report.course_name,
            report.course_code,
            report.actual_students_present,
            report.total_students,
            attendanceRate,
            report.venue,
            report.scheduled_time,
            report.topic,
            report.learning_outcomes,
            report.recommendations,
            report.stream,
            report.prl_feedback || 'No feedback',
            report.feedback_date ? new Date(report.feedback_date).toLocaleDateString() : 'N/A'
          ]);
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=my-reports-${lecturerId}-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Send file
        await workbook.xlsx.write(res);
        console.log(`✅ Lecturer reports Excel generated successfully with ${results.length} reports`);

      } catch (excelError) {
        console.error("❌ Excel generation error:", excelError);
        res.status(500).json({ error: 'Failed to generate Excel file' });
      }
    });

  } catch (error) {
    console.error("❌ Lecturer reports Excel endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// EXCEL DOWNLOAD ENDPOINTS - PRL
// =====================

// Download full reports Excel for PRL
app.get("/api/prl/reports/excel", requireRole(["pl"]), async (req, res) => {
  console.log("📥 Generating full reports Excel for PRL");

  try {
    const userStream = req.headers["x-user-stream"] || "All Streams";
    
    // Fetch reports for PRL's stream
    const sql = `
      SELECT 
        r.*,
        pf.feedback as prl_feedback,
        pf.created_at as feedback_date,
        u.name as lecturer_name
      FROM reports r
      LEFT JOIN prl_feedback pf ON r.id = pf.report_id
      LEFT JOIN users u ON r.lecturer_name = u.name
      WHERE r.stream = ? OR ? = 'All Streams'
      ORDER BY r.date_of_lecture DESC
    `;

    db.query(sql, [userStream, userStream], async (err, results) => {
      if (err) {
        console.error("❌ PRL reports fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('All Reports');

        // Add headers
        worksheet.addRow([
          'Report ID', 'Faculty', 'Class', 'Week', 'Date', 'Course', 
          'Course Code', 'Lecturer', 'Students Present', 'Total Students', 
          'Attendance Rate', 'Venue', 'Time', 'Topic', 'Learning Outcomes', 
          'Recommendations', 'Stream', 'PRL Feedback', 'Feedback Date'
        ]);

        // Add data
        results.forEach(report => {
          const attendanceRate = report.total_students > 0 
            ? ((report.actual_students_present / report.total_students) * 100).toFixed(1) + '%'
            : '0%';

          worksheet.addRow([
            report.id,
            report.faculty_name,
            report.class_name,
            report.week_of_reporting,
            new Date(report.date_of_lecture).toLocaleDateString(),
            report.course_name,
            report.course_code,
            report.lecturer_name,
            report.actual_students_present,
            report.total_students,
            attendanceRate,
            report.venue,
            report.scheduled_time,
            report.topic,
            report.learning_outcomes,
            report.recommendations,
            report.stream,
            report.prl_feedback || 'No feedback',
            report.feedback_date ? new Date(report.feedback_date).toLocaleDateString() : 'N/A'
          ]);
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=prl-reports-${userStream}-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Send file
        await workbook.xlsx.write(res);
        console.log(`✅ PRL full reports Excel generated successfully with ${results.length} reports`);

      } catch (excelError) {
        console.error("❌ Excel generation error:", excelError);
        res.status(500).json({ error: 'Failed to generate Excel file' });
      }
    });

  } catch (error) {
    console.error("❌ PRL reports Excel endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Download summary Excel for PRL
app.get("/api/prl/reports/summary-excel", requireRole(["pl"]), async (req, res) => {
  console.log("📥 Generating summary Excel for PRL");

  try {
    const userStream = req.headers["x-user-stream"] || "All Streams";
    
    // Fetch reports for summary
    const sql = `
      SELECT 
        r.*,
        pf.feedback as prl_feedback
      FROM reports r
      LEFT JOIN prl_feedback pf ON r.id = pf.report_id
      WHERE r.stream = ? OR ? = 'All Streams'
      ORDER BY r.date_of_lecture DESC
    `;

    db.query(sql, [userStream, userStream], async (err, results) => {
      if (err) {
        console.error("❌ PRL summary fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      try {
        const workbook = new ExcelJS.Workbook();
        
        // Calculate statistics
        const totalReports = results.length;
        const totalStudents = results.reduce((sum, report) => sum + (report.total_students || 0), 0);
        const totalPresent = results.reduce((sum, report) => sum + (report.actual_students_present || 0), 0);
        const averageAttendance = totalStudents > 0 ? ((totalPresent / totalStudents) * 100).toFixed(1) : 0;
        const lecturers = [...new Set(results.map(report => report.lecturer_name).filter(Boolean))];
        const coursesCount = [...new Set(results.map(report => report.course_name).filter(Boolean))];
        const classesCount = [...new Set(results.map(report => report.class_name).filter(Boolean))];
        const feedbackGiven = results.filter(report => report.prl_feedback).length;
        const feedbackRate = totalReports > 0 ? ((feedbackGiven / totalReports) * 100).toFixed(1) : 0;

        // Summary sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.addRow(['Stream', 'Total Reports', 'Total Students', 'Total Present', 
                           'Average Attendance', 'Active Lecturers', 'Courses Covered', 
                           'Classes Covered', 'Feedback Provided', 'Feedback Rate']);
        summarySheet.addRow([
          userStream, totalReports, totalStudents, totalPresent,
          averageAttendance + '%', lecturers.length, coursesCount.length,
          classesCount.length, feedbackGiven, feedbackRate + '%'
        ]);

        // Lecturers Performance sheet
        const lecturersSheet = workbook.addWorksheet('Lecturers Performance');
        lecturersSheet.addRow(['Lecturer Name', 'Total Reports', 'Feedback Received', 
                             'Feedback Pending', 'Average Attendance']);

        lecturers.forEach(lecturer => {
          const lecturerReports = results.filter(r => r.lecturer_name === lecturer);
          const totalLecturerReports = lecturerReports.length;
          const feedbackCount = lecturerReports.filter(r => r.prl_feedback).length;
          const totalStudentsLecturer = lecturerReports.reduce((sum, r) => sum + (r.total_students || 0), 0);
          const totalPresentLecturer = lecturerReports.reduce((sum, r) => sum + (r.actual_students_present || 0), 0);
          const avgAttendanceLecturer = totalStudentsLecturer > 0 ? (totalPresentLecturer / totalStudentsLecturer * 100).toFixed(1) : 0;

          lecturersSheet.addRow([
            lecturer,
            totalLecturerReports,
            feedbackCount,
            totalLecturerReports - feedbackCount,
            avgAttendanceLecturer + '%'
          ]);
        });

        // Pending Feedback sheet
        const pendingSheet = workbook.addWorksheet('Pending Feedback');
        pendingSheet.addRow(['Report ID', 'Course', 'Class', 'Lecturer', 'Date', 
                           'Students Present', 'Total Students', 'Attendance Rate']);

        const pendingReports = results.filter(report => !report.prl_feedback);
        pendingReports.forEach(report => {
          const attendanceRate = report.total_students > 0 
            ? ((report.actual_students_present / report.total_students) * 100).toFixed(1) + '%'
            : '0%';

          pendingSheet.addRow([
            report.id,
            report.course_name,
            report.class_name,
            report.lecturer_name,
            new Date(report.date_of_lecture).toLocaleDateString(),
            report.actual_students_present,
            report.total_students,
            attendanceRate
          ]);
        });

        // Style all header rows
        [summarySheet, lecturersSheet, pendingSheet].forEach(sheet => {
          if (sheet.rowCount > 0) {
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE6E6FA' }
            };
          }
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=prl-summary-${userStream}-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Send file
        await workbook.xlsx.write(res);
        console.log(`✅ PRL summary Excel generated successfully with ${results.length} reports analyzed`);

      } catch (excelError) {
        console.error("❌ Excel generation error:", excelError);
        res.status(500).json({ error: 'Failed to generate Excel file' });
      }
    });

  } catch (error) {
    console.error("❌ PRL summary Excel endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// EXCEL DOWNLOAD ENDPOINTS - PROGRAM LEADER
// =====================

// Download all reports Excel for Program Leader
app.get("/api/pl/reports/excel", requireRole(["pl"]), async (req, res) => {
  console.log("📥 Generating all reports Excel for Program Leader");

  try {
    // Fetch all reports
    const sql = `
      SELECT 
        r.*,
        pf.feedback as prl_feedback,
        pf.created_at as feedback_date,
        u.name as lecturer_name
      FROM reports r
      LEFT JOIN prl_feedback pf ON r.id = pf.report_id
      LEFT JOIN users u ON r.lecturer_name = u.name
      ORDER BY r.date_of_lecture DESC
    `;

    db.query(sql, async (err, results) => {
      if (err) {
        console.error("❌ PL reports fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('All Reports');

        // Add headers
        worksheet.addRow([
          'Report ID', 'Faculty', 'Class', 'Week', 'Date', 'Course', 
          'Course Code', 'Lecturer', 'Students Present', 'Total Students', 
          'Attendance Rate', 'Venue', 'Time', 'Topic', 'Learning Outcomes', 
          'Recommendations', 'Stream', 'PRL Feedback', 'Feedback Date'
        ]);

        // Add data
        results.forEach(report => {
          const attendanceRate = report.total_students > 0 
            ? ((report.actual_students_present / report.total_students) * 100).toFixed(1) + '%'
            : '0%';

          worksheet.addRow([
            report.id,
            report.faculty_name,
            report.class_name,
            report.week_of_reporting,
            new Date(report.date_of_lecture).toLocaleDateString(),
            report.course_name,
            report.course_code,
            report.lecturer_name,
            report.actual_students_present,
            report.total_students,
            attendanceRate,
            report.venue,
            report.scheduled_time,
            report.topic,
            report.learning_outcomes,
            report.recommendations,
            report.stream,
            report.prl_feedback || 'No feedback',
            report.feedback_date ? new Date(report.feedback_date).toLocaleDateString() : 'N/A'
          ]);
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=all-reports-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Send file
        await workbook.xlsx.write(res);
        console.log(`✅ Program Leader reports Excel generated successfully with ${results.length} reports`);

      } catch (excelError) {
        console.error("❌ Excel generation error:", excelError);
        res.status(500).json({ error: 'Failed to generate Excel file' });
      }
    });

  } catch (error) {
    console.error("❌ Program Leader reports Excel endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// EXCEL DOWNLOAD ENDPOINTS - STUDENT
// =====================

// Download student's courses and attendance Excel
app.get("/api/student/courses/excel/:studentId", requireRole(["student"]), async (req, res) => {
  const studentId = req.params.studentId;
  console.log("📥 Generating student courses Excel:", studentId);

  try {
    // Fetch student's courses and attendance
    const sql = `
      SELECT DISTINCT
        co.id AS course_id,
        co.course_code,
        co.course_name,
        co.stream,
        co.venue,
        co.scheduled_time,
        c.id AS class_id,
        c.class_name,
        c.total_registered,
        u.name AS lecturer_name,
        IFNULL(a.present, 0) AS present,
        a.date AS attendance_date
      FROM class_courses cc
      JOIN courses co ON cc.course_id = co.id
      JOIN classes c ON cc.class_id = c.id
      LEFT JOIN users u ON co.lecturer_id = u.id
      LEFT JOIN attendance a ON a.class_id = c.id AND a.student_id = ?
      WHERE cc.class_id = (SELECT class_id FROM users WHERE id = ?)
    `;

    db.query(sql, [studentId, studentId], async (err, results) => {
      if (err) {
        console.error("❌ Student courses fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Courses');

        // Add headers
        worksheet.addRow([
          'Course Code', 'Course Name', 'Stream', 'Class Name', 
          'Lecturer', 'Venue', 'Scheduled Time', 'Attendance Status',
          'Attendance Date', 'Total Registered'
        ]);

        // Add data
        results.forEach(record => {
          worksheet.addRow([
            record.course_code,
            record.course_name,
            record.stream,
            record.class_name,
            record.lecturer_name,
            record.venue,
            record.scheduled_time,
            record.present === 1 ? 'Present' : 'Not Recorded',
            record.attendance_date ? new Date(record.attendance_date).toLocaleDateString() : 'N/A',
            record.total_registered
          ]);
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=my-courses-${studentId}-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Send file
        await workbook.xlsx.write(res);
        console.log(`✅ Student courses Excel generated successfully with ${results.length} courses`);

      } catch (excelError) {
        console.error("❌ Excel generation error:", excelError);
        res.status(500).json({ error: 'Failed to generate Excel file' });
      }
    });

  } catch (error) {
    console.error("❌ Student courses Excel endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================
// EXCEL DOWNLOAD ENDPOINTS - MONITORING
// =====================

// Download monitoring data Excel for PRL
app.get("/api/prl/monitoring/excel", requireRole(["pl"]), async (req, res) => {
  console.log("📥 Generating monitoring Excel for PRL");

  try {
    const userStream = req.headers["x-user-stream"] || "All Streams";
    
    // Fetch monitoring data
    const sql = `
      SELECT 
        a.student_id,
        u.name AS student_name,
        c.id AS course_id,
        c.course_code,
        c.course_name,
        cls.class_name,
        cls.faculty,
        c.stream,
        c.venue,
        c.scheduled_time,
        a.present,
        a.date,
        a.class_id,
        lect.name AS lecturer_name
      FROM attendance a
      JOIN classes cls ON a.class_id = cls.id
      JOIN class_courses cc ON cls.id = cc.class_id
      JOIN courses c ON cc.course_id = c.id
      JOIN users u ON a.student_id = u.id
      JOIN users lect ON c.lecturer_id = lect.id
      WHERE c.stream = ? OR ? = 'All Streams'
      ORDER BY a.date DESC, c.course_name, u.name
    `;

    db.query(sql, [userStream, userStream], async (err, results) => {
      if (err) {
        console.error("❌ PRL monitoring fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Monitoring Data');

        // Add headers
        worksheet.addRow([
          'Student ID', 'Student Name', 'Course Code', 'Course Name', 
          'Class Name', 'Faculty', 'Stream', 'Venue', 'Scheduled Time',
          'Status', 'Date', 'Lecturer Name', 'Class ID'
        ]);

        // Add data
        results.forEach(record => {
          worksheet.addRow([
            record.student_id,
            record.student_name,
            record.course_code,
            record.course_name,
            record.class_name,
            record.faculty,
            record.stream,
            record.venue,
            record.scheduled_time,
            record.present === 1 ? 'Present' : 'Absent',
            new Date(record.date).toLocaleDateString(),
            record.lecturer_name,
            record.class_id
          ]);
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=monitoring-${userStream}-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Send file
        await workbook.xlsx.write(res);
        console.log(`✅ PRL monitoring Excel generated successfully with ${results.length} records`);

      } catch (excelError) {
        console.error("❌ Excel generation error:", excelError);
        res.status(500).json({ error: 'Failed to generate Excel file' });
      }
    });

  } catch (error) {
    console.error("❌ PRL monitoring Excel endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Download monitoring data Excel for Lecturer
app.get("/api/lecturer/monitoring/excel/:lecturerId", requireRole(["lecturer"]), async (req, res) => {
  const lecturerId = req.params.lecturerId;
  console.log("📥 Generating monitoring Excel for lecturer:", lecturerId);

  try {
    // Fetch lecturer's monitoring data
    const sql = `
      SELECT 
        a.student_id,
        u.name AS student_name,
        c.id AS course_id,
        c.course_code,
        c.course_name,
        cls.class_name,
        cls.faculty,
        c.stream,
        c.venue,
        c.scheduled_time,
        a.present,
        a.date,
        a.class_id,
        lect.name AS lecturer_name
      FROM attendance a
      JOIN classes cls ON a.class_id = cls.id
      JOIN class_courses cc ON cls.id = cc.class_id
      JOIN courses c ON cc.course_id = c.id
      JOIN users u ON a.student_id = u.id
      JOIN users lect ON c.lecturer_id = lect.id
      WHERE c.lecturer_id = ?
      ORDER BY a.date DESC, c.course_name, u.name
    `;

    db.query(sql, [lecturerId], async (err, results) => {
      if (err) {
        console.error("❌ Lecturer monitoring fetch error:", err.message);
        return res.status(500).json({ error: err.message });
      }

      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Monitoring Data');

        // Add headers
        worksheet.addRow([
          'Student ID', 'Student Name', 'Course Code', 'Course Name', 
          'Class Name', 'Faculty', 'Stream', 'Venue', 'Scheduled Time',
          'Status', 'Date', 'Class ID'
        ]);

        // Add data
        results.forEach(record => {
          worksheet.addRow([
            record.student_id,
            record.student_name,
            record.course_code,
            record.course_name,
            record.class_name,
            record.faculty,
            record.stream,
            record.venue,
            record.scheduled_time,
            record.present === 1 ? 'Present' : 'Absent',
            new Date(record.date).toLocaleDateString(),
            record.class_id
          ]);
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=my-monitoring-${lecturerId}-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Send file
        await workbook.xlsx.write(res);
        console.log(`✅ Lecturer monitoring Excel generated successfully with ${results.length} records`);

      } catch (excelError) {
        console.error("❌ Excel generation error:", excelError);
        res.status(500).json({ error: 'Failed to generate Excel file' });
      }
    });

  } catch (error) {
    console.error("❌ Lecturer monitoring Excel endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});
// =====================
// SEARCH FUNCTIONALITY ENDPOINTS
// =====================

// Universal search endpoint for reports
app.get("/api/search/reports", requireRole(["lecturer", "pl", "prl"]), (req, res) => {
  const { q, stream, lecturer, dateFrom, dateTo, status } = req.query;
  const userRole = req.headers["x-user-role"];
  const userStream = req.headers["x-user-stream"];
  
  console.log("🔍 Searching reports:", { q, stream, lecturer, dateFrom, dateTo, status });

  let sql = `
    SELECT 
      r.*,
      pf.feedback as prl_feedback,
      pf.created_at as feedback_date,
      u.name as lecturer_name
    FROM reports r
    LEFT JOIN prl_feedback pf ON r.id = pf.report_id
    LEFT JOIN users u ON r.lecturer_name = u.name
    WHERE 1=1
  `;
  
  const params = [];

  // Role-based filtering
  if (userRole === 'prl') {
    sql += ' AND r.stream = ?';
    params.push(userStream);
  } else if (userRole === 'lecturer') {
    sql += ' AND r.lecturer_name = (SELECT name FROM users WHERE id = ?)';
    params.push(req.headers["x-user-id"] || '');
  }

  // Text search across multiple fields
  if (q) {
    sql += ` AND (
      r.course_name LIKE ? OR 
      r.class_name LIKE ? OR 
      r.lecturer_name LIKE ? OR 
      r.topic LIKE ? OR
      r.course_code LIKE ? OR
      r.learning_outcomes LIKE ? OR
      r.recommendations LIKE ?
    )`;
    const searchTerm = `%${q}%`;
    params.push(
      searchTerm, searchTerm, searchTerm, searchTerm, 
      searchTerm, searchTerm, searchTerm
    );
  }

  // Additional filters
  if (stream && stream !== 'all') {
    sql += ' AND r.stream = ?';
    params.push(stream);
  }
  
  if (lecturer) {
    sql += ' AND r.lecturer_name LIKE ?';
    params.push(`%${lecturer}%`);
  }
  
  if (dateFrom) {
    sql += ' AND r.date_of_lecture >= ?';
    params.push(dateFrom);
  }
  
  if (dateTo) {
    sql += ' AND r.date_of_lecture <= ?';
    params.push(dateTo);
  }

  // Status filter (feedback given or pending)
  if (status === 'with_feedback') {
    sql += ' AND pf.feedback IS NOT NULL';
  } else if (status === 'pending_feedback') {
    sql += ' AND pf.feedback IS NULL';
  }

  sql += ' ORDER BY r.date_of_lecture DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Search error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} reports matching search`);
    res.json(results);
  });
});

// Search courses
app.get("/api/search/courses", requireRole(["lecturer", "pl", "prl", "student"]), (req, res) => {
  const { q, stream, lecturer } = req.query;
  const userRole = req.headers["x-user-role"];
  const userStream = req.headers["x-user-stream"];
  
  console.log("🔍 Searching courses:", { q, stream, lecturer });

  let sql = `
    SELECT 
      c.*, 
      u.name as lecturer_name,
      u.email as lecturer_email
    FROM courses c
    LEFT JOIN users u ON c.lecturer_id = u.id
    WHERE 1=1
  `;
  
  const params = [];

  // Role-based filtering for PRL
  if (userRole === 'prl') {
    sql += ' AND c.stream = ?';
    params.push(userStream);
  }

  // Text search
  if (q) {
    sql += ` AND (
      c.course_name LIKE ? OR 
      c.course_code LIKE ? OR
      c.stream LIKE ? OR
      c.venue LIKE ? OR
      u.name LIKE ?
    )`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (stream && stream !== 'all') {
    sql += ' AND c.stream = ?';
    params.push(stream);
  }
  
  if (lecturer) {
    sql += ' AND u.name LIKE ?';
    params.push(`%${lecturer}%`);
  }

  sql += ' ORDER BY c.course_name';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Courses search error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} courses matching search`);
    res.json(results);
  });
});

// Search students
app.get("/api/search/students", requireRole(["pl", "prl", "lecturer"]), (req, res) => {
  const { q, stream, class: classFilter } = req.query;
  const userRole = req.headers["x-user-role"];
  const userStream = req.headers["x-user-stream"];
  
  console.log("🔍 Searching students:", { q, stream, class: classFilter });

  let sql = `
    SELECT 
      u.*, 
      c.class_name,
      c.faculty
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.role = 'student'
  `;
  
  const params = [];

  // Role-based filtering for PRL
  if (userRole === 'prl') {
    sql += ' AND u.stream = ?';
    params.push(userStream);
  }

  if (q) {
    sql += ` AND (
      u.name LIKE ? OR 
      u.email LIKE ? OR
      u.student_code LIKE ? OR
      c.class_name LIKE ?
    )`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (stream && stream !== 'all') {
    sql += ' AND u.stream = ?';
    params.push(stream);
  }
  
  if (classFilter) {
    sql += ' AND c.class_name LIKE ?';
    params.push(`%${classFilter}%`);
  }

  sql += ' ORDER BY u.name';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Students search error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} students matching search`);
    res.json(results);
  });
});

// Search lecturers
app.get("/api/search/lecturers", requireRole(["pl", "prl"]), (req, res) => {
  const { q, stream } = req.query;
  const userRole = req.headers["x-user-role"];
  const userStream = req.headers["x-user-stream"];
  
  console.log("🔍 Searching lecturers:", { q, stream });

  let sql = `
    SELECT 
      u.*,
      COUNT(DISTINCT c.id) as course_count,
      COUNT(DISTINCT r.id) as report_count
    FROM users u
    LEFT JOIN courses c ON u.id = c.lecturer_id
    LEFT JOIN reports r ON u.name = r.lecturer_name
    WHERE u.role = 'lecturer'
  `;
  
  const params = [];

  // Role-based filtering for PRL
  if (userRole === 'prl') {
    sql += ' AND u.stream = ?';
    params.push(userStream);
  }

  if (q) {
    sql += ` AND (
      u.name LIKE ? OR 
      u.email LIKE ? OR
      u.faculty LIKE ?
    )`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (stream && stream !== 'all') {
    sql += ' AND u.stream = ?';
    params.push(stream);
  }

  sql += ' GROUP BY u.id ORDER BY u.name';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Lecturers search error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} lecturers matching search`);
    res.json(results);
  });
});

// Search classes
app.get("/api/search/classes", requireRole(["pl", "prl", "lecturer"]), (req, res) => {
  const { q, faculty } = req.query;
  const userRole = req.headers["x-user-role"];
  const userStream = req.headers["x-user-stream"];
  
  console.log("🔍 Searching classes:", { q, faculty });

  let sql = `
    SELECT 
      c.*,
      GROUP_CONCAT(DISTINCT co.course_name) AS course_names,
      GROUP_CONCAT(DISTINCT co.course_code) AS course_codes,
      COUNT(DISTINCT co.id) as course_count,
      COUNT(DISTINCT u.id) as student_count
    FROM classes c
    LEFT JOIN class_courses cc ON c.id = cc.class_id
    LEFT JOIN courses co ON cc.course_id = co.id
    LEFT JOIN users u ON u.class_id = c.id AND u.role = 'student'
    WHERE 1=1
  `;
  
  const params = [];

  // Role-based filtering for PRL
  if (userRole === 'prl') {
    sql += ' AND c.faculty = ?';
    params.push(userStream);
  }

  if (q) {
    sql += ` AND (
      c.class_name LIKE ? OR 
      c.faculty LIKE ? OR
      co.course_name LIKE ? OR
      co.course_code LIKE ?
    )`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (faculty && faculty !== 'all') {
    sql += ' AND c.faculty = ?';
    params.push(faculty);
  }

  sql += ' GROUP BY c.id ORDER BY c.class_name';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Classes search error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} classes matching search`);
    res.json(results);
  });
});

// Search monitoring/attendance data
app.get("/api/search/monitoring", requireRole(["pl", "prl", "lecturer"]), (req, res) => {
  const { q, stream, class: classFilter, dateFrom, dateTo, status } = req.query;
  const userRole = req.headers["x-user-role"];
  const userStream = req.headers["x-user-stream"];
  const userId = req.headers["x-user-id"];
  
  console.log("🔍 Searching monitoring data:", { q, stream, class: classFilter, dateFrom, dateTo, status });

  let sql = `
    SELECT 
      a.*,
      u.name AS student_name,
      u.student_code,
      u.stream,
      c.course_code,
      c.course_name,
      cls.class_name,
      cls.faculty,
      lect.name AS lecturer_name,
      c.venue,
      c.scheduled_time
    FROM attendance a
    JOIN users u ON a.student_id = u.id
    JOIN classes cls ON a.class_id = cls.id
    JOIN class_courses cc ON cls.id = cc.class_id
    JOIN courses c ON cc.course_id = c.id
    JOIN users lect ON c.lecturer_id = lect.id
    WHERE 1=1
  `;
  
  const params = [];

  // Role-based filtering
  if (userRole === 'prl') {
    sql += ' AND c.stream = ?';
    params.push(userStream);
  } else if (userRole === 'lecturer') {
    sql += ' AND c.lecturer_id = ?';
    params.push(userId);
  }

  // Text search
  if (q) {
    sql += ` AND (
      u.name LIKE ? OR 
      c.course_name LIKE ? OR 
      c.course_code LIKE ? OR
      cls.class_name LIKE ? OR
      lect.name LIKE ?
    )`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (stream && stream !== 'all') {
    sql += ' AND c.stream = ?';
    params.push(stream);
  }
  
  if (classFilter) {
    sql += ' AND cls.class_name LIKE ?';
    params.push(`%${classFilter}%`);
  }
  
  if (dateFrom) {
    sql += ' AND a.date >= ?';
    params.push(dateFrom);
  }
  
  if (dateTo) {
    sql += ' AND a.date <= ?';
    params.push(dateTo);
  }

  // Status filter (present/absent)
  if (status === 'present') {
    sql += ' AND a.present = 1';
  } else if (status === 'absent') {
    sql += ' AND a.present = 0';
  }

  sql += ' ORDER BY a.date DESC, c.course_name, u.name';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Monitoring search error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} monitoring records matching search`);
    res.json(results);
  });
});

// Search ratings
app.get("/api/search/ratings", requireRole(["pl", "prl", "student", "lecturer"]), (req, res) => {
  const { q, lecturer, minRating, maxRating, type } = req.query;
  const userRole = req.headers["x-user-role"];
  const userStream = req.headers["x-user-stream"];
  const userId = req.headers["x-user-id"];
  
  console.log("🔍 Searching ratings:", { q, lecturer, minRating, maxRating, type });

  let sql, params = [];

  if (type === 'class_ratings') {
    // Search lecturer class ratings
    sql = `
      SELECT 
        lcr.*,
        l.name as lecturer_name,
        c.course_name,
        c.course_code,
        cls.class_name,
        c.stream
      FROM lecturer_class_ratings lcr
      JOIN users l ON lcr.lecturer_id = l.id
      JOIN courses c ON lcr.course_id = c.id
      JOIN classes cls ON lcr.class_id = cls.id
      WHERE 1=1
    `;

    if (userRole === 'prl') {
      sql += ' AND c.stream = ?';
      params.push(userStream);
    } else if (userRole === 'lecturer') {
      sql += ' AND lcr.lecturer_id = ?';
      params.push(userId);
    }

  } else {
    // Search student ratings
    sql = `
      SELECT 
        r.*,
        l.name as lecturer_name,
        l.email as lecturer_email,
        s.name as student_name,
        s.student_code,
        s.stream
      FROM rating r
      JOIN users l ON r.lecturer_id = l.id
      JOIN users s ON r.student_id = s.id
      WHERE 1=1
    `;

    if (userRole === 'prl') {
      sql += ' AND s.stream = ?';
      params.push(userStream);
    } else if (userRole === 'student') {
      sql += ' AND r.student_id = ?';
      params.push(userId);
    } else if (userRole === 'lecturer') {
      sql += ' AND r.lecturer_id = ?';
      params.push(userId);
    }
  }

  // Common filters
  if (q) {
    const searchTerm = `%${q}%`;
    if (type === 'class_ratings') {
      sql += ` AND (
        l.name LIKE ? OR 
        c.course_name LIKE ? OR 
        c.course_code LIKE ? OR
        cls.class_name LIKE ? OR
        lcr.comment LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    } else {
      sql += ` AND (
        l.name LIKE ? OR 
        s.name LIKE ? OR
        r.comment LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
  }

  if (lecturer) {
    sql += ' AND l.name LIKE ?';
    params.push(`%${lecturer}%`);
  }

  if (minRating) {
    sql += ' AND r.rating >= ?';
    params.push(parseInt(minRating));
  }

  if (maxRating) {
    sql += ' AND r.rating <= ?';
    params.push(parseInt(maxRating));
  }

  sql += ' ORDER BY r.created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Ratings search error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Found ${results.length} ratings matching search`);
    res.json(results);
  });
});

// Universal search across all modules (for dashboards)
app.get("/api/search/global", requireRole(["pl", "prl"]), (req, res) => {
  const { q } = req.query;
  const userRole = req.headers["x-user-role"];
  const userStream = req.headers["x-user-stream"];
  
  console.log("🔍 Global search:", { q });

  if (!q) {
    return res.status(400).json({ error: "Search query is required" });
  }

  const searchTerm = `%${q}%`;
  const results = {
    reports: [],
    courses: [],
    students: [],
    lecturers: [],
    classes: []
  };

  // Search reports
  const reportsSql = `
    SELECT 
      r.*,
      'report' as type
    FROM reports r
    WHERE (
      r.course_name LIKE ? OR 
      r.class_name LIKE ? OR 
      r.lecturer_name LIKE ? OR 
      r.topic LIKE ?
    ) ${userRole === 'prl' ? 'AND r.stream = ?' : ''}
    LIMIT 10
  `;

  const reportsParams = userRole === 'prl' 
    ? [searchTerm, searchTerm, searchTerm, searchTerm, userStream]
    : [searchTerm, searchTerm, searchTerm, searchTerm];

  db.query(reportsSql, reportsParams, (err, reportsResults) => {
    if (!err) results.reports = reportsResults;

    // Search courses
    const coursesSql = `
      SELECT 
        c.*,
        'course' as type
      FROM courses c
      WHERE (
        c.course_name LIKE ? OR 
        c.course_code LIKE ? OR
        c.stream LIKE ?
      ) ${userRole === 'prl' ? 'AND c.stream = ?' : ''}
      LIMIT 10
    `;

    const coursesParams = userRole === 'prl' 
      ? [searchTerm, searchTerm, searchTerm, userStream]
      : [searchTerm, searchTerm, searchTerm];

    db.query(coursesSql, coursesParams, (err, coursesResults) => {
      if (!err) results.courses = coursesResults;
      
      // Search students
      const studentsSql = `
        SELECT 
          u.*,
          'student' as type
        FROM users u
        WHERE u.role = 'student' AND (
          u.name LIKE ? OR 
          u.email LIKE ? OR
          u.student_code LIKE ?
        ) ${userRole === 'prl' ? 'AND u.stream = ?' : ''}
        LIMIT 10
      `;

      const studentsParams = userRole === 'prl' 
        ? [searchTerm, searchTerm, searchTerm, userStream]
        : [searchTerm, searchTerm, searchTerm];

      db.query(studentsSql, studentsParams, (err, studentsResults) => {
        if (!err) results.students = studentsResults;
        
        // Search lecturers
        const lecturersSql = `
          SELECT 
            u.*,
            'lecturer' as type
          FROM users u
          WHERE u.role = 'lecturer' AND (
            u.name LIKE ? OR 
            u.email LIKE ?
          ) ${userRole === 'prl' ? 'AND u.stream = ?' : ''}
          LIMIT 10
        `;

        const lecturersParams = userRole === 'prl' 
          ? [searchTerm, searchTerm, userStream]
          : [searchTerm, searchTerm];

        db.query(lecturersSql, lecturersParams, (err, lecturersResults) => {
          if (!err) results.lecturers = lecturersResults;
          
          console.log(`✅ Global search results: ${Object.values(results).flat().length} items`);
          res.json(results);
        });
      });
    });
  });
});


// =====================
// 404 Handler for undefined routes
// =====================
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: "Route not found" });
});

// =====================
// Server
// =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Backend URL: http://localhost:${PORT}`);
  console.log(`🧪 Test DB: http://localhost:${PORT}/api/test-db`);
  console.log(`📚 Test Courses: http://localhost:${PORT}/api/courses`);
  console.log(`🏫 Test Classes: http://localhost:${PORT}/api/classes`);
  console.log(`🔗 Test Class-Courses: http://localhost:${PORT}/api/class-courses`);
  console.log(`👨‍🏫 Test Lecturers: http://localhost:${PORT}/api/lecturers`);
  console.log(`👨‍🎓 Test Students: http://localhost:${PORT}/api/students`);
  console.log(`👨‍🏫 Test Lecturer by ID: http://localhost:${PORT}/api/lecturer/27`);
  console.log(`👨‍🏫 Test Lecturer Courses: http://localhost:${PORT}/api/lecturer/courses/27`);
  console.log(`👨‍🏫 Test Lecturer Classes: http://localhost:${PORT}/api/lecturer/classes/27`);
  console.log(`👨‍🏫 Test Lecturer Classes for Reports: http://localhost:${PORT}/api/lecturer/27/classes`);
  console.log(`📊 Test Lecturer Monitoring: http://localhost:${PORT}/api/lecturer/monitoring/27`);
  console.log(`⭐ Test Lecturer Class Rating: http://localhost:${PORT}/api/debug/lecturer-classes/27`);
  console.log(`📊 Test Reports: http://localhost:${PORT}/api/reports`);
  console.log(`📊 Test PRL Reports: http://localhost:${PORT}/api/prl/reports`);
  console.log(`⭐ Test PRL Rating: http://localhost:${PORT}/api/prl/rating`);
  console.log(`⭐ Test PRL Lecturer Class Ratings: http://localhost:${PORT}/api/prl/lecturer_class_ratings`);
});

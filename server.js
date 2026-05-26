require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg');


const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.connect()
  .then(() => console.log("Database connected"))
  .catch(err => console.error("Database connection failed:", err));


app.use(cors({
  origin: [
    "https://examify25.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'jamb-secret-key-please-change',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,        // localhost only
    sameSite: "lax",      // IMPORTANT FIX
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, 'public')));


// ─── Auth Middleware ─────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in' });
  const r = await pool.query('SELECT * FROM users WHERE id=$1', [req.session.userId]);
  if (!r.rows.length) { req.session.destroy(); return res.status(401).json({ error: 'User not found' }); }
  req.user = r.rows[0];
  next();
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access only' });
    next();
  });
}

function safeUser(u) {
  const { password_hash, ...rest } = u;
  return rest;
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(400).json({ error: 'An account with this email already exists' });
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING *',
      [name.trim(), email.toLowerCase().trim(), hash, 'student']
    );
    req.session.userId = r.rows[0].id;
    res.json(safeUser(r.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    if (!r.rows.length) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, r.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    req.session.userId = r.rows[0].id;
    res.json(safeUser(r.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(safeUser(req.user));
});

// ─── Profile ─────────────────────────────────────────────────────────────────
app.put('/api/profile', requireAuth, async (req, res) => {
  const { name, school, state, target_score, courses } = req.body;
  const r = await pool.query(
    `UPDATE users SET name=$1,school=$2,state=$3,target_score=$4,courses=$5,updated_at=NOW()
     WHERE id=$6 RETURNING *`,
    [name, school, state, target_score, courses || [], req.user.id]
  );
  res.json(safeUser(r.rows[0]));
});

// ─── Subjects ────────────────────────────────────────────────────────────────
app.get('/api/subjects', requireAuth, async (req, res) => {
  const r = await pool.query('SELECT * FROM subjects ORDER BY name');
  res.json(r.rows);
});

// ─── Quizzes ──────────────────────────────────────────────────────────────────
app.get('/api/quizzes', requireAuth, async (req, res) => {
  const { subject_id } = req.query;
  let q = `SELECT qz.*, s.name as subject_name, s.code as subject_code
           FROM quizzes qz LEFT JOIN subjects s ON qz.subject_id=s.id
           WHERE qz.status='published'`;
  const p = [];
  if (subject_id) { p.push(subject_id); q += ` AND qz.subject_id=$${p.length}`; }
  q += ' ORDER BY qz.created_at DESC';
  const r = await pool.query(q, p);
  res.json(r.rows);
});

app.get('/api/quizzes/:id', requireAuth, async (req, res) => {
  const r = await pool.query(
    `SELECT qz.*, s.name as subject_name FROM quizzes qz
     LEFT JOIN subjects s ON qz.subject_id=s.id WHERE qz.id=$1`, [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Quiz not found' });
  res.json(r.rows[0]);
});

app.get('/api/quizzes/:id/questions', requireAuth, async (req, res) => {
  const r = await pool.query(
    'SELECT id,text,option_a,option_b,option_c,option_d FROM questions WHERE quiz_id=$1 ORDER BY order_index',
    [req.params.id]);
  res.json(r.rows);
});

// ─── Attempts ─────────────────────────────────────────────────────────────────
app.post('/api/attempts', requireAuth, async (req, res) => {
  const { quiz_id } = req.body;
  const qr = await pool.query('SELECT total_questions FROM quizzes WHERE id=$1', [quiz_id]);
  if (!qr.rows.length) return res.status(404).json({ error: 'Quiz not found' });
  const r = await pool.query(
    'INSERT INTO attempts (user_id,quiz_id,total_questions) VALUES ($1,$2,$3) RETURNING *',
    [req.user.id, quiz_id, qr.rows[0].total_questions]);
  res.json(r.rows[0]);
});

app.post('/api/attempts/:id/submit', requireAuth, async (req, res) => {
  const { answers } = req.body;
  const attempt = await pool.query('SELECT * FROM attempts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!attempt.rows.length) return res.status(404).json({ error: 'Attempt not found' });
  let score = 0;
  for (const [qid, opt] of Object.entries(answers || {})) {
    const qr = await pool.query('SELECT correct_option FROM questions WHERE id=$1', [qid]);
    if (!qr.rows.length) continue;
    const is_correct = qr.rows[0].correct_option === opt;
    if (is_correct) score++;
    await pool.query(
      'INSERT INTO answers (attempt_id,question_id,selected_option,is_correct) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [req.params.id, qid, opt, is_correct]);
  }
  const r = await pool.query(
    `UPDATE attempts SET status='completed',score=$1,completed_at=NOW() WHERE id=$2 RETURNING *`,
    [score, req.params.id]);
  res.json(r.rows[0]);
});

app.get('/api/attempts/:id', requireAuth, async (req, res) => {
  const r = await pool.query(
    `SELECT a.*,q.title as quiz_title,s.name as subject_name
     FROM attempts a JOIN quizzes q ON a.quiz_id=q.id LEFT JOIN subjects s ON q.subject_id=s.id
     WHERE a.id=$1 AND a.user_id=$2`, [req.params.id, req.user.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Attempt not found' });
  const ans = await pool.query(
    `SELECT an.*,qu.text,qu.option_a,qu.option_b,qu.option_c,qu.option_d,qu.correct_option,qu.explanation
     FROM answers an JOIN questions qu ON an.question_id=qu.id
     WHERE an.attempt_id=$1 ORDER BY qu.order_index`, [req.params.id]);
  res.json({ ...r.rows[0], answers: ans.rows });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const [total, avg, best, streak, subjects, recent] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM attempts WHERE user_id=$1 AND status='completed'", [uid]),
    pool.query("SELECT ROUND(AVG(score::float/NULLIF(total_questions,0)*100)) as avg FROM attempts WHERE user_id=$1 AND status='completed'", [uid]),
    pool.query("SELECT MAX(score::float/NULLIF(total_questions,0)*100) as best FROM attempts WHERE user_id=$1 AND status='completed'", [uid]),
    pool.query("SELECT COUNT(*) FROM attempts WHERE user_id=$1 AND status='completed' AND completed_at>NOW()-INTERVAL '7 days'", [uid]),
    pool.query(`SELECT s.name as subject,ROUND(AVG(a.score::float/NULLIF(a.total_questions,0)*100)) as score
               FROM attempts a JOIN quizzes q ON a.quiz_id=q.id JOIN subjects s ON q.subject_id=s.id
               WHERE a.user_id=$1 AND a.status='completed' GROUP BY s.name LIMIT 6`, [uid]),
    pool.query(`SELECT a.id,q.title,a.score,a.total_questions,a.completed_at,s.name as subject
               FROM attempts a JOIN quizzes q ON a.quiz_id=q.id LEFT JOIN subjects s ON q.subject_id=s.id
               WHERE a.user_id=$1 AND a.status='completed' ORDER BY a.completed_at DESC LIMIT 5`, [uid]),
  ]);
  res.json({
    total_attempts: parseInt(total.rows[0].count),
    avg_score: parseInt(avg.rows[0].avg) || 0,
    best_score: Math.round(parseFloat(best.rows[0].best) || 0),
    weekly_streak: parseInt(streak.rows[0].count),
    subject_scores: subjects.rows,
    recent_attempts: recent.rows,
  });
});

// ─── Leaderboard ──────────────────────────────────────────────────────────────
app.get('/api/leaderboard', requireAuth, async (req, res) => {
  const r = await pool.query(
    `SELECT u.id,u.name,u.school,COUNT(a.id) as attempts,
            ROUND(AVG(a.score::float/NULLIF(a.total_questions,0)*100)) as avg_score,
            MAX(a.score::float/NULLIF(a.total_questions,0)*100) as best_score
     FROM users u JOIN attempts a ON u.id=a.user_id WHERE a.status='completed'
     GROUP BY u.id,u.name,u.school ORDER BY avg_score DESC LIMIT 50`);
  res.json(r.rows);
});

// ─── Admin ────────────────────────────────────────────────────────────────────
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const [users, quizzes, attempts, avg] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM users WHERE role='student'"),
    pool.query("SELECT COUNT(*) FROM quizzes WHERE status='published'"),
    pool.query("SELECT COUNT(*) FROM attempts WHERE status='completed'"),
    pool.query("SELECT ROUND(AVG(score::float/NULLIF(total_questions,0)*100)) as avg FROM attempts WHERE status='completed'"),
  ]);
  res.json({
    total_students: parseInt(users.rows[0].count),
    total_quizzes: parseInt(quizzes.rows[0].count),
    total_attempts: parseInt(attempts.rows[0].count),
    avg_score: parseInt(avg.rows[0].avg) || 0,
  });
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const r = await pool.query(
    `SELECT u.id,u.name,u.email,u.role,u.school,u.created_at,COUNT(a.id) as attempt_count
     FROM users u LEFT JOIN attempts a ON u.id=a.user_id AND a.status='completed'
     GROUP BY u.id ORDER BY u.created_at DESC`);
  res.json(r.rows);
});

app.get('/api/admin/quizzes', requireAdmin, async (req, res) => {
  const r = await pool.query(
    `SELECT q.*,s.name as subject_name,COUNT(qu.id) as question_count
     FROM quizzes q LEFT JOIN subjects s ON q.subject_id=s.id
     LEFT JOIN questions qu ON q.id=qu.quiz_id
     GROUP BY q.id,s.name ORDER BY q.created_at DESC`);
  res.json(r.rows);
});

app.post('/api/admin/quizzes', requireAdmin, async (req, res) => {
  const { title, description, subject_id, duration_minutes, status, scheduled_at } = req.body;
  const r = await pool.query(
    `INSERT INTO quizzes (title,description,subject_id,duration_minutes,status,scheduled_at,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [title, description, subject_id, duration_minutes||30, status||'draft', scheduled_at||null, req.user.id]);
  res.json(r.rows[0]);
});

app.put('/api/admin/quizzes/:id', requireAdmin, async (req, res) => {
  const { title, description, subject_id, duration_minutes, status, scheduled_at } = req.body;
  const r = await pool.query(
    `UPDATE quizzes SET title=$1,description=$2,subject_id=$3,duration_minutes=$4,
     status=$5,scheduled_at=$6,updated_at=NOW() WHERE id=$7 RETURNING *`,
    [title, description, subject_id, duration_minutes, status, scheduled_at||null, req.params.id]);
  res.json(r.rows[0]);
});

app.delete('/api/admin/quizzes/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM quizzes WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/admin/quizzes/:id/questions', requireAdmin, async (req, res) => {
  const r = await pool.query('SELECT * FROM questions WHERE quiz_id=$1 ORDER BY order_index', [req.params.id]);
  res.json(r.rows);
});

app.post('/api/admin/quizzes/:id/questions', requireAdmin, async (req, res) => {
  const { text, option_a, option_b, option_c, option_d, correct_option, explanation, order_index } = req.body;
  const r = await pool.query(
    `INSERT INTO questions (quiz_id,text,option_a,option_b,option_c,option_d,correct_option,explanation,order_index)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.params.id, text, option_a, option_b, option_c, option_d, correct_option, explanation, order_index||0]);
  await pool.query('UPDATE quizzes SET total_questions=(SELECT COUNT(*) FROM questions WHERE quiz_id=$1) WHERE id=$1', [req.params.id]);
  res.json(r.rows[0]);
});

app.put('/api/admin/questions/:id', requireAdmin, async (req, res) => {
  const { text, option_a, option_b, option_c, option_d, correct_option, explanation } = req.body;
  const r = await pool.query(
    `UPDATE questions SET text=$1,option_a=$2,option_b=$3,option_c=$4,option_d=$5,
     correct_option=$6,explanation=$7 WHERE id=$8 RETURNING *`,
    [text, option_a, option_b, option_c, option_d, correct_option, explanation, req.params.id]);
  res.json(r.rows[0]);
});

app.delete('/api/admin/questions/:id', requireAdmin, async (req, res) => {
  const q = await pool.query('SELECT quiz_id FROM questions WHERE id=$1', [req.params.id]);
  await pool.query('DELETE FROM questions WHERE id=$1', [req.params.id]);
  if (q.rows.length) await pool.query('UPDATE quizzes SET total_questions=(SELECT COUNT(*) FROM questions WHERE quiz_id=$1) WHERE id=$1', [q.rows[0].quiz_id]);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Examify running at http://localhost:${PORT}`));

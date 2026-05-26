# JAMB Quiz Platform

Full-stack JAMB exam prep platform — plain HTML, CSS, JavaScript frontend with a Node.js/Express backend. No frameworks. No third-party auth services.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/jambquiz
SESSION_SECRET=any-long-random-string-here
PORT=3000
```

### 3. Create the database and tables
```bash
createdb jambquiz
psql -d jambquiz -f schema.sql
```

### 4. Start the server
```bash
node server.js
```

Open **http://localhost:3000** in your browser.

---

## Pages

| Page | URL |
|------|-----|
| Home | / |
| Sign Up | /sign-up.html |
| Log In | /sign-in.html |
| Dashboard | /dashboard.html |
| Quizzes | /quizzes.html |
| Take Quiz | /quiz-take.html?quiz=ID |
| Results | /results.html?attempt=ID |
| Leaderboard | /leaderboard.html |
| Profile | /profile.html |
| Admin | /admin.html |

---

## Make yourself admin

After registering through the app, run this on your database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'techhub248@gmail.com';
```

---

## Stack

- **Frontend**: Plain HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js + Express
- **Auth**: Custom email/password (bcrypt + sessions — no third-party services)
- **Database**: PostgreSQL

## Requirements

- Node.js 16+
- PostgreSQL

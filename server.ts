import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("void.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    security_question TEXT,
    security_answer TEXT
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migration for existing databases
try {
  db.prepare("SELECT security_question FROM users LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN security_question TEXT");
    db.exec("ALTER TABLE users ADD COLUMN security_answer TEXT");
  } catch (err) {
    console.log("Migration columns already exist or failed", err);
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "void-secret-key-123";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Google OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const baseUrl = process.env.APP_URL?.replace(/\/$/, "") || "";
    const redirectUri = `${baseUrl}/auth/callback`;
    
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "GOOGLE_CLIENT_ID is not configured" });
    }

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    res.json({ url: authUrl });
  });

  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      const baseUrl = process.env.APP_URL?.replace(/\/$/, "") || "";
      const redirectUri = `${baseUrl}/auth/callback`;
      
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(500).send("Google OAuth credentials not configured");
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("Token exchange failed:", errorData);
        return res.status(500).send("Failed to exchange code for tokens");
      }

      const tokens = await tokenResponse.json();
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userResponse.ok) {
        return res.status(500).send("Failed to fetch user info from Google");
      }

      const googleUser = await userResponse.json();

      // Check if user exists, if not create
      let user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(googleUser.email);
      if (!user) {
        const stmt = db.prepare("INSERT INTO users (username, password, security_question, security_answer) VALUES (?, ?, ?, ?)");
        const result = stmt.run(googleUser.email, "GOOGLE_AUTH_USER", "OAuth", "Google");
        user = { id: result.lastInsertRowid, username: googleUser.email };
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}', user: ${JSON.stringify({ id: user.id, username: user.username })} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Google OAuth error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // API Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { username, password, securityQuestion, securityAnswer } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const hashedAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);
      const stmt = db.prepare("INSERT INTO users (username, password, security_question, security_answer) VALUES (?, ?, ?, ?)");
      const result = stmt.run(username, hashedPassword, securityQuestion, hashedAnswer);
      const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, username } });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username } });
  });

  app.post("/api/auth/forgot-password", (req, res) => {
    const { username } = req.body;
    const user: any = db.prepare("SELECT security_question FROM users WHERE username = ?").get(username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ securityQuestion: user.security_question });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { username, securityAnswer, newPassword } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isAnswerCorrect = await bcrypt.compare(securityAnswer.toLowerCase().trim(), user.security_answer);
    if (!isAnswerCorrect) {
      return res.status(401).json({ error: "Incorrect security answer" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
    
    res.json({ success: true, message: "Password reset successfully" });
  });

  app.get("/api/messages", authenticateToken, (req: any, res) => {
    const messages = db.prepare("SELECT * FROM messages WHERE user_id = ? ORDER BY timestamp ASC").all(req.user.id);
    res.json(messages);
  });

  app.post("/api/messages", authenticateToken, (req: any, res) => {
    const { role, content } = req.body;
    const stmt = db.prepare("INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)");
    stmt.run(req.user.id, role, content);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

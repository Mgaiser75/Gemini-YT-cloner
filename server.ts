import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { searchYouTubeChannels, searchYouTubeVideos, getVideoDetails, extractVideoId } from "./youtube-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("projects.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    niche TEXT NOT NULL,
    original_channel TEXT,
    original_video_url TEXT,
    improved_script TEXT,
    visual_prompts TEXT,
    improvement_suggestions TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS youtube_research (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'channel' or 'video'
    external_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    stats_json TEXT, -- views, subscribers, etc.
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/projects", (req, res) => {
    const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
    res.json(projects);
  });

  app.post("/api/projects", (req, res) => {
    const { title, niche, original_channel, original_video_url, improved_script, visual_prompts, improvement_suggestions } = req.body;
    const info = db.prepare(`
      INSERT INTO projects (title, niche, original_channel, original_video_url, improved_script, visual_prompts, improvement_suggestions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, niche, original_channel, original_video_url, improved_script, visual_prompts, improvement_suggestions);
    
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/projects/:id", (req, res) => {
    db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Research API Routes
  app.get("/api/research", (req, res) => {
    const research = db.prepare("SELECT * FROM youtube_research ORDER BY last_updated DESC").all();
    res.json(research);
  });

  app.post("/api/research", (req, res) => {
    const { type, external_id, title, description, thumbnail_url, stats } = req.body;
    const stats_json = JSON.stringify(stats);
    
    const info = db.prepare(`
      INSERT INTO youtube_research (type, external_id, title, description, thumbnail_url, stats_json, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(external_id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        thumbnail_url = excluded.thumbnail_url,
        stats_json = excluded.stats_json,
        last_updated = CURRENT_TIMESTAMP
    `).run(type, external_id, title, description, thumbnail_url, stats_json);
    
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/research/:id", (req, res) => {
    db.prepare("DELETE FROM youtube_research WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // YouTube API Routes
  app.get("/api/youtube/search/channels", async (req, res) => {
    try {
      const { q } = req.query;
      const channels = await searchYouTubeChannels(q as string);
      res.json(channels);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/youtube/search/videos", async (req, res) => {
    try {
      const { q } = req.query;
      const videos = await searchYouTubeVideos(q as string);
      res.json(videos);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/youtube/video-details", async (req, res) => {
    try {
      const { url } = req.query;
      const videoId = extractVideoId(url as string);
      if (!videoId) {
        return res.status(400).json({ error: "Invalid YouTube URL" });
      }
      const details = await getVideoDetails(videoId);
      res.json(details);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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

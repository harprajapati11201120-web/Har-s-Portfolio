import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.set('trust proxy', 1);
app.use(cors());
const PORT = 3000;

// Supabase Initialization
let supabaseUrl = process.env.SUPABASE_URL || 'https://pxrisuslugsuzrljtzbi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4cmlzdXNsdWdzdXpybGp0emJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzE4MjY1OSwiZXhwIjoyMDkyNzU4NjU5fQ.BZkUODEee-ok-_T6tpo9uJpBSEwMP-ilxUvWIiHaF68';

// Normalize URL (strip /rest/v1 if present)
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');
  if (supabaseUrl.endsWith('/')) supabaseUrl = supabaseUrl.slice(0, -1);
}

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const UPLOADS_DIR = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'data/uploads');
const PROJECTS_FILE = process.env.NODE_ENV === 'production' ? '/tmp/projects.json' : path.join(process.cwd(), 'data/projects.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Local projects fallback logic
const initialProjects = [
  {
    id: "1",
    title: "AI Music Generator",
    description: "A professional AI-powered music generation tool for businesses and content creators.",
    type: "video",
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    posterUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800",
    createdAt: new Date().toISOString()
  }
];

function getLocalProjects() {
  if (!fs.existsSync(PROJECTS_FILE)) {
    try {
      fs.writeFileSync(PROJECTS_FILE, JSON.stringify(initialProjects, null, 2));
    } catch (e) {
      return initialProjects;
    }
    return initialProjects;
  }
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  } catch (e) {
    return initialProjects;
  }
}

function saveLocalProject(project: any) {
  const projects = getLocalProjects();
  projects.unshift(project);
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

function deleteLocalProject(id: string) {
  const projects = getLocalProjects().filter((p: any) => p.id !== id);
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'har-secret-key'));
app.use('/uploads', express.static(UPLOADS_DIR));

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage });

// Admin Authentication Middleware
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.signedCookies.admin_token === 'har-authenticated') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- API ROUTES ---
const apiRouter = express.Router();

// Health Check
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
});

// Login
apiRouter.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (username === 'har2011' && password === '20112011') {
    res.cookie('admin_token', 'har-authenticated', {
      httpOnly: true,
      signed: true,
      secure: true, // Always true for modern browsers/Vercel
      sameSite: 'none', // Needed for cross-domain or iframe environments
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Logout
apiRouter.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

// Auth Status
apiRouter.get('/auth/status', (req, res) => {
  res.json({ 
    isAuthenticated: req.signedCookies.admin_token === 'har-authenticated',
    supabaseConfigured: !!supabase,
    databaseHealthy: !!supabase
  });
});

// Helper to handle Supabase Storage
async function uploadToSupabase(file: Express.Multer.File, bucket: string) {
  if (!supabase) return null;
  const fileExt = path.extname(file.originalname);
  const fileName = `${Date.now()}-${uuidv4()}${fileExt}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fs.readFileSync(file.path), {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.error(`Supabase Storage Error (${bucket}):`, error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
}

// Get Projects
apiRouter.get('/projects', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return res.json(data.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          type: p.type,
          url: p.url,
          posterUrl: p.poster_url,
          createdAt: p.created_at
        })));
      }
    }
  } catch (err) {}
  res.json(getLocalProjects());
});

// Upload Project
apiRouter.post('/projects', isAdmin, upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'contentFile', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, description, type, url } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const posterFile = files?.['poster']?.[0];
    const contentFile = files?.['contentFile']?.[0];

    if (!posterFile) return res.status(400).json({ error: 'Poster image is required' });

    let finalPosterUrl = `/uploads/${posterFile.filename}`;
    let finalContentUrl = (type === 'video' && contentFile) ? `/uploads/${contentFile.filename}` : url;

    if (supabase) {
      const supabasePoster = await uploadToSupabase(posterFile, 'projects');
      if (supabasePoster) finalPosterUrl = supabasePoster;
      if (type === 'video' && contentFile) {
        const supabaseContent = await uploadToSupabase(contentFile, 'projects');
        if (supabaseContent) finalContentUrl = supabaseContent;
      }
    }

    const newProject = {
      id: uuidv4(),
      title,
      description,
      type,
      url: finalContentUrl,
      posterUrl: finalPosterUrl,
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      await supabase.from('projects').insert([{
        id: newProject.id,
        title: newProject.title,
        description: newProject.description,
        type: newProject.type,
        url: newProject.url,
        poster_url: newProject.posterUrl,
        created_at: newProject.createdAt
      }]);
    }

    saveLocalProject(newProject);
    res.json(newProject);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Project
apiRouter.delete('/projects/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (supabase) {
      await supabase.from('projects').delete().eq('id', id);
    }
    deleteLocalProject(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mount the router on both /api for local dev and / for Vercel
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("EXPRESS ERROR:", err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Ensure /api routes that reach here (unmatched) return a 404 JSON instead of index.html
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

export default app;

// AI Studio environment handling
const isDev = process.env.NODE_ENV !== 'production';
const isVercel = !!process.env.VERCEL;

if (isDev || !isVercel) {
  async function startServer() {
    console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);
    
    if (isDev) {
      console.log("Attaching Vite middleware...");
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        console.log(`Serving static files from ${distPath}`);
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      } else {
        console.warn("WARNING: Production mode requested but 'dist/' folder not found. Falling back to Vite middleware.");
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      }
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${PORT}`);
    });
  }

  startServer().catch(err => {
    console.error("Critical server startup error:", err);
  });
}

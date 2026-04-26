import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
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
let supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
});

// Login
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  // Use environment variables for safer credentials in production if needed, 
  // but keeping user's hardcoded ones for continuity unless they ask to change.
  if (username === 'har2011' && password === '20112011') {
    res.cookie('admin_token', 'har-authenticated', {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

let supError = false;

// Auth Status
app.get('/api/auth/status', (req, res) => {
  res.json({ 
    isAuthenticated: req.signedCookies.admin_token === 'har-authenticated',
    supabaseConfigured: !!supabase,
    databaseHealthy: !!(supabase && !supError)
  });
});

// Helper to handle Supabase Storage
async function uploadToSupabase(file: Express.Multer.File, bucket: string) {
  if (!supabase) return null;
  
  const fileExt = path.extname(file.originalname);
  const fileName = `${Date.now()}-${uuidv4()}${fileExt}`;
  const filePath = fileName;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fs.readFileSync(file.path), {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.error(`Supabase Storage Error (${bucket}):`, error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}

// Get Projects
app.get('/api/projects', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        supError = false;
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
      
      if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
        console.warn(`Supabase Log: 'projects' table not found (Error ${error.code}).`);
      }
      supError = true;
    }
  } catch (err) {
    console.warn("Supabase connection issue.");
    supError = true;
  }
  
  // Return local projects if Supabase is unavailable (Note: this won't persist well on Vercel)
  res.json(getLocalProjects());
});

// Upload Project
app.post('/api/projects', isAdmin, upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'contentFile', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, description, type, url } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const posterFile = files?.['poster']?.[0];
    const contentFile = files?.['contentFile']?.[0];

    if (!posterFile) return res.status(400).json({ error: 'Poster image is required' });

    let finalPosterUrl = `/uploads/${posterFile.filename}`;
    let finalContentUrl = (type === 'video' && contentFile) ? `/uploads/${contentFile.filename}` : url;

    // Try to upload to Supabase Storage if available
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

    // Try to sync with Supabase DB
    if (supabase) {
      try {
        const { error } = await supabase.from('projects').insert([{
          id: newProject.id,
          title: newProject.title,
          description: newProject.description,
          type: newProject.type,
          url: newProject.url,
          poster_url: newProject.posterUrl,
          created_at: newProject.createdAt
        }]);
        if (error) console.error("Supabase link error:", error);
      } catch (e) {
        console.error("Failed to sync project to Supabase");
      }
    }

    // Still save local as fallback (though limited on Vercel)
    saveLocalProject(newProject);

    res.json(newProject);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// Delete Project
app.delete('/api/projects/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try Supabase delete
    if (supabase) {
      try {
        await supabase.from('projects').delete().eq('id', id);
      } catch (e) {
        console.error("Failed to sync deletion to Supabase");
      }
    }

    // Handle local file cleanup
    const projects = getLocalProjects();
    const project = projects.find((p: any) => p.id === id);

    if (project) {
      try {
        const posterPath = path.join(UPLOADS_DIR, path.basename(project.posterUrl));
        if (fs.existsSync(posterPath)) fs.unlinkSync(posterPath);
        
        if (project.url.startsWith('/uploads/')) {
          const contentPath = path.join(UPLOADS_DIR, path.basename(project.url));
          if (fs.existsSync(contentPath)) fs.unlinkSync(contentPath);
        }
      } catch (e) {
        console.error("Error deleting local files:", e);
      }
    }

    deleteLocalProject(id);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

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

import express from 'express';
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
const PORT = Number(process.env.PORT) || 3000;

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

const UPLOADS_DIR = path.join(process.cwd(), 'data/uploads');
const PROJECTS_FILE = path.join(process.cwd(), 'data/projects.json');

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
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(initialProjects, null, 2));
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
app.use(cookieParser('har-secret-key'));
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

// Login
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (username === 'har2011' && password === '20112011') {
    res.cookie('admin_token', 'har-authenticated', {
      httpOnly: true,
      signed: true,
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
        
        // Detailed cross-check
        if (supabaseUrl && supabaseKey) {
          try {
            const urlMatch = supabaseUrl.match(/(?:https:\/\/)?([^.]+)\.supabase\.co/);
            const keyPayload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
            const urlId = urlMatch ? urlMatch[1] : 'unknown';
            const keyId = keyPayload.ref || 'unknown';
            
            console.log(`- Project ID in URL: ${urlId}`);
            console.log(`- Project ID in Key: ${keyId}`);
            
            if (urlId !== keyId) {
              console.error("!!! CONFIG MISMATCH: Your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY belong to DIFFERENT projects.");
            }
          } catch (e) {}
        }
        console.warn("Please ensure you ran the SQL in DEPLOYMENT.md and that RLS is configured.");
      } else {
        console.error("Supabase Error Logs:");
        console.error("- Error Code:", error?.code);
        console.error("- Message:", error?.message);
        
        const keyPrefix = supabaseKey ? supabaseKey.substring(0, 15) : 'MISSING';
        console.error("- Current Key Prefix in Environment:", keyPrefix + "...");

        if (supabaseKey && (supabaseKey.startsWith('sb_publishable_') || supabaseKey.startsWith('sb_secret_'))) {
          console.error("!!! FATAL: The key in your Settings starts with 'sb_'. This is a STRIPE key, not a Supabase key.");
          console.error("!!! ACTION REQUIRED: Go to Settings -> SUPABASE_SERVICE_ROLE_KEY and paste the eyJ... key you shared.");
        } else if (supabaseKey && supabaseKey.startsWith('eyJ')) {
          try {
            const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
            if (payload.role === 'anon') {
              console.warn("!!! WARNING: You are using an 'anon' key. Some features might fail. Use 'service_role' for full access.");
            }
          } catch (e) {}
        }
      }
      supError = true;
    }
  } catch (err) {
    console.warn("Supabase connection issue.");
    supError = true;
  }
  
  // Return local projects if Supabase is unavailable
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

    const newProject = {
      id: uuidv4(),
      title,
      description,
      type,
      url: type === 'video' && contentFile ? `/uploads/${contentFile.filename}` : url,
      posterUrl: `/uploads/${posterFile.filename}`,
      createdAt: new Date().toISOString()
    };

    // Try to sync with Supabase
    if (supabase) {
      try {
        await supabase.from('projects').insert([{
          id: newProject.id,
          title: newProject.title,
          description: newProject.description,
          type: newProject.type,
          url: newProject.url,
          poster_url: newProject.posterUrl,
          created_at: newProject.createdAt
        }]);
      } catch (e) {
        console.error("Failed to sync project to Supabase");
      }
    }

    // Always save local for persistence in current container
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

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();

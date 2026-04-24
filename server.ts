import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(PROJECTS_FILE)) fs.writeFileSync(PROJECTS_FILE, JSON.stringify([]));

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
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

// Get Projects
app.get('/api/projects', (req, res) => {
  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  res.json(projects);
});

// Upload Project
app.post('/api/projects', isAdmin, upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'contentFile', maxCount: 1 }]), (req, res) => {
  try {
    const { title, description, type, url } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const posterFile = files?.['poster']?.[0];
    const contentFile = files?.['contentFile']?.[0];

    if (!posterFile) return res.status(400).json({ error: 'Poster image is required' });

    const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
    const newProject = {
      id: uuidv4(),
      title,
      description,
      type,
      url: type === 'video' && contentFile ? `/uploads/${contentFile.filename}` : url,
      posterUrl: `/uploads/${posterFile.filename}`,
      createdAt: new Date().toISOString()
    };

    projects.unshift(newProject);
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));

    res.json(newProject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Project
app.delete('/api/projects/:id', isAdmin, (req, res) => {
  const { id } = req.params;
  let projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  const project = projects.find((p: any) => p.id === id);
  
  if (project) {
    // Delete poster file
    const posterPath = path.join(UPLOADS_DIR, path.basename(project.posterUrl));
    if (fs.existsSync(posterPath)) fs.unlinkSync(posterPath);
    
    // Delete content file if it's a local upload
    if (project.url.startsWith('/uploads/')) {
      const contentPath = path.join(UPLOADS_DIR, path.basename(project.url));
      if (fs.existsSync(contentPath)) fs.unlinkSync(contentPath);
    }
    
    projects = projects.filter((p: any) => p.id !== id);
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

// Auth Status
app.get('/api/auth/status', (req, res) => {
  res.json({ isAuthenticated: req.signedCookies.admin_token === 'har-authenticated' });
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

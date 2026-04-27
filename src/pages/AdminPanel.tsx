import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, LogOut, Upload, Link as LinkIcon, Video, Globe, Gamepad2, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { initialProjects } from '../data/projects';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'video' | 'website' | 'game' | 'graphics'>('video');
  const [url, setUrl] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [postUrlInput, setPosterUrlInput] = useState('');
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    // Check session storage for persistence within the session
    const savedAuth = sessionStorage.getItem('admin_auth');
    if (savedAuth === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as any)?.toDate?.()?.toISOString() || doc.data().createdAt
        }));
        setProjects(projectsData);
      }, (err) => {
        console.error("Firestore sync error:", err);
        setError("Database sync error. Check your Firestore rules.");
      });
      return () => unsubscribe();
    }
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'har2011' && password === '20112011') {
      setIsLoggedIn(true);
      sessionStorage.setItem('admin_auth', 'true');
      setError('');
    } else {
      setError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('admin_auth');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) return;
    setError('');

    if (!title || !description || (!posterFile && !postUrlInput)) {
      setError('Please provide a title, description, and poster.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const projectData = {
        title,
        description,
        type,
        url: url || (contentFile ? URL.createObjectURL(contentFile) : ''), 
        posterUrl: postUrlInput || (posterFile ? URL.createObjectURL(posterFile) : ''),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'projects'), projectData);

      // Reset form
      setTitle('');
      setDescription('');
      setUrl('');
      setPosterFile(null);
      setContentFile(null);
      setPosterUrlInput('');
      setUploadProgress(0);
      alert('Success! Project added to Firestore.');
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isLoggedIn) return;
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (err: any) {
      setError('Delete failed. Unauthorized or DB error.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md overflow-hidden rounded-[2.5rem] bg-neutral-900 border border-neutral-800 shadow-2xl"
        >
          <div className="bg-orange-600 p-8 text-center text-white">
            <Lock size={48} className="mx-auto mb-4" />
            <h2 className="text-3xl font-bold">Admin Login</h2>
            <p className="mt-2 opacity-80 text-sm">Secure Global Administration</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Username</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none ring-orange-600 focus:ring-2"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white outline-none ring-orange-600 focus:ring-2"
                  placeholder="Enter password"
                />
              </div>

              {error && <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20"><ShieldAlert size={14} /> {error}</div>}
              
              <button 
                type="submit"
                className="w-full rounded-xl bg-orange-600 py-4 font-bold text-white shadow-lg shadow-orange-900/20 transition-all hover:bg-orange-700 active:scale-95"
              >
                Login
              </button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-[10px] text-neutral-600 uppercase tracking-widest">Powered by PH Technologies</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-12">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Admin <span className="text-orange-500">Dashboard</span></h1>
          <div className="mt-4 flex items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-600/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-500 ring-1 ring-green-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Firestore Sync Active
            </div>
            <p className="flex items-center gap-2 text-sm text-neutral-400">
              <CheckCircle2 size={14} className="text-green-500" />
              Admin: {username}
            </p>
          </div>
          {error && <p className="mt-4 text-sm font-bold text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-full border border-neutral-800 px-6 py-2 text-sm font-bold text-neutral-400 hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut size={16} />
          Lock Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Upload Form */}
        <section>
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-2xl">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600">
                <Plus size={24} />
              </div>
              Create New Project
            </h2>
            
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-neutral-400">Project Title</label>
                  <input 
                    type="text" 
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 outline-none ring-orange-600 focus:ring-2"
                    placeholder="Enter project name..."
                  />
                </div>
                
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-400">Content Type</label>
                  <select 
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 outline-none ring-orange-600 focus:ring-2"
                  >
                    <option value="video">Media (Video/Audio/Image)</option>
                    <option value="website">Website</option>
                    <option value="game">Game</option>
                    <option value="graphics">Graphic Design</option>
                  </select>
                </div>

                <div className={cn(type === 'video' ? 'sm:col-span-2' : '')}>
                  <label className="mb-2 block text-sm font-medium text-neutral-400">
                    {type === 'video' ? 'Media File (Videos: MP4, MPG, MOV, AVI | Audio: MP3 | Image: JPG, PNG)' : 'Content URL'}
                  </label>
                  {type === 'video' ? (
                    <div className="space-y-4">
                      <label className="flex h-14 w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-neutral-800 bg-neutral-950 px-4 transition-colors hover:border-orange-500/50 hover:bg-neutral-900/50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900">
                          <Upload size={14} className="text-orange-500" />
                        </div>
                        <span className="text-sm text-neutral-500 truncate">
                          {contentFile ? contentFile.name : 'Select media file...'}
                        </span>
                        <input 
                          type="file" 
                          accept="video/*,audio/*,image/*" 
                          onChange={(e) => setContentFile(e.target.files?.[0] || null)}
                          className="hidden" 
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <input 
                        type="url" 
                        required={type !== 'video'}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-4 py-3 outline-none ring-orange-600 focus:ring-2"
                        placeholder="https://..."
                      />
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-400">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-32 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 outline-none ring-orange-600 focus:ring-2"
                  placeholder="Tell us about this project..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-400">Poster Image</label>
                <div className="space-y-3">
                  <input 
                    type="url" 
                    value={postUrlInput}
                    onChange={(e) => setPosterUrlInput(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm outline-none ring-orange-600 focus:ring-2"
                    placeholder="Or paste poster URL directly..."
                  />
                  <div className="flex items-center gap-4 text-neutral-600">
                    <div className="h-[1px] flex-1 bg-neutral-800" />
                    <span className="text-[10px] uppercase font-bold tracking-widest">OR</span>
                    <div className="h-[1px] flex-1 bg-neutral-800" />
                  </div>
                  <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-800 bg-neutral-950 transition-colors hover:border-orange-500/50 hover:bg-neutral-900/50">
                    {posterFile ? (
                      <div className="flex flex-col items-center p-4">
                        <img src={URL.createObjectURL(posterFile)} className="mb-2 h-20 w-32 rounded-lg object-cover" />
                        <span className="text-xs text-neutral-400">{posterFile.name} (Change)</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={32} className="mb-2 opacity-20" />
                        <p className="text-sm text-neutral-500 font-medium">Click or drag to upload poster</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className="relative flex w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-orange-600 py-5 text-lg font-bold text-white shadow-xl shadow-orange-900/20 transition-all hover:bg-orange-700 active:scale-[0.98] disabled:opacity-80"
              >
                <div className="relative z-10 flex items-center gap-2">
                  {isUploading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-4 border-white border-t-transparent" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      <span>Publish to Portfolio</span>
                    </>
                  )}
                </div>
              </button>
            </form>
          </div>
        </section>

        {/* Project List */}
        <section>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Active Projects</h2>
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold text-neutral-500">{projects.length} TOTAL</span>
          </div>

          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {projects.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="group flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-4 transition-all hover:border-neutral-700"
                >
                  <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-black">
                    <img src={p.posterUrl} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="truncate font-bold">{p.title}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 font-medium uppercase tracking-wider">
                      {p.type === 'video' && <Video size={10} />}
                      {p.type === 'website' && <Globe size={10} />}
                      {p.type === 'game' && <Gamepad2 size={10} />}
                      {p.type}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 size={20} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {projects.length === 0 && (
              <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-800 text-neutral-500">
                <p>No projects synced with Firestore yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Play, Gamepad2, Info, X, Layout, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import VideoPlayer from '../components/VideoPlayer';
import { initialProjects } from '../data/projects';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface Project {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'website' | 'game' | 'graphics';
  url: string;
  posterUrl: string;
}

export default function Portfolio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<'all' | 'video' | 'website' | 'game' | 'graphics'>('all');
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState<Project | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as any)?.toDate?.()?.toISOString() || doc.data().createdAt
      })) as unknown as Project[];
      
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore projects fetch failed:", error);
      setProjects(initialProjects as any);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => p.type === filter);

  const categories = [
    { id: 'all', label: 'All Projects' },
    { id: 'video', label: 'AI Music & Media', icon: Play },
    { id: 'graphics', label: 'Graphic Design', icon: Layout },
    { id: 'website', label: 'Websites', icon: ExternalLink },
    { id: 'game', label: 'Games', icon: Gamepad2 }
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Media Modal */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 p-2 sm:p-4 backdrop-blur-2xl"
            onClick={() => setActiveMedia(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative flex flex-col w-full max-w-6xl overflow-hidden rounded-2xl sm:rounded-3xl bg-neutral-950 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-video w-full bg-black">
                <VideoPlayer 
                  src={activeMedia.url} 
                  title={activeMedia.title}
                  poster={activeMedia.posterUrl}
                  type={activeMedia.type}
                  onClose={() => setActiveMedia(null)}
                />
              </div>
              
              {/* Overlay description */}
              <div className="p-6 sm:p-10 bg-neutral-950 border-t border-neutral-900 overflow-y-auto max-h-[30vh]">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">{activeMedia.title}</h2>
                  <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
                    {activeMedia.description}
                  </p>
                </motion.div>
              </div>

              <button 
                onClick={() => setActiveMedia(null)}
                className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="mb-12 sm:mb-20 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]"
        >
          Website, Game & <br className="hidden sm:block" /> <span className="text-orange-500 underline decoration-orange-500/30 underline-offset-8">AI Automation</span> Builder
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto max-w-2xl px-4 text-base sm:text-xl text-neutral-400 leading-relaxed"
        >
          High-performance web solutions, immersive gaming experiences, and cutting-edge AI music & automation tailored for your brand.
        </motion.p>
      </section>

      {/* Filter Tabs */}
      <div className="mb-12 sm:mb-16 overflow-x-auto no-scrollbar pb-4 flex justify-start sm:justify-center">
        <div className="flex gap-3 px-4 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border border-neutral-800 px-5 py-2.5 text-sm font-bold transition-all",
                filter === cat.id 
                  ? "bg-orange-600 text-white border-transparent shadow-[0_0_20px_rgba(234,88,12,0.3)]" 
                  : "bg-neutral-900/50 hover:bg-neutral-800 text-neutral-400"
              )}
            >
              {cat.icon && <cat.icon size={16} />}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <AnimatePresence mode="popLayout">
        {loading ? (
          <div key="loading" className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="group relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/50 p-1">
                <div className="aspect-video animate-pulse rounded-2xl bg-neutral-800" />
                <div className="space-y-3 p-6">
                  <div className="h-6 w-2/3 animate-pulse rounded-lg bg-neutral-800" />
                  <div className="h-4 w-full animate-pulse rounded-lg bg-neutral-800" />
                  <div className="h-12 w-full animate-pulse rounded-xl bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <motion.div 
            key="grid"
            layout
            className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredProjects.map((project) => (
              <motion.div key={project.id} layout>
                <ProjectCard 
                  project={project} 
                  onVideoClick={() => setActiveMedia(project)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="relative mb-8">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 -m-8 rounded-full bg-orange-600/20 blur-3xl"
              />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-neutral-900 border border-neutral-800 text-orange-500 shadow-2xl">
                <Layout size={40} className="opacity-50" />
              </div>
            </div>
            <h2 className="mb-3 text-3xl font-black text-white tracking-tight">Showcase Incoming</h2>
            <p className="mx-auto max-w-md text-lg text-neutral-400 leading-relaxed">
              We're currently polishing our latest <span className="text-orange-500 font-bold">PH Technologies</span> innovations. Check back soon for groundbreaking AI and web solutions.
            </p>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-10 px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-orange-500 hover:text-white transition-all transform hover:scale-105 active:scale-95"
            >
              Back to Top
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-20 border-t border-neutral-900 pt-8 pb-12 text-center text-neutral-600">
        <p className="text-xs font-bold uppercase tracking-widest">
          &copy; {new Date().getFullYear()} PH Technologies. All rights reserved.
        </p>
        <div className="mt-4 flex justify-center gap-4 text-xs font-medium">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span className="opacity-20">•</span>
          <Link to="/admin-panel" className="opacity-20 hover:opacity-100 hover:text-white transition-all">Admin Access</Link>
        </div>
      </footer>
    </main>
  );
}

function ProjectCard({ project, onVideoClick }: { project: Project, onVideoClick: () => void }) {
  const isMedia = project.type === 'video' || project.type === 'graphics';
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      onClick={isMedia ? onVideoClick : undefined}
      className={cn(
        "group relative h-full overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/50 shadow-2xl transition-all hover:border-orange-500/50 hover:-translate-y-2 duration-300",
        isMedia && "cursor-pointer"
      )}
    >
      {/* Poster */}
      <div className="aspect-video relative overflow-hidden bg-neutral-800">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
            <Layout className="text-neutral-700" size={40} />
          </div>
        )}
        
        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 p-4 text-center">
            <ShieldAlert className="text-neutral-700 mb-2" size={32} />
            <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest">Image Unavailable</span>
          </div>
        ) : (
          <img 
            src={project.posterUrl} 
            alt={project.title} 
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={cn(
              "h-full w-full object-cover transition-all duration-700",
              imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110",
              "group-hover:scale-110"
            )}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-60" />
        
        {/* Type Badge */}
        <div className="absolute top-4 left-4 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/10 uppercase tracking-wider">
          {project.type}
        </div>

        {/* Play Overlay for Videos/Media */}
        {isMedia && (
          <div 
            onClick={onVideoClick}
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-500 group-hover:opacity-100 cursor-pointer bg-black/40 backdrop-blur-[2px]"
          >
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-600 text-white shadow-[0_0_30px_rgba(234,88,12,0.4)] transition-transform"
            >
              <Play size={32} fill="white" className={cn("ml-0", project.type === 'video' && "ml-1")} />
            </motion.div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="mb-2 text-xl font-bold text-white transition-colors group-hover:text-orange-500">
          {project.title}
        </h3>
        <p className="mb-6 line-clamp-2 text-sm text-neutral-400">
          {project.description}
        </p>
        
        {isMedia ? (
          <button 
            onClick={onVideoClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-orange-700"
          >
            <Play size={16} />
            View {project.type === 'video' ? 'Media' : 'Work'}
          </button>
        ) : (
          <a 
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-800 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-orange-600"
          >
            <ExternalLink size={16} />
            {project.type === 'game' ? 'Play Game' : 'Visit Website'}
          </a>
        )}
      </div>
    </div>
  );
}

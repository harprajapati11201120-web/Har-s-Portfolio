import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Play, Gamepad2, Info, X, Layout } from 'lucide-react';
import { cn } from '../lib/utils';
import VideoPlayer from '../components/VideoPlayer';
import { initialProjects } from '../data/projects';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface Project {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'website' | 'game';
  url: string;
  posterUrl: string;
}

export default function Portfolio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<'all' | 'video' | 'website' | 'game'>('all');
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<Project | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as any)?.toDate?.()?.toISOString() || doc.data().createdAt
      })) as unknown as Project[];
      
      if (projectsData.length > 0) {
        setProjects(projectsData);
      } else {
        setProjects(initialProjects as any);
      }
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
    { id: 'website', label: 'Websites', icon: ExternalLink },
    { id: 'game', label: 'Games', icon: Gamepad2 }
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {/* Video Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-3xl bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <VideoPlayer 
                src={activeVideo.url} 
                title={activeVideo.title}
                poster={activeVideo.posterUrl}
                onClose={() => setActiveVideo(null)}
              />
              
              {/* Overlay description */}
              <div className="absolute inset-x-0 bottom-0 pointer-events-none p-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-32">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{activeVideo.title}</h2>
                  <p className="max-w-3xl text-lg text-neutral-300 leading-relaxed drop-shadow-md">
                    {activeVideo.description}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="mb-16 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-4xl font-extrabold tracking-tight sm:text-6xl"
        >
          Website, Game & <span className="text-orange-500 underline decoration-orange-500/30 underline-offset-8">AI Automation</span> Builder
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto max-w-2xl text-lg text-neutral-400"
        >
          High-performance web solutions, immersive gaming experiences, and cutting-edge AI music & automation tailored for your brand.
        </motion.p>
      </section>

      {/* Filter Tabs */}
      <div className="mb-12 flex flex-wrap justify-center gap-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id as any)}
            className={cn(
              "flex items-center gap-2 rounded-full border border-neutral-800 px-6 py-2.5 text-sm font-medium transition-all",
              filter === cat.id 
                ? "bg-white text-black border-transparent shadow-xl" 
                : "hover:bg-neutral-900 text-neutral-400"
            )}
          >
            {cat.icon && <cat.icon size={16} />}
            {cat.label}
          </button>
        ))}
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
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredProjects.map((project) => (
              <motion.div key={project.id} layout>
                <ProjectCard 
                  project={project} 
                  onVideoClick={() => setActiveVideo(project)}
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
    </main>
  );
}

function ProjectCard({ project, onVideoClick }: { project: Project, onVideoClick: () => void }) {
  const isLocalVideo = project.type === 'video' && project.url.startsWith('/uploads/');

  return (
    <div
      onClick={project.type === 'video' ? onVideoClick : undefined}
      className={cn(
        "group relative h-full overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/50 shadow-2xl transition-all hover:border-orange-500/50 hover:-translate-y-2 duration-300",
        project.type === 'video' && "cursor-pointer"
      )}
    >
      {/* Poster */}
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={project.posterUrl} 
          alt={project.title} 
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-60" />
        
        {/* Type Badge */}
        <div className="absolute top-4 left-4 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold backdrop-blur-md">
          {project.type.toUpperCase()}
        </div>

        {/* Play Overlay for Videos */}
        {project.type === 'video' && (
          <div 
            onClick={onVideoClick}
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-500 group-hover:opacity-100 cursor-pointer bg-black/40 backdrop-blur-[2px]"
          >
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-600 text-white shadow-[0_0_30px_rgba(234,88,12,0.4)] transition-transform"
            >
              <Play size={32} fill="white" className="ml-1" />
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
        
        {isLocalVideo ? (
          <button 
            onClick={onVideoClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-orange-700"
          >
            <Play size={16} />
            View Media
          </button>
        ) : (
          <a 
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-800 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-orange-600"
          >
            {project.type === 'video' ? <Play size={16} /> : <ExternalLink size={16} />}
            {project.type === 'video' ? 'Open Media' : project.type === 'game' ? 'Play Game' : 'Visit Website'}
          </a>
        )}
      </div>
    </div>
  );
}

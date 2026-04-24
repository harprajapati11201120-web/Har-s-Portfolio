import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Layout } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-900/20"
          >
            <Layout size={24} />
          </motion.div>
          <span className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Har's <span className="text-orange-500">Portfolio</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Admin link removed for security */}
        </div>
      </div>
    </nav>
  );
}

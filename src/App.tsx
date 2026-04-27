import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Portfolio from './pages/Portfolio';
import AdminPanel from './pages/AdminPanel';
import Navbar from './components/Navbar';
import WhatsAppButton from './components/WhatsAppButton';
import { FirebaseAuthProvider } from './components/FirebaseAuthProvider';

export default function App() {
  return (
    <FirebaseAuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-orange-500 selection:text-white">
          <Navbar />
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <WhatsAppButton />
        </div>
      </BrowserRouter>
    </FirebaseAuthProvider>
  );
}

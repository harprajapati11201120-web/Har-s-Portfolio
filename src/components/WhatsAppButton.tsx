import React from 'react';
import { motion } from 'motion/react';

export default function WhatsAppButton() {
  const phoneNumber = '+919157245332';
  const message = 'Hello! I am interested in your Website, Game, AI Music for Business, and AI Automation services.';
  const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1, translateY: -4 }}
      whileTap={{ scale: 0.9 }}
      className="group fixed bottom-8 right-8 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_30px_rgb(37,211,102,0.4)] transition-all hover:shadow-[0_12px_40px_rgb(37,211,102,0.6)] sm:h-16 sm:w-16"
      aria-label="Contact on WhatsApp"
    >
      <div className="absolute -top-12 right-0 hidden rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white shadow-2xl group-hover:block whitespace-nowrap border border-neutral-800 lg:block">
        Message me on WhatsApp
        <div className="absolute bottom-[-6px] right-6 h-3 w-3 rotate-45 border-b border-r border-neutral-800 bg-neutral-900" />
      </div>
      
      <img
        src="https://play-lh.googleusercontent.com/bYtqbOcTYOlgc6gqZ2rwb8lptHuwlNE75zYJu6Bn076-hTmvd96HH-6v7S0YUAAJXoJN"
        alt="WhatsApp"
        className="relative z-10 block h-full w-full rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
      
      {/* Pulse effect */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full bg-[#25D366]"
      />
    </motion.a>
  );
}

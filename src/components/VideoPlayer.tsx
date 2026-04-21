import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  RotateCcw, 
  RotateCw,
  SkipBack
} from 'lucide-react';
import { cn } from '../lib/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  onClose?: () => void;
}

export default function VideoPlayer({ src, poster, title, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect media type
  const getMediaType = (url: string) => {
    // Strip query params and fragments to get the clean extension
    const cleanPath = url.split(/[?#]/)[0];
    const ext = cleanPath.split('.').pop()?.toLowerCase();
    
    // Explicitly check for audio first
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'wma'].includes(ext || '')) return 'audio';
    // Then images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'].includes(ext || '')) return 'image';
    // Everything else is treated as video/general media
    return 'video';
  };

  const mediaType = getMediaType(src);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && mediaType !== 'image') setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyM') {
        toggleMute();
      } else if (e.code === 'KeyF') {
        toggleFullscreen();
      } else if (e.code === 'ArrowRight') {
        skip(10);
      } else if (e.code === 'ArrowLeft') {
        skip(-10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setProgress(parseFloat(e.target.value));
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const rates = [0.5, 1, 1.25, 1.5, 2];

  return (
    <div 
      ref={containerRef}
      className={cn(
        "group/player relative flex items-center justify-center bg-black overflow-hidden select-none",
        isFullscreen ? "w-screen h-screen" : "w-full h-full rounded-2xl"
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && mediaType !== 'image' && setShowControls(false)}
      onDoubleClick={mediaType !== 'image' ? toggleFullscreen : undefined}
    >
      {mediaType === 'image' ? (
        <img 
          src={src} 
          alt={title} 
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
        />
      ) : mediaType === 'audio' ? (
        <div className="relative h-full w-full flex items-center justify-center">
          {poster && (
            <img 
              src={poster} 
              alt={title} 
              className="absolute inset-0 h-full w-full object-cover opacity-20 blur-2xl" 
            />
          )}
          <div className="relative z-0 h-64 w-64 overflow-hidden rounded-3xl shadow-2xl transition-transform duration-500 group-hover/player:scale-105">
            <img 
              src={poster} 
              alt={title} 
              className="h-full w-full object-cover" 
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 p-4">
               <div className="h-1 w-full rounded-full bg-white/20">
                 <motion.div 
                   className="h-full rounded-full bg-orange-600"
                   style={{ width: `${progress}%` }}
                 />
               </div>
            </div>
          </div>
          <video
            ref={videoRef}
            src={src}
            className="hidden"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="h-full w-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          playsInline
        />
      )}

      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/60"
          >
            <div className="flex items-center justify-between p-6">
              <h3 className="text-lg font-bold text-white drop-shadow-lg tracking-tight">{title}</h3>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur-xl transition-all hover:bg-orange-600 hover:scale-110 active:scale-95"
                >
                  <SkipBack size={20} className="rotate-180" />
                </button>
              )}
            </div>

            {mediaType !== 'image' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <motion.div
                   initial={false}
                   animate={{ scale: isPlaying ? 0.8 : 1, opacity: isPlaying ? 0 : 0.5 }}
                   className="rounded-full bg-white/10 p-10 backdrop-blur-md"
                 >
                   {isPlaying ? <Pause size={48} className="text-white" /> : <Play size={48} className="text-white ml-2" />}
                 </motion.div>
              </div>
            )}

            <div className="space-y-4 p-8 pointer-events-auto">
              {mediaType !== 'image' && (
                <div className="group/progress relative flex items-center h-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={progress}
                    onChange={handleSeek}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 transition-all hover:h-2 accent-orange-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,0,0,0.5)] [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none"
                    style={{
                      background: `linear-gradient(to right, #ea580c ${progress}%, rgba(255, 255, 255, 0.2) ${progress}%)`
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  {mediaType !== 'image' && (
                    <>
                      <button 
                        onClick={togglePlay}
                        className="text-white transition-transform hover:scale-125 active:scale-90"
                      >
                        {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                      </button>

                      <div className="flex items-center gap-6">
                        <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition-colors">
                          <RotateCcw size={22} />
                        </button>
                        <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition-colors">
                          <RotateCw size={22} />
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                          {isMuted || volume === 0 ? <VolumeX size={26} /> : <Volume2 size={26} />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-24 accent-orange-600 h-1 transition-all"
                        />
                      </div>

                      <div className="text-sm font-mono font-medium text-white/80 tabular-nums">
                        <span>{formatTime(currentTime)}</span>
                        <span className="mx-2 text-white/30">/</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-8">
                  {mediaType !== 'image' && (
                    <div className="relative">
                      <button 
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={cn(
                          "text-white/70 transition-all hover:text-orange-500 hover:scale-110",
                          isSettingsOpen && "text-orange-500 rotate-90"
                        )}
                      >
                        <Settings size={22} />
                      </button>

                      <AnimatePresence>
                        {isSettingsOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full right-0 mb-6 w-36 overflow-hidden rounded-2xl bg-neutral-900/95 p-2 backdrop-blur-2xl border border-neutral-800 shadow-2xl"
                          >
                            <div className="mb-2 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Speed</div>
                            {rates.map(rate => (
                              <button
                                key={rate}
                                onClick={() => {
                                  if (videoRef.current) videoRef.current.playbackRate = rate;
                                  setPlaybackRate(rate);
                                  setIsSettingsOpen(false);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all",
                                  playbackRate === rate ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-neutral-400 hover:bg-white/5 hover:text-white"
                                )}
                              >
                                {rate}x
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {mediaType !== 'image' && (
                    <button 
                      onClick={toggleFullscreen}
                      className="text-white/70 transition-all hover:text-orange-500 hover:scale-110"
                    >
                      {isFullscreen ? <Minimize size={26} /> : <Maximize size={26} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

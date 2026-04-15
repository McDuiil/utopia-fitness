import React, { useState, useEffect } from "react";
import { Terminal, X, Trash2, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DebugLogger = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [hasNewError, setHasNewError] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLogs = window.__ERROR_LOGS__ || [];
      if (currentLogs.length !== logs.length) {
        setLogs([...currentLogs]);
        if (!isOpen && currentLogs.length > logs.length) {
          setHasNewError(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [logs.length, isOpen]);

  const clearLogs = () => {
    window.__ERROR_LOGS__ = [];
    setLogs([]);
    setHasNewError(false);
  };

  if (logs.length === 0 && !isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[9999]">
      {/* Trigger Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNewError(false);
        }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-colors ${
          hasNewError ? "bg-red-500 animate-pulse" : "bg-zinc-800 text-zinc-400"
        }`}
      >
        <Terminal size={18} />
        {hasNewError && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[8px] font-bold text-red-500">
            !
          </span>
        )}
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-12 right-0 w-[85vw] max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">System Logs</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/40">{logs.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clearLogs} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-2 font-mono">
              {logs.slice().reverse().map((log, i) => (
                <div key={log.timestamp || i} className="rounded-xl bg-black/40 p-3 text-[10px] border border-white/5">
                  <div className="flex justify-between text-red-400 mb-1">
                    <span className="font-bold">ERROR</span>
                    <span className="opacity-40">{log.time}</span>
                  </div>
                  <div className="text-white/80 break-all mb-2">{log.message}</div>
                  {log.stack && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-white/20 hover:text-white/40 transition-colors">Stack Trace</summary>
                      <pre className="mt-2 overflow-x-auto text-[8px] text-white/30 leading-relaxed bg-black/20 p-2 rounded-lg">
                        {log.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebugLogger;

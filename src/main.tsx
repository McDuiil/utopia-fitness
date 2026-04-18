import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppProvider } from './context/AppContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { resetApp } from './utils/reset.ts';
import { setupGlobalErrorHandler } from './utils/errorHandler.ts';

// Initialize global error monitoring
setupGlobalErrorHandler();

const GlobalFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-black p-6 text-center">
    <div className="max-w-sm space-y-6">
      <div className="mx-auto h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-black tracking-tight text-white">系统运行异常</h2>
        <p className="text-sm text-white/40">抱歉，应用遇到了无法预料的问题。我们已记录此错误并尝试修复。</p>
      </div>
      <button 
        onClick={resetApp}
        className="w-full rounded-2xl bg-white py-4 font-bold text-black active:scale-95 transition-transform"
      >
        重置并重启应用
      </button>
      <p className="text-[10px] text-white/20 uppercase tracking-widest">Utopia Stability System 1.0</p>
    </div>
  </div>
);

const Root = () => {
  useEffect(() => {
    // Prevent zooming on double tap for mobile safari
    const preventZoom = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (event: TouchEvent) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchend', preventDoubleTapZoom, false);

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchend', preventDoubleTapZoom);
    };
  }, []);

  return (
    <StrictMode>
      <ErrorBoundary name="Global" fallback={<GlobalFallback />}>
        <AppProvider>
          <App />
        </AppProvider>
      </ErrorBoundary>
    </StrictMode>
  );
};

createRoot(document.getElementById('root')!).render(<Root />);

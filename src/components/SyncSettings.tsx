import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Download, Upload, Smartphone, Monitor, CheckCircle2, AlertCircle, Github, Cloud, RefreshCw, LogIn, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { githubService } from '../services/githubService';

export const SyncSettings: React.FC = () => {
  const { t, appData, setAppData, mergeData, syncWithGist, showToast, user, signIn, logout, pushAllToCloud, isAuthReady } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showForcePullConfirm, setShowForcePullConfirm] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);

  const handleExport = () => {
    const dataStr = JSON.stringify(appData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `utopia_sync_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        mergeData(importedData);
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (error) {
        console.error('Import failed:', error);
        showToast(t('syncError'), 'error');
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleGistSync = async () => {
    if (!appData.syncSettings.githubToken || !appData.syncSettings.gistId) {
      setSyncStatus('error');
      showToast(t('enterTokenAndGistId'), 'error');
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
      return;
    }
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      await syncWithGist(false);
      setSyncStatus('success');
    } catch (error) {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleForcePull = async () => {
    if (!appData.syncSettings.githubToken || !appData.syncSettings.gistId) {
      showToast(t('enterTokenAndGistId'), 'error');
      return;
    }
    
    setShowForcePullConfirm(true);
  };

  const executeForcePull = async () => {
    setShowForcePullConfirm(false);
    setIsSyncing(true);
    try {
      const remoteData = await githubService.fetchGist(appData.syncSettings.githubToken, appData.syncSettings.gistId);
      if (remoteData) {
        mergeData(remoteData);
        setSyncStatus('success');
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (error) {
      setSyncStatus('error');
      showToast(t('gistSyncError'), 'error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Firebase Real-time Sync (New Primary) */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Cloud size={80} />
        </div>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{t('realtimeSync' as any) || 'Real-time Sync'}</h3>
            <p className="text-sm text-gray-400">{t('realtimeSyncDesc' as any) || 'Automatic sync across all devices'}</p>
          </div>
        </div>

        {!user ? (
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 p-4 bg-white text-black rounded-2xl font-bold transition-all hover:bg-white/90 active:scale-95 shadow-xl shadow-white/10"
          >
            <LogIn size={20} />
            {t('loginWithGoogle' as any) || 'Login with Google'}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="User" 
                className="w-12 h-12 rounded-full border-2 border-green-500/50"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <button 
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                title={t('logout' as any) || 'Logout'}
              >
                <LogOut size={20} />
              </button>
            </div>

            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                  {t('connected' as any) || 'Connected'}
                </span>
              </div>
              <span className="text-[10px] text-gray-500">
                {t('autoSyncEnabled' as any) || 'Auto-sync active'}
              </span>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={pushAllToCloud}
                className="w-full flex items-center justify-center gap-3 p-4 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-2xl font-bold transition-all hover:bg-blue-500/30 active:scale-95"
              >
                <Cloud size={20} />
                {t('pushAllToCloud' as any) || 'Push All to Cloud'}
              </button>
              <p className="text-[10px] text-gray-500 text-center px-4 leading-relaxed">
                {t('pushAllDesc' as any) || 'Syncs your entire local history to the cloud. Use this after importing data from a file to ensure it reaches all your devices.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Device Mode Selection */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Smartphone className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{t('syncMode')}</h3>
            <p className="text-sm text-gray-400">{t('syncDescription')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setAppData({ ...appData, syncSettings: { ...appData.syncSettings, mode: 'pc' } })}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
              appData.syncSettings.mode === 'pc'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Monitor className="w-6 h-6" />
            <span className="text-sm font-medium">{t('pcMode')}</span>
            {appData.syncSettings.mode === 'pc' && <CheckCircle2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setAppData({ ...appData, syncSettings: { ...appData.syncSettings, mode: 'mobile' } })}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
              appData.syncSettings.mode === 'mobile'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Smartphone className="w-6 h-6" />
            <span className="text-sm font-medium">{t('mobileMode')}</span>
            {appData.syncSettings.mode === 'mobile' && <CheckCircle2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Legacy Sync Options Toggle */}
      <button 
        onClick={() => setShowLegacy(!showLegacy)}
        className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw size={12} className={showLegacy ? 'rotate-180 transition-transform' : ''} />
        {showLegacy ? t('hideLegacySync' as any) || 'Hide Legacy Sync' : t('showLegacySync' as any) || 'Show Legacy Sync'}
      </button>

      <AnimatePresence>
        {showLegacy && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            {/* GitHub Gist Sync */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Github className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{t('gistSync')}</h3>
                  <p className="text-sm text-gray-400">{t('gistSyncDescription')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t('githubToken')}</label>
                  <input
                    type="password"
                    placeholder={t('enterToken')}
                    className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none border border-white/10 focus:border-purple-500/50 transition-all"
                    value={appData.syncSettings.githubToken || ''}
                    onChange={(e) => setAppData({
                      ...appData,
                      syncSettings: { ...appData.syncSettings, githubToken: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t('gistId')}</label>
                  <input
                    type="text"
                    placeholder={t('enterGistId')}
                    className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none border border-white/10 focus:border-purple-500/50 transition-all"
                    value={appData.syncSettings.gistId || ''}
                    onChange={(e) => setAppData({
                      ...appData,
                      syncSettings: { ...appData.syncSettings, gistId: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleGistSync}
                  disabled={isSyncing}
                  className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl text-white transition-all shadow-lg ${
                    isSyncing ? 'bg-gray-600 cursor-not-allowed' : 
                    syncStatus === 'success' ? 'bg-green-500 shadow-green-500/20' :
                    syncStatus === 'error' ? 'bg-red-500 shadow-red-500/20' :
                    'bg-purple-500 hover:bg-purple-600 shadow-purple-500/20'
                  }`}
                >
                  {isSyncing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : syncStatus === 'success' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : syncStatus === 'error' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <Cloud className="w-5 h-5" />
                  )}
                  <span className="text-sm font-bold">
                    {isSyncing ? t('syncing') : 
                     syncStatus === 'success' ? t('gistSyncSuccess') :
                     syncStatus === 'error' ? t('gistSyncError') :
                     t('gistSyncNow')}
                  </span>
                </button>

                <button
                  onClick={handleForcePull}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all"
                  title={t('forcePullTip')}
                >
                  <Download className="w-5 h-5" />
                  <span className="text-sm font-bold">{t('forcePull')}</span>
                </button>
              </div>
            </div>

            {/* Local Export/Import */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all"
              >
                <Download className="w-5 h-5" />
                <span className="text-sm font-medium">{t('exportSync')}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-white transition-all shadow-lg shadow-blue-500/20"
              >
                <Upload className="w-5 h-5" />
                <span className="text-sm font-medium">{t('importSync')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        className="hidden"
      />

      {appData.syncSettings.lastSync && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <AlertCircle className="w-3 h-3" />
          <span>{t('lastSync')}: {new Date(appData.syncSettings.lastSync).toLocaleString()}</span>
        </div>
      )}

      {/* Force Pull Confirmation Modal */}
      {showForcePullConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <AlertCircle className="w-12 h-12 text-orange-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">{t('forcePull')}?</h3>
              <p className="text-sm text-gray-400">{t('confirmForcePull')}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowForcePullConfirm(false)}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-white transition-all"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={executeForcePull}
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 rounded-2xl font-bold text-white transition-all shadow-lg shadow-red-500/20"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

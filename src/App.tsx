import React, { useState } from 'react';
import { AuthView } from './components/AuthView';
import { FeedView } from './components/FeedView';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTab, setCurrentTab] = useState<'feed' | 'profile'>('feed');

  if (!isAuthenticated) {
    return <AuthView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-indigo-400 tracking-wider">CONEXA</h1>
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
          US
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto p-4">
        {currentTab === 'feed' ? (
          <FeedView />
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-2">Perfil do Usuário</h2>
            <p className="text-slate-400 text-sm">Gerencie suas informações e publicações aqui.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 py-3 px-6 flex justify-around items-center z-50">
        <button
          onClick={() => setCurrentTab('feed')}
          className={`flex flex-col items-center text-xs font-medium transition-colors ${
            currentTab === 'feed' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🏠 Feed</span>
        </button>
        <button
          onClick={() => setCurrentTab('profile')}
          className={`flex flex-col items-center text-xs font-medium transition-colors ${
            currentTab === 'profile' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>👤 Perfil</span>
        </button>
      </nav>
    </div>
  );
}

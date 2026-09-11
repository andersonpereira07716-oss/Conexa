import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { FeedView } from './views/main/FeedView';
import { ProfileView } from './views/main/ProfileView';

export const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<'feed' | 'profile'>('feed');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div style={{ backgroundColor: '#0B0F17', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {currentTab === 'feed' ? <FeedView /> : <ProfileView />}

      {/* Navegação Inferior */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#161F30',
        borderTop: '1px solid #1E293B',
        display: 'flex',
        justify: 'space-around',
        padding: '12px 0',
        zIndex: 1000
      }}>
        <button
          onClick={() => setCurrentTab('feed')}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: currentTab === 'feed' ? '#6366F1' : '#94A3B8',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>🏠</span>
          <span>Feed</span>
        </button>

        <button
          onClick={() => setCurrentTab('profile')}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: currentTab === 'profile' ? '#6366F1' : '#94A3B8',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>👤</span>
          <span>Perfil</span>
        </button>
      </div>
    </div>
  );
};

export default App;

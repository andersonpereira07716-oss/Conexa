import React from 'react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px', backgroundColor: '#161F30', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100 }}>
      <button 
        onClick={() => onTabChange('home')}
        style={{ background: 'none', border: 'none', color: activeTab === 'home' ? '#6366F1' : '#94A3B8', fontWeight: activeTab === 'home' ? 'bold' : 'normal', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
      >
        <span>🏠</span>
        <span style={{ fontSize: '0.75rem' }}>Feed</span>
      </button>

      <button 
        onClick={() => onTabChange('profile')}
        style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#6366F1' : '#94A3B8', fontWeight: activeTab === 'profile' ? 'bold' : 'normal', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
      >
        <span>👤</span>
        <span style={{ fontSize: '0.75rem' }}>Perfil</span>
      </button>
    </div>
  );
};
export default BottomNavigation;

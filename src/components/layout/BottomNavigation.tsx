import React from 'react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Feed', icon: '🏠' },
    { id: 'search', label: 'Buscar', icon: '🔍' },
    { id: 'profile', label: 'Perfil', icon: '👤' },
  ];

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(22,31,48,0.92)', backdropFilter: 'blur(10px)', borderTop: '1px solid #232C3D', display: 'flex', justifyContent: 'center', padding: '10px 16px calc(10px + env(safe-area-inset-bottom))', zIndex: 100 }}>
      <div style={{ display: 'flex', gap: '4px', width: '100%', maxWidth: '400px', justifyContent: 'space-around' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                background: isActive ? 'rgba(99,102,241,0.15)' : 'none',
                border: 'none',
                borderRadius: '14px',
                color: isActive ? '#818CF8' : '#64748B',
                fontWeight: isActive ? 700 : 500,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '8px 18px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
              <span style={{ fontSize: '0.68rem' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default BottomNavigation;

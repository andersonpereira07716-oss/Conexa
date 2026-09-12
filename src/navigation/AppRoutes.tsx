import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';

import { LandingView } from '../views/auth/LandingView';
import { LoginView } from '../views/auth/LoginView';

// Carregamento Lazy seguro para exportações nomeadas
const RegisterView = lazy(() => import('../views/auth/RegisterView').then(m => ({ default: m.RegisterView || m.default })));
const RecoveryView = lazy(() => import('../views/auth/RecoveryView').then(m => ({ default: m.RecoveryView || m.default })));
const FeedView = lazy(() => import('../views/main/FeedView').then(m => ({ default: m.FeedView || m.default })));
const ProfileView = lazy(() => import('../views/main/ProfileView').then(m => ({ default: m.ProfileView || m.default })));

export const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('landing');

  useEffect(() => {
    if (!loading) {
      setCurrentScreen(user ? 'home' : 'landing');
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#0B0F17', minHeight: '100vh', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Carregando CONEXA...
      </div>
    );
  }

  const renderContent = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginView onNavigate={setCurrentScreen} />;
      case 'register':
        return <RegisterView onNavigate={setCurrentScreen} />;
      case 'recovery':
        return <RecoveryView onNavigate={setCurrentScreen} />;
      case 'home':
        return user ? <FeedView /> : <LandingView onNavigate={setCurrentScreen} />;
      case 'profile':
        return user ? <ProfileView /> : <LandingView onNavigate={setCurrentScreen} />;
      case 'landing':
      default:
        return <LandingView onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div style={{ backgroundColor: '#0B0F17', minHeight: '100vh', color: '#FFF' }}>
      <Suspense fallback={<div style={{ padding: '20px', color: '#6366F1', textAlign: 'center' }}>Carregando tela...</div>}>
        {renderContent()}
      </Suspense>
    </div>
  );
};

export default AppRoutes;

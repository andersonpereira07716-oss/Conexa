import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';

import { LandingView } from '../views/auth/LandingView';
import { LoginView } from '../views/auth/LoginView';

const RegisterView = lazy(() => import('../views/auth/RegisterView').then(m => ({ default: m.RegisterView })).catch(() => ({ default: () => <div style={{padding:20, color:'red'}}>Erro ao carregar Registro</div> })));
const RecoveryView = lazy(() => import('../views/auth/RecoveryView').then(m => ({ default: m.RecoveryView })).catch(() => ({ default: () => <div style={{padding:20, color:'red'}}>Erro ao carregar Recuperação</div> })));
const HomeProvisoriaView = lazy(() => import('../views/main/HomeProvisoriaView').then(m => ({ default: m.HomeProvisoriaView })).catch(() => ({ default: () => <div style={{padding:20, color:'red'}}>Erro ao carregar Home</div> })));
const ProfileProvisorioView = lazy(() => import('../views/main/ProfileProvisorioView').then(m => ({ default: m.ProfileProvisorioView })).catch(() => ({ default: () => <div style={{padding:20, color:'red'}}>Erro ao carregar Perfil</div> })));

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
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        return user ? <HomeProvisoriaView /> : <LandingView onNavigate={setCurrentScreen} />;
      case 'profile':
        return user ? <ProfileProvisorioView /> : <LandingView onNavigate={setCurrentScreen} />;
      case 'landing':
      default:
        return <LandingView onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', color: '#FFF' }}>
      <Suspense fallback={<div style={{ padding: '20px', color: '#6366F1' }}>Carregando tela...</div>}>
        {renderContent()}
      </Suspense>
    </div>
  );
};

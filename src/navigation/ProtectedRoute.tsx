import React from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: JSX.Element;
  requireOnboarding?: boolean;
}

export const ProtectedRoute: React.FC<Props> = ({ children, requireOnboarding = true }) => {
  const { user, loading, isOnboarded } = useAuth();

  if (loading) {
    return <div>Carregando CONEXA...</div>;
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  if (requireOnboarding && !isOnboarded) {
    window.location.href = '/onboarding';
    return null;
  }

  return children;
};

import React from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: JSX.Element;
}

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando CONEXA...</div>;
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  return children;
};

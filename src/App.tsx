import React from 'react';
import { AppRoutes } from './navigation/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', color: '#FF5555', backgroundColor: 'var(--bg)', height: '100vh', fontFamily: 'sans-serif' }}>
          <h2>⚠️ Erro em um componente da interface:</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Identificamos a origem do problema no projeto:</p>
          <pre style={{ backgroundColor: '#1A1D24', padding: '12px', borderRadius: '8px', overflow: 'auto', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

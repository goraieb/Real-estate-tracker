import type { ReactNode } from 'react';
import { useAuth } from '../firebase/auth';
import { LoginPage } from './LoginPage';

const DEMO_MODE = import.meta.env.VITE_DEMO === 'true';

interface Props {
  children: ReactNode;
}

export function AuthGate({ children }: Props) {
  const { user, loading } = useAuth();

  if (DEMO_MODE) return <>{children}</>;

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

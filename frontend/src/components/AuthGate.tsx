import type { ReactNode } from 'react';
import { useAuth } from '../firebase/auth';
import { LoginPage } from './LoginPage';

interface Props {
  children: ReactNode;
}

export function AuthGate({ children }: Props) {
  const { user, loading } = useAuth();

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

import { useState } from 'react';
import { useAuth } from '../firebase/auth';

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password);
        setSignupSuccess(true);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg.includes('user-not-found') || msg.includes('invalid-credential')) {
        setError('Email ou senha incorretos.');
      } else if (msg.includes('email-already-in-use')) {
        setError('Este email já está cadastrado. Faça login.');
      } else if (msg.includes('weak-password')) {
        setError('Senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (signupSuccess) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h2>Verifique seu email</h2>
          <p>Enviamos um link de verificação para <strong>{email}</strong>.</p>
          <p>Clique no link e depois faça login.</p>
          <button className="btn-login-email" onClick={() => { setSignupSuccess(false); setMode('login'); }}>
            Ir para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Real Estate Tracker</h1>
        <p className="login-subtitle">
          {mode === 'login' ? 'Faça login para acessar seu portfólio' : 'Crie sua conta'}
        </p>

        {/* Google */}
        <button className="btn-login-google" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/><path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.3 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 6.6 6.3 14.7z"/><path fill="#FBBC05" d="M24 46c5.4 0 10.2-1.8 13.9-4.9l-6.9-5.6c-2 1.4-4.5 2.2-7 2.2-6 0-11.1-4-12.9-9.5l-7 5.4C7.8 41.5 15.4 46 24 46z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1 3.1-3 5.6-5.6 7.2l6.9 5.6C41.3 37.5 46 31.3 46 24c0-1.3-.2-2.7-.5-4z"/></svg>
          Continuar com Google
        </button>

        <div className="login-divider"><span>ou</span></div>

        {/* Email/password form */}
        <form onSubmit={handleEmail}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="login-input"
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-login-email" disabled={loading}>
            {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="login-toggle">
          {mode === 'login' ? (
            <>Não tem conta? <button onClick={() => { setMode('signup'); setError(''); }}>Criar conta</button></>
          ) : (
            <>Já tem conta? <button onClick={() => { setMode('login'); setError(''); }}>Fazer login</button></>
          )}
        </p>
      </div>
    </div>
  );
}

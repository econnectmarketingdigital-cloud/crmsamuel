import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithGoogle, user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      setGoogleLoading(true);
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await res.json();

      await loginWithGoogle(userInfo.email, userInfo.name);
      addToast('Conectado via Google com sucesso!', 'success');
      navigate('/');
    } catch (error) {
      addToast(error.message || 'Erro no login com Google', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  const loginGoogleAction = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => addToast('O login com Google falhou.', 'error'),
  });

  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      addToast('Login realizado com sucesso', 'success');
      navigate('/');
    } catch (error) {
      addToast(error.message || 'Erro ao fazer login', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    loginGoogleAction();
  };

  const hasGoogleClient = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#050506',
      position: 'relative',
      overflow: 'hidden',
      padding: '1rem'
    }}>
      {/* Subtle Architectural Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '44px 44px',
        zIndex: 0
      }} />

      {/* Subtle Monochrome Glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-15%', left: '15%', width: '48vw', height: '48vw',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(90px)', animation: 'float 12s infinite alternate ease-in-out'
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '10%', width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(100px)', animation: 'float 15s infinite alternate-reverse ease-in-out'
        }} />
      </div>

      <style>{`
        @keyframes float { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(4%, 4%) scale(1.08); } }
        .login-card {
          background: rgba(12, 12, 14, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 2.25rem;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 255, 255, 0.04);
          position: relative;
          z-index: 10;
        }
        .clean-input {
          background: rgba(255, 255, 255, 0.04) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          color: #FFFFFF !important;
          padding: 12px 16px;
          border-radius: 10px;
          transition: all 0.25s;
          width: 100%;
        }
        .clean-input:focus {
          border-color: #FFFFFF !important;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12) !important;
          outline: none;
        }
        .clean-input::placeholder {
          color: rgba(255, 255, 255, 0.32);
        }
        .mono-btn {
          background: #FFFFFF;
          color: #050506;
          border: none;
          border-radius: 10px;
          padding: 12px;
          font-weight: 800;
          font-size: 0.95rem;
          letter-spacing: 0.4px;
          cursor: pointer;
          transition: all 0.25s ease;
          width: 100%;
        }
        .mono-btn:hover {
          background: #E4E4E7;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(255, 255, 255, 0.18);
        }
      `}</style>

      <div className="login-card" style={{ width: '100%', maxWidth: '410px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img
            src="/logo_full.png"
            alt="Samuel Corrêa - Corretor de Imóveis"
            style={{
              width: '185px',
              height: 'auto',
              margin: '0 auto',
              borderRadius: '14px',
              display: 'block'
            }}
          />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="clean-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="clean-input"
            />
          </div>

          <button type="submit" disabled={loading} className="mono-btn" style={{ marginTop: '0.5rem' }}>
            {loading ? 'Entrando...' : 'Acessar CRM'}
          </button>
        </form>

        {hasGoogleClient && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>ou</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              {googleLoading ? 'Conectando...' : 'Entrar com Google'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;

import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { HiHome, HiViewBoards, HiUserGroup, HiOfficeBuilding, HiCog, HiLogout, HiPlus } from 'react-icons/hi';
import { FiHelpCircle, FiUser } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import OnboardingTour from './OnboardingTour';
import PushNotificationManager from './PushNotificationManager';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('@CRM_Tour_Done');
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const navLinks = [
    { to: '/', icon: <HiHome size={22} />, label: 'Dashboard' },
    { to: '/kanban', icon: <HiViewBoards size={22} />, label: 'Kanban' },
    { to: '/leads', icon: <HiUserGroup size={22} />, label: 'Leads' },
    { to: '/empreendimentos', icon: <HiOfficeBuilding size={22} />, label: 'Imóveis' },
    { to: '/perfil', icon: <FiUser size={22} />, label: 'Meu Perfil' },
    { to: '/configuracoes', icon: <HiCog size={22} />, label: 'Ajustes' },
  ];

  return (
    <div
      className="app-container"
      style={user?.wallpaper_url ? {
        backgroundImage: `url(${user.wallpaper_url})`,
        backgroundSize: 'cover',
        backgroundPosition: user?.wallpaper_position || 'center center',
        backgroundAttachment: 'fixed'
      } : {}}
    >
      {user?.wallpaper_url && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 5, 6, 0.84)', zIndex: 0, pointerEvents: 'none' }} />
      )}

      <OnboardingTour isOpen={showTour} onClose={() => setShowTour(false)} />

      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img
            src="/logo_icon.png"
            alt="Samuel Corrêa"
            style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.22)' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '0.4px' }}>SAMUEL CORRÊA</span>
            <span style={{ fontSize: '0.56rem', color: '#A1A1AA', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>Corretor de Imóveis</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PushNotificationManager mode="bell" />

          <button
            onClick={() => navigate('/leads/novo')}
            style={{
              background: '#FFFFFF',
              color: '#050506',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer'
            }}
            title="Novo Lead"
          >
            <HiPlus size={18} />
          </button>

          <div onClick={() => navigate('/perfil')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.nome}
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFFFFF' }}
              />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.12)', color: '#FFFFFF', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', border: '1px solid rgba(255, 255, 255, 0.35)' }}>
                {user?.nome?.charAt(0)?.toUpperCase() || 'S'}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="brand" style={{ marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <img
            src="/logo_full.png"
            alt="Samuel Corrêa - Corretor de Imóveis"
            style={{
              width: '155px',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '12px'
            }}
          />
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              data-tour={`nav-${link.to.replace('/', '') || 'dashboard'}`}
              className={({ isActive }) => `btn ${isActive ? 'btn-primary' : ''}`}
              style={({ isActive }) => ({
                justifyContent: 'flex-start',
                backgroundColor: isActive ? undefined : 'transparent'
              })}
            >
              {link.icon} {link.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '0.75rem 0', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Notificações</span>
            <PushNotificationManager mode="bell" />
          </div>
          <button
            onClick={() => setShowTour(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
              fontSize: '0.825rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          >
            <FiHelpCircle size={16} /> Guia da Plataforma
          </button>
        </div>

        <div className="user-info" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', overflow: 'hidden' }} onClick={() => navigate('/perfil')}>
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.nome}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFFFFF', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.12)', color: '#FFFFFF', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', border: '1px solid rgba(255, 255, 255, 0.28)', flexShrink: 0 }}>
                  {user?.nome?.charAt(0)?.toUpperCase() || 'S'}
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                  {user?.nome}
                </div>
                <div className="text-secondary" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Corretor de Imóveis
                </div>
              </div>
            </div>
            <button onClick={logout} className="btn" style={{ padding: '0.5rem', color: 'var(--color-danger)' }} title="Sair do sistema">
              <HiLogout size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      <PushNotificationManager mode="banner" />

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        <NavLink to="/" end className="nav-item">
          <HiHome size={22} />
          <span>Início</span>
        </NavLink>
        <NavLink to="/kanban" className="nav-item">
          <HiViewBoards size={22} />
          <span>Kanban</span>
        </NavLink>
        <NavLink to="/leads" className="nav-item">
          <HiUserGroup size={22} />
          <span>Leads</span>
        </NavLink>
        <NavLink to="/empreendimentos" className="nav-item">
          <HiOfficeBuilding size={22} />
          <span>Imóveis</span>
        </NavLink>
        <NavLink to="/configuracoes" className="nav-item">
          <HiCog size={22} />
          <span>Ajustes</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default Layout;

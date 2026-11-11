import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCheck, FiArrowRight, FiTarget, FiStar, FiMap, FiX } from 'react-icons/fi';

const TOUR_STEPS = [
  {
    target: null,
    title: 'Bem-vindo, {nome}! 🏠',
    description: 'Vamos fazer um tour rápido pelo seu CRM imobiliário pessoal para você aproveitar tudo desde o primeiro dia.',
    actionText: 'Começar',
    icon: <FiStar size={28} color="var(--color-primary)" />,
    triggerNext: 'button'
  },
  {
    target: '[data-tour="nav-kanban"]',
    title: 'O Coração das Vendas 🗂️',
    description: 'Clique em "Kanban" para acompanhar seus clientes etapa por etapa, de Novo até Venda Fechada.',
    actionText: 'Ir para Kanban',
    icon: <FiMap size={28} color="#FFFFFF" />,
    triggerNext: '/kanban'
  },
  {
    target: '[data-tour="nav-leads"]',
    title: 'Lista Completa de Leads 👥',
    description: 'Em "Leads" você busca contatos rapidamente, filtra por imóvel/etapa e chama direto no WhatsApp com 1 clique.',
    actionText: 'Ir para Leads',
    icon: <FiTarget size={28} color="#10B981" />,
    triggerNext: '/leads'
  },
  {
    target: '[data-tour="nav-empreendimentos"]',
    title: 'Sua Carteira de Imóveis 🏢',
    description: 'Em "Imóveis" você cadastra os empreendimentos e unidades que trabalha para vincular aos seus leads e vendas.',
    actionText: 'Ir para Imóveis',
    icon: <FiMap size={28} color="#E4E4E7" />,
    triggerNext: '/empreendimentos'
  },
  {
    target: null,
    title: 'Tudo Pronto para Vender! 🚀',
    description: 'Seus webhooks de Meta Ads, Make e Google Ads já caem direto na sua carteira. Boas vendas!',
    actionText: 'Concluir',
    icon: <FiCheck size={28} color="#10B981" />,
    triggerNext: 'finish'
  }
];

export default function OnboardingTour({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isOpen) setStep(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const currentStep = TOUR_STEPS[step];
    if (currentStep?.triggerNext?.startsWith('/') && location.pathname === currentStep.triggerNext) {
      if (step < TOUR_STEPS.length - 1) {
        setStep(step + 1);
      }
    }
  }, [location.pathname, isOpen, step]);

  if (!isOpen) return null;

  const current = TOUR_STEPS[step];
  const nome = user?.nome?.split(' ')[0] || 'Samuel';

  const handleClose = () => {
    localStorage.setItem('@CRM_Tour_Done', 'true');
    onClose();
  };

  const handleAction = () => {
    if (current.triggerNext === 'finish') {
      handleClose();
      return;
    }
    if (current.triggerNext?.startsWith('/')) {
      navigate(current.triggerNext);
    }
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      maxWidth: '380px',
      width: 'calc(100% - 32px)',
      background: 'rgba(12, 12, 15, 0.96)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      borderRadius: '18px',
      padding: '1.35rem',
      boxShadow: '0 20px 50px rgba(0,0,0,0.85)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {current.icon}
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E4E4E7', textTransform: 'uppercase' }}>
            Passo {step + 1} de {TOUR_STEPS.length}
          </span>
        </div>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
          <FiX size={18} />
        </button>
      </div>

      <h3 className="font-heading" style={{ fontSize: '1.15rem', margin: '0 0 0.5rem 0', color: '#FFFFFF' }}>
        {current.title.replace('{nome}', nome)}
      </h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
        {current.description}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#71717A', fontSize: '0.8rem', cursor: 'pointer' }}>
          Pular guia
        </button>
        <button onClick={handleAction} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {current.actionText} <FiArrowRight />
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { FiSave, FiCopy, FiCheck, FiLink } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function Configuracoes() {
  const [config, setConfig] = useState({
    reserva_prazo_horas: '48',
    alerta_sem_contato_horas: '24',
    meta_vgv_pessoal: '500000'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const { addToast } = useToast();

  const apiBase = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await api.config.getConfig();
      if (Array.isArray(data)) {
        const configObj = { ...config };
        data.forEach(item => {
          if (Object.prototype.hasOwnProperty.call(configObj, item.chave)) {
            configObj[item.chave] = item.valor;
          }
        });
        setConfig(configObj);
      }
    } catch (err) {
      addToast(err.message || 'Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.config.updateConfig(config);
      addToast('Configurações atualizadas com sucesso!', 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copyWebhook = (key, url) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    addToast('URL copiada para a área de transferência!', 'success');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  if (loading) return <div className="p-6 text-center text-[var(--color-text-secondary)]">Carregando configurações...</div>;

  const webhooks = [
    { key: 'meta', label: 'Meta Ads (Lead Ads Direto)', url: `${apiBase}/api/webhooks/meta` },
    { key: 'make', label: 'Make / Automação (Meta & Formulários)', url: `${apiBase}/api/webhooks/make` },
    { key: 'google', label: 'Google Ads / Site', url: `${apiBase}/api/webhooks/google` }
  ];

  return (
    <div style={{ padding: '1rem', maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
        Configurações do CRM
      </h1>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div className="input-group">
              <label>Meta Mensal de VGV (R$)</label>
              <input
                type="number"
                name="meta_vgv_pessoal"
                value={config.meta_vgv_pessoal}
                onChange={handleChange}
                className="input"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.4rem' }}>
                Usada na barra de progresso do seu Dashboard.
              </p>
            </div>

            <div className="input-group">
              <label>Alerta sem Primeiro Contato (horas)</label>
              <input
                type="number"
                name="alerta_sem_contato_horas"
                value={config.alerta_sem_contato_horas}
                onChange={handleChange}
                className="input"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.4rem' }}>
                Destaca leads parados em "Novo" no Dashboard.
              </p>
            </div>

            <div className="input-group">
              <label>Prazo de Reserva de Unidade (horas)</label>
              <input
                type="number"
                name="reserva_prazo_horas"
                value={config.reserva_prazo_horas}
                onChange={handleChange}
                className="input"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.4rem' }}>
                Tempo limite de reserva antes de liberar a unidade.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiSave /> {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>

      {/* Webhooks Info */}
      <div className="card">
        <h3 className="font-heading" style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
          <FiLink /> Recebimento Automático de Leads (Webhooks)
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Todos os leads enviados para estas URLs entram automaticamente no seu funil, com detecção de reengajamento e notificação no celular.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {webhooks.map(w => (
            <div key={w.key} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>{w.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <code style={{ fontSize: '0.8rem', color: '#E4E4E7', wordBreak: 'break-all' }}>{w.url}</code>
                <button
                  type="button"
                  onClick={() => copyWebhook(w.key, w.url)}
                  className="btn btn-sm btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copiedKey === w.key ? <FiCheck color="#10B981" /> : <FiCopy />}
                  {copiedKey === w.key ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

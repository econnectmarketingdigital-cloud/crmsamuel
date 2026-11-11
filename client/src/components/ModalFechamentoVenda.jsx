import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FiDollarSign, FiCheck, FiX } from 'react-icons/fi';

export default function ModalFechamentoVenda({ isOpen, onClose, leadId, onSuccess }) {
  const { addToast } = useToast();
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [empreendimentoId, setEmpreendimentoId] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEmpreendimentos();
    }
  }, [isOpen]);

  const formatBRL = (number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
  };

  const fetchEmpreendimentos = async () => {
    try {
      const data = await api.empreendimentos.getEmpreendimentos();
      setEmpreendimentos(data || []);
      if (data && data.length > 0) {
        const first = data[0];
        setEmpreendimentoId(first.id);
        const defaultVal = first.valor_min || first.valor_max || 20000;
        setValorVenda(formatBRL(defaultVal));
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const formatCurrencyInput = (value) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    const number = parseInt(clean, 10) / 100;
    return formatBRL(number);
  };

  const getRawValue = (formatted) => {
    if (!formatted) return 0;
    const clean = formatted.replace(/\D/g, '');
    return parseInt(clean, 10) / 100;
  };

  const handleEmpreendimentoChange = (e) => {
    const id = e.target.value;
    setEmpreendimentoId(id);
    const selected = empreendimentos.find(emp => emp.id === id);
    if (selected && (selected.valor_min || selected.valor_max)) {
      setValorVenda(formatBRL(selected.valor_min || selected.valor_max));
    }
  };

  const handleValorChange = (e) => {
    setValorVenda(formatCurrencyInput(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valorReal = getRawValue(valorVenda);
    if (valorReal <= 0) {
      addToast('Informe um valor de venda válido.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.leads.fecharVenda(leadId, {
        empreendimento_id: empreendimentoId || null,
        valor_venda: valorReal
      });
      addToast('🎉 Venda registrada com sucesso! VGV atualizado no painel.', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Erro ao registrar venda', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '20px', padding: '2rem', border: '1px solid rgba(255, 255, 255, 0.22)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 className="font-heading" style={{ fontSize: '1.5rem', margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💰 Registrar Fechamento de Venda
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              Parabéns pela venda! Preencha os dados abaixo para contabilizar o seu VGV no painel.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <FiX size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Qual imóvel / empreendimento foi vendido? (opcional)
            </label>
            <select 
              className="input" 
              value={empreendimentoId} 
              onChange={handleEmpreendimentoChange}
              style={{ width: '100%' }}
            >
              <option value="">Venda avulsa / Não vinculado</option>
              {empreendimentos.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Valor Bruto da Venda (VGV)
            </label>
            <input
              type="text"
              className="input"
              value={valorVenda}
              onChange={handleValorChange}
              placeholder="R$ 0,00"
              required
              style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10B981', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <FiCheck /> {submitting ? 'Salvando...' : 'Confirmar Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

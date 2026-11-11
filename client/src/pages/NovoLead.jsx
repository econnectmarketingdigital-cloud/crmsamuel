import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FiUserPlus, FiArrowLeft, FiSave } from 'react-icons/fi';

const formatPhone = (val) => {
  let v = val.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
  return v;
};

export default function NovoLead() {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    faixa_renda: '',
    empreendimento_interesse_id: '',
    observacoes: ''
  });
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    api.empreendimentos.getEmpreendimentos()
      .then(data => setEmpreendimentos(data || []))
      .catch(() => addToast('Erro ao carregar imóveis', 'error'));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'telefone' ? formatPhone(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.telefone) {
      return addToast('Nome e telefone são obrigatórios', 'error');
    }

    setLoading(true);
    try {
      await api.leads.createLead({
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        email: formData.email && formData.email.trim() ? formData.email.trim() : null,
        faixa_renda: formData.faixa_renda && formData.faixa_renda.trim() ? formData.faixa_renda.trim() : null,
        empreendimento_interesse_id: formData.empreendimento_interesse_id || null,
        observacoes: formData.observacoes && formData.observacoes.trim() ? formData.observacoes.trim() : null,
        origem: 'manual'
      });
      addToast('Lead cadastrado com sucesso!', 'success');
      navigate('/kanban');
    } catch (err) {
      addToast(err.message || 'Erro ao cadastrar lead', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FiArrowLeft /> Voltar
        </button>
        <h1 className="font-heading" style={{ fontSize: '1.65rem', margin: 0, fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiUserPlus style={{ color: '#FFFFFF' }} /> Novo Lead
        </h1>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              Nome Completo *
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              required
              placeholder="Ex: João da Silva"
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                WhatsApp / Telefone *
              </label>
              <input
                type="text"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                required
                placeholder="(98) 99999-9999"
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                E-mail
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="cliente@email.com"
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                Imóvel / Empreendimento de Interesse
              </label>
              <select
                name="empreendimento_interesse_id"
                value={formData.empreendimento_interesse_id}
                onChange={handleChange}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="">Ainda não definido / Aberto</option>
                {empreendimentos.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                Faixa de Renda / Orçamento
              </label>
              <input
                type="text"
                name="faixa_renda"
                value={formData.faixa_renda}
                onChange={handleChange}
                placeholder="Ex: Até R$ 400 mil"
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              Observações
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows="4"
              placeholder="Ex: Procura apartamento 2 quartos com financiamento..."
              className="input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.75rem' }}>
              <FiSave /> {loading ? 'Salvando...' : 'Salvar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

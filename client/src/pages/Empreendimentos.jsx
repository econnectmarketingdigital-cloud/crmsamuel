import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiHome, FiMapPin, FiX } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function Empreendimentos() {
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    incorporadora: '',
    tipo: 'residencial',
    valor_min: '',
    valor_max: '',
    comissao_percentual: '5',
    descricao: ''
  });
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmpreendimentos();
  }, []);

  const fetchEmpreendimentos = async () => {
    try {
      setLoading(true);
      const data = await api.empreendimentos.getEmpreendimentos();
      setEmpreendimentos(data || []);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar imóveis', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) return addToast('Nome do imóvel/empreendimento é obrigatório', 'error');
    try {
      setSaving(true);
      await api.empreendimentos.createEmpreendimento({
        ...formData,
        valor_min: formData.valor_min ? Number(formData.valor_min) : null,
        valor_max: formData.valor_max ? Number(formData.valor_max) : null,
        comissao_percentual: formData.comissao_percentual ? Number(formData.comissao_percentual) : 5.0
      });
      addToast('Imóvel cadastrado com sucesso!', 'success');
      setShowCreateModal(false);
      setFormData({
        nome: '',
        endereco: '',
        incorporadora: '',
        tipo: 'residencial',
        valor_min: '',
        valor_max: '',
        comissao_percentual: '5',
        descricao: ''
      });
      fetchEmpreendimentos();
    } catch (err) {
      addToast(err.message || 'Erro ao cadastrar imóvel', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'Sob consulta';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  if (loading) {
    return <div className="p-6 text-center text-[var(--color-text-secondary)]">Carregando imóveis...</div>;
  }

  return (
    <div className="empreendimentos-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', margin: 0, fontWeight: 800 }}>
            Imóveis & Empreendimentos
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
            Catálogo da sua carteira de imóveis, unidades e valores
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <FiPlus /> Novo Imóvel / Empreendimento
        </button>
      </div>

      {empreendimentos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            Você ainda não cadastrou nenhum imóvel ou empreendimento na sua carteira.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FiPlus /> Cadastrar Primeiro Imóvel
          </button>
        </div>
      ) : (
        <div className="imoveis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
          {empreendimentos.map((emp) => {
            const isComercial = emp.tipo?.toLowerCase().includes('comercial');
            const isLote = emp.tipo?.toLowerCase().includes('lote');
            const iconEmoji = isComercial ? '🏢' : isLote ? '📐' : '🏡';
            const badgeColor = isComercial ? '#C084FC' : isLote ? '#10B981' : '#FFFFFF';
            const badgeBg = isComercial ? 'rgba(168,85,247,0.12)' : isLote ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.1)';
            const badgeBorder = isComercial ? 'rgba(168,85,247,0.28)' : isLote ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.25)';

            return (
              <div
                key={emp.id}
                onClick={() => navigate(`/empreendimentos/${emp.id}`)}
                className="card"
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '1.75rem', marginRight: '8px' }}>{iconEmoji}</span>
                    <h2 className="font-heading" style={{ fontSize: '1.3rem', margin: '0.5rem 0 0 0', fontWeight: 800, color: '#FFFFFF' }}>
                      {emp.nome}
                    </h2>
                  </div>
                  <span style={{
                    backgroundColor: badgeBg,
                    color: badgeColor,
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    border: `1px solid ${badgeBorder}`
                  }}>
                    {emp.tipo || 'Imóvel'}
                  </span>
                </div>

                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                  {emp.descricao || 'Sem descrição cadastrada.'}
                </p>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
                    <FiMapPin color="#E4E4E7" /> {emp.endereco || 'Localização não informada'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
                    <FiHome color="#E4E4E7" /> {emp.total_unidades_real || emp.total_unidades || 0} unidade(s) cadastrada(s)
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.5px', display: 'block' }}>
                      A partir de
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {formatCurrency(emp.valor_min)}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>
                    {emp.disponiveis || 0} disponível(is)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="font-heading" style={{ margin: 0, color: '#FFFFFF' }}>Novo Imóvel / Empreendimento</h3>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-sm btn-secondary"><FiX /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Nome *</label>
                <input
                  type="text"
                  required
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Ex: Residencial Jardim das Flores"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Tipo</label>
                  <select className="input" style={{ width: '100%' }} value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })}>
                    <option value="residencial">Residencial</option>
                    <option value="casa">Casa / Sobrado</option>
                    <option value="apartamento">Apartamento</option>
                    <option value="loteamento">Loteamento</option>
                    <option value="comercial">Comercial</option>
                    <option value="mcmv">Minha Casa Minha Vida</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Construtora / Captação</label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="Ex: Captação Própria"
                    value={formData.incorporadora}
                    onChange={e => setFormData({ ...formData, incorporadora: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Endereço / Bairro</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Ex: Bairro Centro"
                  value={formData.endereco}
                  onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Valor Mín (R$)</label>
                  <input type="number" className="input" style={{ width: '100%' }} value={formData.valor_min} onChange={e => setFormData({ ...formData, valor_min: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Valor Máx (R$)</label>
                  <input type="number" className="input" style={{ width: '100%' }} value={formData.valor_max} onChange={e => setFormData({ ...formData, valor_max: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Comissão (%)</label>
                  <input type="number" step="0.1" className="input" style={{ width: '100%' }} value={formData.comissao_percentual} onChange={e => setFormData({ ...formData, comissao_percentual: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Descrição</label>
                <textarea rows="3" className="input" style={{ width: '100%' }} value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Salvando...' : 'Salvar Imóvel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

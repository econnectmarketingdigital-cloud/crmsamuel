import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiHome, FiCheckCircle, FiClock, FiXCircle, FiArrowLeft, FiPlus, FiX } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function EmpreendimentoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [empreendimento, setEmpreendimento] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [unitForm, setUnitForm] = useState({
    numero: '',
    tipologia: '',
    area_m2: '',
    valor: '',
    status: 'disponivel'
  });
  const { addToast } = useToast();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empData, uniData] = await Promise.all([
        api.empreendimentos.getEmpreendimento(id),
        api.unidades.getUnidades(id)
      ]);
      setEmpreendimento(empData);
      setUnidades(Array.isArray(uniData) ? uniData : []);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar imóvel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!unitForm.numero.trim()) return addToast('Identificação da unidade é obrigatória', 'error');
    try {
      setSavingUnit(true);
      await api.unidades.createUnidade({
        empreendimento_id: id,
        numero: unitForm.numero.trim(),
        tipologia: unitForm.tipologia.trim() || null,
        area_m2: unitForm.area_m2 ? Number(unitForm.area_m2) : null,
        valor: unitForm.valor ? Number(unitForm.valor) : null,
        status: unitForm.status
      });
      addToast('Unidade cadastrada com sucesso!', 'success');
      setShowAddUnit(false);
      setUnitForm({ numero: '', tipologia: '', area_m2: '', valor: '', status: 'disponivel' });
      fetchData();
    } catch (err) {
      addToast(err.message || 'Erro ao criar unidade', 'error');
    } finally {
      setSavingUnit(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'Sob consulta';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!empreendimento) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Imóvel não encontrado.
      </div>
    );
  }

  const stats = {
    total: unidades.length,
    disponivel: unidades.filter(u => u.status === 'disponivel').length,
    reservado: unidades.filter(u => u.status === 'reservado').length,
    vendido: unidades.filter(u => u.status === 'vendido').length
  };

  const filteredUnidades = statusFilter === 'todos'
    ? unidades
    : unidades.filter(u => u.status === statusFilter);

  return (
    <div style={{ padding: '1.25rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={() => navigate('/empreendimentos')}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FiArrowLeft /> Voltar aos Imóveis
        </button>
        <button
          onClick={() => setShowAddUnit(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FiPlus /> Nova Unidade / Lote
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="font-heading" style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', margin: 0, fontWeight: 800, color: '#FFFFFF' }}>
              🏠 {empreendimento.nome}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
              {empreendimento.endereco || empreendimento.descricao || 'Imóvel da carteira'}
            </p>
          </div>
          <span style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            {empreendimento.tipo || 'Imóvel'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <FiHome size={12} /> Total
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>{stats.total}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)' }}>
            <div style={{ fontSize: '0.7rem', color: '#10B981', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <FiCheckCircle size={12} /> Disponíveis
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981' }}>{stats.disponivel}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)' }}>
            <div style={{ fontSize: '0.7rem', color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <FiClock size={12} /> Reservadas
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FBBF24' }}>{stats.reservado}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.06)' }}>
            <div style={{ fontSize: '0.7rem', color: '#F43F5E', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <FiXCircle size={12} /> Vendidas
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F43F5E' }}>{stats.vendido}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="font-heading" style={{ fontSize: '1.35rem', margin: 0, fontWeight: 700, color: '#FFFFFF' }}>
          Espelho de Unidades
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'todos', label: `Todas (${unidades.length})` },
            { key: 'disponivel', label: `Disponíveis (${stats.disponivel})` },
            { key: 'reservado', label: `Reservadas (${stats.reservado})` },
            { key: 'vendido', label: `Vendidas (${stats.vendido})` },
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`btn btn-sm ${statusFilter === filter.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '20px', fontSize: '0.8rem' }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>
        {filteredUnidades.map(unidade => {
          const statusColor = unidade.status === 'disponivel' ? '#10B981' : unidade.status === 'reservado' ? '#FBBF24' : '#F43F5E';
          const statusBg = unidade.status === 'disponivel' ? 'rgba(16,185,129,0.12)' : unidade.status === 'reservado' ? 'rgba(251,191,36,0.12)' : 'rgba(244,63,94,0.12)';
          const statusLabel = unidade.status === 'disponivel' ? 'Disponível' : unidade.status === 'reservado' ? 'Reservado' : 'Vendido';

          return (
            <div key={unidade.id} className="card" style={{ padding: '1rem', position: 'relative', overflow: 'hidden', borderRadius: '14px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: statusColor }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', marginTop: '4px' }}>
                <span className="font-heading" style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>
                  {unidade.numero}
                </span>
                <span style={{
                  background: statusBg,
                  color: statusColor,
                  border: `1px solid ${statusColor}30`,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  {statusLabel}
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                {unidade.tipologia && <div>Tipo: <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{unidade.tipologia}</span></div>}
                {unidade.area_m2 > 0 && <div>Área: <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{unidade.area_m2} m²</span></div>}
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#FFFFFF' }}>
                {formatCurrency(unidade.valor)}
              </div>
            </div>
          );
        })}

        {filteredUnidades.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-secondary)' }}>
            Nenhuma unidade cadastrada nesta categoria.
          </div>
        )}
      </div>

      {showAddUnit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="font-heading" style={{ margin: 0, color: '#FFFFFF' }}>Nova Unidade / Lote</h3>
              <button onClick={() => setShowAddUnit(false)} className="btn btn-sm btn-secondary"><FiX /></button>
            </div>
            <form onSubmit={handleCreateUnit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Número / Identificação *</label>
                <input type="text" required className="input" style={{ width: '100%' }} placeholder="Ex: Apto 101 / Lote 05" value={unitForm.numero} onChange={e => setUnitForm({ ...unitForm, numero: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Tipologia / Quadra</label>
                <input type="text" className="input" style={{ width: '100%' }} placeholder="Ex: 2 Quartos / Quadra A" value={unitForm.tipologia} onChange={e => setUnitForm({ ...unitForm, tipologia: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Área (m²)</label>
                  <input type="number" step="0.01" className="input" style={{ width: '100%' }} value={unitForm.area_m2} onChange={e => setUnitForm({ ...unitForm, area_m2: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Valor (R$)</label>
                  <input type="number" className="input" style={{ width: '100%' }} value={unitForm.valor} onChange={e => setUnitForm({ ...unitForm, valor: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddUnit(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" disabled={savingUnit} className="btn btn-primary">{savingUnit ? 'Salvando...' : 'Salvar Unidade'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiAlertCircle, FiTrendingUp, FiClock, FiChevronRight, FiFilter, FiPlus, FiUsers } from 'react-icons/fi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ETAPAS_FUNIL, getEtapaLabel } from '../lib/utils';

const Dashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.dashboard.getResumo();
        setData(res);
      } catch (err) {
        addToast(err.message || 'Erro ao carregar dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    const today = new Date().getDate();
    const mapByDay = {};
    if (data?.chart) {
      data.chart.forEach(item => {
        mapByDay[Number(item.dia)] = Number(item.vgv);
      });
    }

    const points = [];
    let accumulated = 0;
    const maxDay = Math.max(today, 1);

    for (let d = 1; d <= maxDay; d++) {
      if (mapByDay[d]) {
        accumulated += mapByDay[d];
      }
      points.push({
        day: String(d).padStart(2, '0'),
        label: `Dia ${String(d).padStart(2, '0')}`,
        vgv: accumulated,
        vendaDia: mapByDay[d] || 0
      });
    }

    if (points.length === 1) {
      points.unshift({ day: '01', label: 'Início do Mês', vgv: 0, vendaDia: 0 });
    }

    return points;
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const vgvMes = Number(data?.vgvMes || 0);
  const meta = Number(data?.meta || 500000);
  const vgvPercent = meta > 0 ? Math.min((vgvMes / meta) * 100, 100) : 0;

  const funnelMap = {};
  (data?.leads || []).forEach(item => {
    funnelMap[item.etapa] = Number(item.count || 0);
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(12, 12, 15, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          padding: '12px 16px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
        }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 600 }}>{p.label || `Dia ${label}`}</p>
          <p style={{ color: '#FFFFFF', margin: 0, fontWeight: 800, fontSize: '1.2rem' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(payload[0].value)}
          </p>
          {p.vendaDia > 0 && (
            <p style={{ color: '#10B981', margin: '4px 0 0 0', fontSize: '0.75rem', fontWeight: 600 }}>
              +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(p.vendaDia)} realizada neste dia
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.2rem)', margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Olá, <span style={{ color: 'transparent', backgroundImage: 'linear-gradient(90deg, #FFFFFF, #A1A1AA)', WebkitBackgroundClip: 'text' }}>{user?.nome?.split(' ')[0] || 'Samuel'}</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
            Resumo comercial dos seus atendimentos e vendas do mês.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/leads/novo')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiPlus /> Novo Lead
        </button>
      </div>

      {/* Cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem' }}>
        {/* VGV do Mês + Meta */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', padding: '0.55rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.22)' }}>
              <FiTrendingUp size={20} />
            </div>
            <h3 className="font-heading" style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.05rem' }}>VGV do Mês</h3>
          </div>

          <div style={{ fontSize: 'clamp(1.8rem, 6vw, 2.5rem)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, marginBottom: '1rem' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(vgvMes)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
            <span>Meta Mensal: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(meta)}</span>
            <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{vgvPercent.toFixed(0)}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${vgvPercent}%`, height: '100%', background: 'linear-gradient(90deg, #E4E4E7, #10B981)', borderRadius: '999px', transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* Pipeline / Leads */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.14)', color: '#10B981', padding: '0.55rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <FiUsers size={20} />
            </div>
            <h3 className="font-heading" style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.05rem' }}>Leads & Conversão</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>{data?.totalLeads || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Leads na base</div>
            </div>
            <div style={{ height: '32px', width: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981', lineHeight: 1 }}>{data?.taxaConversao || 0}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Taxa fechamento</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/kanban')} className="btn btn-secondary btn-sm">Abrir Kanban</button>
            <button onClick={() => navigate('/leads')} className="btn btn-secondary btn-sm">Ver Todos</button>
          </div>
        </div>

        {/* Funil Resumido */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.14)', color: '#38BDF8', padding: '0.55rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <FiFilter size={20} />
            </div>
            <h3 className="font-heading" style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.05rem' }}>Funil Atual</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {ETAPAS_FUNIL.filter(e => e.id !== 'perdido').map(etapa => (
              <div
                key={etapa.id}
                onClick={() => navigate(`/leads?etapa=${etapa.id}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{etapa.title}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: etapa.color }}>{funnelMap[etapa.id] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução + Leads Recentes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1rem' }}>
        <div className="card">
          <h3 className="font-heading" style={{ margin: '0 0 1rem 0', fontSize: '1.05rem' }}>Evolução de VGV no Mês</h3>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="vgvMonoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="#71717A" fontSize={12} />
                <YAxis stroke="#71717A" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="vgv" stroke="#FFFFFF" strokeWidth={2.5} fillOpacity={1} fill="url(#vgvMonoGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="font-heading" style={{ margin: 0, fontSize: '1.05rem' }}>Leads Recentes</h3>
            <button onClick={() => navigate('/leads')} className="btn btn-sm btn-secondary">Ver todos</button>
          </div>

          {(!data?.recentLeads || data.recentLeads.length === 0) ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
              Nenhum lead cadastrado ainda. Cadastre um novo lead ou conecte seu webhook!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.recentLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: lead.reengajado ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {lead.nome}
                      {lead.reengajado && <span style={{ fontSize: '0.68rem', color: '#FB923C' }}>🔥 Reengajou</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {lead.telefone || 'Sem telefone'} • {lead.empreendimento_nome || lead.campanha || 'Geral'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#E4E4E7', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.16)', padding: '3px 8px', borderRadius: '6px' }}>
                      {getEtapaLabel(lead.etapa)}
                    </span>
                    <FiChevronRight size={16} color="#71717A" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alertas de leads sem primeiro contato */}
      {data?.alertasSemContato && data.alertasSemContato.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(251, 191, 36, 0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#FBBF24' }}>
            <FiAlertCircle size={18} />
            <h3 className="font-heading" style={{ margin: 0, fontSize: '1rem', color: '#FBBF24' }}>
              Atenção: Leads em "Novo" há mais de {data.alertaHoras || 24}h
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {data.alertasSemContato.map(lead => (
              <button
                key={lead.id}
                onClick={() => navigate(`/leads/${lead.id}`)}
                className="btn btn-sm btn-secondary"
                style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }}
              >
                <FiClock size={14} color="#FBBF24" /> {lead.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

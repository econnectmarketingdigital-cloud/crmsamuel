import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FiPlus, FiSearch, FiFilter, FiMessageCircle } from 'react-icons/fi';
import { getCampanhaBadge, getWhatsAppUrl, ETAPAS_FUNIL, getEtapaLabel, getEtapaColor } from '../lib/utils';

const getOrigemColor = (origem) => {
  const colors = {
    meta_ads: '#3B82F6',
    google_ads: '#EF4444',
    manual: '#E4E4E7'
  };
  return colors[origem] || '#64748B';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const cleanStr = dateStr.includes('T') || dateStr.endsWith('Z')
    ? dateStr
    : dateStr.replace(' ', 'T') + 'Z';
  return new Date(cleanStr).toLocaleDateString('pt-BR');
};

export default function Leads() {
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [etapaFilter, setEtapaFilter] = useState(searchParams.get('etapa') || '');
  const [origemFilter, setOrigemFilter] = useState('');
  const [produtoFilter, setProdutoFilter] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [selectedLeads, setSelectedLeads] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [data, empsData] = await Promise.all([
        api.leads.getLeads(),
        api.empreendimentos.getEmpreendimentos().catch(() => [])
      ]);
      setLeads(data || []);
      setEmpreendimentos(empsData || []);
      setSelectedLeads([]);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads
    .filter(lead => {
      const matchesSearch =
        (lead.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (lead.telefone || '').includes(searchTerm) ||
        (lead.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesEtapa = etapaFilter ? lead.etapa === etapaFilter : true;
      const matchesOrigem = origemFilter ? lead.origem === origemFilter : true;
      const matchesProduto = produtoFilter
        ? `${lead.empreendimento_nome || ''} ${lead.campanha || ''}`.toLowerCase().includes(produtoFilter.toLowerCase())
        : true;

      return matchesSearch && matchesEtapa && matchesOrigem && matchesProduto;
    })
    .sort((a, b) => {
      const timeA = new Date(a.reengajado_em || a.created_at).getTime();
      const timeB = new Date(b.reengajado_em || b.created_at).getTime();
      return timeB - timeA;
    });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedLeads(prev => [...prev, id]);
    } else {
      setSelectedLeads(prev => prev.filter(leadId => leadId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedLeads.length} lead(s) selecionado(s)? Esta ação é irreversível.`)) {
      return;
    }

    setIsDeletingBulk(true);
    let successCount = 0;

    try {
      for (const id of selectedLeads) {
        await api.leads.deleteLead(id);
        successCount++;
      }
      addToast(`${successCount} lead(s) excluído(s) com sucesso.`, 'success');
      fetchData();
    } catch {
      addToast(`Erro ao excluir alguns leads. ${successCount} excluídos.`, 'error');
      fetchData();
    } finally {
      setIsDeletingBulk(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', margin: 0 }}>Meus Leads</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0 0 0', fontSize: '0.875rem' }}>
            Total encontrado: {filteredLeads.length} lead(s)
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/leads/novo')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiPlus /> Novo Lead
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ width: '100%', paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <FiFilter color="var(--color-text-secondary)" />
          <select value={etapaFilter} onChange={(e) => setEtapaFilter(e.target.value)} className="input" style={{ minWidth: '150px' }}>
            <option value="">Todas Etapas</option>
            {ETAPAS_FUNIL.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>

          <select value={origemFilter} onChange={(e) => setOrigemFilter(e.target.value)} className="input" style={{ minWidth: '140px' }}>
            <option value="">Todas Origens</option>
            <option value="meta_ads">Meta Ads</option>
            <option value="google_ads">Google Ads</option>
            <option value="manual">Manual</option>
          </select>

          <select value={produtoFilter} onChange={(e) => setProdutoFilter(e.target.value)} className="input" style={{ minWidth: '160px' }}>
            <option value="">Todos Imóveis</option>
            {empreendimentos.map(emp => (
              <option key={emp.id} value={emp.nome}>{emp.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedLeads.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '15px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#FFFFFF' }}>
            {selectedLeads.length} lead(s) selecionado(s)
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={isDeletingBulk}
            style={{
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: isDeletingBulk ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {isDeletingBulk ? 'Excluindo...' : 'Excluir Selecionados'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Carregando leads...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Nome</th>
                  <th>Telefone / WhatsApp</th>
                  <th>Origem</th>
                  <th>Etapa</th>
                  <th>Imóvel / Campanha</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-tertiary)' }}>
                      Nenhum lead encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => {
                    const campBadge = getCampanhaBadge(lead.campanha, lead.empreendimento_nome);
                    const etapaColor = getEtapaColor(lead.etapa);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        style={{ cursor: 'pointer', backgroundColor: selectedLeads.includes(lead.id) ? 'var(--color-surface-hover)' : 'transparent' }}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={(e) => handleSelectOne(e, lead.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{lead.nome}</span>
                            {lead.reengajado && (
                              <span style={{
                                backgroundColor: 'rgba(249, 115, 22, 0.15)',
                                color: '#FB923C',
                                border: '1px solid rgba(249, 115, 22, 0.4)',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap'
                              }}>
                                🔥 Preencheu de novo
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{lead.telefone || '-'}</span>
                            {lead.telefone && (
                              <a
                                href={getWhatsAppUrl(lead.telefone)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  backgroundColor: 'rgba(37, 211, 102, 0.15)',
                                  color: '#25D366',
                                  border: '1px solid rgba(37, 211, 102, 0.35)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  textDecoration: 'none'
                                }}
                              >
                                <FiMessageCircle size={13} />
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: getOrigemColor(lead.origem),
                            color: lead.origem === 'manual' ? '#050506' : '#fff',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            {lead.origem}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            color: etapaColor,
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${etapaColor}44`,
                            padding: '3px 10px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {getEtapaLabel(lead.etapa)}
                          </span>
                        </td>
                        <td>
                          {campBadge ? (
                            <span style={{
                              backgroundColor: campBadge.bg,
                              color: campBadge.color,
                              border: `1px solid ${campBadge.border}`,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>
                              {campBadge.label}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                              {lead.empreendimento_nome || lead.campanha || '-'}
                            </span>
                          )}
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                          {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

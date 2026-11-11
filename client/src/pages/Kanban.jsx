import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FiClock, FiMessageCircle, FiPhone, FiFilter, FiPlus } from 'react-icons/fi';
import ModalFechamentoVenda from '../components/ModalFechamentoVenda';
import { getWhatsAppUrl, getCampanhaBadge, ETAPAS_FUNIL } from '../lib/utils';

const columns = ETAPAS_FUNIL;

const originBadgeClass = (origem) => {
  if (origem === 'meta_ads') return 'badge-meta';
  if (origem === 'google_ads') return 'badge-google';
  return 'badge-manual';
};

const originLabel = (origem) => {
  if (origem === 'meta_ads') return 'Meta';
  if (origem === 'google_ads') return 'Google';
  return 'Manual';
};

const Kanban = () => {
  const [leads, setLeads] = useState([]);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [selectedProduto, setSelectedProduto] = useState('');
  const [loading, setLoading] = useState(true);
  const [showVendaModal, setShowVendaModal] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsData, empsData] = await Promise.all([
        api.leads.getLeads(),
        api.empreendimentos.getEmpreendimentos().catch(() => [])
      ]);
      setLeads(Array.isArray(leadsData) ? leadsData : (leadsData?.leads || []));
      setEmpreendimentos(empsData || []);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (selectedProduto) {
      const text = `${lead.empreendimento_nome || ''} ${lead.campanha || ''}`.toLowerCase();
      if (!text.includes(selectedProduto.toLowerCase())) return false;
    }
    return true;
  });

  const getLeadsByEtapa = (etapa) => {
    return filteredLeads
      .filter(lead => lead.etapa === etapa)
      .sort((a, b) => {
        const timeA = new Date(a.reengajado_em || a.created_at).getTime();
        const timeB = new Date(b.reengajado_em || b.created_at).getTime();
        return timeB - timeA;
      });
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newEtapa = destination.droppableId;

    if (newEtapa === 'fechado') {
      setActiveLeadId(draggableId);
      setShowVendaModal(true);
      return;
    }

    let motivo = null;
    if (newEtapa === 'perdido') {
      motivo = window.prompt('Qual o motivo da perda/sem resposta?');
      if (!motivo) return;
    }

    setLeads(prev => prev.map(lead => (lead.id === draggableId ? { ...lead, etapa: newEtapa } : lead)));

    try {
      await api.leads.moveLeadEtapa(draggableId, newEtapa, motivo);
      addToast('Lead movido com sucesso', 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao mover lead', 'error');
      fetchData();
    }
  };

  const formatTimeSince = (dateString) => {
    if (!dateString) return 'Agora';
    const diff = new Date() - new Date(dateString);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  if (loading) return <div style={{ padding: '2rem' }}>Carregando...</div>;

  return (
    <div className="flex-col h-full">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
        <h1 className="font-heading" style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', margin: 0 }}>Kanban de Vendas</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiFilter size={16} color="var(--color-text-secondary)" />
            <select
              value={selectedProduto}
              onChange={(e) => setSelectedProduto(e.target.value)}
              className="input"
              style={{
                padding: '6px 32px 6px 12px',
                fontSize: '0.85rem',
                borderRadius: '8px',
                minWidth: '180px'
              }}
            >
              <option value="">Todos os Imóveis</option>
              {empreendimentos.map(emp => (
                <option key={emp.id} value={emp.nome}>{emp.nome}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => navigate('/leads/novo')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiPlus /> Novo Lead
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div
          className="kanban-board"
          style={{
            display: 'flex',
            gap: '1rem',
            overflowX: 'auto',
            paddingBottom: '1rem',
            flex: '1',
            minHeight: 'calc(100vh - 180px)',
            alignItems: 'flex-start'
          }}
        >
          {columns.map(col => {
            const colLeads = getLeadsByEtapa(col.id);
            return (
              <div
                key={col.id}
                className="kanban-column"
                style={{
                  minWidth: '285px',
                  maxWidth: '285px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'calc(100vh - 190px)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: col.color || 'var(--color-text)', margin: 0 }}>
                    {col.title}
                  </h3>
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '999px'
                  }}>
                    {colLeads.length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        minHeight: '100px',
                        flex: '1',
                        overflowY: 'auto',
                        padding: '0.25rem',
                        paddingRight: '0.4rem',
                        borderRadius: '8px',
                        backgroundColor: snapshot.isDraggingOver ? 'var(--color-surface-hover)' : 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      {colLeads.map((lead, index) => {
                        const campBadge = getCampanhaBadge(lead.campanha, lead.empreendimento_nome);

                        return (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                className="card"
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => navigate(`/leads/${lead.id}`)}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.85 : 1,
                                  marginBottom: '0.5rem',
                                  padding: '0.75rem',
                                  cursor: 'pointer',
                                  border: lead.reengajado ? '1px solid rgba(249, 115, 22, 0.5)' : undefined,
                                  boxShadow: lead.reengajado ? '0 0 12px rgba(249, 115, 22, 0.15)' : undefined,
                                }}
                              >
                                {campBadge && (
                                  <div style={{ marginBottom: '6px' }}>
                                    <span style={{
                                      backgroundColor: campBadge.bg,
                                      color: campBadge.color,
                                      border: `1px solid ${campBadge.border}`,
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      {campBadge.label}
                                    </span>
                                  </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', gap: '6px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                    <h4 style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {lead.nome}
                                    </h4>
                                    {lead.telefone && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                        {lead.telefone}
                                      </span>
                                    )}
                                    {lead.reengajado && (
                                      <span style={{
                                        alignSelf: 'flex-start',
                                        backgroundColor: 'rgba(249, 115, 22, 0.15)',
                                        color: '#FB923C',
                                        border: '1px solid rgba(249, 115, 22, 0.4)',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        marginTop: '2px'
                                      }}>
                                        🔥 Preencheu de novo
                                      </span>
                                    )}
                                  </div>
                                  <span className={`badge ${originBadgeClass(lead.origem)}`} style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                                    {originLabel(lead.origem)}
                                  </span>
                                </div>

                                {lead.faixa_renda && (
                                  <div style={{ fontSize: '0.72rem', color: '#E4E4E7', marginBottom: '0.4rem', fontWeight: 600 }}>
                                    💵 Renda: {lead.faixa_renda}
                                  </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: lead.reengajado ? '#FB923C' : 'var(--color-text-tertiary)' }}>
                                    <FiClock size={12} />
                                    <span>{formatTimeSince(lead.reengajado_em || lead.ultimo_contato || lead.created_at)}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    {lead.telefone && (
                                      <a
                                        href={getWhatsAppUrl(lead.telefone)}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          backgroundColor: 'rgba(37, 211, 102, 0.16)',
                                          color: '#25D366',
                                          border: '1px solid rgba(37, 211, 102, 0.35)',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          textDecoration: 'none'
                                        }}
                                        title="Conversar no WhatsApp"
                                      >
                                        <FiMessageCircle size={12} />
                                        WhatsApp
                                      </a>
                                    )}
                                    {lead.telefone && (
                                      <a
                                        href={`tel:${lead.telefone.replace(/\D/g, '')}`}
                                        onClick={e => e.stopPropagation()}
                                        style={{ color: 'var(--color-primary)', padding: '2px' }}
                                        title="Ligar"
                                      >
                                        <FiPhone size={14} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <ModalFechamentoVenda
        isOpen={showVendaModal}
        onClose={() => {
          setShowVendaModal(false);
          setActiveLeadId(null);
        }}
        leadId={activeLeadId}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};

export default Kanban;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FiPhone, FiMail, FiMessageCircle, FiEdit3, FiInfo, FiClock, FiCheck, FiXCircle, FiArrowRight, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import ModalFechamentoVenda from '../components/ModalFechamentoVenda';
import { getWhatsAppUrl, getCampanhaBadge, getEtapaLabel } from '../lib/utils';

const ETAPAS = ['novo', 'contato_feito', 'visita_agendada', 'proposta', 'documentacao', 'fechado'];

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const cleanStr = dateStr.includes('T') || dateStr.endsWith('Z')
    ? dateStr
    : dateStr.replace(' ', 'T') + 'Z';
  return new Date(cleanStr).toLocaleString('pt-BR');
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [lead, setLead] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notaText, setNotaText] = useState('');
  const [showLostModal, setShowLostModal] = useState(false);
  const [showVendaModal, setShowVendaModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadData, histData] = await Promise.all([
        api.leads.getLead(id),
        api.leads.getHistorico(id)
      ]);
      setLead(leadData);
      setHistorico(histData || []);
    } catch {
      addToast('Erro ao carregar dados do lead', 'error');
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNota = async () => {
    if (!notaText.trim()) return;
    try {
      setActionLoading(true);
      await api.leads.addNota(id, notaText);
      setNotaText('');
      addToast('Nota adicionada com sucesso', 'success');
      fetchData();
    } catch {
      addToast('Erro ao adicionar nota', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEtapaChange = async (novaEtapa) => {
    if (novaEtapa === lead.etapa) return;

    if (novaEtapa === 'perdido') {
      setShowLostModal(true);
      return;
    }

    if (novaEtapa === 'fechado') {
      setShowVendaModal(true);
      return;
    }

    try {
      setActionLoading(true);
      await api.leads.moveLeadEtapa(id, novaEtapa);
      addToast('Etapa atualizada com sucesso', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Erro ao atualizar etapa', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNextEtapa = async () => {
    if (!lead) return;
    const currentIndex = ETAPAS.indexOf(lead.etapa);
    if (currentIndex >= 0 && currentIndex < ETAPAS.length - 1) {
      handleEtapaChange(ETAPAS[currentIndex + 1]);
    }
  };

  const handleMarkLost = async () => {
    if (!lostReason.trim()) {
      addToast('Motivo é obrigatório', 'error');
      return;
    }
    try {
      setActionLoading(true);
      await api.leads.moveLeadEtapa(id, 'perdido', lostReason);
      setShowLostModal(false);
      setLostReason('');
      addToast('Lead marcado como perdido', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Erro ao marcar como perdido', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLead = async () => {
    try {
      setActionLoading(true);
      await api.leads.deleteLead(id);
      addToast('Lead excluído com sucesso!', 'success');
      navigate('/kanban');
    } catch (err) {
      addToast(err.message || 'Erro ao excluir lead', 'error');
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Carregando dados...</div>;
  if (!lead) return null;

  const getPhoneNumbers = (phone) => (phone ? phone.replace(/\D/g, '') : '');
  const badge = getCampanhaBadge(lead.campanha, lead.empreendimento_nome);

  return (
    <div style={{ padding: '16px', maxWidth: '1050px', margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary"
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <FiArrowLeft /> Voltar
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
        <div>
          <h1 className="font-heading" style={{ margin: '0 0 10px 0', fontSize: 'clamp(1.4rem, 5vw, 2rem)', display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF', flexWrap: 'wrap' }}>
            {lead.nome}
            {badge && (
              <span style={{
                backgroundColor: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                {badge.label}
              </span>
            )}
            <span className="badge" style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-secondary)' }}>
              {lead.origem}
            </span>
            <span className="badge" style={{
              fontSize: '0.7rem',
              padding: '4px 10px',
              borderRadius: '12px',
              background: lead.etapa === 'perdido' ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.12)',
              color: lead.etapa === 'perdido' ? '#F43F5E' : '#FFFFFF',
              border: `1px solid ${lead.etapa === 'perdido' ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.28)'}`
            }}>
              {getEtapaLabel(lead.etapa)}
            </span>
          </h1>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {lead.telefone && (
              <a href={getWhatsAppUrl(lead.telefone)} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#25D366', color: '#fff', textDecoration: 'none', borderRadius: '8px' }}>
                <FiMessageCircle /> WhatsApp ({lead.telefone})
              </a>
            )}
            {lead.telefone && (
              <a href={`tel:${getPhoneNumbers(lead.telefone)}`} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', borderRadius: '8px' }}>
                <FiPhone /> Ligar
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', borderRadius: '8px' }}>
                <FiMail /> {lead.email}
              </a>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-secondary"
            style={{ color: '#F43F5E', border: '1px solid rgba(244,63,94,0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiTrash2 /> Excluir
          </button>

          {lead.etapa !== 'perdido' && lead.etapa !== 'fechado' && (
            <>
              <button
                onClick={() => setShowLostModal(true)}
                className="btn btn-secondary"
                style={{ color: '#F43F5E', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FiXCircle /> Perdido
              </button>
              <button
                onClick={() => setShowVendaModal(true)}
                className="btn"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                💰 Registrar Venda
              </button>
              <button
                onClick={handleNextEtapa}
                disabled={actionLoading}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Avançar Etapa <FiArrowRight />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stepper */}
      {lead.etapa !== 'perdido' && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', padding: '18px', overflowX: 'auto', gap: '10px' }}>
          {ETAPAS.map((etp, idx) => {
            const currentIdx = ETAPAS.indexOf(lead.etapa);
            const isCompleted = idx <= currentIdx;
            return (
              <div key={etp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isCompleted ? 1 : 0.35, minWidth: '100px', cursor: 'pointer' }} onClick={() => handleEtapaChange(etp)}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isCompleted ? '#FFFFFF' : 'rgba(255,255,255,0.1)', color: isCompleted ? '#050506' : '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', boxShadow: isCompleted ? '0 0 15px rgba(255,255,255,0.28)' : 'none' }}>
                  {isCompleted ? <FiCheck size={18} /> : idx + 1}
                </div>
                <span style={{ fontSize: '0.82em', textAlign: 'center', fontWeight: isCompleted ? 700 : 400, color: isCompleted ? '#FFFFFF' : 'var(--color-text-secondary)' }}>
                  {getEtapaLabel(etp)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 className="font-heading" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
            <FiInfo /> Detalhes do Lead
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Imóvel / Empreendimento de Interesse</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#FFFFFF' }}>{lead.empreendimento_nome || 'Ainda não definido / Aberto'}</p>
            </div>
            {lead.faixa_renda && (
              <div>
                <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Faixa de Renda / Orçamento</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#E4E4E7' }}>{lead.faixa_renda}</p>
              </div>
            )}
            {lead.campanha && lead.campanha !== 'manual' && (
              <div>
                <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Campanha / Origem</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#10B981' }}>{lead.campanha}</p>
              </div>
            )}
            {lead.anuncio && (
              <div>
                <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Anúncio de Origem</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 500, color: '#FFFFFF' }}>{lead.anuncio}</p>
              </div>
            )}
            <div>
              <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Observações Iniciais</span>
              <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{lead.observacoes || 'Nenhuma observação registrada.'}</p>
            </div>
            {lead.perdido_motivo && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <span style={{ fontSize: '0.8em', color: '#F43F5E', fontWeight: 700, textTransform: 'uppercase' }}>Motivo da Perda</span>
                <p style={{ margin: '4px 0 0 0', color: '#F43F5E' }}>{lead.perdido_motivo}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 className="font-heading" style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
              <FiEdit3 /> Nova Nota / Acompanhamento
            </h3>
            <textarea
              value={notaText}
              onChange={(e) => setNotaText(e.target.value)}
              placeholder="Digite o resumo do contato, visita ou negociação..."
              rows="3"
              className="input"
              style={{ width: '100%', marginBottom: '10px', resize: 'vertical' }}
            />
            <button
              onClick={handleAddNota}
              disabled={actionLoading || !notaText.trim()}
              className="btn btn-primary"
              style={{ float: 'right' }}
            >
              Adicionar Nota
            </button>
            <div style={{ clear: 'both' }} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

          <div>
            <h3 className="font-heading" style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
              <FiClock /> Linha do Tempo & Histórico
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
              {historico.length === 0 ? (
                <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9em' }}>Nenhum histórico registrado.</p>
              ) : (
                historico.map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: '10px', fontSize: '0.9em', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF', marginTop: '6px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-tertiary)', fontSize: '0.8em', marginBottom: '4px' }}>
                        <span>{item.corretor_nome || 'Sistema'}</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--color-text)' }}>
                        {item.tipo === 'mudanca_etapa' ? (
                          <span>Mudou etapa de <strong>{getEtapaLabel(item.etapa_anterior)}</strong> para <strong>{getEtapaLabel(item.etapa_nova)}</strong></span>
                        ) : (
                          item.descricao
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lost Modal */}
      {showLostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
          <div className="card" style={{ padding: '20px', width: '90%', maxWidth: '420px', border: '1px solid rgba(244,63,94,0.4)' }}>
            <h3 className="font-heading" style={{ margin: '0 0 10px 0', color: '#F43F5E' }}>Marcar Lead como Perdido</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>Informe o motivo pelo qual a negociação não avançou:</p>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              rows="3"
              className="input"
              placeholder="Ex: Cliente sem renda aprovada / Comprou outro imóvel..."
              style={{ width: '100%', marginBottom: '15px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowLostModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleMarkLost} disabled={actionLoading} className="btn" style={{ background: '#F43F5E', color: '#fff' }}>Confirmar Perda</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
          <div className="card" style={{ padding: '25px', width: '90%', maxWidth: '440px', border: '1px solid rgba(244,63,94,0.4)' }}>
            <h3 className="font-heading" style={{ margin: '0 0 10px 0', color: '#F43F5E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiTrash2 /> Excluir Lead?
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Tem certeza que deseja excluir <strong>{lead.nome}</strong>? Todas as propostas e histórico vinculados a este lead serão removidos.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleDeleteLead} disabled={actionLoading} className="btn" style={{ background: '#F43F5E', color: '#fff', fontWeight: 'bold' }}>
                Sim, Excluir Lead
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalFechamentoVenda
        isOpen={showVendaModal}
        onClose={() => setShowVendaModal(false)}
        leadId={id}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}

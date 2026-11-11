import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getWhatsAppUrl(phone) {
  if (!phone) return '#';
  let digits = phone.replace(/\D/g, '');
  while (digits.startsWith('5555')) {
    digits = digits.substring(2);
  }
  if (!digits.startsWith('55')) {
    digits = '55' + digits;
  }
  return `https://wa.me/${digits}`;
}

export const ETAPAS_FUNIL = [
  { id: 'novo', title: 'Novo', color: '#38BDF8' },
  { id: 'contato_feito', title: 'Contato Feito', color: '#FBBF24' },
  { id: 'visita_agendada', title: 'Visita Agendada', color: '#A855F7' },
  { id: 'proposta', title: 'Proposta', color: '#F97316' },
  { id: 'documentacao', title: 'Documentação', color: '#E4E4E7' },
  { id: 'fechado', title: 'Fechado', color: '#10B981' },
  { id: 'perdido', title: 'Perdido/S. Resposta', color: '#EF4444' },
];

export const ETAPA_LABELS = Object.fromEntries(ETAPAS_FUNIL.map(e => [e.id, e.title]));
export const getEtapaLabel = (etapa) => ETAPA_LABELS[etapa] || etapa;
export const getEtapaColor = (etapa) => ETAPAS_FUNIL.find(e => e.id === etapa)?.color || '#94A3B8';

export function getCampanhaBadge(campanha, empNome) {
  const rawText = empNome || campanha;
  if (!rawText || rawText === 'Meta Ads' || rawText === 'manual' || rawText === 'google_ads') return null;

  const lower = `${campanha || ''} ${empNome || ''}`.toLowerCase();
  if (lower.includes('comercial') || lower.includes('sala')) {
    return { label: `🏢 ${rawText.replace(/campanha\s*[-_:]?\s*/i, '').trim()}`, bg: 'rgba(168, 85, 247, 0.16)', color: '#C084FC', border: 'rgba(168, 85, 247, 0.4)' };
  }
  if (lower.includes('lote') || lower.includes('terreno')) {
    return { label: `📐 ${rawText.replace(/campanha\s*[-_:]?\s*/i, '').trim()}`, bg: 'rgba(16, 185, 129, 0.16)', color: '#34D399', border: 'rgba(16, 185, 129, 0.4)' };
  }
  if (lower.includes('casa') || lower.includes('sobrado') || lower.includes('residencial')) {
    return { label: `🏡 ${rawText.replace(/campanha\s*[-_:]?\s*/i, '').trim()}`, bg: 'rgba(255, 255, 255, 0.14)', color: '#FFFFFF', border: 'rgba(255, 255, 255, 0.35)' };
  }

  const cleanLabel = rawText.replace(/campanha\s*[-_:]?\s*/i, '').trim();
  return { label: `🏠 ${cleanLabel}`, bg: 'rgba(255, 255, 255, 0.09)', color: '#E4E4E7', border: 'rgba(255, 255, 255, 0.25)' };
}

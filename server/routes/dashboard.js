import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

async function buildSingleBrokerDashboard(db, userId) {
  const vgvMesRow = await db.queryOne(`
    SELECT COALESCE(SUM(valor_venda), 0) as vgv, COUNT(*) as vendas_count
    FROM propostas
    WHERE status = 'aprovada'
    AND EXTRACT(MONTH FROM data_fechamento) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM data_fechamento) = EXTRACT(YEAR FROM CURRENT_DATE)
  `);

  const vgvTotalRow = await db.queryOne(`
    SELECT COALESCE(SUM(valor_venda), 0) as vgv, COUNT(*) as vendas_count
    FROM propostas
    WHERE status = 'aprovada'
  `);

  const metaConfig = await db.queryOne(
    "SELECT valor FROM configuracoes WHERE chave IN ('meta_vgv_pessoal', 'meta_vgv_equipe') ORDER BY CASE WHEN chave = 'meta_vgv_pessoal' THEN 0 ELSE 1 END LIMIT 1"
  );
  const userRow = await db.queryOne('SELECT meta_vgv_pessoal FROM usuarios WHERE id = ?', [userId]);
  const metaValue = Number(metaConfig?.valor || userRow?.meta_vgv_pessoal || 500000);

  const alertaConfig = await db.queryOne("SELECT valor FROM configuracoes WHERE chave = 'alerta_sem_contato_horas'");
  const alertaHoras = parseInt(alertaConfig?.valor, 10) || 24;

  const leadsPorEtapa = await db.query('SELECT etapa, COUNT(*)::int as count FROM leads GROUP BY etapa');
  const funnelOrigem = await db.query('SELECT origem, etapa, COUNT(*)::int as count FROM leads GROUP BY origem, etapa');

  const totalLeadsRow = await db.queryOne('SELECT COUNT(*)::int as total FROM leads');
  const fechadosRow = await db.queryOne("SELECT COUNT(*)::int as total FROM leads WHERE etapa = 'fechado'");
  const totalLeads = Number(totalLeadsRow?.total || 0);
  const totalFechados = Number(fechadosRow?.total || 0);
  const taxaConversao = totalLeads > 0 ? Number(((totalFechados / totalLeads) * 100).toFixed(1)) : 0;

  const recentLeads = await db.query(`
    SELECT l.id, l.nome, l.telefone, l.etapa, l.origem, l.campanha, l.created_at, l.reengajado, l.reengajado_em, e.nome as empreendimento_nome
    FROM leads l
    LEFT JOIN empreendimentos e ON l.empreendimento_interesse_id = e.id
    ORDER BY COALESCE(l.reengajado_em, l.created_at) DESC
    LIMIT 8
  `);

  const alertasSemContato = await db.query(`
    SELECT l.id, l.nome, l.telefone, l.origem, l.campanha, l.created_at, e.nome as empreendimento_nome
    FROM leads l
    LEFT JOIN empreendimentos e ON l.empreendimento_interesse_id = e.id
    WHERE l.etapa = 'novo'
    AND l.created_at <= NOW() - (? || ' hours')::interval
    ORDER BY l.created_at ASC
    LIMIT 10
  `, [String(alertaHoras)]);

  const chartDataQuery = await db.query(`
    SELECT EXTRACT(DAY FROM data_fechamento)::int as dia, COALESCE(SUM(valor_venda), 0) as vgv
    FROM propostas
    WHERE status = 'aprovada'
    AND EXTRACT(MONTH FROM data_fechamento) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM data_fechamento) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY dia
    ORDER BY dia ASC
  `);

  return {
    vgv: Number(vgvMesRow?.vgv || 0),
    vgvMes: Number(vgvMesRow?.vgv || 0),
    vgvTotal: Number(vgvTotalRow?.vgv || 0),
    vendasMesCount: Number(vgvMesRow?.vendas_count || 0),
    vendasTotalCount: Number(vgvTotalRow?.vendas_count || 0),
    meta: metaValue,
    totalLeads,
    totalFechados,
    taxaConversao,
    leads: leadsPorEtapa,
    funnel: funnelOrigem,
    chart: chartDataQuery,
    recentLeads,
    alertasSemContato,
    alertaHoras
  };
}

router.get('/resumo', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const data = await buildSingleBrokerDashboard(db, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/corretor', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const data = await buildSingleBrokerDashboard(db, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/gestor', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const data = await buildSingleBrokerDashboard(db, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

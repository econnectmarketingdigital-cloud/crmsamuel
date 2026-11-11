import '../env.js';
import express from 'express';
import { getDb } from '../database.js';
import { findExistingLead } from '../services/deduplicacao.js';
import { notifyCorretorNewLead, notifyCorretorReengajamento } from '../services/notification.js';
import { sendPushToUser } from '../services/webpush.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'samuel_meta_verify_2026';
const DEFAULT_PAGE_ID = process.env.META_PAGE_ID || '';
let cachedPageToken = null;

async function getValidPageToken() {
  if (cachedPageToken) return cachedPageToken;
  const envToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (envToken && DEFAULT_PAGE_ID) {
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${DEFAULT_PAGE_ID}?fields=access_token&access_token=${envToken}`);
      const data = await res.json();
      if (data && data.access_token) {
        cachedPageToken = data.access_token;
        return cachedPageToken;
      }
    } catch {
      // ignora erro e usa token direto do env
    }
  }
  return envToken || '';
}

// Resolve o usuário principal do CRM (corretor individual)
async function getPrimaryBrokerId(db) {
  const user = await db.queryOne(`
    SELECT id FROM usuarios
    WHERE ativo = 1
    ORDER BY CASE WHEN role = 'gestor' THEN 0 ELSE 1 END, created_at ASC
    LIMIT 1
  `);
  return user?.id || null;
}

// Inscreve o app na página da Meta para receber eventos de leadgen
router.get('/subscribe-page', async (req, res) => {
  const systemUserToken = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!systemUserToken || !pageId) {
    return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN ou META_PAGE_ID não configurado no .env' });
  }
  try {
    const pageTokenRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}?fields=access_token&access_token=${systemUserToken}`);
    const pageTokenData = await pageTokenRes.json();

    if (pageTokenData.error) {
      return res.status(400).json({ step: 'get_page_token', error: pageTokenData.error });
    }

    const pageToken = pageTokenData.access_token;
    if (!pageToken) {
      return res.status(400).json({ error: 'Não foi possível obter o Page Access Token.' });
    }

    const subscribeRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscribed_fields: 'leadgen', access_token: pageToken })
    });
    const subscribeData = await subscribeRes.json();

    res.json({
      success: subscribeData.success || false,
      subscription_result: subscribeData,
      page_access_token: pageToken
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Meta Verification (GET)
router.get('/meta', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook] GET Verification Successful!');
    res.status(200).send(challenge);
  } else {
    console.error('[Meta Webhook] GET Verification Failed.');
    res.sendStatus(403);
  }
});

async function resolveMetaLeadDetails(telefone, nome) {
  try {
    if (!DEFAULT_PAGE_ID) return null;
    const token = await getValidPageToken();
    if (!token) return null;

    const digits = (telefone || '').replace(/\D/g, '');
    const last8 = digits.length >= 8 ? digits.slice(-8) : '';
    const cleanName = (nome || '').trim().toLowerCase();

    const url = `https://graph.facebook.com/v20.0/${DEFAULT_PAGE_ID}/leadgen_forms?fields=id,name,leads.limit(15){id,created_time,ad_name,campaign_name,field_data}&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || !Array.isArray(data.data)) return null;

    let bestMatch = null;
    for (const form of data.data) {
      const leads = form.leads?.data || [];
      for (const ml of leads) {
        let mPhone = '';
        let mName = '';
        for (const f of ml.field_data || []) {
          const fn = (f.name || '').toLowerCase();
          if (fn.includes('phone') || fn.includes('whatsapp') || fn.includes('telefone')) {
            mPhone = f.values?.[0] || '';
          } else if (fn.includes('name') || fn.includes('nome')) {
            mName = f.values?.[0] || '';
          }
        }
        const mDigits = mPhone.replace(/\D/g, '');
        const mLast8 = mDigits.length >= 8 ? mDigits.slice(-8) : '';

        const phoneMatches = last8 && mLast8 && last8 === mLast8;
        const nameMatches = cleanName && mName && cleanName === mName.trim().toLowerCase();

        if (phoneMatches || nameMatches) {
          if (!bestMatch || new Date(ml.created_time) > new Date(bestMatch.created_time)) {
            bestMatch = {
              form_name: form.name || '',
              campaign_name: ml.campaign_name || '',
              ad_name: ml.ad_name || '',
              created_time: ml.created_time
            };
          }
        }
      }
    }
    return bestMatch;
  } catch (err) {
    console.error('[Webhook] Erro ao consultar detalhes do lead na Meta API:', err.message);
    return null;
  }
}

async function matchEmpreendimento(db, searchText, explicitEmp) {
  if (explicitEmp) {
    const emp = await db.queryOne('SELECT id FROM empreendimentos WHERE nome ILIKE ? AND ativo = 1', [`%${explicitEmp}%`]);
    if (emp) return emp.id;
  }

  if (!searchText) return null;

  const allEmps = await db.query('SELECT id, nome FROM empreendimentos WHERE ativo = 1');
  const lower = searchText.toLowerCase();
  for (const emp of allEmps) {
    if (emp.nome && lower.includes(emp.nome.toLowerCase())) {
      return emp.id;
    }
  }
  return null;
}

const handleIncomingLead = async (leadData) => {
  const db = getDb();
  const { nome, telefone, email, origem = 'meta_ads', empreendimento, faixa_renda, renda, observacoes } = leadData;
  const rendaFinal = faixa_renda || renda || null;

  if (!nome && !telefone && !email) {
    console.warn('[Webhook] Payload vazio ignorado.');
    return;
  }

  try {
    let rawCampanha = leadData.campanha || leadData.campaign_name || leadData.campaign || leadData.form_name || leadData.formulario || '';
    let rawAnuncio = leadData.anuncio || leadData.ad_name || null;
    let rawFormName = leadData.form_name || leadData.formulario || '';

    if (!rawCampanha || rawCampanha.toLowerCase() === 'meta ads' || !rawAnuncio) {
      const metaDetails = await resolveMetaLeadDetails(telefone, nome);
      if (metaDetails) {
        if (!rawCampanha || rawCampanha.toLowerCase() === 'meta ads') {
          rawCampanha = metaDetails.campaign_name || metaDetails.form_name || rawCampanha;
        }
        if (!rawAnuncio && metaDetails.ad_name) {
          rawAnuncio = metaDetails.ad_name;
        }
        if (!rawFormName && metaDetails.form_name) {
          rawFormName = metaDetails.form_name;
        }
      }
    }

    const searchContext = [
      empreendimento,
      leadData.produto,
      rawCampanha,
      rawAnuncio,
      rawFormName,
      observacoes
    ].filter(Boolean).join(' ');

    const finalCampanha = rawCampanha || (origem === 'google_ads' ? 'Google Ads' : 'Meta Ads');
    const empreendimentoId = await matchEmpreendimento(db, searchContext, empreendimento || leadData.produto);

    let observacoesFinais = observacoes || null;
    if (observacoesFinais && observacoesFinais.includes('Anúncio:  |') && rawAnuncio) {
      observacoesFinais = observacoesFinais.replace('Anúncio:  |', `Anúncio: ${rawAnuncio} |`);
    }

    const existing = await findExistingLead(telefone, email);
    if (existing) {
      console.log(`[Webhook] 🔥 Lead reengajado detectado: ${existing.nome} (${existing.telefone}) [${finalCampanha}]`);

      const novasObs = observacoesFinais || '';
      const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const historicoMsg = `🔥 [RE-ENGAJAMENTO - ${finalCampanha}] O lead preencheu o formulário novamente em ${dataHora}. ${novasObs ? `Dados preenchidos: ${novasObs}` : ''}`;

      const obsAtualizada = existing.observacoes
        ? `${existing.observacoes}\n\n[Reengajamento ${finalCampanha} em ${dataHora}]:\n${novasObs}`
        : `[Reengajamento ${finalCampanha} em ${dataHora}]:\n${novasObs}`;

      await db.execute(`
        UPDATE leads
        SET reengajado = true,
            reengajado_em = CURRENT_TIMESTAMP,
            vezes_convertido = COALESCE(vezes_convertido, 1) + 1,
            campanha = CASE WHEN campanha IS NULL OR campanha = 'Meta Ads' THEN ? ELSE campanha END,
            anuncio = COALESCE(?, anuncio),
            empreendimento_interesse_id = COALESCE(?, empreendimento_interesse_id),
            observacoes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [finalCampanha, rawAnuncio, empreendimentoId, obsAtualizada, existing.id]);

      const notifyUserId = existing.corretor_id || (await getPrimaryBrokerId(db));

      await db.execute(
        `INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, descricao) VALUES (?, ?, ?, 'reengajamento', ?)`,
        [uuidv4(), existing.id, notifyUserId, historicoMsg]
      );

      notifyCorretorReengajamento(existing.id, novasObs).catch(err => console.error('[Webhook] Erro ao notificar reengajamento:', err));

      if (notifyUserId) {
        sendPushToUser(notifyUserId, {
          title: `⚡ Lead Reengajado [${finalCampanha}]!`,
          body: `🔥 ${existing.nome} preencheu o formulário novamente! Toque para atender.`,
          icon: '/logo_icon.png',
          badge: '/logo_icon.png',
          data: { url: `/leads/${existing.id}` }
        }).catch(err => console.error('[Webhook] Erro no Push Reengajamento:', err));
      }
      return;
    }

    const corretorId = await getPrimaryBrokerId(db);
    const id = uuidv4();

    await db.execute(`
      INSERT INTO leads (id, nome, telefone, email, origem, campanha, anuncio, faixa_renda, observacoes, corretor_id, empreendimento_interesse_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, nome || 'Lead Sem Nome', telefone || null, email || null, origem, finalCampanha, rawAnuncio, rendaFinal, observacoesFinais, corretorId, empreendimentoId]);

    await db.execute(
      `INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, descricao) VALUES (?, ?, ?, 'sistema', ?)`,
      [uuidv4(), id, corretorId, `Lead via Webhook ${origem} (Campanha: ${finalCampanha})`]
    );

    console.log(`[Webhook] ✅ Lead salvo no CRM! (${nome} [${finalCampanha}] -> Corretor ID: ${corretorId})`);

    notifyCorretorNewLead(id).catch(err => console.error('[Webhook] Erro ao notificar corretor:', err));

    if (corretorId) {
      const tagProduto = (finalCampanha && finalCampanha.toLowerCase() !== 'meta ads') ? ` [${finalCampanha}]` : '';
      sendPushToUser(corretorId, {
        title: `🔥 Novo Lead${tagProduto}!`,
        body: `${nome} acabou de entrar no CRM! Toque para atender.`,
        icon: '/logo_icon.png',
        badge: '/logo_icon.png',
        data: { url: `/leads/${id}` }
      }).catch(err => console.error('[Webhook] Erro no Push Novo Lead:', err));
    }
  } catch (e) {
    console.error('[Webhook] Erro no processamento do lead:', e);
  }
};

async function fetchLeadFromGraphApi(leadgenId, pageToken) {
  try {
    const url = `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${pageToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('[Meta Graph API Error]:', data.error);
      return null;
    }

    let nome = 'Lead Meta Ads';
    let telefone = null;
    let email = null;
    const customObs = [];

    if (data.field_data && Array.isArray(data.field_data)) {
      for (const field of data.field_data) {
        const fieldName = field.name.toLowerCase();
        const value = field.values && field.values[0] ? field.values[0] : '';

        if (fieldName.includes('full_name') || fieldName.includes('nome')) {
          nome = value;
        } else if (fieldName.includes('phone') || fieldName.includes('whatsapp') || fieldName.includes('telefone')) {
          telefone = value;
        } else if (fieldName.includes('email')) {
          email = value;
        } else {
          customObs.push(`${field.name}: ${value}`);
        }
      }
    }

    let campanha = 'Meta Lead Ads';
    let anuncio = null;

    if (data.ad_id && pageToken) {
      try {
        const adUrl = `https://graph.facebook.com/v20.0/${data.ad_id}?fields=name,campaign{name}&access_token=${pageToken}`;
        const adRes = await fetch(adUrl);
        const adData = await adRes.json();
        if (adData.name) anuncio = adData.name;
        if (adData.campaign && adData.campaign.name) campanha = adData.campaign.name;
      } catch {
        // ignora erro secundário
      }
    }

    return {
      nome,
      telefone,
      email,
      campanha,
      anuncio,
      empreendimento: anuncio || campanha,
      observacoes: customObs.length > 0 ? customObs.join(' | ') : null
    };
  } catch (err) {
    console.error('[Meta Graph API Fetch Exception]:', err.message);
    return null;
  }
}

router.post('/meta', async (req, res) => {
  const body = req.body;
  res.status(200).json({ success: true });

  if (body.object === 'page' && Array.isArray(body.entry)) {
    const pageToken = await getValidPageToken();

    for (const entry of body.entry) {
      if (Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen' && change.value && change.value.leadgen_id) {
            const leadgenId = change.value.leadgen_id;
            if (pageToken) {
              const leadData = await fetchLeadFromGraphApi(leadgenId, pageToken);
              if (leadData) {
                await handleIncomingLead({ ...leadData, origem: 'meta_ads' });
              }
            } else {
              console.warn('[Meta Webhook] META_PAGE_ACCESS_TOKEN não configurado.');
            }
          }
        }
      }
    }
    return;
  }

  handleIncomingLead({ ...body, origem: 'meta_ads' });
});

router.post('/google', async (req, res) => {
  res.status(200).json({ success: true });
  handleIncomingLead({ ...req.body, origem: 'google_ads' });
});

router.post('/make', async (req, res) => {
  res.status(200).json({ success: true });
  handleIncomingLead({ ...req.body, origem: req.body?.origem || 'meta_ads' });
});

router.post('/lead', async (req, res) => {
  res.status(200).json({ success: true });
  handleIncomingLead({ ...req.body, origem: req.body?.origem || 'site' });
});

export default router;

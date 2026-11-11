import '../env.js';
import { getDb } from '../database.js';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

export async function notifyCorretorNewLead(leadId) {
  const db = getDb();
  try {
    const lead = await db.queryOne(`
      SELECT l.*, e.nome as empreendimento_nome, u.nome as corretor_nome, u.email as corretor_email
      FROM leads l
      LEFT JOIN empreendimentos e ON l.empreendimento_interesse_id = e.id
      LEFT JOIN usuarios u ON l.corretor_id = u.id
      WHERE l.id = ?
    `, [leadId]);

    if (!lead || !lead.corretor_email) {
      return;
    }

    const {
      nome,
      telefone,
      email = 'Não informado',
      origem = 'meta_ads',
      empreendimento_nome = 'Ainda não definido / Aberto',
      corretor_nome,
      corretor_email
    } = lead;

    const origemLabel = origem === 'meta_ads' ? 'Meta Ads' : origem === 'google_ads' ? 'Google Ads' : 'Manual';
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || 'econnectmarketingdigital@gmail.com';
    const senderName = process.env.SENDER_NAME || 'Samuel Corrêa | CRM';

    if (!brevoApiKey) {
      console.log(`📢 [E-mail Simulado - Novo Lead] Para: ${corretor_email} | Lead: ${nome} (${telefone})`);
      return;
    }

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050506; color: #f4f4f5; margin: 0; padding: 20px; }
          .card { background-color: #111114; border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 16px; padding: 25px; max-width: 550px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .logo { text-align: center; margin-bottom: 20px; font-weight: bold; color: #FFFFFF; font-size: 22px; letter-spacing: -0.5px; }
          .title { color: #FFFFFF; font-size: 19px; font-weight: 800; margin-bottom: 15px; text-transform: uppercase; }
          .lead-info { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 15px; margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
          .info-row:last-child { border-bottom: none; }
          .label { color: #a1a1aa; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .val { color: #ffffff; font-weight: 600; font-size: 14px; text-align: right; }
          .btn { display: block; text-align: center; background: linear-gradient(135deg, #FFFFFF, #D4D4D8); color: #050506 !important; font-weight: 800; text-decoration: none; padding: 12px 20px; border-radius: 10px; margin-top: 20px; text-transform: uppercase; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🏠 ${senderName}</div>
          <div class="title">🔥 Novo Lead Recebido!</div>
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
            Olá, <strong>${corretor_nome}</strong>. Um novo lead imobiliário acabou de entrar no seu CRM. Faça o primeiro contato o mais rápido possível!
          </p>
          <div class="lead-info">
            <div class="info-row"><span class="label">Nome</span><span class="val">${nome}</span></div>
            <div class="info-row"><span class="label">WhatsApp / Tel</span><span class="val">${telefone || 'Não informado'}</span></div>
            <div class="info-row"><span class="label">E-mail</span><span class="val">${email || 'Não informado'}</span></div>
            <div class="info-row"><span class="label">Origem</span><span class="val">${origemLabel}</span></div>
            <div class="info-row"><span class="label">Interesse</span><span class="val">${empreendimento_nome}</span></div>
          </div>
          <a href="${FRONTEND_URL}/leads/${leadId}" class="btn">Visualizar Lead no CRM</a>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: corretor_email, name: corretor_nome }],
        subject: `🔥 Novo Lead no CRM - ${nome}`,
        htmlContent: htmlBody
      })
    });

    if (!response.ok) {
      const errTxt = await response.text();
      console.error(`[Notification] ❌ Brevo API error (${response.status}):`, errTxt);
    }
  } catch (err) {
    console.error('[Notification] Failed to send email:', err.message);
  }
}

export async function notifyCorretorReengajamento(leadId, novasObservacoes) {
  const db = getDb();
  try {
    const lead = await db.queryOne(`
      SELECT l.*, e.nome as empreendimento_nome, u.nome as corretor_nome, u.email as corretor_email
      FROM leads l
      LEFT JOIN empreendimentos e ON l.empreendimento_interesse_id = e.id
      LEFT JOIN usuarios u ON l.corretor_id = u.id
      WHERE l.id = ?
    `, [leadId]);

    if (!lead || !lead.corretor_email) return;

    const { nome, telefone, corretor_nome, corretor_email, empreendimento_nome } = lead;
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || 'econnectmarketingdigital@gmail.com';
    const senderName = process.env.SENDER_NAME || 'Samuel Corrêa | CRM';

    if (!brevoApiKey) {
      console.log(`📢 [E-mail Simulado - Reengajamento] Para: ${corretor_email} | Lead ${nome} preencheu novamente!`);
      return;
    }

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #050506; color: #f4f4f5; margin: 0; padding: 20px; }
          .card { background-color: #111114; border: 1px solid #f59e0b; border-radius: 16px; padding: 25px; max-width: 550px; margin: 0 auto; }
          .logo { text-align: center; margin-bottom: 20px; font-weight: bold; color: #f59e0b; font-size: 22px; }
          .title { color: #f59e0b; font-size: 19px; font-weight: 800; margin-bottom: 15px; }
          .lead-info { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; padding: 15px; margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
          .label { color: #a1a1aa; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .val { color: #ffffff; font-weight: 600; font-size: 14px; text-align: right; }
          .btn { display: block; text-align: center; background: linear-gradient(135deg, #FFFFFF, #D4D4D8); color: #050506 !important; font-weight: 800; text-decoration: none; padding: 12px 20px; border-radius: 10px; margin-top: 20px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">⚡ ${senderName}</div>
          <div class="title">🔥 LEAD PREENCHEU O ANÚNCIO NOVAMENTE!</div>
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
            Olá, <strong>${corretor_nome}</strong>! O lead <strong>${nome}</strong> acabou de preencher um formulário novamente. Alta intenção de compra!
          </p>
          <div class="lead-info">
            <div class="info-row"><span class="label">Nome</span><span class="val">${nome}</span></div>
            <div class="info-row"><span class="label">WhatsApp</span><span class="val">${telefone || 'Não informado'}</span></div>
            <div class="info-row"><span class="label">Interesse</span><span class="val">${empreendimento_nome || 'Imóveis'}</span></div>
            ${novasObservacoes ? `<div style="margin-top: 10px; font-size: 13px; color: #fde68a;"><strong>Respostas do formulário:</strong><br/>${novasObservacoes}</div>` : ''}
          </div>
          <a href="${FRONTEND_URL}/leads/${leadId}" class="btn">Abrir Lead no CRM</a>
        </div>
      </body>
      </html>
    `;

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: corretor_email, name: corretor_nome }],
        subject: `🔥 URGENTE: ${nome} preencheu o anúncio novamente!`,
        htmlContent: htmlBody
      })
    });
  } catch (err) {
    console.error('[Notification] Erro ao enviar notificação de reengajamento:', err);
  }
}

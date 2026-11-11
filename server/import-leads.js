import './env.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDb } from './database.js';

const CSV_FILES = [
  'C:/Users/User 2023/.gemini/antigravity/brain/c40d52f8-fc9d-45f2-9e1b-8db93a69bed8/.user_uploaded/media_1794421438048_5c8e55c3.csv',
  'C:/Users/User 2023/.gemini/antigravity/brain/c40d52f8-fc9d-45f2-9e1b-8db93a69bed8/.user_uploaded/media_1794421438048_70dad7ae.csv',
  'C:/Users/User 2023/.gemini/antigravity/brain/c40d52f8-fc9d-45f2-9e1b-8db93a69bed8/.user_uploaded/media_1794421438048_161c8f8b.csv',
  'C:/Users/User 2023/.gemini/antigravity/brain/c40d52f8-fc9d-45f2-9e1b-8db93a69bed8/.user_uploaded/media_1794421438048_15eb2c5d.csv'
];

function formatRenda(raw) {
  if (!raw) return null;
  let str = raw.trim();
  str = str.replace(/_/g, ' ');
  str = str.replace(/\s+/g, ' ');
  str = str.replace(/r\$\s*/gi, 'R$ ');
  str = str.replace(/^de /i, 'De ');
  str = str.replace(/^acima de /i, 'Acima de ');
  str = str.replace(/^at[eé] /i, 'Até ');
  return str.trim();
}

function cleanPhone(raw) {
  if (!raw) return null;
  let p = raw.trim();
  p = p.replace(/\s+/g, '');
  p = p.replace(/^p:/i, '');
  if (!p.startsWith('+') && !p.startsWith('55')) {
    p = '55' + p;
  }
  if (!p.startsWith('+')) {
    p = '+' + p;
  }
  return p;
}

function cleanName(raw) {
  if (!raw) return 'Lead Meta Ads';
  let n = raw.trim();
  if (n.startsWith('"') && n.endsWith('"')) {
    n = n.slice(1, -1).trim();
  }
  // Remove corrupted arabic/surrogate characters if any
  n = n.replace(/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '').trim();
  return n || 'Lead Meta Ads';
}

function parseTSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].replace(/^\uFEFF/, '').split('\t').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const obj = {};
    header.forEach((h, idx) => {
      let val = cols[idx] !== undefined ? cols[idx].trim() : '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      obj[h] = val;
    });
    rows.push(obj);
  }
  return rows;
}

async function run() {
  await initDatabase();
  const db = getDb();

  console.log('🚀 Iniciando importação de leads para o CRM Samuel...');

  // 1. Usuário Samuel
  const user = await db.queryOne('SELECT id, nome, email FROM usuarios LIMIT 1');
  if (!user) {
    throw new Error('Nenhum usuário encontrado na tabela usuarios. Rode a migração antes.');
  }
  const corretorId = user.id;
  console.log(`👤 Corretor responsável: ${user.nome} (${user.email})`);

  // 2. Garantir empreendimentos
  let empSaoMarcos = await db.queryOne("SELECT id FROM empreendimentos WHERE LOWER(nome) LIKE '%são marcos%'");
  if (!empSaoMarcos) {
    const empId = uuidv4();
    await db.execute(`
      INSERT INTO empreendimentos (id, nome, endereco, incorporadora, tipo, valor_min, valor_max, comissao_percentual, descricao)
      VALUES (?, 'Reserva São Marcos', 'Ponta do Farol / São Marcos - São Luís/MA', 'Parceira', 'alto_padrao', 1200000, 2500000, 5.0, 'Apartamentos de alto padrão com vista mar e unidades a partir de R$ 1,2 milhão.')
    `, [empId]);
    empSaoMarcos = { id: empId };
    console.log('🏢 Empreendimento cadastrado: Reserva São Marcos');
  }

  let empRangedor = await db.queryOne("SELECT id FROM empreendimentos WHERE LOWER(nome) LIKE '%rangedor%'");
  if (!empRangedor) {
    const empId = uuidv4();
    await db.execute(`
      INSERT INTO empreendimentos (id, nome, endereco, incorporadora, tipo, valor_min, valor_max, comissao_percentual, descricao)
      VALUES (?, 'Reserva Rangedor', 'Ao lado do Parque do Rangedor - São Luís/MA', 'Parceira', 'alto_padrao', 800000, 1800000, 5.0, 'Empreendimento de alto padrão próximo à reserva e parque ecológico.')
    `, [empId]);
    empRangedor = { id: empId };
    console.log('🏢 Empreendimento cadastrado: Reserva Rangedor');
  }

  // 3. Ler todos os arquivos CSV
  const rawRows = [];
  for (const path of CSV_FILES) {
    if (!fs.existsSync(path)) {
      console.warn(`Arquivo não encontrado: ${path}`);
      continue;
    }
    const buf = fs.readFileSync(path);
    const text = (buf[0] === 0xff && buf[1] === 0xfe || buf.indexOf(0x00) !== -1)
      ? buf.toString('utf16le')
      : buf.toString('utf8');
    const parsed = parseTSV(text);
    rawRows.push(...parsed);
  }

  console.log(`📋 Total de registros lidos das planilhas: ${rawRows.length}`);

  // 4. Inserir leads com deduplicação por telefone e lead_id
  let inserted = 0;
  let reengaged = 0;
  let updatedCount = 0;

  for (const r of rawRows) {
    const metaLeadId = r.id || '';
    const nome = cleanName(r.full_name);
    const telefone = cleanPhone(r.whatsapp_number);
    const createdAt = r.created_time ? new Date(r.created_time) : new Date();
    const adName = r.ad_name || '';
    const campaignName = r.campaign_name || 'Reserva São Marcos';
    const formName = r.form_name || '';
    const platform = r.platform ? (r.platform.toLowerCase() === 'ig' ? 'Instagram' : 'Facebook') : 'Meta Ads';

    const rawRenda = r['qual_é_a_sua_renda_mensal?'] ||
                     r['unidades_a_partir_de_r$_1,2_milhão._preencha_para_receber_a_tabela_de_vendas_e_agendar_uma_visita._📍'] ||
                     '';
    const faixaRenda = formatRenda(rawRenda);

    // Determina qual empreendimento corresponde
    let empId = empSaoMarcos.id;
    let nomeEmp = 'Reserva São Marcos';
    const context = `${adName} ${formName} ${campaignName}`.toLowerCase();
    if (context.includes('rangedor')) {
      empId = empRangedor.id;
      nomeEmp = 'Reserva Rangedor';
    }

    const obsArray = [];
    if (metaLeadId) obsArray.push(`Meta Lead ID: ${metaLeadId}`);
    if (platform) obsArray.push(`Plataforma: ${platform}`);
    if (formName) obsArray.push(`Formulário: ${formName}`);
    if (adName) obsArray.push(`Anúncio: ${adName}`);
    if (faixaRenda) obsArray.push(`Faixa/Renda: ${faixaRenda}`);
    const observacoes = obsArray.join(' | ');

    // Checar se já existe pelo telefone ou meta_id
    let existing = null;
    if (telefone) {
      existing = await db.queryOne(
        `SELECT id, nome, vezes_convertido, observacoes FROM leads WHERE telefone = ? OR telefone = ?`,
        [telefone, telefone.replace('+', '')]
      );
    }
    if (!existing && metaLeadId) {
      existing = await db.queryOne(
        `SELECT id, nome, vezes_convertido, observacoes FROM leads WHERE observacoes LIKE ?`,
        [`%${metaLeadId}%`]
      );
    }

    if (existing) {
      // Reengajamento
      const novasVezes = (existing.vezes_convertido || 1) + 1;
      const obsAtualizada = `${existing.observacoes || ''}\n\n[Reengajamento em ${createdAt.toLocaleString('pt-BR')}]: Formulário ${formName} | ${adName} | ${faixaRenda || ''}`;
      await db.execute(`
        UPDATE leads
        SET reengajado = true,
            reengajado_em = ?,
            vezes_convertido = ?,
            observacoes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [createdAt, novasVezes, obsAtualizada, existing.id]);

      await db.execute(`
        INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, descricao, created_at)
        VALUES (?, ?, ?, 'reengajamento', ?, ?)
      `, [uuidv4(), existing.id, corretorId, `Lead reengajou na campanha ${campaignName} (${adName})`, createdAt]);

      reengaged++;
      console.log(`🔁 Reengajado: ${nome} (${telefone}) - ${nomeEmp}`);
    } else {
      // Novo Lead
      const leadId = uuidv4();
      await db.execute(`
        INSERT INTO leads (
          id, nome, telefone, email, origem, campanha, anuncio,
          faixa_renda, observacoes, corretor_id, empreendimento_interesse_id,
          etapa, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'meta_ads', ?, ?, ?, ?, ?, ?, 'novo', ?, ?)
      `, [
        leadId, nome, telefone, null, campaignName, adName,
        faixaRenda, observacoes, corretorId, empId,
        createdAt, createdAt
      ]);

      await db.execute(`
        INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, descricao, created_at)
        VALUES (?, ?, ?, 'sistema', ?, ?)
      `, [
        uuidv4(), leadId, corretorId,
        `Lead importado da campanha Meta Ads: ${campaignName} (Anúncio: ${adName})`,
        createdAt
      ]);

      inserted++;
      console.log(`✅ Inserido: ${nome} (${telefone}) - ${nomeEmp} [${faixaRenda || 'S/ Renda'}]`);
    }
  }

  console.log(`\n🎉 IMPORTAÇÃO CONCLUÍDA!`);
  console.log(`   - Novos leads criados: ${inserted}`);
  console.log(`   - Reengajamentos atualizados: ${reengaged}`);

  const total = await db.queryOne('SELECT COUNT(*) as total FROM leads');
  console.log(`📊 Total de leads agora no CRM: ${total.total}`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erro na importação:', err);
  process.exit(1);
});

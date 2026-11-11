import './env.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDb } from './database.js';

async function seed() {
  await initDatabase();
  const db = getDb();

  console.log('🌱 Iniciando seed opcional do CRM Samuel...');

  const adminEmail = (process.env.ADMIN_EMAIL || 'samuel@crm.com').toLowerCase().trim();
  const adminName = process.env.ADMIN_NAME || 'Samuel Corrêa';
  const adminPass = process.env.ADMIN_PASSWORD || 'Samuel2026!';

  const existingUser = await db.queryOne('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)', [adminEmail]);
  let corretorId = existingUser?.id;

  if (!corretorId) {
    corretorId = uuidv4();
    await db.execute(
      `INSERT INTO usuarios (id, nome, email, senha_hash, role, ativo, disponivel_rodizio, meta_vgv_pessoal)
       VALUES (?, ?, ?, ?, 'gestor', 1, 1, 500000)`,
      [corretorId, adminName, adminEmail, bcrypt.hashSync(adminPass, 10)]
    );
    console.log(`✅ Usuário criado: ${adminName} (${adminEmail})`);
  }

  const empCount = await db.queryOne('SELECT COUNT(*) as total FROM empreendimentos');
  if (!empCount || Number(empCount.total) === 0) {
    const emp1 = uuidv4();
    const emp2 = uuidv4();
    await db.execute(
      `INSERT INTO empreendimentos (id, nome, endereco, incorporadora, tipo, valor_min, valor_max, comissao_percentual, descricao)
       VALUES (?, 'Residencial Exemplo', 'Centro', 'Parceira', 'planta', 280000, 450000, 5.0, 'Empreendimento de exemplo — edite ou exclua quando cadastrar sua carteira.')`,
      [emp1]
    );
    await db.execute(
      `INSERT INTO empreendimentos (id, nome, endereco, incorporadora, tipo, faixa_mcmv, valor_min, valor_max, comissao_percentual, descricao)
       VALUES (?, 'Casa / Imóvel Avulso', 'Bairro Nobre', 'Captação Própria', 'avulso', NULL, 400000, 850000, 6.0, 'Imóvel de captação direta.')`,
      [emp2]
    );
    console.log('✅ 2 imóveis de exemplo cadastrados.');
  }

  console.log('🚀 Seed concluído!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});

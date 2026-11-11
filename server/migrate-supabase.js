import './env.js';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const { Client } = pg;

function createClient() {
  if (process.env.DATABASE_URL) {
    return new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return new Client({
    host: process.env.DB_HOST || 'aws-0-sa-east-1.pooler.supabase.com',
    port: Number(process.env.DB_PORT || 6543),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });
}

async function migrate() {
  if (!process.env.DATABASE_URL && (!process.env.DB_USER || !process.env.DB_PASSWORD)) {
    console.error('❌ Configure DATABASE_URL ou DB_USER/DB_PASSWORD no server/.env antes de rodar a migração.');
    process.exit(1);
  }

  const client = createClient();
  await client.connect();
  console.log('⚡ Conectado ao Supabase para migração do CRM Samuel...');

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave VARCHAR(100) PRIMARY KEY,
        valor TEXT
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        telefone VARCHAR(50),
        senha_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'gestor',
        ativo INT DEFAULT 1,
        disponivel_rodizio INT DEFAULT 1,
        pausado_rodizio INT DEFAULT 0,
        meta_vgv_pessoal NUMERIC DEFAULT 0,
        avatar_cor VARCHAR(50),
        avatar_url TEXT,
        wallpaper_url TEXT,
        wallpaper_position TEXT DEFAULT 'center center',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS empreendimentos (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        endereco TEXT,
        incorporadora VARCHAR(255),
        tipo VARCHAR(50) NOT NULL,
        faixa_mcmv VARCHAR(50),
        valor_min NUMERIC,
        valor_max NUMERIC,
        comissao_percentual NUMERIC DEFAULT 5.0,
        total_unidades INT DEFAULT 0,
        descricao TEXT,
        ativo INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS blocos (
        id VARCHAR(50) PRIMARY KEY,
        empreendimento_id VARCHAR(50) REFERENCES empreendimentos(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS unidades (
        id VARCHAR(50) PRIMARY KEY,
        bloco_id VARCHAR(50) REFERENCES blocos(id) ON DELETE SET NULL,
        empreendimento_id VARCHAR(50) REFERENCES empreendimentos(id) ON DELETE CASCADE,
        numero VARCHAR(50) NOT NULL,
        tipologia VARCHAR(100),
        area_m2 NUMERIC,
        valor NUMERIC,
        status VARCHAR(50) DEFAULT 'disponivel',
        andar INT,
        posicao VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(50),
        email VARCHAR(255),
        origem VARCHAR(50) DEFAULT 'manual',
        campanha VARCHAR(255),
        anuncio VARCHAR(255),
        corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE SET NULL,
        etapa VARCHAR(50) DEFAULT 'novo',
        empreendimento_interesse_id VARCHAR(50) REFERENCES empreendimentos(id) ON DELETE SET NULL,
        observacoes TEXT,
        ultimo_contato TIMESTAMP WITH TIME ZONE,
        proximo_followup TIMESTAMP WITH TIME ZONE,
        perdido_motivo TEXT,
        faixa_renda VARCHAR(100),
        reengajado BOOLEAN DEFAULT FALSE,
        reengajado_em TIMESTAMP WITH TIME ZONE,
        vezes_convertido INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lead_historico (
        id VARCHAR(50) PRIMARY KEY,
        lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
        corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE SET NULL,
        tipo VARCHAR(50),
        descricao TEXT,
        etapa_anterior VARCHAR(50),
        etapa_nova VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reservas (
        id VARCHAR(50) PRIMARY KEY,
        unidade_id VARCHAR(50) REFERENCES unidades(id) ON DELETE CASCADE,
        lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
        corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'ativa',
        prazo_expiracao TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS propostas (
        id VARCHAR(50) PRIMARY KEY,
        lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
        unidade_id VARCHAR(50) REFERENCES unidades(id) ON DELETE SET NULL,
        corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE SET NULL,
        valor_venda NUMERIC,
        comissao_valor NUMERIC,
        status VARCHAR(50) DEFAULT 'em_analise',
        data_proposta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        data_fechamento TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS metas (
        id VARCHAR(50) PRIMARY KEY,
        corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo VARCHAR(50) DEFAULT 'vgv',
        valor_meta NUMERIC NOT NULL,
        mes INT NOT NULL,
        ano INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id VARCHAR(50) PRIMARY KEY,
        usuario_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Todas as tabelas criadas/verificadas no Supabase com sucesso!');

    const configs = [
      ['reserva_prazo_horas', '48'],
      ['alerta_sem_contato_horas', '24'],
      ['meta_vgv_equipe', '500000'],
      ['meta_vgv_pessoal', '500000']
    ];
    for (const [chave, valor] of configs) {
      await client.query(
        'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING',
        [chave, valor]
      );
    }

    const adminName = process.env.ADMIN_NAME || 'Samuel Corrêa';
    const adminEmail = (process.env.ADMIN_EMAIL || 'samuel@crm.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Samuel2026!';

    await client.query(`
      INSERT INTO usuarios (id, nome, email, senha_hash, role, ativo, disponivel_rodizio, meta_vgv_pessoal)
      VALUES ($1, $2, $3, $4, 'gestor', 1, 1, 500000)
      ON CONFLICT (email) DO UPDATE SET role = 'gestor', ativo = 1;
    `, [uuidv4(), adminName, adminEmail, bcrypt.hashSync(adminPassword, 10)]);

    console.log(`✅ Usuário principal configurado: ${adminName} (${adminEmail})`);
    console.log('🚀 Migração para o Supabase concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    await client.end();
  }
}

migrate();

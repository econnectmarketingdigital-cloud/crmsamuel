import express from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../database.js';
import { generateToken, authenticateToken, requireRole } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.post('/login', async (req, res) => {
  const db = getDb();
  const { email, password, senha } = req.body;
  const loginSenha = password || senha;

  if (!email || !loginSenha) {
    return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await db.queryOne('SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?) AND ativo = 1', [cleanEmail]);
    if (!user) return res.status(401).json({ success: false, error: 'Usuário não encontrado ou inativo' });

    const validPassword = bcrypt.compareSync(loginSenha, user.senha_hash);
    if (!validPassword) return res.status(401).json({ success: false, error: 'Senha incorreta' });

    const token = generateToken(user);
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          role: user.role,
          avatar_url: user.avatar_url,
          wallpaper_url: user.wallpaper_url,
          wallpaper_position: user.wallpaper_position
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/google', async (req, res) => {
  const db = getDb();
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email do Google não fornecido' });
  }

  try {
    const user = await db.queryOne('SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?) AND ativo = 1', [email.trim().toLowerCase()]);

    if (!user) {
      return res.status(403).json({
        success: false,
        error: `O e-mail "${email}" não está autorizado para acessar este CRM.`
      });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          role: user.role,
          avatar_url: user.avatar_url,
          wallpaper_url: user.wallpaper_url,
          wallpaper_position: user.wallpaper_position
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/register', authenticateToken, requireRole('gestor'), async (req, res) => {
  const db = getDb();
  const { nome, email, telefone, senha, role } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes' });

  try {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.queryOne('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)', [cleanEmail]);
    if (existing) return res.status(400).json({ success: false, error: 'Email já cadastrado' });

    const id = uuidv4();
    const hash = bcrypt.hashSync(senha, 10);
    const userRole = role || 'gestor';

    await db.execute(
      `INSERT INTO usuarios (id, nome, email, telefone, senha_hash, role, disponivel_rodizio)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [id, nome.trim(), cleanEmail, telefone || null, hash, userRole]
    );
    res.json({ success: true, data: { id, nome, email: cleanEmail, role: userRole } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar usuário: ' + error.message });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const user = await db.queryOne(
      'SELECT id, nome, email, telefone, role, ativo, avatar_url, meta_vgv_pessoal, pausado_rodizio, disponivel_rodizio, wallpaper_url, wallpaper_position FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/me', authenticateToken, async (req, res) => {
  const db = getDb();
  const { nome, telefone, avatar_url, wallpaper_url, wallpaper_position, meta_vgv_pessoal } = req.body;
  try {
    const sets = [];
    const params = [];

    if (nome !== undefined) {
      sets.push('nome = ?');
      params.push(nome);
    }
    if (telefone !== undefined) {
      sets.push('telefone = ?');
      params.push(telefone);
    }
    if (avatar_url !== undefined) {
      sets.push('avatar_url = ?');
      params.push(avatar_url);
    }
    if (wallpaper_url !== undefined) {
      sets.push('wallpaper_url = ?');
      params.push(wallpaper_url);
    }
    if (wallpaper_position !== undefined) {
      sets.push('wallpaper_position = ?');
      params.push(wallpaper_position);
    }
    if (meta_vgv_pessoal !== undefined) {
      sets.push('meta_vgv_pessoal = ?');
      params.push(Number(meta_vgv_pessoal) || 0);
    }

    if (sets.length > 0) {
      params.push(req.user.id);
      await db.execute(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    const updatedUser = await db.queryOne(
      'SELECT id, nome, email, telefone, role, ativo, avatar_url, meta_vgv_pessoal, pausado_rodizio, disponivel_rodizio, wallpaper_url, wallpaper_position FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/change-password', authenticateToken, async (req, res) => {
  const db = getDb();
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await db.queryOne('SELECT senha_hash FROM usuarios WHERE id = ?', [req.user.id]);
    if (!user || !bcrypt.compareSync(currentPassword, user.senha_hash)) {
      return res.status(400).json({ success: false, error: 'Senha atual incorreta' });
    }
    const newHash = bcrypt.hashSync(newPassword, 10);
    await db.execute('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [newHash, req.user.id]);
    res.json({ success: true, data: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

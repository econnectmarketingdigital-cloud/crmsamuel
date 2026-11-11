import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const configs = await db.query('SELECT * FROM configuracoes');
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/', authenticateToken, requireRole('gestor'), async (req, res) => {
  const db = getDb();
  const entries = Object.entries(req.body);
  try {
    for (const [chave, valor] of entries) {
      await db.execute(
        'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor',
        [chave, valor !== null && valor !== undefined ? String(valor) : '']
      );
    }
    res.json({ success: true, data: 'Atualizado' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

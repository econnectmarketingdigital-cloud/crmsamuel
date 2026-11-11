import cron from 'node-cron';
import { getDb } from '../database.js';

export const startScheduler = () => {
  cron.schedule('*/5 * * * *', async () => {
    const db = getDb();
    try {
      const expiradas = await db.query(`
        SELECT r.id, r.unidade_id FROM reservas r
        WHERE r.status = 'ativa' AND r.prazo_expiracao <= CURRENT_TIMESTAMP
      `);

      for (const res of expiradas) {
        await db.execute("UPDATE reservas SET status = 'expirada' WHERE id = ?", [res.id]);
        await db.execute("UPDATE unidades SET status = 'disponivel' WHERE id = ?", [res.unidade_id]);
      }
    } catch (error) {
      console.error('Error in scheduler:', error);
    }
  });
};

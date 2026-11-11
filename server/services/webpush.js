import '../env.js';
import webpush from 'web-push';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const envPublic = process.env.VAPID_PUBLIC_KEY || '';
const envPrivate = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:samuel@crm.com';

let PUBLIC_VAPID_KEY = envPublic;
let pushConfigured = false;

if (envPublic && envPrivate) {
  webpush.setVapidDetails(SUBJECT, envPublic, envPrivate);
  pushConfigured = true;
} else {
  const generated = webpush.generateVAPIDKeys();
  PUBLIC_VAPID_KEY = generated.publicKey;
  webpush.setVapidDetails(SUBJECT, generated.publicKey, generated.privateKey);
  pushConfigured = true;
  console.warn('[WebPush] ⚠️ VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas no .env; usando chaves temporárias para esta sessão.');
}

export { PUBLIC_VAPID_KEY };

export async function saveSubscription(usuarioId, subscription, userAgent = '') {
  const db = getDb();
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Dados da inscrição push incompletos');
  }

  const existing = await db.queryOne('SELECT id FROM push_subscriptions WHERE endpoint = ?', [endpoint]);

  if (existing) {
    await db.execute(`
      UPDATE push_subscriptions
      SET usuario_id = ?, p256dh = ?, auth = ?, user_agent = ?, created_at = CURRENT_TIMESTAMP
      WHERE endpoint = ?
    `, [usuarioId, p256dh, auth, userAgent, endpoint]);
    return existing.id;
  }

  const id = uuidv4();
  await db.execute(`
    INSERT INTO push_subscriptions (id, usuario_id, endpoint, p256dh, auth, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, usuarioId, endpoint, p256dh, auth, userAgent]);
  return id;
}

export async function removeSubscription(endpoint) {
  const db = getDb();
  return await db.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
}

export async function sendPushToUser(usuarioId, payload) {
  if (!pushConfigured) return { sent: 0, failed: 0 };
  const db = getDb();
  try {
    const subscriptions = await db.query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE usuario_id = ?',
      [usuarioId]
    );

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payloadString = JSON.stringify(payload);
    let sentCount = 0;
    let failedCount = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, payloadString);
          sentCount++;
        } catch (err) {
          failedCount++;
          if (err.statusCode === 404 || err.statusCode === 410) {
            await db.execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]).catch(() => {});
          }
        }
      })
    );

    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    console.error('[WebPush] Erro geral ao enviar push:', error);
    return { sent: 0, failed: 0 };
  }
}

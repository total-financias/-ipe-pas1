'use strict';
/**
 * Respeito em Ação — servidor
 * Sem dependências externas: usa apenas módulos nativos do Node (>= 22.13),
 * incluindo o SQLite embutido (node:sqlite) para guardar o mural de forma permanente.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

// ───────────────────────── Configuração ─────────────────────────
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, ''); // ex.: https://meusite.com.br
const TRUST_PROXY = process.env.TRUST_PROXY === '1'; // atrás de nginx/Render/etc.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''; // opcional: habilita moderação (DELETE)

const LIMITS = {
  nameMin: 2,
  nameMax: 40,
  textMin: 3,
  textMax: 600,
  bodyMaxBytes: 4 * 1024,
  postCooldownMs: 20 * 1000, // 1 mensagem a cada 20 s por conexão
  postPerHour: 8, // e no máximo 8 por hora
  duplicateWindowMs: 10 * 60 * 1000, // texto idêntico bloqueado por 10 min
  hugPerMinute: 120,
  pageSize: 20,
};
const TYPES = new Set(['apoio', 'relato', 'compromisso']);

// ───────────────────────── Banco de dados ─────────────────────────
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'mural.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT    NOT NULL,
    name       TEXT    NOT NULL DEFAULT '',
    text       TEXT    NOT NULL,
    hugs       INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at DESC, id DESC);
  CREATE TABLE IF NOT EXISTS hugs (
    message_id INTEGER NOT NULL,
    visitor_id TEXT    NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (message_id, visitor_id),
    FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
  );
`);
db.exec('PRAGMA foreign_keys = ON;');

const q = {
  insert: db.prepare('INSERT INTO messages (type, name, text, created_at) VALUES (?, ?, ?, ?)'),
  byId: db.prepare('SELECT id, type, name, text, hugs, created_at FROM messages WHERE id = ?'),
  page: db.prepare(
    'SELECT id, type, name, text, hugs, created_at FROM messages WHERE id < ? ORDER BY id DESC LIMIT ?'
  ),
  hugInsert: db.prepare('INSERT OR IGNORE INTO hugs (message_id, visitor_id, created_at) VALUES (?, ?, ?)'),
  hugBump: db.prepare('UPDATE messages SET hugs = hugs + 1 WHERE id = ?'),
  hugCheck: db.prepare('SELECT 1 FROM hugs WHERE message_id = ? AND visitor_id = ?'),
  del: db.prepare('DELETE FROM messages WHERE id = ?'),
  recentSame: db.prepare('SELECT 1 FROM messages WHERE text = ? AND created_at > ? LIMIT 1'),
};

// ───────────────────────── Limite de frequência ─────────────────────────
const buckets = new Map(); // chave -> [timestamps]
function hit(key, windowMs, max) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return { ok: false, retryAfterMs: windowMs - (now - arr[0]) };
  }
  arr.push(now);
  buckets.set(key, arr);
  return { ok: true };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of buckets) {
    if (!arr.length || now - arr[arr.length - 1] > 3600 * 1000) buckets.delete(k);
  }
}, 10 * 60 * 1000).unref();

function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'desconhecido';
}

// ───────────────────────── Validação ─────────────────────────
const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|io|ly|me|xyz|gg)\b)/i;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;

function clean(str) {
  return String(str ?? '')
    .normalize('NFC')
    .replace(CONTROL_RE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function validateMessage(body) {
  if (!body || typeof body !== 'object') return { error: 'Pedido inválido.' };
  if (body.website) return { error: 'Pedido inválido.', silent: true }; // honeypot (robôs)
  const type = String(body.type || '');
  if (!TYPES.has(type)) return { error: 'Escolha o tipo da mensagem.' };
  const name = clean(body.name).replace(/\n/g, ' ');
  const text = clean(body.text);
  if (name.length < LIMITS.nameMin) return { error: 'Escreva seu nome (pelo menos 2 letras).' };
  if (name.length > LIMITS.nameMax) return { error: `O nome pode ter no máximo ${LIMITS.nameMax} caracteres.` };
  if (text.length < LIMITS.textMin) return { error: `Escreva pelo menos ${LIMITS.textMin} caracteres.` };
  if (text.length > LIMITS.textMax) return { error: `A mensagem pode ter no máximo ${LIMITS.textMax} caracteres.` };
  if (URL_RE.test(text) || URL_RE.test(name))
    return { error: 'Por segurança, o mural não aceita links. Tire o endereço e tente de novo.' };
  if (/(.)\1{14,}/.test(text)) return { error: 'Tente escrever de um jeito um pouco mais natural.' };
  return { type, name, text };
}

function publicMessage(row, hugged) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    text: row.text,
    hugs: row.hugs,
    createdAt: row.created_at,
    hugged: !!hugged,
  };
}

const VISITOR_RE = /^[A-Za-z0-9-]{16,64}$/;
function visitorId(req) {
  const v = String(req.headers['x-visitor'] || '');
  return VISITOR_RE.test(v) ? v : null;
}

// ───────────────────────── HTTP utilitários ─────────────────────────
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

function send(res, status, payload, extra = {}) {
  const isJson = typeof payload === 'object' && !Buffer.isBuffer(payload);
  const body = isJson ? JSON.stringify(payload) : payload;
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > LIMITS.bodyMaxBytes) {
        reject(Object.assign(new Error('grande'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// ───────────────────────── API ─────────────────────────
async function handleApi(req, res, url) {
  const ip = clientIp(req);
  const route = url.pathname;

  // GET /api/messages?limit=20&before=ID
  if (route === '/api/messages' && req.method === 'GET') {
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit'), 10) || LIMITS.pageSize, 1), 50);
    const beforeParam = parseInt(url.searchParams.get('before'), 10);
    const before = Number.isFinite(beforeParam) && beforeParam > 0 ? beforeParam : Number.MAX_SAFE_INTEGER;
    const rows = q.page.all(before, limit + 1);
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);
    const vid = visitorId(req);
    const messages = slice.map((r) => publicMessage(r, vid && q.hugCheck.get(r.id, vid)));
    return send(res, 200, { messages, hasMore });
  }

  // POST /api/messages
  if (route === '/api/messages' && req.method === 'POST') {
    let body;
    try {
      body = await readJson(req);
    } catch (e) {
      return send(res, e.status || 400, { error: e.status === 413 ? 'Mensagem grande demais.' : 'Pedido inválido.' });
    }
    const v = validateMessage(body);
    if (v.error) {
      // robôs recebem "sucesso" falso, para não aprenderem a contornar
      if (v.silent) return send(res, 201, { ok: true });
      return send(res, 400, { error: v.error });
    }
    const cool = hit(`post:cool:${ip}`, LIMITS.postCooldownMs, 1);
    if (!cool.ok) {
      const s = Math.ceil(cool.retryAfterMs / 1000);
      return send(res, 429, { error: `Calma, a gente respira junto. Espere ${s} s para enviar outra mensagem.` }, { 'Retry-After': String(s) });
    }
    const hour = hit(`post:hour:${ip}`, 3600 * 1000, LIMITS.postPerHour);
    if (!hour.ok) {
      return send(res, 429, { error: 'Você já deixou várias mensagens hoje. Volte daqui a pouco!' }, { 'Retry-After': String(Math.ceil(hour.retryAfterMs / 1000)) });
    }
    if (q.recentSame.get(v.text, Date.now() - LIMITS.duplicateWindowMs)) {
      return send(res, 409, { error: 'Essa mensagem já foi publicada há pouco.' });
    }
    const info = q.insert.run(v.type, v.name, v.text, Date.now());
    const row = q.byId.get(Number(info.lastInsertRowid));
    return send(res, 201, { message: publicMessage(row, false) });
  }

  // POST /api/messages/:id/hug
  let m = route.match(/^\/api\/messages\/(\d+)\/hug$/);
  if (m && req.method === 'POST') {
    const id = Number(m[1]);
    const vid = visitorId(req);
    if (!vid) return send(res, 400, { error: 'Visitante inválido.' });
    if (!hit(`hug:${ip}`, 60 * 1000, LIMITS.hugPerMinute).ok) return send(res, 429, { error: 'Muitos abraços de uma vez! Espere um instante.' });
    const row = q.byId.get(id);
    if (!row) return send(res, 404, { error: 'Mensagem não encontrada.' });
    let counted = false;
    try {
      db.exec('BEGIN');
      const r = q.hugInsert.run(id, vid, Date.now());
      if (r.changes > 0) {
        q.hugBump.run(id);
        counted = true;
      }
      db.exec('COMMIT');
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* sem transação aberta */ }
      throw e;
    }
    const fresh = q.byId.get(id);
    return send(res, 200, { hugs: fresh.hugs, counted, alreadyHugged: !counted });
  }

  // DELETE /api/messages/:id  (moderação — exige ADMIN_TOKEN)
  m = route.match(/^\/api\/messages\/(\d+)$/);
  if (m && req.method === 'DELETE') {
    const auth = String(req.headers.authorization || '');
    const given = Buffer.from(auth.replace(/^Bearer\s+/i, ''));
    const wanted = Buffer.from(ADMIN_TOKEN);
    const okToken = ADMIN_TOKEN && given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
    if (!okToken) return send(res, 403, { error: 'Não autorizado.' });
    const r = q.del.run(Number(m[1]));
    return send(res, r.changes ? 200 : 404, { ok: !!r.changes });
  }

  if (route === '/api/health') return send(res, 200, { ok: true });
  return send(res, 404, { error: 'Rota não encontrada.' });
}

// ───────────────────────── Arquivos estáticos ─────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function serveStatic(req, res, url) {
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    return send(res, 400, 'Requisição inválida');
  }
  if (rel.includes('\0')) return send(res, 400, 'Requisição inválida');
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Proibido');

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Página não encontrada');
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';

    if (ext === '.html') {
      // Injeta a URL absoluta do site nas metatags sociais (og:image exige URL completa).
      const proto = TRUST_PROXY ? String(req.headers['x-forwarded-proto'] || 'http').split(',')[0] : 'http';
      const base = SITE_URL || `${proto}://${req.headers.host || `localhost:${PORT}`}`;
      const html = fs.readFileSync(file, 'utf8').replaceAll('%SITE_URL%', base);
      res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': type, 'Cache-Control': 'no-cache' });
      return res.end(req.method === 'HEAD' ? undefined : html);
    }
    const immutable = ext === '.woff2' || ext === '.png' || ext === '.svg';
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': type,
      'Content-Length': st.size,
      'Cache-Control': immutable ? 'public, max-age=604800' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

// ───────────────────────── Servidor ─────────────────────────
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método não permitido');
    return serveStatic(req, res, url);
  } catch (err) {
    console.error('Erro:', err);
    if (!res.headersSent) send(res, 500, { error: 'Algo deu errado do nosso lado. Tente de novo em instantes.' });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Respeito em Ação no ar: http://localhost:${PORT}`);
  console.log(`Banco de dados: ${path.join(DATA_DIR, 'mural.db')}`);
});

function shutdown() {
  server.close(() => {
    try { db.close(); } catch { /* já fechado */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

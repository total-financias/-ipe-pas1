'use strict';
// Teste de fumaça: sobe o servidor com banco temporário e exercita a API.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const PORT = 3900 + Math.floor(Math.random() * 90);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rea-'));
const base = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
  env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', DATA_DIR: dir, ADMIN_TOKEN: 'segredo-de-teste' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const call = async (p, o = {}) => {
  const r = await fetch(base + p, { ...o, headers: { 'Content-Type': 'application/json', ...(o.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const post = (b) => call('/api/messages', { method: 'POST', body: JSON.stringify(b) });

(async () => {
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/health'); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  try {
    let r = await post({ type: 'apoio', name: 'Ana', text: 'Você não está sozinha.' });
    assert.equal(r.status, 201); const id = r.body.message.id;
    r = await post({ type: 'apoio', text: 'outra logo em seguida' });
    assert.equal(r.status, 429, 'limite de frequência');
    r = await post({ type: 'apoio', text: 'oi' }); assert.equal(r.status, 400, 'mínimo de 3');
    r = await post({ type: 'xx', text: 'texto ok' }); assert.equal(r.status, 400, 'tipo inválido');
    r = await post({ type: 'apoio', text: 'a'.repeat(601) }); assert.equal(r.status, 400, 'máx 600');
    r = await post({ type: 'apoio', name: 'n'.repeat(41), text: 'texto ok' }); assert.equal(r.status, 400, 'nome máx 40');
    r = await post({ type: 'apoio', text: 'veja www.spam.com agora' }); assert.equal(r.status, 400, 'links bloqueados');

    const v1 = 'visitante-um-0000000001', v2 = 'visitante-dois-000000002';
    r = await call(`/api/messages/${id}/hug`, { method: 'POST', headers: { 'X-Visitor': v1 }, body: '{}' });
    assert.equal(r.body.hugs, 1); assert.equal(r.body.counted, true);
    r = await call(`/api/messages/${id}/hug`, { method: 'POST', headers: { 'X-Visitor': v1 }, body: '{}' });
    assert.equal(r.body.hugs, 1, 'o mesmo visitante não abraça duas vezes'); assert.equal(r.body.alreadyHugged, true);
    r = await call(`/api/messages/${id}/hug`, { method: 'POST', headers: { 'X-Visitor': v2 }, body: '{}' });
    assert.equal(r.body.hugs, 2);
    r = await call(`/api/messages/${id}/hug`, { method: 'POST', body: '{}' }); assert.equal(r.status, 400);

    r = await call('/api/messages', { headers: { 'X-Visitor': v1 } });
    assert.equal(r.body.messages[0].id, id); assert.equal(r.body.messages[0].hugged, true); assert.equal(r.body.messages[0].hugs, 2);
    r = await call(`/api/messages/${id}`, { method: 'DELETE' }); assert.equal(r.status, 403);
    r = await call(`/api/messages/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer segredo-de-teste' } });
    assert.equal(r.status, 200);
    const html = await (await fetch(base + '/')).text();
    assert.ok(html.includes(`${base}/img/og-image.png`), 'og:image absoluto');
    assert.equal((await fetch(base + '/..%2fserver.js')).status === 200, false, 'sem path traversal');
    console.log('✔ todos os testes passaram');
  } catch (e) { console.error('✘', e.message); process.exitCode = 1; }
  finally { srv.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
})();

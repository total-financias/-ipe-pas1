(() => {
  'use strict';
  document.documentElement.classList.add('js');

  // ───────────── Utilidades ─────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    kids.flat().forEach((c) => n.append(c));
    return n;
  };
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch { /* sem armazenamento */ } },
  };

  // ───────────── Revelar ao rolar ─────────────
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((n) => io.observe(n));
  } else reveals.forEach((n) => n.classList.add('in'));

  // ═════════════════════════════════════════════════════════
  //  O QUE VOCÊ FARIA?
  // ═════════════════════════════════════════════════════════
  const SCENARIOS = [
    {
      title: 'O apelido do Thiago',
      ask: 'Se ele já pediu duas vezes pra parar, por que ainda chamam de brincadeira?',
      who: 'Thiago',
      story: 'Desde o começo do ano, uns colegas chamam o Thiago, que é negro, de “Carvão”. Ele ri junto, mas já pediu duas vezes pra parar. Hoje o apelido volta, na frente da turma toda, e você está do lado dele.',
      options: [
        { text: 'Rir. Ele também está rindo, deve estar tudo bem.', good: false,
          effect: 'O riso do Thiago é defesa, não graça. Quem ri pra não ser o próximo alvo aprende que rir é o jeito mais seguro de sobreviver ali. Ele ri por fora e se apaga por dentro, e a sua risada ajuda os outros a achar que está tudo certo.',
          better: 'Quem pediu duas vezes pra parar já avisou que não é brincadeira.' },
        { text: 'Esperar o intervalo e comentar com outros colegas que o pessoal exagera.', good: false,
          effect: 'A conversa rola longe de quem faz e longe de quem sofre. O Thiago passa a aula inteira ouvindo o apelido sem ninguém dizer nada e entende que a turma só “acha ruim” quando ele não está por perto.',
          better: 'Comentar depois é melhor que nada, mas ele precisava de você na hora.' },
        { text: 'Dizer ali mesmo, com calma: “O Thiago já pediu pra parar. Chama pelo nome.”', good: true,
          effect: 'O Thiago levanta os olhos. Alguém disse em voz alta o que ele já tinha dito sozinho. O apelido perde a graça, o grupo se cala e ele percebe que não precisa rir pra ser aceito. Um “para” na hora vale mais que um discurso depois.' },
      ],
    },
    {
      title: 'A figurinha do cabelo',
      ask: 'Se a figurinha fosse sua, de quem você gostaria de receber uma mensagem?',
      who: 'Marina',
      story: 'A Marina, que é negra, passou anos alisando o cabelo pra escapar das piadas. Hoje veio com o cabelo natural pela primeira vez. Alguém faz uma figurinha zoando o volume do cabelo dela e joga no grupo da turma. Em minutos chovem risadinhas. Ela ainda não respondeu nada.',
      options: [
        { text: 'Não reagir nem repassar, mandar mensagem pra Marina no privado dizendo que o cabelo dela está lindo e que você está com ela, e avisar um adulto da escola sobre a figurinha.', good: true,
          effect: 'No meio da humilhação, a Marina recebe uma mensagem só dela: “seu cabelo é lindo e ninguém tem o direito de rir dele”. Ela chora, mas de alívio. O cabelo faz parte da história dela e da família dela, e ela percebe que não precisa se esconder de novo. Com um adulto sabendo, a figurinha tem chance de sumir antes de ir mais longe.' },
        { text: 'Reagir com 😂 só pra não parecer chato. Você não escreveu nada, foi só uma reação.', good: false,
          effect: 'Cada reação é uma pancada pequena, e a Marina conta todas. Ela vê seu nome no meio dos risos e conclui que o cabelo natural não é bem-vindo ali. No dia seguinte volta a alisar, e o racismo ganhou de novo. “Só uma reação” vale como aplauso.',
          better: 'Silêncio no grupo e apoio no privado teriam virado o jogo.' },
        { text: 'Sair do grupo em silêncio e esquecer o assunto.', good: false,
          effect: 'Você sai sem arranhão, mas a Marina continua lá dentro, sozinha. Ela repara que quem não riu também não fez nada. Passa a noite relendo os comentários e achando que o problema é o cabelo, e não quem riu dele.',
          better: 'Sair protege você, mas não ajuda ela. Dava pra sair e ainda mandar uma mensagem.' },
      ],
    },
    {
      title: 'A piada com a religião da Bruna',
      ask: 'Você defenderia a fé de alguém que não é a sua?',
      who: 'Bruna',
      story: 'A Bruna, negra, é de candomblé e usa as guias (colares) na escola. No pátio, um garoto faz piada dizendo que ela “tem pacto” e “faz macumba contra a turma”. Alguns riem. A Bruna abaixa a cabeça e segura o colar.',
      options: [
        { text: 'Rir de leve pra não criar clima. É só zoeira, né?', good: false,
          effect: 'Pra Bruna, a risada vem de todos os lados. Ela passa a esconder o colar e a evitar falar de onde vem. Quando a fé e a cultura de alguém viram piada, a pessoa aprende a ter vergonha de quem é.',
          better: 'Não é “só zoeira”. Religião de matriz africana é alvo constante de intolerância, e isso tem consequência real.' },
        { text: 'Dizer com firmeza e sem agressão que aquilo é desrespeito, ficar ao lado da Bruna e, se repetir, procurar a coordenação.', good: true,
          effect: 'A Bruna levanta a cabeça. Alguém disse em voz alta que ela merece respeito. O garoto perde a plateia, os outros pensam duas vezes, e ela sabe que, se acontecer de novo, não vai estar sozinha.' },
        { text: 'Responder com ofensas, pro garoto saber como é ser humilhado.', good: false,
          effect: 'A briga muda de dono: agora o assunto é a discussão, e não a Bruna. Ela fica no meio, com vergonha e medo, e a coordenação pode acabar punindo todo mundo igual. A violência ganhou dois lados em vez de perder um.',
          better: 'Defender alguém não pede humilhação em troca. Firmeza e calma pesam mais.' },
      ],
    },
    {
      title: 'A “consciência branca”',
      ask: 'Se todo mundo já fosse tratado com igualdade, o que ainda faria essa data ser necessária?',
      who: 'Aline',
      story: 'Na semana do 20 de novembro, a escola monta um mural sobre Zumbi e a história negra. Um colega fala bem alto: “Cadê o Dia da Consciência Branca? Todo mundo é igual, isso é só mimimi!” Alguns riem. A Aline, uma das poucas alunas negras da sala, fica quieta olhando o mural.',
      options: [
        { text: 'Responder com calma que a data existe porque a história e a contribuição negra foram apagadas por séculos, e depois procurar a Aline pra ouvir como ela está.', good: true,
          effect: 'A Aline percebe que alguém ali entende por que aquele mural existe. O colega não é humilhado, mas ouve uma resposta que dá pra levar pra casa. O silêncio perde força, e ela deixa de ser a única a segurar esse peso.' },
        { text: 'Rir ou ficar quieto. Responder vai dar confusão.', good: false,
          effect: 'O riso confirma que o mural é enfeite e que a história e a dor expostas ali podem virar piada. A Aline aprende que até no dia que devia ser dela está sozinha. O silêncio de quem “não concorda” pesa quase tanto quanto o riso de quem concorda.',
          better: 'Dizer “isso não é verdade”, com calma, já muda o rumo da conversa.' },
        { text: 'Gritar que ele é racista na frente de todo mundo e chamar a turma pra vaiar.', good: false,
          effect: 'Vira briga. O colega se fecha em vez de pensar, e o assunto passa a ser quem gritou mais. A Aline fica de plateia do próprio tema, e o mural, que servia pra ensinar, vira cenário de confusão.',
          better: 'Firmeza não precisa de grito. Explicar ensina; humilhar só separa.' },
      ],
    },
    {
      title: 'A foto que não era pra existir',
      ask: 'O que você gostaria que fizessem com uma foto sua chorando?',
      who: 'Caio',
      story: 'Chega no seu celular uma foto do Caio chorando no banheiro da escola, tirada escondido, com a legenda “chorão”. Já passou por vários grupos e todo mundo está comentando.',
      options: [
        { text: 'Mandar pra só mais um amigo. Já está em todo lugar mesmo.', good: false,
          effect: 'Cada reenvio leva a humilhação do Caio pra mais uma casa, mais um celular, mais uma pessoa que nunca vai esquecer. A foto não some quando a gente cansa de olhar. Ele passa a ter medo de chorar e de voltar pra escola.',
          better: 'O “já está em todo lugar” é justamente o que mantém a foto viva.' },
        { text: 'Apagar a foto e fingir que nada aconteceu.', good: false,
          effect: 'Do seu lado, a foto sumiu. Do dele, não. O Caio continua achando que ninguém se importa e que todo mundo viu e riu. Sem adulto sabendo, nada impede a foto de continuar circulando.',
          better: 'Apagar é um bom começo, mas só ajuda de verdade com apoio e com um adulto de confiança.' },
        { text: 'Não repassar, mostrar pra um adulto de confiança e procurar o Caio pra dizer que você não concorda com aquilo.', good: true,
          effect: 'O Caio descobre que pelo menos uma pessoa viu a foto e ficou do lado dele. Com a escola sabendo, dá pra conter a circulação e quem expôs responde pelo que fez. A dor não passa na hora, mas ele deixa de encarar isso no escuro.' },
      ],
    },
  ];

  const quizEl = $('#quiz');
  let qIndex = 0;
  let correct = 0;
  const results = [];

  function renderDots() {
    const wrap = el('div', { class: 'dots', 'aria-hidden': 'true' });
    SCENARIOS.forEach((_, i) => {
      const cls = results[i] === true ? 'good' : results[i] === false ? 'bad' : i === qIndex ? 'on' : '';
      wrap.append(el('span', { class: cls }));
    });
    return wrap;
  }

  function renderScenario() {
    const s = SCENARIOS[qIndex];
    quizEl.replaceChildren();
    quizEl.append(
      el('div', { class: 'quiz-head' },
        el('span', { class: 'quiz-count', text: `Situação ${qIndex + 1} de ${SCENARIOS.length}` }),
        renderDots()),
    );
    const outcomeSlot = el('div', { class: 'outcome-slot' });
    const nextSlot = el('div', { class: 'quiz-next' });
    const list = el('ul', { class: 'options' });
    const buttons = [];

    s.options.forEach((o, i) => {
      const letter = 'ABC'[i];
      const btn = el('button', { class: 'opt', type: 'button', 'data-i': String(i) },
        el('span', { class: 'letter', 'aria-hidden': 'true', text: letter }),
        el('span', { class: 'txt' }, el('span', { class: 'sr-only', text: `Alternativa ${letter}: ` }), o.text));
      btn.addEventListener('click', () => choose(i));
      buttons.push(btn);
      list.append(el('li', {}, btn));
    });

    function choose(i) {
      const o = s.options[i];
      buttons.forEach((b, j) => {
        b.disabled = true;
        if (j === i) b.classList.add('chosen', o.good ? 'is-good' : 'is-bad');
      });
      results[qIndex] = o.good;
      if (o.good) correct += 1;
      const out = el('div', { class: `outcome ${o.good ? 'is-good' : 'is-bad'}`, role: 'status' },
        el('span', { class: 'badge', text: o.good ? 'Esse caminho acolhe' : 'Esse caminho machuca' }),
        el('h4', { text: `O que isso provoca em ${s.who}` }),
        el('p', { text: o.effect }));
      if (!o.good && o.better) out.append(el('p', { class: 'better', text: o.better }));
      out.append(el('p', { class: 'ask', text: 'Pergunte-se: ' + s.ask }));
      outcomeSlot.replaceChildren(out);
      const last = qIndex === SCENARIOS.length - 1;
      nextSlot.replaceChildren(el('button', { class: 'btn', type: 'button', text: last ? 'Ver meu resultado' : 'Próxima situação', onclick: () => { qIndex += 1; last ? renderScore() : renderScenario(); } }));
      const head = $('.dots', quizEl); if (head) head.replaceWith(renderDots());
      out.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }

    quizEl.append(el('div', { class: 'quiz-body' },
      el('div', { class: 'scenario' },
        el('span', { class: 'scenario-tag', text: `Situação ${qIndex + 1}` }),
        el('h3', { text: s.title }),
        el('p', { class: 'story', text: s.story }),
        el('p', { class: 'sr-only', text: 'Escolha uma alternativa:' }),
        list, outcomeSlot, nextSlot)));
  }

  function scoreMessage(n, total) {
    if (n === total) return 'Você enxergou o que cada escolha faz com a pessoa do outro lado. O difícil é repetir isso na vida real, com amigo olhando e rindo do seu lado. É nessa hora que o que você escolheu aqui vira atitude.';
    if (n >= total - 1) return 'Quase. A escolha em que você escorregou provavelmente é das mais comuns, e por isso mesmo vale pensar nela de novo. Todo mundo erra. O que conta é perceber e mudar.';
    if (n >= 2) return 'Você acertou o que muita gente erra por medo de ficar de fora. Releia o que as alternativas que machucam provocam: atitude pequena pesa muito do outro lado. Não é pra se culpar, é pra escolher melhor da próxima vez.';
    return 'Esse resultado não diz quem você é. Diz o que ainda é difícil pra quase todos nós. Aprender a acolher leva tempo, e você deu um passo ao parar pra pensar. Tente de novo e repare no que muda quando você se coloca no lugar de quem sofre.';
  }

  function renderScore() {
    quizEl.replaceChildren(
      el('div', { class: 'quiz-head' }, el('span', { class: 'quiz-count', text: 'Resultado' }), renderDots()),
      el('div', { class: 'quiz-body' },
        el('div', { class: 'score' },
          el('p', { class: 'big' }, 'Você acertou ', el('b', { text: String(correct) }), ` de ${SCENARIOS.length}`),
          el('p', { text: scoreMessage(correct, SCENARIOS.length) }),
          el('div', {},
            el('button', { class: 'btn', type: 'button', text: 'Refazer as situações', onclick: () => { qIndex = 0; correct = 0; results.length = 0; renderScenario(); quizEl.scrollIntoView({ block: 'start' }); } }),
            ' ',
            el('a', { class: 'btn btn-ghost', href: '#mural', text: 'Deixar uma mensagem no mural' })))));
  }
  renderScenario();

  // ═════════════════════════════════════════════════════════
  //  MURAL
  // ═════════════════════════════════════════════════════════
  const TYPE_LABEL = { apoio: '💛 Apoio', relato: '🗣️ Relato', compromisso: '🤝 Compromisso' };
  const feed = $('#feed');
  const stateEl = $('#feed-state');
  const moreBtn = $('#more');
  const updatedEl = $('#feed-updated');
  const form = $('#wall-form');
  const statusEl = $('#f-status');
  const submitBtn = $('#f-submit');
  const textEl = $('#f-text');
  const counter = $('#f-count');

  // identidade anônima do visitante (só para não abraçar duas vezes)
  const newId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2));
  let visitor = store.get('rea_visitor');
  if (!visitor || !/^[A-Za-z0-9-]{16,64}$/.test(visitor)) { visitor = newId(); store.set('rea_visitor', visitor); }
  let hugged = new Set();
  try { hugged = new Set(JSON.parse(store.get('rea_hugged') || '[]').map(Number)); } catch { hugged = new Set(); }
  const saveHugged = () => store.set('rea_hugged', JSON.stringify([...hugged].slice(-2000)));

  const api = async (path, opts = {}) => {
    const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'X-Visitor': visitor, ...(opts.headers || {}) } });
    let data = {};
    try { data = await res.json(); } catch { /* sem corpo */ }
    if (!res.ok) throw Object.assign(new Error(data.error || 'Não foi possível concluir agora.'), { status: res.status });
    return data;
  };

  function timeAgo(ts) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return 'agora há pouco';
    const m = Math.round(s / 60);
    if (m < 60) return `há ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.round(h / 24);
    if (d === 1) return 'ontem';
    if (d < 7) return `há ${d} dias`;
    return new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const nodes = new Map(); // id -> {li, hugBtn, countEl, timeEl, ts}
  let oldestId = null;
  let hasMore = false;

  function buildMessage(m, fresh) {
    const isHugged = m.hugged || hugged.has(m.id);
    if (m.hugged) hugged.add(m.id);
    const countEl = el('span', { class: 'n', text: String(m.hugs) });
    const hugBtn = el('button', { class: 'hug' + (isHugged ? ' done' : ''), type: 'button', 'aria-label': isHugged ? `Você já abraçou esta mensagem. ${m.hugs} abraços` : `Abraçar esta mensagem. ${m.hugs} abraços` },
      el('span', { class: 'e', 'aria-hidden': 'true', text: '🤗' }),
      el('span', { text: isHugged ? 'Abraçado' : 'Abraçar' }), countEl);
    if (isHugged) hugBtn.disabled = true;
    const timeEl = el('time', { datetime: new Date(m.createdAt).toISOString(), text: timeAgo(m.createdAt) });
    const li = el('li', { class: 'msg' + (fresh ? ' fresh' : ''), 'data-type': m.type, 'data-id': String(m.id) },
      el('div', { class: 'msg-top' }, el('span', { class: 'tag', text: TYPE_LABEL[m.type] || m.type }), timeEl),
      el('p', { class: 'msg-text', text: m.text }),
      el('div', { class: 'msg-foot' }, el('span', { class: 'msg-author', text: m.name ? `— ${m.name}` : '— Pessoa anônima' }), hugBtn));
    const rec = { li, hugBtn, countEl, timeEl, ts: m.createdAt, hugs: m.hugs };
    hugBtn.addEventListener('click', () => hug(m.id, rec));
    nodes.set(m.id, rec);
    return li;
  }

  function setHugState(rec, hugs, done) {
    rec.hugs = hugs;
    rec.countEl.textContent = String(hugs);
    if (done) {
      rec.hugBtn.disabled = true;
      rec.hugBtn.classList.add('done');
      rec.hugBtn.children[1].textContent = 'Abraçado';
    }
    rec.hugBtn.setAttribute('aria-label', done ? `Você já abraçou esta mensagem. ${hugs} abraços` : `Abraçar esta mensagem. ${hugs} abraços`);
  }

  async function hug(id, rec) {
    if (hugged.has(id)) return;
    rec.hugBtn.disabled = true; // trava já: nada de clique duplo
    try {
      const r = await api(`/api/messages/${id}/hug`, { method: 'POST', body: '{}' });
      hugged.add(id); saveHugged();
      setHugState(rec, r.hugs, true);
      rec.hugBtn.classList.add('bump');
      setTimeout(() => rec.hugBtn.classList.remove('bump'), 700);
    } catch (e) {
      rec.hugBtn.disabled = false;
      flash(e.message);
    }
  }

  let flashTimer;
  function flash(msg) {
    updatedEl.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { updatedEl.textContent = ''; }, 5000);
  }

  function showState(text) {
    stateEl.textContent = text || '';
    stateEl.hidden = !text;
  }

  async function loadFirstPage(initial) {
    try {
      const data = await api('/api/messages?limit=20');
      const incoming = data.messages;
      if (initial) {
        feed.replaceChildren();
        incoming.forEach((m) => feed.append(buildMessage(m, false)));
        hasMore = data.hasMore;
        oldestId = incoming.length ? incoming[incoming.length - 1].id : null;
      } else {
        const fresh = incoming.filter((m) => !nodes.has(m.id));
        fresh.reverse().forEach((m) => feed.prepend(buildMessage(m, true)));
        incoming.forEach((m) => { const r = nodes.get(m.id); if (r && r.hugs !== m.hugs) setHugState(r, m.hugs, r.hugBtn.classList.contains('done')); });
        // se o mural estava vazio no começo, define o cursor
        if (oldestId === null && incoming.length) { oldestId = incoming[incoming.length - 1].id; hasMore = data.hasMore; }
      }
      showState(feed.children.length ? '' : 'O mural ainda está vazio. Que tal ser a primeira pessoa a deixar uma palavra?');
      moreBtn.hidden = !hasMore;
      updatedEl.textContent = '';
    } catch (e) {
      if (initial) showState('Não conseguimos carregar o mural agora. Tente atualizar a página em instantes.');
    }
  }

  moreBtn.addEventListener('click', async () => {
    if (!oldestId) return;
    moreBtn.disabled = true;
    try {
      const data = await api(`/api/messages?limit=20&before=${oldestId}`);
      data.messages.forEach((m) => { if (!nodes.has(m.id)) feed.append(buildMessage(m, false)); });
      if (data.messages.length) oldestId = data.messages[data.messages.length - 1].id;
      hasMore = data.hasMore;
      moreBtn.hidden = !hasMore;
    } catch (e) { flash(e.message); }
    moreBtn.disabled = false;
  });

  // atualização "ao vivo" leve (a cada 25 s, só com a aba visível)
  setInterval(() => { if (!document.hidden) loadFirstPage(false); }, 25000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadFirstPage(false); });
  // mantém "há X min" atualizado
  setInterval(() => nodes.forEach((r) => { r.timeEl.textContent = timeAgo(r.ts); }), 60000);

  // ───────────── Formulário ─────────────
  const updateCount = () => {
    const n = textEl.value.length;
    counter.textContent = `${n} / 600`;
    counter.classList.toggle('warn', n >= 540);
  };
  textEl.addEventListener('input', updateCount);

  let cooldownUntil = 0;
  const setStatus = (msg, kind) => { statusEl.textContent = msg; statusEl.className = 'form-status' + (kind ? ' ' + kind : ''); };

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const text = textEl.value.trim();
    const name = form.elements.name.value.trim();
    const type = form.elements.type.value;
    if (text.length < 3) { setStatus('Escreva pelo menos 3 caracteres.', 'err'); textEl.focus(); return; }
    if (text.length > 600) { setStatus('A mensagem pode ter no máximo 600 caracteres.', 'err'); return; }
    if (name.length < 2) { setStatus('Escreva seu nome (pelo menos 2 letras).', 'err'); form.elements.name.focus(); return; }
    if (name.length > 40) { setStatus('O nome pode ter no máximo 40 caracteres.', 'err'); return; }
    const wait = Math.ceil((cooldownUntil - Date.now()) / 1000);
    if (wait > 0) { setStatus(`Calma, a gente respira junto. Espere ${wait} s para enviar outra mensagem.`, 'err'); return; }

    submitBtn.disabled = true;
    setStatus('Publicando…');
    try {
      const r = await api('/api/messages', { method: 'POST', body: JSON.stringify({ type, name, text, website: form.elements.website.value }) });
      cooldownUntil = Date.now() + 20000;
      form.elements.text.value = '';
      updateCount();
      setStatus('Pronto! Sua mensagem já está no mural. Obrigado por deixar uma palavra.', 'ok');
      if (r.message && !nodes.has(r.message.id)) {
        showState('');
        feed.prepend(buildMessage(r.message, true));
        if (oldestId === null) oldestId = r.message.id;
        feed.firstElementChild.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    } catch (e) {
      setStatus(e.message, 'err');
      if (e.status === 429) cooldownUntil = Date.now() + 15000;
    } finally {
      submitBtn.disabled = false;
    }
  });

  loadFirstPage(true);
})();

(() => {
'use strict';

const W = 1000, H = 760;
const NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById(id);
const svg = $('map');
const COUNTRY = new Map(COUNTRIES.map(c => [c.id, c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = {
  get(k, d) { try { const v = localStorage.getItem('ee.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ee.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ============================== Sound & confetti ============================== */
let muted = store.get('muted', false);
let actx;
function tone(freq, dur = .15, type = 'sine', delay = 0, vol = .15) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur);
  } catch { /* audio unavailable */ }
}
const sfx = {
  good: () => { tone(660, .12, 'triangle'); tone(880, .12, 'triangle', .1); tone(1320, .22, 'triangle', .2); },
  ok:   () => { tone(520, .12, 'triangle'); tone(700, .18, 'triangle', .1); },
  bad:  () => tone(170, .25, 'sawtooth', 0, .08),
  win:  () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .3, 'triangle', i * .13)),
};

const fx = $('fx'), fctx = fx.getContext('2d');
let parts = [], raf = 0;
function sizeFx() { fx.width = innerWidth; fx.height = innerHeight; }
addEventListener('resize', sizeFx); sizeFx();
function confetti(x, y, n = 45, spread = 1) {
  if (reduceMotion) return;
  for (let i = 0; i < n; i++) {
    parts.push({ x, y, vx: (Math.random() - .5) * 11 * spread, vy: -Math.random() * 11 - 3, s: 5 + Math.random() * 6,
      c: `hsl(${Math.random() * 360 | 0} 90% 60%)`, r: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 70 + Math.random() * 40 });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
function tick() {
  fctx.clearRect(0, 0, fx.width, fx.height);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) {
    p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
    fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.r); fctx.fillStyle = p.c;
    fctx.globalAlpha = Math.min(1, p.life / 25); fctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); fctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : 0;
}

/* ============================== Map ============================== */
const mk = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};

const els = {};     // id -> [path, ring?]
const labels = {};  // id -> <text>
const geo = {};     // id -> { area, c:[x,y], w, bounds }
let gFx;

function inEurope(poly) {
  const b = d3.geoBounds({ type: 'Polygon', coordinates: poly });
  if (b[0][0] > b[1][0]) return false; // wraps the antimeridian (eastern Siberia)
  return b[1][0] >= -26 && b[0][0] <= 62 && b[1][1] >= 33 && b[0][1] <= 72;
}

function buildMap() {
  const fc = topojson.feature(WORLD_TOPO, WORLD_TOPO.objects.countries);
  const projection = d3.geoConicConformal().rotate([-15, 0]).center([0, 52]).parallels([40, 65])
    .fitExtent([[50, 40], [W - 50, H - 40]], { type: 'MultiPoint',
      coordinates: [[-24, 64], [-9.5, 37], [-9, 52], [34, 35], [40, 47], [40, 60], [30, 71], [12, 71]] })
    .clipExtent([[-400, -300], [W + 400, H + 300]]);
  const pathGen = d3.geoPath(projection);

  mk('rect', { class: 'sea', x: -3000, y: -3000, width: 7000, height: 7000 }, svg);
  const gOther = mk('g', {}, svg), gLand = mk('g', {}, svg), gRing = mk('g', {}, svg), gLabel = mk('g', {}, svg);
  gFx = mk('g', {}, svg);

  for (const f of fc.features) {
    const raw = f.properties.name;
    if (raw === 'Greenland' || raw === 'Antarctica') continue;
    const id = ALIASES[raw] || raw;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const keep = polys.filter(inEurope);
    if (!keep.length) continue;
    const d = pathGen({ type: 'MultiPolygon', coordinates: keep });
    if (!d) continue;
    const isGame = COUNTRY.has(id);
    const p = mk('path', { d, class: isGame ? 'land' : 'other', 'data-id': id, 'data-name': raw, 'data-game': isGame ? 1 : 0 }, isGame ? gLand : gOther);
    if (!isGame) continue;
    (els[id] = els[id] || []).push(p);

    let best = null, bestA = -1;
    for (const poly of keep) {
      const a = d3.geoArea({ type: 'Polygon', coordinates: poly });
      if (a > bestA) { bestA = a; best = poly; }
    }
    if (!geo[id] || bestA > geo[id].area) {
      const g = { type: 'Polygon', coordinates: best };
      const bounds = pathGen.bounds(g);
      geo[id] = { area: bestA, c: pathGen.centroid(g), w: bounds[1][0] - bounds[0][0], bounds };
    }
  }

  for (const c of COUNTRIES) {
    if (!geo[c.id]) { console.warn('No map shape for', c.id); continue; }
    if (MICROSTATES.includes(c.id)) {
      const [cx, cy] = geo[c.id].c;
      els[c.id].push(mk('circle', { class: 'ring', cx, cy, r: 9, 'data-id': c.id, 'data-name': c.name, 'data-game': 1 }, gRing));
    }
    const t = mk('text', { class: 'label', x: geo[c.id].c[0], y: geo[c.id].c[1] }, gLabel);
    t.textContent = c.name.replace(' and Herzegovina', '').replace('United Kingdom', 'UK');
    t.style.display = 'none';
    labels[c.id] = t;
  }
}

/* ---- view: zoom & pan ---- */
const vb = { x: 0, y: 0, w: W, h: H };
let scale = 1;
const toSvg = (cx, cy) => { const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; return pt.matrixTransform(svg.getScreenCTM().inverse()); };

function applyView() {
  if (vb.w >= W - .01) { vb.x = 0; vb.y = 0; vb.w = W; vb.h = H; }
  else {
    vb.x = clamp(vb.x, -150, W - vb.w + 150);
    vb.y = clamp(vb.y, -150, H - vb.h + 150);
  }
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  scale = W / vb.w;
  svg.querySelectorAll('.ring').forEach(r => r.setAttribute('r', 9 / scale));
  for (const id in labels) {
    const L = labels[id];
    L.setAttribute('font-size', 13 / scale);
    L.style.strokeWidth = 3.5 / scale;
    L.style.display = L.dataset.on === '1' && geo[id].w * scale >= L.textContent.length * 6.5 ? '' : 'none';
  }
}

function zoomAt(p, f) {
  const s = clamp(scale * f, 1, 14);
  f = s / scale;
  if (f === 1) return;
  vb.x = p.x - (p.x - vb.x) / f; vb.y = p.y - (p.y - vb.y) / f;
  vb.w /= f; vb.h /= f;
  applyView();
}

function resetView() {
  if (S.regionSet && S.regionSet.size < COUNTRIES.length) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const id of S.regionSet) {
      const b = geo[id].bounds;
      x0 = Math.min(x0, b[0][0]); y0 = Math.min(y0, b[0][1]); x1 = Math.max(x1, b[1][0]); y1 = Math.max(y1, b[1][1]);
    }
    const pad = 1.35;
    let w = Math.max((x1 - x0) * pad, (y1 - y0) * pad * W / H, 120);
    w = Math.min(w, W);
    vb.w = w; vb.h = w * H / W; vb.x = (x0 + x1) / 2 - vb.w / 2; vb.y = (y0 + y1) / 2 - vb.h / 2;
  } else { vb.x = 0; vb.y = 0; vb.w = W; vb.h = H; }
  applyView();
}

const ptrs = new Map();
let dragMoved = false, movedDist = 0;
svg.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); movedDist = 0; dragMoved = false; });
addEventListener('pointermove', e => {
  const prev = ptrs.get(e.pointerId);
  if (!prev) return;
  const cur = { x: e.clientX, y: e.clientY };
  if (ptrs.size === 1) {
    const dx = cur.x - prev.x, dy = cur.y - prev.y;
    movedDist += Math.abs(dx) + Math.abs(dy);
    if (movedDist > 6) {
      dragMoved = true; svg.classList.add('dragging');
      const r = svg.getBoundingClientRect(), k = Math.min(r.width / vb.w, r.height / vb.h);
      vb.x -= dx / k; vb.y -= dy / k; applyView();
    }
  } else if (ptrs.size === 2) {
    const other = [...ptrs.entries()].find(([id]) => id !== e.pointerId)[1];
    const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(cur.x - other.x, cur.y - other.y);
    if (d0 > 0) zoomAt(toSvg((cur.x + other.x) / 2, (cur.y + other.y) / 2), d1 / d0);
    dragMoved = true;
  }
  ptrs.set(e.pointerId, cur);
});
const endPtr = e => { ptrs.delete(e.pointerId); if (!ptrs.size) setTimeout(() => svg.classList.remove('dragging'), 0); };
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(toSvg(e.clientX, e.clientY), e.deltaY < 0 ? 1.25 : .8); }, { passive: false });
const centre = () => { const r = svg.getBoundingClientRect(); return toSvg(r.left + r.width / 2, r.top + r.height / 2); };
$('zoom-in').onclick = () => zoomAt(centre(), 1.6);
$('zoom-out').onclick = () => zoomAt(centre(), 1 / 1.6);
$('zoom-reset').onclick = resetView;

svg.addEventListener('click', e => {
  if (dragMoved) return;
  const t = e.target.closest('[data-name]');
  if (t) onMapClick(t.dataset.id, t.dataset.game === '1', t.dataset.name, t);
});

/* ============================== Game state ============================== */
let cfg = Object.assign({ mode: 'find', region: 'all', len: 10 }, store.get('cfg', {}));
let stamps = store.get('stamps', {});
let S = { regionSet: null };

const setPaint = (id, on) => {
  for (const n of els[id]) n.classList.toggle('found', on);
  if (labels[id]) { labels[id].dataset.on = on ? '1' : '0'; }
};

function clearHighlights() {
  svg.classList.remove('focus');
  for (const id in els) for (const n of els[id]) n.classList.remove('glow', 'reveal', 'flash-bad');
  gFx.replaceChildren();
}

function resetMap() {
  for (const id in els) {
    setPaint(id, false);
    for (const n of els[id]) n.classList.toggle('off', !S.regionSet.has(id));
  }
  clearHighlights();
  resetView();
}

let toastTimer;
function toast(msg, cls = '', ms = 2200) {
  const t = $('toast');
  t.textContent = msg; t.className = 'show ' + cls;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', ms);
}

const show = id => { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('hidden', s.id !== id); };

/* ---- starting ---- */
function startGame() {
  store.set('cfg', cfg);
  const pool = COUNTRIES.filter(c => cfg.region === 'all' || c.region === cfg.region);
  S = {
    mode: cfg.mode, regionSet: new Set(pool.map(c => c.id)), queue: [], idx: 0, score: 0, streak: 0, bestStreak: 0,
    firstTry: 0, done: 0, attempts: 0, hint: false, locked: false, waiting: false, cur: null, missed: new Set(), timer: 0,
  };
  const types = ['find', 'name', 'capital'];
  if (cfg.mode !== 'explore') {
    let picked = shuffle(pool);
    if (cfg.len > 0) picked = picked.slice(0, cfg.len);
    S.queue = picked.map(c => ({ c, type: cfg.mode === 'mix' ? pick(types) : cfg.mode, again: false }));
  }
  const explore = cfg.mode === 'explore';
  $('game').classList.toggle('explore', explore);
  $('info-card').classList.add('hidden');
  $('choices').classList.add('hidden');
  show('game');
  resetMap();
  setHud();
  if (explore) {
    for (const id of S.regionSet) setPaint(id, true);
    $('q-text').innerHTML = 'Tap any country to meet it! 👆';
    applyView();
  } else nextQuestion();
}

function setHud() {
  $('score').textContent = S.score;
  $('streak').textContent = S.streak;
  $('streak-box').classList.toggle('hot', S.streak >= 3);
  const total = S.queue.length;
  $('progress-bar').style.width = total ? (S.done / total * 100) + '%' : '0';
  $('progress-text').textContent = total ? `${Math.min(S.idx + 1, total)} / ${total}` : '';
}

/* ---- questions ---- */
function nextQuestion() {
  clearTimeout(S.timer);
  S.waiting = false;
  $('info-card').classList.add('hidden');
  if (S.idx >= S.queue.length) return endGame();
  const q = S.cur = S.queue[S.idx];
  S.attempts = 0; S.hint = false; S.locked = false; S.t0 = performance.now();
  clearHighlights();
  setHud();
  $('hint-btn').disabled = false; $('skip-btn').disabled = false;
  const c = q.c, again = q.again ? ' <small>(second chance!)</small>' : '';
  const box = $('choices');

  if (q.type === 'find') {
    $('q-text').innerHTML = `Where is <em>${c.name}</em>?${again}`;
    box.classList.add('hidden');
    return;
  }

  svg.classList.add('focus');
  for (const n of els[c.id]) n.classList.add('glow');
  resetView();
  $('q-text').innerHTML = (q.type === 'name' ? 'Which country is glowing?' : `What is the capital of <em>${c.name}</em>?`) + again;

  const text = o => q.type === 'name' ? o.name : o.cap;
  const sameRegion = shuffle(COUNTRIES.filter(o => o.region === c.region && o !== c));
  const others = shuffle(COUNTRIES.filter(o => o.region !== c.region));
  const opts = [c];
  for (const o of [...sameRegion, ...others]) {
    if (opts.length === 4) break;
    if (!opts.some(x => text(x) === text(o))) opts.push(o);
  }
  box.replaceChildren();
  shuffle(opts).forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'choice';
    b.innerHTML = `<span class="key">${i + 1}</span>`;
    b.append(text(o));
    b.onclick = () => onChoice(b, o);
    box.appendChild(b);
  });
  box.classList.remove('hidden');
}

function onChoice(btn, o) {
  if (S.locked) return;
  if (o === S.cur.c) {
    btn.classList.add('right');
    for (const b of $('choices').children) b.disabled = true;
    return correct(btn);
  }
  btn.classList.add('wrong'); btn.disabled = true;
  miss();
  if (S.attempts >= 3) {
    for (const b of $('choices').children) if (b.textContent.endsWith(S.cur.type === 'name' ? S.cur.c.name : S.cur.c.cap)) b.classList.add('right');
    for (const b of $('choices').children) b.disabled = true;
    reveal();
  } else toast('Not quite. Try again!', 'bad', 1200);
}

function miss() {
  S.attempts++; S.streak = 0; S.missed.add(S.cur.c.name);
  sfx.bad(); setHud();
}

function onMapClick(id, isGame, rawName, target) {
  if (S.mode === 'explore') {
    if (!isGame) return toast(`${rawName} isn't part of this game, but it's a neighbour!`, '', 1800);
    clearHighlights();
    for (const n of els[id]) n.classList.add('glow');
    sfx.ok();
    return showInfo(COUNTRY.get(id), 0, false);
  }
  if (!S.cur || S.cur.type !== 'find' || S.locked) return;
  if (!isGame) return toast(`${rawName} isn't part of this game. Try again!`, '', 1500);
  const c = COUNTRY.get(id);
  if (!S.regionSet.has(id)) return toast(`That's ${c.name}, but it's not in this round.`, '', 1500);
  if (id === S.cur.c.id) return correct(target);
  for (const n of els[id]) { n.classList.add('flash-bad'); setTimeout(() => n.classList.remove('flash-bad'), 600); }
  miss();
  if (S.attempts >= 3) reveal();
  else toast(`That's ${c.name}. Try again!`, 'bad', 1500);
}

function award() {
  let pts = [100, 60, 30][Math.min(S.attempts, 2)];
  if (S.hint) pts = Math.round(pts / 2);
  if (S.attempts === 0 && !S.hint) {
    const secs = (performance.now() - S.t0) / 1000;
    pts += Math.max(0, Math.round(40 - secs * 4));
  }
  if (S.attempts === 0) { S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); pts += Math.min(S.streak, 10) * 5; }
  return pts;
}

function correct(target) {
  if (S.locked) return;
  S.locked = true;
  const c = S.cur.c, first = S.attempts === 0 && !S.hint;
  const pts = award();
  S.score += pts; S.done++;
  if (first) { S.firstTry++; stamps[c.id] = true; store.set('stamps', stamps); }
  if (S.attempts >= 2 && !S.cur.again) requeue();
  clearHighlights();
  setPaint(c.id, true);
  const r = (target || els[c.id][0]).getBoundingClientRect();
  confetti(r.left + r.width / 2, r.top + r.height / 2, first ? 50 : 25);
  first ? sfx.good() : sfx.ok();
  const praise = S.streak >= 5 ? '🔥 On fire!' : first ? pick(['🎉 Brilliant!', '⭐ Perfect!', '🚀 Nailed it!', '😎 Easy!']) : '👍 Got it!';
  toast(`${praise}  +${pts}`, 'good', 1800);
  const sc = $('score'); sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump');
  $('hint-btn').disabled = true; $('skip-btn').disabled = true;
  setHud();
  showInfo(c, pts, true);
}

function requeue() {
  S.queue.splice(Math.min(S.idx + 4, S.queue.length), 0, { c: S.cur.c, type: S.cur.type, again: true });
}

function reveal() {
  S.locked = true; S.streak = 0; S.done++;
  S.missed.add(S.cur.c.name);
  if (!S.cur.again) requeue();
  const c = S.cur.c;
  svg.classList.remove('focus');
  setPaint(c.id, true);
  for (const n of els[c.id]) n.classList.add('reveal');
  const [cx, cy] = geo[c.id].c;
  mk('circle', { class: 'ping', cx, cy, r: 8 }, gFx);
  // keep the answer in view if the player had zoomed away from it
  if (cx < vb.x || cx > vb.x + vb.w || cy < vb.y || cy > vb.y + vb.h) { vb.x = cx - vb.w / 2; vb.y = cy - vb.h / 2; applyView(); }
  sfx.bad();
  toast(`It's ${c.name}! We'll try it again later.`, '', 2400);
  $('hint-btn').disabled = true; $('skip-btn').disabled = true;
  setHud();
  showInfo(c, 0, true);
}

$('skip-btn').onclick = () => {
  if (!S.cur || S.locked) return;
  if (S.cur.type !== 'find') for (const b of $('choices').children) if (b.textContent.endsWith(S.cur.type === 'name' ? S.cur.c.name : S.cur.c.cap)) b.classList.add('right');
  for (const b of $('choices').children) b.disabled = true;
  reveal();
};

$('hint-btn').onclick = () => {
  if (!S.cur || S.locked || S.hint) return;
  S.hint = true; $('hint-btn').disabled = true;
  if (S.cur.type === 'find') {
    const [cx, cy] = geo[S.cur.c.id].c;
    mk('circle', { class: 'ping', cx, cy, r: 8 }, gFx);
    toast('Look for the ripples! 🌊 (half points)', '', 2000);
  } else {
    const right = S.cur.type === 'name' ? S.cur.c.name : S.cur.c.cap;
    let removed = 0;
    for (const b of shuffle([...$('choices').children])) {
      if (removed < 2 && !b.disabled && !b.textContent.endsWith(right)) { b.disabled = true; b.style.opacity = .3; removed++; }
    }
    toast('Two wrong answers removed! (half points)', '', 1800);
  }
};

function showInfo(c, pts, withNext) {
  if (withNext && cfg.quick) { // no fact card: just a short pause, then on to the next question
    S.waiting = true;
    clearTimeout(S.timer);
    S.timer = setTimeout(advance, pts > 0 ? 900 : 2200);
    return;
  }
  const R = REGIONS[c.region], card = $('info-card');
  card.innerHTML = `<h3>${c.name}</h3><div>🏙️ Capital: <b>${c.cap}</b> &nbsp; ${R.emoji} ${R.name}</div><p>💡 ${c.fact}</p>`;
  if (withNext) {
    const b = document.createElement('button');
    b.className = 'small-btn'; b.id = 'next-btn'; b.textContent = 'Next ➜'; b.onclick = advance;
    b.style.marginTop = '8px';
    card.appendChild(b);
    S.waiting = true;
    clearTimeout(S.timer);
    S.timer = setTimeout(advance, pts > 0 ? 4200 : 5200);
  }
  card.classList.remove('hidden');
}

function advance() {
  if (!S.waiting) return;
  S.waiting = false; clearTimeout(S.timer);
  S.idx++;
  nextQuestion();
}

addEventListener('keydown', e => {
  if ($('game').classList.contains('hidden')) return;
  if (e.key >= '1' && e.key <= '4') {
    const b = $('choices').children[+e.key - 1];
    if (b && !b.disabled) b.click();
  } else if ((e.key === 'Enter' || e.key === ' ') && S.waiting) {
    e.preventDefault(); advance();
  }
});

/* ---- end ---- */
function endGame() {
  const total = S.done || 1, acc = Math.round(S.firstTry / total * 100);
  const stars = acc >= 80 ? 3 : acc >= 50 ? 2 : 1;
  const msg = [
    ['Keep exploring!', "Every explorer starts somewhere. The tricky ones will come back, I promise!"],
    ['Great job!', "You're getting really good at this. Try again to beat your score!"],
    ['Super Explorer!', "Wow! You know your way around Europe like a real map master!"],
  ][stars - 1];
  $('end-stars').innerHTML = [1, 2, 3].map(i => `<span class="star ${i > stars ? 'off' : ''}" style="animation-delay:${i * .25}s">⭐</span>`).join('');
  $('end-title').textContent = msg[0];
  $('end-text').textContent = msg[1];
  $('end-score').textContent = S.score;
  $('end-acc').textContent = acc + '%';
  $('end-streak').textContent = S.bestStreak;
  const tricky = [...S.missed];
  $('end-tricky').innerHTML = tricky.length ? '<p>Tricky ones to practise:</p>' + tricky.map(n => `<span class="tag">${n}</span>`).join('') : '<p>🌟 Not a single mistake. Amazing!</p>';

  const key = `best.${cfg.mode}.${cfg.region}.${cfg.len}`, old = store.get(key, 0);
  if (S.score > old) { store.set(key, S.score); if (old) $('end-text').textContent += ' 🏆 New high score!'; }
  show('end');
  sfx.win();
  const bursts = stars === 3 ? 6 : 3;
  for (let i = 0; i < bursts; i++) setTimeout(() => confetti(innerWidth * (.15 + Math.random() * .7), innerHeight * .35, 60, 1.3), i * 220);
  renderHome();
}

/* ============================== Home & passport ============================== */
const HELLO = [
  "Hi, explorer! I'm Finn. Ready to learn all of Europe?",
  "Welcome back! Let's fill that map with colour!",
  "Did you know Europe has more than 40 countries? Let's meet them!",
  "Pssst... the tiny countries hide in dashed circles!",
];

function renderHome() {
  $('finn-hello').textContent = pick(HELLO);
  document.querySelectorAll('#mode-cards .card').forEach(b => b.classList.toggle('on', b.dataset.mode === cfg.mode));
  document.querySelectorAll('#region-chips .chip').forEach(b => b.classList.toggle('on', b.dataset.region === cfg.region));
  document.querySelectorAll('#length-chips .chip').forEach(b => b.classList.toggle('on', +b.dataset.len === cfg.len));
  $('length-box').classList.toggle('hidden', cfg.mode === 'explore');
  $('quick-box').classList.toggle('hidden', cfg.mode === 'explore');
  $('quick-toggle').checked = !!cfg.quick;
  const n = COUNTRIES.filter(c => stamps[c.id]).length;
  $('passport-count').textContent = `(${n}/${COUNTRIES.length})`;
  const best = store.get(`best.${cfg.mode}.${cfg.region}.${cfg.len}`, 0);
  $('best-score').textContent = cfg.mode !== 'explore' && best ? `🏆 Best for this game: ${best}` : '';
}

function setupHome() {
  const chips = $('region-chips');
  const all = document.createElement('button');
  all.className = 'chip'; all.dataset.region = 'all'; all.textContent = '🌍 All Europe';
  chips.appendChild(all);
  for (const k in REGIONS) {
    const b = document.createElement('button');
    b.className = 'chip'; b.dataset.region = k; b.textContent = `${REGIONS[k].emoji} ${REGIONS[k].name}`;
    chips.appendChild(b);
  }
  chips.onclick = e => { const b = e.target.closest('.chip'); if (b) { cfg.region = b.dataset.region; renderHome(); } };
  $('mode-cards').onclick = e => { const b = e.target.closest('.card'); if (b) { cfg.mode = b.dataset.mode; renderHome(); } };
  $('length-chips').onclick = e => { const b = e.target.closest('.chip'); if (b) { cfg.len = +b.dataset.len; renderHome(); } };
  $('quick-toggle').onchange = e => { cfg.quick = e.target.checked; store.set('cfg', cfg); };
  $('start-btn').onclick = () => { sfx.ok(); startGame(); };
  $('again-btn').onclick = startGame;
  $('menu-btn').onclick = $('home-btn').onclick = () => { clearTimeout(S.timer); show('home'); renderHome(); };

  $('passport-btn').onclick = () => {
    $('passport-grid').innerHTML = COUNTRIES.map(c =>
      `<div class="stamp ${stamps[c.id] ? 'got' : ''}"><span class="em">${stamps[c.id] ? REGIONS[c.region].emoji : '❔'}</span>${stamps[c.id] ? c.name : '???'}</div>`).join('');
    $('passport').classList.remove('hidden');
  };
  $('passport-close').onclick = () => $('passport').classList.add('hidden');
  $('passport').onclick = e => { if (e.target === $('passport')) $('passport').classList.add('hidden'); };

  const mute = $('mute-btn');
  const paint = () => mute.textContent = muted ? '🔇' : '🔊';
  mute.onclick = () => { muted = !muted; store.set('muted', muted); paint(); };
  paint();
}

buildMap();
applyView();
setupHome();
renderHome();
})();

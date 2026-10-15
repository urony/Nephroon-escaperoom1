/* ==========================================================================
   מסע בתוך הנפרון — מנוע האתר
   תלוי ב-rooms.js (ROOMS, PRE, EXAM, SUBSTANCE_TABLE, GLOSSARY, fig, term)
   ========================================================================== */
(function () {
  'use strict';

  const STORE = 'nephron-escape-v1';
  const LET = ['א', 'ב', 'ג', 'ד', 'ה'];
  const N = ROOMS.length;

  /* ---------- מצב ---------- */
  const fresh = () => ({ started: false, pre: {}, solved: {}, keys: {}, exam: {}, openAll: false });
  let S = fresh();
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) S = Object.assign(fresh(), JSON.parse(raw));
  } catch (e) { /* ללא אחסון — עובד גם כך */ }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} };
  /* קישור לעיון (למורה): index.html?open=1 פותח את כל החדרים */
  if (/[?&]open=1\b/.test(location.search)) S.openAll = true;

  /* ---------- עזרים ---------- */
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of kids.flat()) {
      if (c == null || c === false) continue;
      e.append(c.nodeType ? c : document.createTextNode(c));
    }
    return e;
  }
  const $ = (s, r = document) => r.querySelector(s);

  function shuffle(arr, avoidSame) {
    const a = arr.map((v, i) => ({ v, i }));
    for (let t = 0; t < 8; t++) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      if (!avoidSame || a.some((x, i) => x.i !== i)) break;
    }
    return a;
  }

  const ICON = {
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H22M18 12v4M21.5 12v3"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    glomerulus: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M32 7a17 17 0 1 0 0 34"/><path d="M19 19c4-5 11-3 10 3s-9 4-9 10 9 6 12 1"/><path d="M4 14h12M4 34h12M32 24h13"/></svg>',
    pct: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 24c4-14 9-14 11 0s7 14 10 0 7-14 10 0 5 9 11 0"/><path d="M10 38h28" stroke-dasharray="2 5"/></svg>',
    loop: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 5v28a11 11 0 0 0 22 0V5"/><path d="M8 16l5 5 5-5M30 26l5-5 5 5"/></svg>',
    duct: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 5v20M24 25L11 44M24 25l13 19M24 14l-10-8M24 14l10-8"/></svg>',
    exit: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 4c8 10 13 17 13 24a13 13 0 0 1-26 0c0-7 5-14 13-24z"/><path d="M20 30a5 5 0 0 0 5 5"/></svg>'
  };

  /* ---------- ניווט ---------- */
  const canEnter = (n) => S.openAll || (n === 1 ? S.started : !!S.keys[n - 1]);
  const canFinal = () => S.openAll || !!S.keys[N];
  const keyCount = () => Object.keys(S.keys).filter((k) => S.keys[k]).length;
  const go = (hash) => {
    if (location.hash === hash) render(); else location.hash = hash;
  };
  function frontier() {
    if (!S.started) return '#/intro';
    for (let n = 1; n <= N; n++) if (!S.keys[n]) return '#/room/' + n;
    return '#/final';
  }

  /* ---------- מסגרת קבועה ---------- */
  const app = document.getElementById('app');
  let topbar, keysEl, progEl, menuEl;

  function buildChrome() {
    keysEl = h('div', { class: 'keys' });
    progEl = h('i');
    topbar = h('header', { class: 'topbar' },
      h('div', { class: 'topbar-in' },
        h('button', { class: 'brand', type: 'button', onclick: () => go(frontier()) }, 'מסע בתוך הנפרון'),
        keysEl,
        h('button', { class: 'menubtn', type: 'button', 'aria-label': 'תפריט', html: ICON.menu, onclick: openMenu })
      ),
      h('div', { class: 'progress' }, progEl)
    );
    menuEl = h('div', { class: 'menu', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'תפריט', onclick: (e) => { if (e.target === menuEl) closeMenu(); } });
    document.body.prepend(menuEl);
    document.body.prepend(topbar);
  }

  function updateChrome(currentRoom) {
    keysEl.replaceChildren();
    ROOMS.forEach((r) => {
      const got = !!S.keys[r.id];
      const ok = canEnter(r.id);
      const b = h('button', {
        class: 'keybtn' + (got ? ' got' : ''), type: 'button', html: ICON.key,
        'aria-label': 'חדר ' + r.id + (got ? ' (נפתח)' : ok ? '' : ' (נעול)'),
        'aria-current': currentRoom === r.id ? 'true' : null,
        disabled: !ok,
        onclick: () => go('#/room/' + r.id)
      });
      keysEl.append(b);
    });
    progEl.style.width = Math.min(100, (keyCount() / N) * 100) + '%';
    let ban = document.getElementById('browse-banner');
    if (S.openAll) {
      if (!ban) {
        ban = h('div', { id: 'browse-banner', class: 'browse-banner' }, h('span', null, 'מצב עיון פעיל: כל החדרים וההסברים פתוחים.'),
          h('button', { type: 'button', onclick: () => { S.openAll = false; save(); render(); } }, 'כיבוי'));
        topbar.append(ban);
      }
    } else if (ban) ban.remove();
  }

  function openMenu() {
    const list = h('ul', { class: 'menu-list' },
      h('li', null, h('button', { type: 'button', onclick: () => { closeMenu(); go('#/intro'); } },
        h('span', { class: 'n' }, '◦'), 'פתיחה והסבר')),
      ROOMS.map((r) => h('li', null, h('button', {
        type: 'button', disabled: !canEnter(r.id),
        onclick: () => { closeMenu(); go('#/room/' + r.id); }
      }, h('span', { class: 'n' }, S.keys[r.id] ? '✓' : String(r.id)), r.title))),
      h('li', null, h('button', { type: 'button', disabled: !canFinal(), onclick: () => { closeMenu(); go('#/final'); } },
        h('span', { class: 'n' }, '★'), 'סיכום ושאלות בחינה')));
    const modeBtn = h('button', { class: 'btn-quiet', type: 'button', 'aria-pressed': S.openAll ? 'true' : 'false', onclick: () => {
      S.openAll = !S.openAll; save();
      closeMenu(); render();
    } }, S.openAll ? 'מצב עיון: פעיל (לחצו לכיבוי)' : 'מצב עיון: כבוי (לחצו להפעלה)');
    const panel = h('div', { class: 'menu-panel' },
      h('div', { style: 'display:flex;justify-content:space-between;align-items:center' },
        h('h2', null, 'חדרי הנפרון'),
        h('button', { class: 'menubtn', type: 'button', 'aria-label': 'סגירת התפריט', style: 'color:var(--ink);font-size:1.6rem', onclick: closeMenu }, '×')),
      list,
      h('p', { class: 'menu-note' }, 'ההתקדמות נשמרת בדפדפן הזה בלבד.'),
      h('div', { class: 'menu-actions' },
        modeBtn,
        h('p', { class: 'menu-note', style: 'margin:0' }, 'מצב עיון פותח את כל החדרים גם בלי לפתור את החידות, כדי לעבור על התוכן. הוא משנה רק חדרים שעוד לא נפתרו.'),
        h('button', { class: 'btn-quiet', type: 'button', onclick: () => {
          if (confirm('למחוק את כל ההתקדמות ולהתחיל מחדש?')) { S = fresh(); save(); closeMenu(); go('#/intro'); }
        } }, 'איפוס התקדמות (מחיקת כל מה שנפתר)')));
    menuEl.replaceChildren(panel);
    menuEl.classList.add('open');
  }
  const closeMenu = () => menuEl.classList.remove('open');

  /* ---------- קטעים משותפים ---------- */
  function fbBox(kind, title, html) {
    return h('div', { class: 'fb ' + kind, role: 'status', html: '<b>' + title + '</b>' + html });
  }

  function hintBlock(text) {
    if (!text) return null;
    const box = h('div');
    const btn = h('button', { class: 'hintbtn', type: 'button' }, 'צריכים רמז?');
    btn.onclick = () => {
      if (box.firstChild) { box.replaceChildren(); btn.textContent = 'צריכים רמז?'; }
      else { box.append(h('div', { class: 'hint', html: '<b>רמז:</b> ' + text })); btn.textContent = 'הסתרת הרמז'; }
    };
    return h('div', null, btn, box);
  }

  /* מסיים חידה: מציג את ה"אחרי" וכפתור המשך */
  function finish(p, container, done) {
    container.append(h('div', { class: 'callout', html: p.after || '' }));
    container.append(h('div', { class: 'row-actions' },
      h('button', { class: 'btn gold', type: 'button', onclick: done }, 'הבנתי, ממשיכים')));
  }

  /* בלוק בחירה לשימוש חוזר. onRight נקרא כשהתשובה הנכונה נבחרה */
  function choiceBlock(opts, onRight) {
    const order = shuffle(opts, false);
    const list = h('div', { class: 'opts' });
    const fbHolder = h('div');
    let solved = false;
    order.forEach((o, pos) => {
      const item = opts[o.i];
      const b = h('button', { class: 'opt', type: 'button' },
        h('span', { class: 'mark' }, LET[pos]), h('span', null, item.t));
      b.onclick = () => {
        if (solved) return;
        if (item.ok) {
          solved = true;
          b.classList.add('ok');
          [...list.children].forEach((x) => { x.disabled = true; });
          fbHolder.replaceChildren(fbBox('ok', 'נכון. ', item.fb || ''));
          onRight();
        } else {
          b.classList.add('no'); b.disabled = true;
          fbHolder.replaceChildren(fbBox('no', 'עדיין לא. ', item.fb || ''));
        }
      };
      list.append(b);
    });
    return h('div', null, list, fbHolder);
  }

  /* ---------- סוגי חידות ---------- */
  const PUZZLES = {};

  PUZZLES.choice = (p, done) => {
    const root = h('div');
    root.append(choiceBlock(p.opts, () => finish(p, root, done)));
    root.append(hintBlock(p.hint));
    return root;
  };

  PUZZLES.order = (p, done) => {
    const root = h('div');
    const seq = h('ol', { class: 'seq' });
    const pool = h('div', { class: 'pool' });
    const msg = h('div');
    let next = 0, misses = 0;
    const items = shuffle(p.steps, true);
    items.forEach((it) => {
      const b = h('button', { class: 'opt', type: 'button' }, h('span', null, p.steps[it.i]));
      b.onclick = () => {
        if (it.i === next) {
          next++;
          b.remove();
          seq.append(h('li', null, h('span', { class: 'num' }, String(next)), h('span', null, p.steps[it.i])));
          msg.replaceChildren();
          if (next === p.steps.length) {
            poolLabel.remove();
            pool.remove();
            msg.replaceChildren(fbBox('ok', 'הסדר נכון. ', ''));
            finish(p, root, done);
          }
        } else {
          misses++;
          b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
          msg.replaceChildren(fbBox('no', 'זה לא הצעד הבא. ',
            misses >= 3 ? 'נסו לשאול מה חייב לקרות קודם כדי שהצעד הזה יתאפשר.' : 'חשבו שוב על הסדר הסיבתי.'));
        }
      };
      pool.append(b);
    });
    const poolLabel = h('div', { class: 'pool-label' }, 'הקישו על הצעד הבא:');
    root.append(seq, poolLabel, pool, msg, hintBlock(p.hint));
    return root;
  };

  PUZZLES.classify = (p, done) => {
    const root = h('div');
    const n = p.items.length;
    if (!p.items.some((x) => x.g)) p = Object.assign({}, p, { items: shuffle(p.items, false).map((o) => p.items[o.i]) });
    const sel = Array(n).fill(null);
    const locked = Array(n).fill(false);
    const bad = Array(n).fill(false);
    const list = h('div');
    const msg = h('div');
    const check = h('button', { class: 'btn', type: 'button', disabled: true }, 'בדיקה');

    function draw() {
      list.replaceChildren();
      let lastG = null;
      p.items.forEach((it, i) => {
        if (it.g && it.g !== lastG) { list.append(h('div', { class: 'cls-group' }, it.g)); lastG = it.g; }
        const box = h('div', { class: 'cls-item' + (locked[i] ? ' ok' : bad[i] ? ' bad' : '') });
        box.append(h('div', { class: 'name' }, it.t));
        const btns = h('div', { class: 'cls-btns' });
        p.labels.forEach((lab, k) => {
          btns.append(h('button', {
            type: 'button', class: sel[i] === k ? 'on' : '', disabled: locked[i],
            'aria-pressed': sel[i] === k ? 'true' : 'false',
            onclick: () => { sel[i] = k; bad[i] = false; check.disabled = sel.some((v) => v === null); draw(); }
          }, lab));
        });
        box.append(btns);
        if (locked[i]) box.append(h('div', { class: 'why', html: '<b>✓</b> ' + it.why }));
        if (bad[i]) box.append(h('div', { class: 'why', html: '<b>✕</b> לא נכון. בחרו שוב.' }));
        list.append(box);
      });
    }

    check.onclick = () => {
      let wrong = 0;
      p.items.forEach((it, i) => {
        if (locked[i]) return;
        if (sel[i] === it.a) locked[i] = true;
        else { bad[i] = true; sel[i] = null; wrong++; }
      });
      check.disabled = sel.some((v) => v === null);
      draw();
      if (wrong === 0) {
        check.remove();
        msg.replaceChildren(fbBox('ok', 'כל התשובות נכונות. ', ''));
        finish(p, root, done);
      } else {
        const ok = locked.filter(Boolean).length;
        msg.replaceChildren(fbBox('no', ok + ' מתוך ' + n + ' נכונים. ', 'תקנו את הפריטים המסומנים ובדקו שוב.'));
      }
    };
    draw();
    root.append(list, msg, h('div', { class: 'row-actions' }, check), hintBlock(p.hint));
    return root;
  };

  /* סימולציית גלוקוז */
  PUZZLES['glucose-sim'] = (p, done) => {
    const root = h('div');
    const CAP = 55;
    const out = h('div');
    const slider = h('input', { type: 'range', min: '0', max: '100', value: '20', 'aria-label': 'רמת גלוקוז בדם' });
    const q = h('div');
    let asked = false;

    function meter(label, cls) {
      const bar = h('div', { class: 'bar ' + cls }, h('i'));
      const val = h('span');
      return { wrap: h('div', { class: 'meter' }, h('div', { class: 'lbl' }, h('span', null, label), val), bar), bar, val };
    }
    const mFilt = meter('מסונן אל התסנין', 'blood');
    const mReab = meter('נספג חזרה אל הדם', '');
    const mUr = meter('יוצא בשתן', 'urine');
    mReab.bar.append(h('span', { class: 'cap', style: 'inset-inline-start:' + CAP + '%' }));
    const dots = h('div', { class: 'dots', 'aria-hidden': 'true' });
    for (let i = 0; i < 10; i++) dots.append(h('i'));
    const status = h('div', { class: 'sim-status' });

    function upd() {
      const v = +slider.value;
      const reab = Math.min(v, CAP);
      const ur = Math.max(0, v - CAP);
      mFilt.bar.firstChild.style.width = v + '%';
      mReab.bar.firstChild.style.width = reab + '%';
      mUr.bar.firstChild.style.width = ur + '%';
      mFilt.val.textContent = v > 66 ? 'גבוה מאוד' : v > 33 ? 'גבוה' : 'תקין';
      mReab.val.textContent = v > CAP ? 'מרבי' : 'מלא';
      mUr.val.textContent = ur > 0 ? 'יש גלוקוז בשתן' : 'אין';
      const on = Math.round(Math.min(reab / CAP, 1) * 10);
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i < on));
      if (ur > 0) {
        status.textContent = 'הגלוקוז המסונן כבר גדול מכושר הספיגה, והעודף יוצא בשתן.';
        if (!asked) {
          asked = true;
          q.append(h('h4', { style: 'margin:18px 0 8px;font-family:var(--serif);font-size:1.1rem' }, p.question));
          q.append(choiceBlock(p.opts, () => finish(p, q, done)));
          q.append(hintBlock(p.hint));
        }
      } else {
        status.textContent = 'כל הגלוקוז המסונן חוזר אל הדם.';
      }
    }
    slider.addEventListener('input', upd);
    out.append(
      h('div', { class: 'sim' },
        h('div', { class: 'slider-label' }, h('span', null, 'גלוקוז בדם: גבוה'), h('span', null, 'נמוך')),
        slider, mFilt.wrap, mReab.wrap, mUr.wrap,
        h('div', { class: 'meter' }, h('div', { class: 'lbl' }, h('span', null, 'נשאים תפוסים'))), dots, status)
    );
    root.append(out, q);
    upd();
    return root;
  };

  /* סימולציית ADH */
  PUZZLES['adh-sim'] = (p, done) => {
    const root = h('div');
    let idx = 0;
    const slider = h('input', { type: 'range', min: '0', max: '100', value: '50', 'aria-label': 'רמת ADH' });
    const gates = h('div', { class: 'dots gates', 'aria-hidden': 'true' });
    for (let i = 0; i < 8; i++) gates.append(h('i'));
    const mPerm = { bar: h('div', { class: 'bar' }, h('i')), val: h('span') };
    const mVol = { bar: h('div', { class: 'bar urine' }, h('i')), val: h('span') };
    const mCon = { bar: h('div', { class: 'bar blood' }, h('i')), val: h('span') };
    const wrapMeter = (label, m) => h('div', { class: 'meter' }, h('div', { class: 'lbl' }, h('span', null, label), m.val), m.bar);

    function upd() {
      const v = +slider.value;
      const vol = 92 - 0.8 * v, con = 14 + 0.82 * v;
      mPerm.bar.firstChild.style.width = Math.max(4, v) + '%';
      mVol.bar.firstChild.style.width = vol + '%';
      mCon.bar.firstChild.style.width = con + '%';
      mPerm.val.textContent = v > 66 ? 'גבוהה' : v > 33 ? 'בינונית' : 'נמוכה';
      mVol.val.textContent = vol > 66 ? 'רב' : vol > 40 ? 'בינוני' : 'מועט';
      mCon.val.textContent = con > 66 ? 'מרוכז' : con > 40 ? 'בינוני' : 'דליל';
      const on = Math.round(v / 100 * 8);
      [...gates.children].forEach((g, i) => g.classList.toggle('on', i < on));
    }
    slider.addEventListener('input', upd);

    const scen = h('div', { class: 'scenario' });
    const msg = h('div');
    const ok = h('button', { class: 'btn', type: 'button' }, 'אישור');
    const actions = h('div', { class: 'row-actions' }, ok);

    function showScenario() { scen.textContent = (idx + 1) + '/' + p.scenarios.length + ' · ' + p.scenarios[idx].text; }
    ok.onclick = () => {
      const s = p.scenarios[idx];
      if (s.ok(+slider.value)) {
        msg.replaceChildren(fbBox('ok', 'נכון. ', s.yes));
        idx++;
        if (idx >= p.scenarios.length) {
          ok.remove(); scen.remove();
          finish(p, root, done);
        } else {
          ok.disabled = true;
          setTimeout(() => { ok.disabled = false; showScenario(); msg.replaceChildren(); }, 1600);
          showScenario();
        }
      } else {
        msg.replaceChildren(fbBox('no', 'לא מתאים. ', s.no));
      }
    };
    showScenario();
    root.append(
      scen,
      h('div', { class: 'sim' },
        h('div', { class: 'slider-label' }, h('span', null, 'ADH גבוה'), h('span', null, 'ADH נמוך')),
        slider,
        h('div', { class: 'meter' }, h('div', { class: 'lbl' }, h('span', null, 'תעלות מים פתוחות בצינור המאסף'))), gates,
        wrapMeter('חדירות הצינור למים', mPerm),
        wrapMeter('נפח השתן', mVol),
        wrapMeter('ריכוז השתן', mCon)),
      msg, actions);
    upd();
    return root;
  };

  /* לולאת הנלה */
  function loopSvg(state) {
    // state 0: לפני, 1: אחרי היורדת, 2: אחרי העולה
    const cls = 's' + state;
    return `
<svg class="loop-svg ${cls}" viewBox="0 0 320 340" role="img" aria-label="תרשים לולאת הנלה: הצינורית יורדת אל הליבה ועולה חזרה">
  <style>
    .loop-svg { --c0: var(--conc-mid); --c1: var(--conc-hi); --c2: var(--conc-lo); }
    .loop-svg .t-d1 { stop-color: var(--c0); } .loop-svg .t-d2 { stop-color: var(--c0); }
    .loop-svg .t-b  { stroke: var(--c0); }
    .loop-svg .t-a1 { stop-color: var(--c0); } .loop-svg .t-a2 { stop-color: var(--c0); }
    .loop-svg.s1 .t-d2, .loop-svg.s2 .t-d2 { stop-color: var(--c1); }
    .loop-svg.s1 .t-b,  .loop-svg.s2 .t-b  { stroke: var(--c1); }
    .loop-svg.s1 .t-a1, .loop-svg.s1 .t-a2 { stop-color: var(--c1); }
    .loop-svg.s2 .t-a1 { stop-color: var(--c1); } .loop-svg.s2 .t-a2 { stop-color: var(--c2); }
    .loop-svg .fx-w, .loop-svg .fx-s { opacity: 0; transition: opacity .5s; }
    .loop-svg.s1 .fx-w, .loop-svg.s2 .fx-w { opacity: 1; }
    .loop-svg.s2 .fx-s { opacity: 1; }
    .loop-svg text { font-family: var(--sans); fill: var(--ink); }
  </style>
  <defs>
    <linearGradient id="gInt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--conc-mid)" stop-opacity=".35"/>
      <stop offset="1" stop-color="var(--conc-hi)" stop-opacity=".55"/>
    </linearGradient>
    <linearGradient id="gD" gradientUnits="userSpaceOnUse" x1="0" y1="50" x2="0" y2="250">
      <stop class="t-d1" offset="0"/><stop class="t-d2" offset="1"/>
    </linearGradient>
    <linearGradient id="gA" gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2="50">
      <stop class="t-a1" offset="0"/><stop class="t-a2" offset="1"/>
    </linearGradient>
  </defs>
  <rect x="10" y="50" width="300" height="250" rx="14" fill="url(#gInt)"/>
  <line x1="10" y1="50" x2="310" y2="50" stroke="var(--line)" stroke-dasharray="4 4"/>
  <text x="300" y="42" text-anchor="start" font-size="12" fill="var(--muted)" style="fill:var(--muted)">קליפה</text>
  <text x="300" y="320" text-anchor="start" font-size="12" style="fill:var(--muted)">ליבה: מלוחה יותר ככל שיורדים</text>
  <path d="M110 50 V250" stroke="url(#gD)" stroke-width="34" fill="none"/>
  <path d="M110 250 a50 50 0 0 0 100 0" class="t-b" stroke-width="34" fill="none"/>
  <path d="M210 250 V50" stroke="url(#gA)" stroke-width="34" fill="none"/>
  <path d="M93 50 V250 a67 67 0 0 0 134 0 V50 M127 50 V250 a33 33 0 0 0 66 0 V50" stroke="var(--ink)" stroke-opacity=".5" stroke-width="1.5" fill="none"/>
  <text x="110" y="30" text-anchor="middle" font-size="13" font-weight="700">זרוע יורדת</text>
  <text x="210" y="30" text-anchor="middle" font-size="13" font-weight="700">זרוע עולה</text>
  <g class="fx-w" stroke="var(--filtrate)" fill="var(--filtrate)">
    <path d="M90 100 H48 M90 150 H48 M90 200 H48" stroke-width="2.4"/>
    <path d="M48 95 l-8 5 8 5z M48 145 l-8 5 8 5z M48 195 l-8 5 8 5z" stroke="none"/>
    <text x="52" y="128" text-anchor="middle" font-size="12" stroke="none" style="fill:var(--filtrate)">מים יוצאים</text>
  </g>
  <g class="fx-s" stroke="var(--urine)" fill="var(--urine)">
    <path d="M230 100 H272 M230 150 H272 M230 200 H272" stroke-width="2.4"/>
    <path d="M272 95 l8 5 -8 5z M272 145 l8 5 -8 5z M272 195 l8 5 -8 5z" stroke="none"/>
    <text x="268" y="128" text-anchor="middle" font-size="12" stroke="none" style="fill:var(--urine)">Na⁺ ו-Cl⁻ יוצאים</text>
  </g>
</svg>
<div style="display:flex;gap:6px;align-items:center;font-size:.85rem;color:var(--muted);margin-top:6px;justify-content:center">
  <span>דליל</span>
  <span style="display:inline-block;width:120px;height:10px;border-radius:99px;background:linear-gradient(to left,var(--conc-lo),var(--conc-mid),var(--conc-hi))"></span>
  <span>מרוכז</span>
</div>`;
  }

  PUZZLES.loop = (p, done) => {
    const root = h('div');
    let step = 0;
    const figure = h('div', { class: 'figure', html: loopSvg(0) });
    const area = h('div');
    root.append(figure, area);

    function setState(s) {
      const svg = figure.querySelector('svg');
      if (svg) svg.setAttribute('class', 'loop-svg s' + s);
    }
    function showStep() {
      area.replaceChildren();
      const st = p.steps[step];
      area.append(h('div', { class: 'scenario' }, 'שלב ' + (step + 1) + ' מתוך ' + p.steps.length + ' · ' + st.q));
      area.append(choiceBlock(st.opts, () => {
        if (step === 0) setState(1);
        if (step === 1) setState(2);
        const row = h('div', { class: 'row-actions' });
        if (step + 1 < p.steps.length) {
          row.append(h('button', { class: 'btn', type: 'button', onclick: () => { step++; showStep(); } }, 'לשלב הבא'));
        } else {
          finish(p, area, done);
          return;
        }
        area.append(row);
      }));
    }
    showStep();
    root.append(hintBlock(p.hint));
    return root;
  };

  /* ---------- תצוגות ---------- */
  function twoRiversSvg() {
    return `
<svg viewBox="0 0 320 210" role="img" aria-label="שני זרמים: דם ונוזל הצינורית, עם שלושה מעברים ביניהם: סינון, ספיגה חוזרת והפרשה">
  <rect x="8" y="14" width="304" height="52" rx="12" style="fill:var(--blood-soft);stroke:var(--blood)" stroke-width="1.6"/>
  <text x="300" y="46" text-anchor="start" font-size="14" font-weight="700" style="fill:var(--blood);font-family:var(--sans)">דם (נימי הכליה)</text>
  <rect x="8" y="144" width="304" height="52" rx="12" style="fill:var(--filtrate-soft);stroke:var(--filtrate)" stroke-width="1.6"/>
  <text x="300" y="176" text-anchor="start" font-size="14" font-weight="700" style="fill:var(--filtrate);font-family:var(--sans)">נוזל הצינורית</text>
  <text x="40" y="176" text-anchor="middle" font-size="13" style="fill:var(--urine);font-family:var(--sans);font-weight:700">⟵ שתן</text>
  <g style="stroke:var(--ink);fill:var(--ink)">
    <path d="M232 70 V138" stroke-width="2.4"/><path d="M226 134 l6 10 6-10z" stroke="none"/>
    <path d="M150 140 V76" stroke-width="2.4"/><path d="M144 80 l6-10 6 10z" stroke="none"/>
    <path d="M68 70 V138" stroke-width="2.4"/><path d="M62 134 l6 10 6-10z" stroke="none"/>
  </g>
  <g font-size="13" font-weight="700" style="fill:var(--ink);font-family:var(--sans)" text-anchor="middle">
    <text x="232" y="110" dx="-34">סינון</text>
    <text x="150" y="110" dx="-48">ספיגה חוזרת</text>
    <text x="68" y="110" dx="-26">הפרשה</text>
  </g>
</svg>`;
  }

  function viewIntro() {
    const root = h('div');
    root.append(h('section', { class: 'hero' }, h('div', { class: 'wrap' },
      h('div', { class: 'kicker' }, 'חדר בריחה במדעי הבריאות · כיתה י״א'),
      h('h1', null, 'מסע בתוך הנפרון'),
      h('p', { class: 'sub' }, 'חמישה חדרים. אזור אחד בנפרון בכל חדר. דרך אחת החוצה.'))));

    const wrap = h('div', { class: 'wrap' });
    wrap.append(h('p', { class: 'scene', html: 'הכליות מסננות בכל יממה כ-180 ליטר נוזל, ומוציאות מן הגוף כ-1.5 ליטר שתן בלבד. בין שני המספרים האלה מתרחש כל הסיפור.' }));
    wrap.append(h('p', { html: 'אתם נכנסים לכליה עם זרם הדם, דרך עורק הכליה, ועליכם לעבור את כל הנפרון: מן הפקעית ועד היציאה לדרכי השתן. כל חדר הוא אזור אחד בנפרון, והוא נעול עד שתפתרו את החידות שבו. בסוף כל חדר תקבלו הסבר מסודר על האזור שבו הייתם.' }));
    wrap.append(h('h2', { style: 'font-size:1.3rem;margin:26px 0 6px' }, 'המפה שתלווה אתכם לאורך כל הדרך'));
    wrap.append(h('p', { html: 'בכל חדר תחזרו לשני זרמים: <b style="color:var(--blood)">דם</b> ו<b style="color:var(--filtrate)">נוזל הצינורית</b>, ולשלושה מעברים ביניהם. מי שמבין לאן חומר נע, ובאיזה תהליך, מבין את הנפרון.' }));
    wrap.append(h('div', { class: 'card figure', html: twoRiversSvg() }));
    wrap.append(h('ul', { html:
      '<li><b>סינון:</b> מן הדם אל הצינורית, בפקעית.</li>' +
      '<li><b>ספיגה חוזרת:</b> מן הצינורית חזרה אל הדם.</li>' +
      '<li><b>הפרשה:</b> מן הדם אל הצינורית, אחרי הפקעית.</li>' }));

    wrap.append(h('h2', { style: 'font-size:1.3rem;margin:26px 0 6px' }, 'לפני שנכנסים: שלוש שאלות, בלי ציון'));
    wrap.append(h('p', { style: 'color:var(--muted)' }, 'ענו לפי מה שאתם חושבים עכשיו. בסוף המסע נחזור אליהן.'));

    const enter = h('button', { class: 'btn gold', type: 'button', disabled: true }, 'כניסה לחדר הראשון');
    const refresh = () => { enter.disabled = !PRE.every((q) => S.pre[q.id] != null); };

    PRE.forEach((q, qi) => {
      const card = h('div', { class: 'card' }, h('div', { class: 'puzzle-tag' }, 'שאלה ' + (qi + 1)), h('p', { style: 'font-weight:600' }, q.q));
      const list = h('div', { class: 'opts' });
      q.opts.forEach((t, i) => {
        const b = h('button', { class: 'opt' + (S.pre[q.id] === i ? ' picked' : ''), type: 'button' },
          h('span', { class: 'mark' }, LET[i]), h('span', null, t));
        b.onclick = () => {
          S.pre[q.id] = i; save();
          [...list.children].forEach((x, k) => x.classList.toggle('picked', k === i));
          refresh();
        };
        list.append(b);
      });
      card.append(list);
      wrap.append(card);
    });

    enter.onclick = () => { S.started = true; save(); go('#/room/1'); };
    refresh();
    wrap.append(h('div', { class: 'row-actions' }, enter));
    if (S.started) {
      wrap.append(h('p', { style: 'margin-top:14px' }, h('a', { href: frontier() }, 'להמשיך מהמקום שבו הפסקתם')));
    }
    wrap.append(h('p', { class: 'foot' }, 'מבוסס על ספר המגמה נפרולוגיה, ערך וארגן אורי העליון.'));
    root.append(wrap);
    return root;
  }

  function viewRoom(n) {
    const room = ROOMS[n - 1];
    const root = h('div');
    root.append(h('section', { class: 'hero' }, h('div', { class: 'wrap' },
      h('div', { class: 'hero-row' },
        h('div', { class: 'hero-icon', html: ICON[room.icon] }),
        h('div', null,
          h('div', { class: 'kicker' }, 'חדר ' + n + ' מתוך ' + N),
          h('h1', null, room.title),
          h('p', { class: 'sub' }, room.place))))));

    const wrap = h('div', { class: 'wrap' });
    wrap.append(h('p', { class: 'scene' }, room.scene));
    wrap.append(h('p', { class: 'objective', html: room.objective }));
    const body = h('div');
    if (n > 1 || S.keys[n]) {
      const top = h('div', { class: 'row-actions', style: 'margin:0 0 18px' });
      if (n > 1) top.append(h('button', { class: 'btn ghost', type: 'button', onclick: () => go('#/room/' + (n - 1)) }, '→ חדר ' + (n - 1) + ': ' + ROOMS[n - 2].title));
      if (S.keys[n]) top.append(h('button', { class: 'btn ghost', type: 'button', onclick: () => { const e = document.querySelector('.explain'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'קפיצה להסבר החדר'));
      wrap.append(top);
    }
    wrap.append(body);
    root.append(wrap);

    let justUnlocked = false;

    function refreshRoom(scrollToNext) {
      body.replaceChildren();
      const solved = S.solved[n] || (S.solved[n] = {});
      let activeEl = null;
      let allDone = true;

      room.puzzles.forEach((p, i) => {
        const tag = 'חידה ' + (i + 1) + ' מתוך ' + room.puzzles.length;
        if (solved[p.id]) {
          body.append(h('details', { class: 'solved-puzzle' },
            h('summary', null, h('span', { class: 'tick' }, '✓'), p.title),
            h('div', { class: 'body', html: p.after || '' })));
        } else if (allDone) {
          allDone = false;
          const card = h('section', { class: 'card puzzle', style: 'scroll-margin-top:70px' },
            h('div', { class: 'puzzle-tag' }, tag),
            h('h3', null, p.title),
            h('p', { class: 'prompt' }, p.prompt));
          card.append(PUZZLES[p.type](p, () => {
            solved[p.id] = true;
            const last = room.puzzles.every((q) => solved[q.id]);
            if (last && !S.keys[n]) { S.keys[n] = true; justUnlocked = true; }
            save(); updateChrome(n); refreshRoom(true);
          }));
          body.append(card);
          activeEl = card;
        } else {
          body.append(h('div', { class: 'puzzle-tag', style: 'opacity:.6;margin:6px 4px' }, '🔒 ' + tag + ' · ' + p.title));
        }
      });

      if (allDone) {
        const un = h('section', { class: 'unlock' + (justUnlocked ? ' pop' : ''), style: 'scroll-margin-top:70px' },
          h('div', { class: 'bigkey', html: ICON.key }),
          h('h2', null, n < N ? 'הדלת נפתחה' : 'הדלת האחרונה נפתחה'),
          h('p', null, 'המפתח של חדר ' + n + ' אצלכם. עכשיו אפשר להבין מה בעצם עברתם.'));
        body.append(un);
        const ex = h('section', { class: 'explain' },
          h('h2', { class: 'explain-title' }, 'מה היה בחדר הזה'));
        ex.insertAdjacentHTML('beforeend', room.explain);
        body.append(ex);
        const nav = h('div', { class: 'next' });
        if (n > 1) nav.append(h('button', { class: 'btn ghost', type: 'button', onclick: () => go('#/room/' + (n - 1)) }, '→ לחדר הקודם'));
        if (n < N) nav.append(h('button', { class: 'btn gold', type: 'button', onclick: () => go('#/room/' + (n + 1)) }, 'לחדר הבא'));
        else nav.append(h('button', { class: 'btn gold', type: 'button', onclick: () => go('#/final') }, 'ליציאה ולסיכום'));
        body.append(nav);
        if (scrollToNext) un.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        if (!S.openAll) {
          const holder = h('div');
          const tgl = h('button', { class: 'btn ghost', type: 'button', 'aria-expanded': 'false' }, 'לקרוא קודם את ההסבר על האזור');
          tgl.onclick = () => {
            if (holder.firstChild) { holder.replaceChildren(); tgl.textContent = 'לקרוא קודם את ההסבר על האזור'; tgl.setAttribute('aria-expanded', 'false'); }
            else {
              const ex = h('section', { class: 'explain' }, h('h2', { class: 'explain-title' }, 'על האזור הזה'));
              ex.insertAdjacentHTML('beforeend', room.explain);
              holder.append(ex); tgl.textContent = 'הסתרת ההסבר וחזרה לחידות'; tgl.setAttribute('aria-expanded', 'true');
            }
          };
          body.append(h('div', { class: 'row-actions', style: 'margin:0 0 14px' }, tgl), holder);
        }
        if (S.openAll) {
          const ex = h('section', { class: 'explain' }, h('h2', { class: 'explain-title' }, 'מה היה בחדר הזה (מצב עיון)'));
          ex.insertAdjacentHTML('beforeend', room.explain);
          body.append(ex);
          const nav = h('div', { class: 'next' });
          if (n > 1) nav.append(h('button', { class: 'btn ghost', type: 'button', onclick: () => go('#/room/' + (n - 1)) }, '→ לחדר הקודם'));
          nav.append(h('button', { class: 'btn gold', type: 'button', onclick: () => go(n < N ? '#/room/' + (n + 1) : '#/final') }, n < N ? 'לחדר הבא' : 'לסיכום'));
          body.append(nav);
        }
        if (scrollToNext && activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    refreshRoom(false);
    return root;
  }

  function viewFinal() {
    const root = h('div');
    root.append(h('section', { class: 'hero' }, h('div', { class: 'wrap' },
      h('div', { class: 'kicker' }, 'יצאתם מן הנפרון'),
      h('h1', null, 'סיכום ושאלות בחינה'),
      h('p', { class: 'sub' }, 'כל חמשת המפתחות אצלכם.'))));
    const wrap = h('div', { class: 'wrap' });

    wrap.append(h('h2', { class: 'explain-title', style: 'margin-top:30px' }, 'המסע בקצרה'));
    wrap.append(h('p', { html: 'כ-180 ליטר תסנין ביממה נכנסים אל הצינוריות, וכ-1.5 ליטר שתן יוצאים. ההפרש חוזר לדם. כך נראה מסע הנוזל:' }));
    wrap.append(h('div', { class: 'explain' }, h('div', { html: fig('journey.jpg', 'מסע התסנין: תהליך יצירת השתן בנפרון.') })));
    wrap.append(h('ol', { html:
      '<li><b>הפקעית:</b> סינון פסיבי לפי גודל ומטען; נוצר תסנין, ללא חלבונים ותאי דם.</li>' +
      '<li><b>הצינורית המקורבת:</b> עיקר הספיגה החוזרת: כ-65% מן המים והנתרן, וכמעט כל הגלוקוז וחומצות האמינו.</li>' +
      '<li><b>לולאת הנלה:</b> היורדת מאבדת מים והעולה מאבדת מלחים; נוצר מפל ריכוזים בליבה.</li>' +
      '<li><b>המרוחקת והמאספת:</b> כוונון: ספיגת נתרן, הפרשת אשלגן ומימן (אלדוסטרון), וספיגת מים בהשפעת ADH.</li>' +
      '<li><b>דרכי השתן:</b> הולכה ואגירה, בלי שינוי בהרכב.</li>' }));

    wrap.append(h('div', { class: 'explain', html: fig('three-processes.jpg', 'שלושת התהליכים ונוסחת האיזון.') }));
    wrap.append(h('div', { class: 'callout' , html:
      '<p><b>ארבע שאלות לכל חומר</b> שאתם פוגשים בנפרון:</p><ol>' +
      '<li>איפה החומר נמצא עכשיו: בדם או בנוזל הצינורית?</li>' +
      '<li>לאיזה כיוון הוא נע?</li>' +
      '<li>באיזה תהליך: סינון, ספיגה חוזרת או הפרשה?</li>' +
      '<li>מה המשמעות להרכב ולנפח השתן ולשמירה על הומאוסטזיס?</li></ol>' }));

    wrap.append(h('h3', { style: 'font-size:1.2rem;margin:26px 0 6px' }, 'מסלול החומרים'));
    const tb = h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, h('th', null, 'חומר'), h('th', null, 'ספיגה חוזרת'), h('th', null, 'הפרשה'))),
      h('tbody', null, SUBSTANCE_TABLE.map((r) => h('tr', null, h('th', null, r[0]), h('td', null, r[1]), h('td', null, r[2])))));
    wrap.append(h('div', { class: 'tbl-scroll' }, tb));

    /* השוואה לניבוי הראשוני */
    if (PRE.some((q) => S.pre[q.id] != null)) {
      wrap.append(h('h3', { style: 'font-size:1.2rem;margin:26px 0 6px' }, 'מה חשבתם בכניסה, ומה אתם יודעים עכשיו'));
      const cmp = h('div', { class: 'compare' });
      PRE.forEach((q) => {
        if (S.pre[q.id] == null) return;
        const was = q.opts[S.pre[q.id]];
        const right = S.pre[q.id] === q.right;
        cmp.append(h('div', { class: 'cmp' },
          h('div', { class: 'q' }, q.q),
          h('div', { class: 'a', html: '<b>בכניסה ענית:</b> ' + was + (right ? ' (נכון)' : ' (השתנה)') }),
          h('div', { class: 'a', html: '<b>התשובה המדעית:</b> ' + q.sci })));
      });
      wrap.append(cmp);
    }

    /* מבחן */
    wrap.append(h('h2', { class: 'explain-title', style: 'margin-top:40px' }, 'חמש שאלות בסגנון הבחינה'));
    wrap.append(h('p', { style: 'color:var(--muted)' }, 'לכל שאלה תשובה נכונה אחת. אחרי כל תשובה תקבלו הסבר.'));
    const scoreBox = h('div');
    function renderScore() {
      scoreBox.replaceChildren();
      const answered = Object.keys(S.exam).length;
      if (answered < EXAM.length) return;
      const sc = EXAM.filter((q, i) => S.exam[i] === q.right).length;
      scoreBox.append(h('div', { class: 'card', style: 'text-align:center' },
        h('div', { class: 'score' }, sc + ' / ' + EXAM.length),
        h('p', null, sc === EXAM.length ? 'כל הכבוד. המנגנון מובן, ולא רק נזכר.' :
          sc >= 3 ? 'בסיס טוב. כדאי לחזור לחדרים שבהם טעיתם ולקרוא שוב את ההסבר.' :
          'כדאי לחזור לחדרים ולקרוא את ההסברים, ואז לנסות שוב.'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { S.exam = {}; save(); render(); } }, 'לנסות שוב')));
    }
    EXAM.forEach((q, qi) => {
      const card = h('section', { class: 'card final-q' },
        h('div', { class: 'qno' }, 'שאלה ' + (qi + 1) + ' מתוך ' + EXAM.length),
        h('div', { class: 'qtext' }, q.q));
      const list = h('div', { class: 'opts' });
      const fbh = h('div');
      const answered = S.exam[qi] != null;
      q.opts.forEach((t, i) => {
        const b = h('button', { class: 'opt', type: 'button', disabled: answered },
          h('span', { class: 'mark' }, LET[i]), h('span', null, t));
        if (answered) {
          if (i === q.right) b.classList.add('ok');
          else if (i === S.exam[qi]) b.classList.add('no');
        }
        b.onclick = () => {
          S.exam[qi] = i; save();
          [...list.children].forEach((x, k) => {
            x.disabled = true;
            if (k === q.right) x.classList.add('ok');
            else if (k === i) x.classList.add('no');
          });
          fbh.replaceChildren(fbBox(i === q.right ? 'ok' : 'no', i === q.right ? 'נכון. ' : 'לא נכון. ', q.exp));
          renderScore();
        };
        list.append(b);
      });
      if (answered) fbh.append(fbBox(S.exam[qi] === q.right ? 'ok' : 'no', S.exam[qi] === q.right ? 'נכון. ' : 'לא נכון. ', q.exp));
      card.append(list, fbh);
      wrap.append(card);
    });
    wrap.append(scoreBox);
    renderScore();

    wrap.append(h('details', { class: 'more' },
      h('summary', null, 'מילון מונחים: עברית ואנגלית'),
      h('div', { class: 'in' }, h('div', { class: 'terms', html: GLOSSARY.map((g) => term(g[0], g[1])).join('') }),
        h('p', { style: 'margin-top:12px;color:var(--muted);font-size:.92rem' }, 'בספר המגמה משתמשים לסירוגין ב״אבובית״ וב״צינורית״; שניהם אותו דבר.'))));

    wrap.append(h('div', { class: 'next' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => go('#/room/1') }, 'חזרה לחדר הראשון'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => {
        if (confirm('להתחיל את כל המסע מחדש?')) { S = fresh(); save(); go('#/intro'); }
      } }, 'להתחיל מחדש')));
    wrap.append(h('p', { class: 'foot' }, 'מבוסס על ספר המגמה נפרולוגיה, ערך וארגן אורי העליון.'));
    root.append(wrap);
    return root;
  }

  /* ---------- רינדור ---------- */
  function render() {
    closeMenu();
    const m = location.hash.match(/^#\/(intro|final|room\/(\d))$/);
    let view = m ? m[1] : null;
    let n = m && m[2] ? +m[2] : null;
    if (!view) { location.replace(frontier()); return; }
    if (view.startsWith('room')) {
      if (!n || n < 1 || n > N || !canEnter(n)) { location.replace(frontier()); return; }
      view = 'room';
    } else if (view === 'final' && !canFinal()) { location.replace(frontier()); return; }

    app.replaceChildren();
    window.scrollTo(0, 0);
    if (view === 'intro') { app.append(viewIntro()); updateChrome(null); document.title = 'מסע בתוך הנפרון'; }
    else if (view === 'room') { app.append(viewRoom(n)); updateChrome(n); document.title = 'חדר ' + n + ' · ' + ROOMS[n - 1].title; }
    else { app.append(viewFinal()); updateChrome(null); document.title = 'סיכום · מסע בתוך הנפרון'; }
  }

  buildChrome();
  window.addEventListener('hashchange', render);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  if (!location.hash) location.replace(frontier()); else render();
})();


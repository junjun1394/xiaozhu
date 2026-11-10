/* ============================================================
   小住 · chat.js
   聊天：渲染 / 发送 / 打字模拟 / 主动消息
   ============================================================ */
(function () {
  'use strict';
  const XZ = window.XZ;
  const $ = XZ.$, time = XZ.time;
  const esc = XZ.esc;

  let runId = 0;           // 用于切换人设时中断上一条回复
  let typingEl = null;
  let busy = false;        // 是否正在生成回复

  const list = () => $('#chatScroll');
  const body = () => $('.chat-body');

  function timeLabel(ts) {
    const d = new Date(ts), now = new Date();
    const same = d.toDateString() === now.toDateString();
    const y = new Date(now.getTime() - 864e5).toDateString() === d.toDateString();
    if (same) return time.fmtClock(d);
    if (y) return '昨天 ' + time.fmtClock(d);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + time.fmtClock(d);
  }

  function avatarHTML(p, cls) {
    return XZ.avatarHTML(p, cls);
  }

  function render(p, opts) {
    opts = opts || {};
    const box = list();
    if (!box) return;
    const bodyEl = body();
    const nearBottom = !bodyEl || (bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight < 90);
    const msgs = (p.chat && p.chat.msgs) || [];
    let html = '';
    let prevTs = 0, prevFrom = null;
    msgs.forEach((m) => {
      if (m.from === 'sys') {
        html += '<div class="sys-note">' + esc(m.text) + '</div>';
        prevFrom = null; prevTs = 0;
        return;
      }
      const gap = prevTs ? m.ts - prevTs : 1e9;
      const newDay = prevTs && time.dayKey(prevTs) !== time.dayKey(m.ts);
      if (!prevTs || gap > 5 * 60e3 || newDay) {
        html += '<div class="msg-time">' + timeLabel(m.ts) + '</div>';
      }
      const stack = !!prevTs && prevFrom === m.from && gap < 2 * 60e3;
      const cls = 'msg-row ' + (m.from === 'me' ? 'me' : 'ta') + (stack ? ' stack' : '');
      if (m.from === 'ta') {
        html += '<div class="' + cls + '">' + avatarHTML(p) + '<div class="bubble">' + esc(m.text) + '</div></div>';
      } else {
        html += '<div class="' + cls + '"><div class="bubble">' + esc(m.text) + '</div></div>';
      }
      prevTs = m.ts; prevFrom = m.from;
    });
    box.innerHTML = html;
    if (typingEl) { box.appendChild(typingEl); }
    if (opts.forceBottom || nearBottom) scrollBottom(false);
    updateToBottom();
  }

  function scrollBottom(smooth) {
    const b = body();
    if (!b) return;
    requestAnimationFrame(() => {
      b.scrollTo({ top: b.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
  }

  function updateToBottom() {
    const b = body(), btn = $('#toBottom');
    if (!b || !btn) return;
    const far = b.scrollHeight - b.scrollTop - b.clientHeight > 260;
    btn.hidden = !far;
  }

  function showTyping(p) {
    const box = list();
    if (!box) return;
    if (!typingEl) {
      typingEl = document.createElement('div');
      typingEl.className = 'msg-row ta';
      typingEl.innerHTML = avatarHTML(p) + '<div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div>';
      box.appendChild(typingEl);
      scrollBottom(true);
    }
  }
  function hideTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  function delayFor(text) {
    const n = String(text || '').length;
    return XZ.clamp(420 + n * 55 + Math.random() * 320, 560, 2400);
  }

  function setStatus(text, live) {
    const el = $('#chatStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('live', !!live);
  }
  function idleStatus(p) {
    const mins = (Date.now() - (p.lastTaAt || Date.now())) / 60000;
    if (mins < 3) return '刚刚在线';
    if (mins < 60) return Math.floor(mins) + ' 分钟前在线';
    return '在忙';
  }

  function refreshHead(p) {
    $('#chatName').textContent = p.name;
    const av = $('#chatAvatar');
    if (av) {
      av.style.cssText = XZ.avatarStyle(p);
      av.textContent = XZ.avatarText(p);
    }
    setStatus(idleStatus(p), false);
  }

  function addMsg(p, from, text, ts) {
    const msg = { id: XZ.uid('c'), from, text, ts: ts || Date.now() };
    p.chat.msgs.push(msg);
    p.chat.lastAt = msg.ts;
    if (from === 'ta') p.lastTaAt = msg.ts;
    if (p.chat.msgs.length > 800) p.chat.msgs = p.chat.msgs.slice(-800);
    XZ.store.save();
    return msg;
  }

  function addSys(p, text) {
    p.chat.msgs.push({ id: XZ.uid('c'), from: 'sys', text, ts: Date.now() });
    XZ.store.save();
  }

  /* ---------------- 送达 TA 的话 ---------------- */
  async function deliver(p, bubbles, opts) {
    opts = opts || {};
    if (!bubbles || !bubbles.length) { busy = false; return; }
    const myRun = ++runId;
    busy = true;
    for (let i = 0; i < bubbles.length; i++) {
      if (myRun !== runId) break;
      showTyping(p);
      setStatus('正在输入…', true);
      await XZ.sleep(delayFor(bubbles[i]));
      if (myRun !== runId) break;
      hideTyping();
      addMsg(p, 'ta', bubbles[i]);
      if (XZ.currentApp === 'chat' && XZ.state.activeId === p.id) {
        render(p);
        p.chat.unread = 0;
      }
      if (i < bubbles.length - 1) await XZ.sleep(280 + Math.random() * 420);
    }
    hideTyping();
    if (myRun !== runId) { busy = false; return; }
    setStatus(idleStatus(p), false);
    applyEffect(p, opts.effect);
    if (opts.memoryNote) addSys(p, opts.memoryNote);
    render(p);
    XZ.store.save();
    busy = false;
    if (XZ.shell && XZ.shell.afterChat) XZ.shell.afterChat(p);
  }

  function applyEffect(p, eff) {
    if (!eff) return;
    const before = p.bond;
    p.bond = XZ.clamp(p.bond + (eff.bond || 0), 0, 100);
    p.mood = XZ.clamp(p.mood + (eff.mood || 0), -5, 5);
    [[30, '你们熟了一点。'], [62, 'TA 开始主动找你了。'], [88, 'TA 现在会记得你说过的大部分话。']].forEach((m) => {
      if (before < m[0] && p.bond >= m[0]) addSys(p, m[1]);
    });
  }

  /* ---------------- 发送 ---------------- */
  async function send(text) {
    const p = XZ.activePersona();
    if (!p) return;
    const t = String(text || '').trim();
    if (!t) return;
    if (busy) {
      // 用户插话：打断还没说完的那几条，直接处理新消息
      runId++;
      busy = false;
      hideTyping();
    }
    addMsg(p, 'me', t);
    render(p, { forceBottom: true });
    autoGrow($('#chatInput'));
    p.chat.todayCount = (p.chat.todayCount || 0) + 1;
    if (XZ.shell && XZ.shell.bumpStreak) XZ.shell.bumpStreak(p);

    const memBefore = (p.memories || []).length;
    const res = await XZ.engine.reply(p, t);
    if (!res || !res.bubbles || !res.bubbles.length) { busy = false; hideTyping(); return; }
    let memoryNote = '';
    if ((p.memories || []).length > memBefore) {
      const last = p.memories[p.memories.length - 1];
      memoryNote = '（TA 记下了：' + (last.kind === 'like' ? '你喜欢' + last.text
        : last.kind === 'dislike' ? '你不太喜欢' + last.text
        : last.kind === 'plan' ? '你' + last.text
        : last.kind === 'event' ? '你' + last.text : last.text) + '）';
    }
    if (res.warn) XZ.shell.toast(res.warn, 4200);
    await deliver(p, res.bubbles, { effect: res.effect, memoryNote });
  }

  /* ---------------- 打开 / 关闭 ---------------- */
  function mount(p) {
    abort();
    refreshHead(p);
    render(p, { forceBottom: true });
    p.chat.unread = 0;
    XZ.store.save();
    if (XZ.shell && XZ.shell.refreshBadge) XZ.shell.refreshBadge();
    setTimeout(() => {
      const input = $('#chatInput');
      if (input && window.innerWidth > 520) input.focus({ preventScroll: true });
    }, 380);
  }

  /* 打断：切角色、清空、离开时用，避免旧的回复串到新角色身上 */
  function abort() {
    runId++;
    busy = false;
    hideTyping();
    if (XZ.engine && XZ.engine.abort) XZ.engine.abort();
    setStatus('', false);
  }

  /* 打开聊天时：补开场白 / 久别第一句 */
  function onOpen(p) {
    if (!p.chat.msgs.length) {
      const bubbles = XZ.engine.opening(p);
      addMsg(p, 'ta', bubbles[0]);
      render(p);
      deliver(p, bubbles.slice(1), {});
      return;
    }
    const last = p.chat.msgs[p.chat.msgs.length - 1];
    const hours = (Date.now() - last.ts) / 36e5;
    if (hours > 2.5 && last.from === 'me') {
      const bubbles = XZ.engine.gapLine(p, hours);
      deliver(p, bubbles, {});
    } else if (hours > 6 && chance(0.5)) {
      deliver(p, XZ.engine.proactive(p), {});
    }
  }

  function chance(v) { return Math.random() < v; }

  /* ---------------- 主动消息（外部调用） ---------------- */
  async function proactive(p, opts) {
    if (busy) return false;
    const bubbles = XZ.engine.proactive(p);
    const isOpen = XZ.currentApp === 'chat' && XZ.state.activeId === p.id;
    if (isOpen) {
      deliver(p, bubbles, {});
    } else {
      const first = bubbles[0];
      addMsg(p, 'ta', first);
      if (bubbles[1]) setTimeout(() => { addMsg(p, 'ta', bubbles[1]); XZ.store.save(); if (XZ.shell.bumpBadge) XZ.shell.bumpBadge(); }, 2600);
      p.chat.unread = (p.chat.unread || 0) + 1;
      XZ.store.save();
      if (XZ.shell.onProactive) XZ.shell.onProactive(p, first);
    }
    return true;
  }

  /* ---------------- 输入框 ---------------- */
  function autoGrow(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 104) + 'px';
    const btn = $('#sendBtn');
    if (btn) btn.classList.toggle('idle', !ta.value.trim());
  }

  function bind() {
    const ta = $('#chatInput');
    ta.addEventListener('input', () => autoGrow(ta));
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(ta.value); ta.value = ''; autoGrow(ta); }
    });
    const b = body();
    b.addEventListener('scroll', updateToBottom, { passive: true });
    $('#sendBtn').addEventListener('click', () => {
      send(ta.value); ta.value = ''; autoGrow(ta);
    });
  }

  /* ---------------- 快捷面板 ---------------- */
  function quickSheet() {
    const p = XZ.activePersona();
    const items = [
      ['在吗', '先把话头递过去'],
      ['今天好累', 'TA 会问你怎么了'],
      ['想你了', ''],
      ['你在干嘛', 'TA 会说自己此刻在做什么'],
      ['晚安', ''],
    ];
    let html = '<p class="sheet-title">不知道说什么的时候</p><div class="quick-grid">';
    items.forEach((it) => {
      html += '<button class="quick-item" data-act="quick-send" data-text="' + esc(it[0]) + '">'
        + esc(it[0]) + (it[1] ? '<span>' + esc(it[1]) + '</span>' : '') + '</button>';
    });
    html += '</div><div class="hr"></div>';
    html += '<button class="sheet-row" data-act="open-app" data-app="inspect"><svg class="ic"><use href="#i-magnify"/></svg>看看 TA 的手机</button>';
    html += '<button class="sheet-row" data-act="open-app" data-app="moments"><svg class="ic"><use href="#i-moments"/></svg>TA 的动态</button>';
    html += '<button class="sheet-row" data-act="open-app" data-app="game"><svg class="ic"><use href="#i-dice"/></svg>下一盘飞行棋</button>';
    html += '<button class="sheet-cancel" data-act="sheet-close">取消</button>';
    XZ.shell.sheet(html);
  }

  XZ.chat = {
    mount, render, send, deliver, onOpen, proactive, quickSheet, bind, abort,
    refreshHead, addMsg, addSys, setStatus, idleStatus, avatarHTML,
    get busy() { return busy; },
  };
})();

/* ============================================================
   小住 · group.js
   群聊：你 + 2～3 个住客，AI 之间会互相接话（纯本地，不需要服务器）
   ============================================================ */
(function () {
  'use strict';
  const XZ = window.XZ;
  const $ = XZ.$, esc = XZ.esc, time = XZ.time;
  const sleep = XZ.sleep;

  let busy = false;
  let typingRow = null;
  let runId = 0;

  function groups() { return (XZ.state && XZ.state.groups) || []; }

  function activeGroup() {
    if (!XZ.state) return null;
    const list = groups();
    if (!list.length) return null;
    let g = list.find((x) => x.id === XZ.state.activeGroupId);
    if (!g) { g = list[0]; XZ.state.activeGroupId = g.id; }
    return g;
  }

  function membersOf(g) {
    if (!g) return [];
    return g.members.map((id) => XZ.state.people[id]).filter(Boolean);
  }

  function who(g, id) {
    return XZ.state.people[id] || null;
  }

  function nameOf(g, id) {
    const p = who(g, id);
    return p ? p.name : '某人';
  }

  function avatarOf(id, cls) {
    const p = who(null, id);
    if (!p) return '<div class="avatar ' + (cls || '') + '">?</div>';
    return XZ.avatarHTML(p, cls);
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    const g = activeGroup();
    const box = $('#gpScroll');
    if (!box) return;

    if (!g) {
      $('#gpName').textContent = '群聊';
      $('#gpStatus').textContent = '还没有群';
      box.innerHTML = '<div class="gp-empty">'
        + '<div class="gp-empty-icon"><svg class="ic"><use href="#i-chat"/></svg></div>'
        + '<b>拉几个人进来聊天</b>'
        + '<p>你说话，他们会各自回；有意思的是，<br>他们之间也会接话。</p>'
        + '<button class="btn btn-primary" data-act="gp-create">建一个群</button>'
        + '</div>';
      return;
    }

    const ms = membersOf(g);
    $('#gpName').textContent = g.name;
    $('#gpStatus').textContent = ms.length + ' 位住客 · 你也在';

    let html = '<div class="sys-note">群聊 · 这里说的每句话，大家都看得见</div>';
    let prevTs = 0, prevFrom = null;
    g.msgs.forEach((m) => {
      if (!prevTs || m.ts - prevTs > 10 * 60e3) {
        html += '<div class="msg-time">' + time.fmtClock(m.ts) + '</div>';
        prevFrom = null;
      }
      const same = prevFrom && prevFrom === m.from && m.ts - prevTs < 2 * 60e3;
      prevTs = m.ts;
      prevFrom = m.from;
      if (m.from === 'me') {
        html += '<div class="msg-row me' + (same ? ' stack' : '') + '"><div class="bubble">' + esc(m.text) + '</div></div>';
      } else {
        const p = who(g, m.from);
        html += '<div class="msg-row ta' + (same ? ' stack' : '') + '"><div class="avatar" style="' + XZ.avatarStyle(p || {}) + '">'
          + esc(XZ.avatarText(p || {})) + '</div>'
          + '<div class="gp-col">' + (same ? '' : '<span class="gp-name">' + esc(p ? p.name : '某人') + '</span>')
          + '<div class="bubble">' + esc(m.text) + '</div></div></div>';
      }
    });
    box.innerHTML = html;
    if (typingRow) box.appendChild(typingRow);
    const body = $('.app--group .chat-body');
    if (body) requestAnimationFrame(() => body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }));
  }

  function showTyping(p) {
    const box = $('#gpScroll');
    if (!box) return;
    hideTyping();
    typingRow = document.createElement('div');
    typingRow.className = 'msg-row ta';
    typingRow.innerHTML = XZ.avatarHTML(p) + '<div class="gp-col"><span class="gp-name">' + esc(p.name)
      + '</span><div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div></div>';
    box.appendChild(typingRow);
    const body = $('.app--group .chat-body');
    if (body) requestAnimationFrame(() => body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }));
  }
  function hideTyping() {
    if (typingRow && typingRow.parentNode) typingRow.parentNode.removeChild(typingRow);
    typingRow = null;
  }

  function delayFor(text) {
    const n = String(text || '').length;
    return XZ.clamp(450 + n * 50 + Math.random() * 300, 600, 2200);
  }

  /* ---------------- 发消息 ---------------- */
  async function send(text) {
    const g = activeGroup();
    const t = String(text || '').trim();
    if (!g || !t) return;
    const input = $('#gpInput');

    if (busy) { runId++; busy = false; hideTyping(); }

    g.msgs.push({ from: 'me', text: t, ts: Date.now() });
    if (g.msgs.length > 400) g.msgs = g.msgs.slice(-400);
    XZ.store.save();
    render();

    const ms = membersOf(g);
    if (!ms.length) return;

    const myRun = ++runId;
    busy = true;
    const order = ms.slice().sort(() => Math.random() - 0.5);
    const count = ms.length >= 2 && Math.random() < 0.6 ? 2 : 1;
    const speakers = order.slice(0, Math.min(count, ms.length));

    let lastLine = '';
    for (let i = 0; i < speakers.length; i++) {
      if (myRun !== runId) break;
      const p = speakers[i];
      showTyping(p);
      await sleep(delayFor(t) + (i ? 700 : 0));
      if (myRun !== runId) break;
      hideTyping();

      let lines;
      if (i > 0 && lastLine && Math.random() < 0.55) {
        lines = XZ.engine.crossReply(p, speakers[0].name, lastLine).split('|');
      } else {
        const res = await XZ.engine.reply(p, t);
        lines = res.bubbles.slice(0, 2);
      }
      for (let k = 0; k < lines.length; k++) {
        if (myRun !== runId) break;
        if (k) { showTyping(p); await sleep(500 + Math.random() * 500); hideTyping(); }
        g.msgs.push({ from: p.id, text: lines[k], ts: Date.now() });
        XZ.store.save();
        render();
        lastLine = lines[k];
        await sleep(260);
      }
      await sleep(400);
    }
    hideTyping();
    if (myRun === runId) busy = false;
    if (input) input.value = '';
  }

  /* ---------------- 建群 ---------------- */
  function createSheet() {
    const people = Object.values(XZ.state.people || {});
    if (people.length < 2) {
      XZ.shell.sheet('<p class="sheet-title">还差一个人</p>'
        + '<p style="font-size:13.5px;line-height:1.75;color:var(--ink2);padding:0 4px 14px">'
        + '群聊至少要有两个住客。先请第二位住进来，再回来建群。</p>'
        + '<button class="btn btn-primary btn-lg" data-act="persona-new">再请一个人住进来</button>'
        + '<button class="sheet-cancel" data-act="sheet-close">先算了</button>');
      return;
    }
    const html = '<p class="sheet-title">谁进来聊天（选 2–3 位）</p>'
      + '<div class="gp-pick" id="gpPick">'
      + people.map((x) => '<button class="gp-pick-row" data-act="gp-pick" data-id="' + x.id + '">'
        + XZ.avatarHTML(x, 'avatar-sm')
        + '<div class="grow"><b>' + esc(x.name) + '</b><span>' + esc(x.relation) + ' · ' + esc(XZ.VOICES[x.voice].name) + '</span></div>'
        + '<i class="gp-check">✓</i></button>').join('')
      + '</div>'
      + '<button class="btn btn-primary btn-lg" style="margin-top:12px" data-act="gp-create-do">建群</button>'
      + '<button class="sheet-cancel" data-act="sheet-close">取消</button>';
    XZ.shell.sheet(html);
    gpPicked = people.slice(0, 2).map((x) => x.id);
    syncPick();
  }

  let gpPicked = [];
  function gpPick(id) {
    const i = gpPicked.indexOf(id);
    if (i >= 0) gpPicked.splice(i, 1);
    else {
      if (gpPicked.length >= 3) { XZ.shell.toast('最多三个人，人多了会吵'); return; }
      gpPicked.push(id);
    }
    syncPick();
  }
  function syncPick() {
    XZ.$$('#gpPick .gp-pick-row').forEach((row) => {
      row.classList.toggle('on', gpPicked.indexOf(row.dataset.id) >= 0);
    });
  }

  function createDo() {
    if (gpPicked.length < 2) { XZ.shell.toast('至少选两个人'); return; }
    const ms = gpPicked.map((id) => XZ.state.people[id]).filter(Boolean);
    const g = {
      id: XZ.uid('g'),
      name: ms.map((x) => x.name).join(' 和 ') + ' 的群',
      members: gpPicked.slice(),
      msgs: [],
      createdAt: Date.now(),
    };
    const now = Date.now();
    g.msgs.push({ from: ms[0].id, text: '……都进来了？', ts: now });
    g.msgs.push({ from: ms[1].id, text: '嗯。', ts: now + 1600 });
    g.msgs.push({ from: ms[1].id, text: '你先说。', ts: now + 2600 });
    XZ.state.groups = XZ.state.groups || [];
    XZ.state.groups.push(g);
    XZ.state.activeGroupId = g.id;
    XZ.store.save();
    XZ.shell.closeSheet();
    XZ.shell.openApp('group');
  }

  function moreSheet() {
    const g = activeGroup();
    XZ.shell.sheet('<p class="sheet-title">' + esc(g ? g.name : '群聊') + '</p>'
      + '<button class="sheet-row" data-act="gp-create"><svg class="ic"><use href="#i-plus"/></svg>再建一个群</button>'
      + '<button class="sheet-row" data-act="gp-leave"><svg class="ic"><use href="#i-close"/></svg>解散这个群</button>'
      + '<button class="sheet-cancel" data-act="sheet-close">取消</button>');
  }

  function leave() {
    const g = activeGroup();
    if (!g) return;
    XZ.state.groups = groups().filter((x) => x.id !== g.id);
    XZ.state.activeGroupId = XZ.state.groups[0] ? XZ.state.groups[0].id : null;
    XZ.store.save();
    XZ.shell.closeSheet();
    render();
    XZ.shell.toast('群已解散');
  }

  function bind() {
    const ta = $('#gpInput');
    if (!ta) return;
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 104) + 'px';
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(ta.value);
        ta.value = '';
        ta.style.height = 'auto';
      }
    });
  }

  function mount() {
    render();
    const ta = $('#gpInput');
    if (ta && window.innerWidth > 520) setTimeout(() => ta.focus({ preventScroll: true }), 350);
  }

  XZ.group = {
    mount, render, send, createSheet, createDo, gpPick, moreSheet, leave, bind,
    get hasGroup() { return !!activeGroup(); },
  };
})();

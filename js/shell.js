/* ============================================================
   小住 · shell.js
   开机 / 锁屏 / 桌面 / 导航 / 动作路由 / 主动消息
   ============================================================ */
(function () {
  'use strict';
  const XZ = window.XZ;
  const $ = XZ.$, $$ = XZ.$$, esc = XZ.esc, time = XZ.time;

  XZ.VERSION = '1.0';
  XZ.currentApp = null;

  const APPS = [
    { id: 'chat', name: '消息', cls: 'a-chat', icon: 'i-chat' },
    { id: 'moments', name: '动态', cls: 'a-moments', icon: 'i-moments' },
    { id: 'diary', name: '日记', cls: 'a-diary', icon: 'i-book' },
    { id: 'album', name: '相册', cls: 'a-album', icon: 'i-photo' },
    { id: 'inspect', name: '查手机', cls: 'a-inspect', icon: 'i-magnify' },
    { id: 'game', name: '飞行棋', cls: 'a-game', icon: 'i-dice' },
    { id: 'settings', name: '设置', cls: 'a-settings', icon: 'i-gear' },
    { id: 'manual', name: '说明书', cls: 'a-manual', icon: 'i-manual' },
  ];

  let toastTimer = null, bannerTimer = null, clockTimer = null, tickTimer = null;
  let demoMode = false;
  let setupDraft = { key: 'shenyu', name: '', call: '', relation: '', voice: '' };

  XZ.activePersona = function () {
    if (!XZ.state || !XZ.state.activeId) return null;
    return XZ.state.people[XZ.state.activeId] || null;
  };

  /* ---------------- 出错时别白屏 ---------------- */
  window.addEventListener('error', function (e) {
    try {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:999;padding:10px 12px;'
        + 'background:#B4473A;color:#fff;font:12px/1.5 monospace;border-radius:10px;max-height:40vh;overflow:auto';
      box.textContent = '出错了：' + (e.message || e.error) + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno;
      document.body.appendChild(box);
    } catch (err) {}
  });

  /* ---------------- 主题 ---------------- */
  function applyTheme() {
    const S = (XZ.state && XZ.state.settings) || { theme: 'light', wall: 'dusk' };
    let t = S.theme;
    if (t === 'auto') {
      const h = new Date().getHours();
      t = (h >= 19 || h < 7) ? 'night' : 'light';
    }
    document.documentElement.dataset.theme = t;
    document.documentElement.dataset.wall = S.wall || 'dusk';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'night' ? '#12121A' : '#F3EDE4');
  }

  /* ---------------- 提示 / 弹层 ---------------- */
  function toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { el.hidden = true; }, 300);
    }, ms || 2200);
  }

  function sheet(html) {
    $('#sheetPanel').innerHTML = html;
    $('#sheet').hidden = false;
    setTimeout(() => {
      const f = $('#sheetPanel input, #sheetPanel textarea');
      if (f && window.innerWidth > 520) f.focus({ preventScroll: true });
    }, 140);
  }
  function closeSheet() {
    $('#sheet').hidden = true;
    $('#sheetPanel').innerHTML = '';
  }
  function confirmSheet(title, desc, okLabel, cb) {
    sheet('<p class="sheet-title">' + esc(title) + '</p>'
      + '<p style="font-size:13.5px;line-height:1.7;color:var(--ink2);padding:0 4px 16px">' + esc(desc) + '</p>'
      + '<button class="btn btn-lg btn-danger" data-act="confirm-yes">' + esc(okLabel) + '</button>'
      + '<button class="sheet-cancel" data-act="sheet-close">再想想</button>');
    pendingConfirm = cb;
  }
  let pendingConfirm = null;

  function banner(p, text) {
    const el = $('#banner');
    el.innerHTML = XZ.avatarHTML(p)
      + '<div class="banner-txt"><b>' + esc(p.name) + '</b><p>' + esc(text) + '</p></div>';
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { el.hidden = true; }, 400);
    }, 4200);
  }

  /* ---------------- 视图切换 ---------------- */
  function showView(id) {
    ['setup', 'lockscreen', 'home'].forEach((v) => {
      const el = document.getElementById(v);
      if (el) el.classList.toggle('active', v === id);
    });
  }

  /* ---------------- 时钟 ---------------- */
  function tickClock() {
    const d = new Date();
    const t = time.fmtClock(d);
    const lt = $('#lockTime'), ct = $('#clockTop');
    if (lt) lt.textContent = d.getHours() + ':' + time.pad2(d.getMinutes());
    if (ct) ct.textContent = t;
    const ld = $('#lockDate');
    if (ld) ld.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + time.WEEK[d.getDay()];
    const hd = $('#homeDate');
    if (hd) hd.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + time.WEEK_S[d.getDay()];
    const temp = $('#homeTemp');
    if (temp) temp.textContent = homeTemp() + '°';
  }
  function homeTemp() {
    const h = XZ.hash('t' + time.dayKey());
    return 15 + (h % 11);
  }

  /* ---------------- 桌面 ---------------- */
  let built = false;
  function buildGrid() {
    if (built) return;
    built = true;
    $('#appGrid').innerHTML = APPS.map((a) =>
      '<button class="app-btn" data-act="open-app" data-app="' + a.id + '">'
      + '<span class="app-ic-wrap"><span class="app-ic ' + a.cls + '"><svg class="ic"><use href="#' + a.icon + '"/></svg></span>'
      + (a.id === 'chat' ? '<span class="badge" id="chatBadge" hidden>0</span>' : '')
      + '</span><span class="app-label">' + a.name + '</span></button>').join('');
  }

  function refreshBadge() {
    const p = XZ.activePersona();
    const el = $('#chatBadge');
    if (!el || !p) return;
    const n = p.chat.unread || 0;
    el.hidden = n <= 0;
    el.textContent = n > 9 ? '9+' : n;
  }
  function bumpBadge() { refreshBadge(); }

  function widgetLine(p) {
    const msgs = p.chat.msgs.filter((m) => m.from !== 'sys');
    const last = msgs[msgs.length - 1];
    if (last && last.from === 'ta' && Date.now() - last.ts < 30 * 60e3) return last.text;
    return XZ.content.ambientLine(p);
  }

  function hideBootHint() {
    const el = document.getElementById('bootHint');
    if (el) el.remove();
  }

  /* 照片库是异步来的：到了就补上带图内容；8 秒还没到先用兜底矢量图，
     等照片真到了再升级一次（慢网络下很重要） */
  function watchPhotos(p) {
    let waited = 0, fellBack = false;
    const timer = setInterval(() => {
      waited += 400;
      if (window.XZ_PHOTOS && window.XZ_PHOTOS.length) {
        clearInterval(timer);
        XZ.content.ensure(p);
        XZ.content.upgradeMoments(p);
        XZ.content.upgradePhotos(p);
        XZ.store.save();
        refreshHome();
        if (XZ.currentApp === 'moments' || XZ.currentApp === 'album') openApp(XZ.currentApp);
        return;
      }
      if (!fellBack && waited >= 8000) {
        fellBack = true;
        window.__xzPhotosDone = true;   // 先用兜底矢量图顶上
        XZ.content.ensure(p);
        refreshHome();
      }
    }, 400);
    setTimeout(() => clearInterval(timer), 90000);
  }

  function refreshHome() {
    const p = XZ.activePersona();
    if (!p) return;
    const av = $('#wAvatar');
    if (av) {
      av.style.cssText = XZ.avatarStyle(p);
      av.textContent = XZ.avatarText(p);
    }
    const r = XZ.routineAt(p);
    $('#wName').textContent = p.name;
    $('#wWhere').textContent = r.where + ' · ' + r.doing.replace(/^在/, '');
    $('#wTime').textContent = time.fmtClock();
    $('#wLine').textContent = widgetLine(p);
    $('#wFoot').textContent = (p.chat.unread || 0) > 0 ? (p.chat.unread + ' 条新消息') : '点一下，回到聊天';
    const lv = $('#lockAvatar');
    if (lv) { lv.style.cssText = XZ.avatarStyle(p); lv.textContent = XZ.avatarText(p); }
    const ln = $('#lockName'); if (ln) ln.textContent = p.name;
    const lw = $('#lockWhere'); if (lw) lw.textContent = r.where + ' · ' + r.doing;
    $('#homeQuote').textContent = XZ.content.ambientLine(p, 3);
    const tempEl = $('#homeTemp');
    if (tempEl) tempEl.textContent = homeTemp() + '°';

    const d = (p.diaries || [])[0];
    const m = (p.moments || [])[0];
    const diaryEl = $('#todayDiary'), momEl = $('#todayMoment'), insEl = $('#todayInsp');
    if (diaryEl) diaryEl.textContent = d ? d.title : '今晚九点后写';
    if (momEl) momEl.textContent = m ? String(m.text).split('\n')[0] : '还没有';
    if (insEl) insEl.textContent = (p.notes || []).length ? (p.notes.length + ' 条备忘录') : '没看过';
    const meta = $('#todayMeta');
    if (meta) meta.textContent = '第 ' + XZ.daysBetween(p.createdAt) + ' 天';

    refreshBadge();
    tickClock();
  }

  function refreshLockNotifs() {
    const p = XZ.activePersona();
    const box = $('#lockNotifs');
    if (!p || !box) return;
    const msgs = p.chat.msgs.filter((m) => m.from === 'ta').slice(-2).reverse();
    if (!msgs.length) { box.innerHTML = ''; return; }
    box.innerHTML = msgs.map((m, i) =>
      '<div class="lock-notif" style="animation-delay:' + (i * 0.08) + 's">'
      + XZ.avatarHTML(p)
      + '<div class="ln-txt"><b>' + esc(p.name) + '</b><p>' + esc(m.text) + '</p></div>'
      + '<span class="ln-time">' + time.fmtClock(m.ts) + '</span></div>').join('');
  }

  /* ---------------- 应用开关 ---------------- */
  function openApp(id) {
    const p = XZ.activePersona();
    if (!p) return;
    closeSheet();
    XZ.content.ensure(p);
    const el = document.querySelector('.app[data-app="' + id + '"]');
    if (!el) return;
    $$('.app').forEach((a) => a.classList.toggle('open', a === el));
    XZ.currentApp = id;
    try { history.pushState({ app: id }, '', location.pathname + location.search + '#app-' + id); } catch (e) {}
    if (id === 'chat') {
      XZ.chat.mount(p);
      XZ.chat.onOpen(p);
    }
    if (id === 'group') XZ.group.mount();
    if (id === 'moments') XZ.apps.renderMoments(p);
    if (id === 'diary') XZ.apps.renderDiary(p);
    if (id === 'album') XZ.apps.renderAlbum(p);
    if (id === 'inspect') XZ.apps.renderInspect(p);
    if (id === 'game') XZ.apps.renderGame(p);
    if (id === 'settings') XZ.apps.renderSettings();
    if (id === 'manual') XZ.apps.renderManual(p);
    if ((p.chat.unread || 0) > 0 && id !== 'chat') { /* 保留未读，进去再看 */ }
  }

  function closeApp(back) {
    $$('.app').forEach((a) => a.classList.remove('open'));
    XZ.currentApp = null;
    refreshHome();
    if (!back) {
      try { if (location.hash.indexOf('#app-') === 0) history.back(); } catch (e) {}
    }
  }

  /* ---------------- 开机流程 ---------------- */
  function bootHome() {
    XZ.store.save(true);
    applyTheme();
    buildGrid();
    refreshHome();
    refreshLockNotifs();
    showView('home');
  }

  function unlock() {
    if (!$('#lockscreen').classList.contains('active')) return;
    showView('home');
    refreshHome();
  }

  function bootAnimation(cb) {
    const screen = $('#screen');
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;z-index:80;background:var(--bg);display:grid;place-items:center;'
      + 'transition:opacity .5s cubic-bezier(.32,.72,.24,1);';
    overlay.innerHTML = '<div style="text-align:center">'
      + '<div style="font-family:var(--serif);font-size:30px;letter-spacing:.2em;color:var(--ink)">小住</div>'
      + '<div style="margin-top:12px;font-size:11.5px;letter-spacing:.22em;color:var(--ink3)">正在唤醒</div></div>';
    screen.appendChild(overlay);
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.remove(); if (cb) cb(); }, 480);
    }, 900);
  }

  /* ---------------- 引导 ---------------- */
  function renderSetupCards() {
    const box = $('#personaCards');
    box.innerHTML = XZ.PRESETS.map((x) =>
      '<button class="p-card' + (setupDraft.key === x.key ? ' on' : '') + '" data-act="setup-pick" data-key="' + x.key + '">'
      + '<div class="avatar" style="' + XZ.avatarCSS('p' + x.key) + '">' + esc(x.name.slice(0, 1)) + '</div>'
      + '<b>' + esc(x.name) + '</b><span>' + esc(x.relation) + ' · ' + XZ.VOICES[x.voice].name + '</span>'
      + '<p>' + esc(x.line) + '</p></button>').join('');
  }

  function setupStep(n) {
    $$('#setup .setup-step').forEach((el) => { el.hidden = Number(el.dataset.step) !== n; });
    const wrap = $('#setup .setup-wrap');
    if (wrap) wrap.scrollTop = 0;
  }

  function setupPick(key) {
    setupDraft.key = key;
    renderSetupCards();
  }

  function setupNext() {
    const preset = XZ.findPreset(setupDraft.key);
    setupDraft.name = preset.name;
    setupDraft.call = preset.call;
    setupDraft.relation = preset.relation;
    setupDraft.voice = preset.voice;
    $('#fName').value = preset.name;
    $('#fCall').value = preset.call;
    renderChipGroup('#fRelation', XZ.RELATIONS, preset.relation, 'setup-rel');
    renderChipGroup('#fVoice', Object.keys(XZ.VOICES).map((v) => XZ.VOICES[v].name), XZ.VOICES[preset.voice].name, 'setup-voice');
    $('#fRelation').dataset.value = preset.relation;
    $('#fVoice').dataset.value = preset.voice;
    setupStep(2);
  }

  function renderChipGroup(sel, items, active, act) {
    const box = $(sel);
    box.innerHTML = items.map((it) =>
      '<button class="chip' + (it === active ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(it) + '">' + esc(it) + '</button>').join('');
  }

  function fillChipGroup(sel, v) {
    const box = $(sel);
    if (!box) return;
    box.dataset.value = v;
    $$('.chip', box).forEach((c) => c.classList.toggle('on', c.dataset.v === v));
  }

  function startBoot(fast) {
    if (!XZ.state) {
      XZ.state = XZ.store.blankState();
      XZ.state.installedAt = Date.now();
    }
    let opts;
    if (fast) {
      const preset = XZ.findPreset(setupDraft.key || 'shenyu');
      opts = { key: preset.key, name: preset.name, call: preset.call, relation: preset.relation, voice: preset.voice };
    } else {
      const name = ($('#fName').value || '').trim();
      if (!name) { toast('先给 TA 起个名字'); return; }
      opts = {
        key: setupDraft.key,
        name: name,
        call: ($('#fCall').value || '你').trim(),
        relation: $('#fRelation').dataset.value || '朋友',
        voice: voiceKeyOf($('#fVoice').dataset.value || '温柔'),
      };
    }
    const preset = XZ.findPreset(opts.key);
    const p = XZ.newPersona(preset, opts);
    p.avatarText = opts.name.slice(0, 1);
    
    XZ.content.ensure(p);
    XZ.state.people[p.id] = p;
    XZ.state.activeId = p.id;
    XZ.store.save(true);
    bootAnimation(() => {
      bootHome();
      startTicker();
      watchPhotos(XZ.activePersona());
      showView('lockscreen');
      refreshLockNotifs();
      setTimeout(() => {
        showView('home');
        setTimeout(() => {
          openApp('chat');
        }, 420);
      }, 1500);
    });
  }

  function voiceKeyOf(name) {
    const k = Object.keys(XZ.VOICES).find((v) => XZ.VOICES[v].name === name);
    return k || 'gentle';
  }

  /* ---------------- 主动消息 / 世界继续走 ---------------- */
  function startTicker() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, 30000);
  }

  /* 你不在的时候，世界也在继续：回来时补内容 + 他可能先开口 */
  function catchUp(p) {
    if (!p) return;
    const now = Date.now();
    const last = p.lastActive || p.chat.lastAt || p.createdAt || now;
    const mins = (now - last) / 60000;
    p.lastActive = now;
    if (mins < 20) return;
    XZ.content.ensure(p);
    if (mins > 45 && !document.hidden && Math.random() < 0.65) {
      XZ.chat.proactive(p);
    }
    refreshHome();
    refreshLockNotifs();
  }

  function tick() {
    const p = XZ.activePersona();
    if (!p || !p.chat.msgs.length) return;
    if (document.hidden) return;
    const now = Date.now();
    const last = p.chat.msgs[p.chat.msgs.length - 1];
    const mins = (now - last.ts) / 60000;
    if (last.from !== 'me') return;
    if (p.chat.unread > 2) return;
    if (XZ.currentApp === 'chat') {
      if (mins > 5 && Math.random() < 0.34) XZ.chat.proactive(p);
    } else {
      if (mins > 3 && mins < 240 && Math.random() < 0.22) XZ.chat.proactive(p);
    }
    p.lastActive = now;
    refreshHome();
  }

  /* ---------------- 动作路由 ---------------- */
  function handle(act, el) {
    const p = XZ.activePersona();
    switch (act) {
      case 'lock': unlock(); break;
      case 'setup-pick': setupPick(el.dataset.key); break;
      case 'setup-next': setupNext(); break;
      case 'setup-back': setupStep(1); break;
      case 'setup-fast': startBoot(true); break;
      case 'setup-start': startBoot(false); break;
      case 'setup-rel': fillChipGroup('#fRelation', el.dataset.v); break;
      case 'setup-voice': fillChipGroup('#fVoice', el.dataset.v); break;

      case 'open-app': openApp(el.dataset.app); break;
      case 'close-app': closeApp(); break;
      case 'open-chat': openApp('chat'); break;
      case 'to-bottom': {
        const b = $('.chat-body');
        if (b) b.scrollTo({ top: b.scrollHeight, behavior: 'smooth' });
        break;
      }
      case 'quick': XZ.chat.quickSheet(); break;
      case 'quick-send': {
        closeSheet();
        XZ.chat.send(el.dataset.text);
        break;
      }
      case 'chat-more': chatMore(); break;
      case 'sheet-close': closeSheet(); break;
      case 'confirm-yes': {
        const cb = pendingConfirm; pendingConfirm = null; closeSheet();
        if (cb) cb();
        break;
      }

      case 'mv-like': XZ.apps.mvLike(el.dataset.id); break;
      case 'mv-cmt-toggle': XZ.apps.mvToggleCmt(el.dataset.id); break;
      case 'mv-cmt-send': {
        const inp = document.querySelector('[data-cmt="' + el.dataset.id + '"]');
        if (inp) { const v = inp.value; inp.value = ''; XZ.apps.mvSendCmt(el.dataset.id, v); }
        break;
      }
      case 'moment-new': XZ.apps.newMomentSheet(); break;
      case 'mv-publish': {
        const t = ($('#mvNewText') || {}).value || '';
        XZ.apps.mvPublish(t);
        break;
      }
      case 'lb-open': XZ.apps.openLightbox(el.dataset.id); break;
      case 'lb-close': XZ.apps.closeLightbox(); break;

      case 'roll': XZ.apps.roll(); break;
      case 'game-help': XZ.apps.rulesSheet(); break;
      case 'ph-add': XZ.apps.addPhoto(); break;
      case 'ph-save': XZ.apps.photoSave(); break;

      case 'set-engine': XZ.state.settings.engine = el.dataset.v; XZ.store.save(); XZ.apps.renderSettings(); break;
      case 'set-theme': XZ.state.settings.theme = el.dataset.v; XZ.store.save(); applyTheme(); XZ.apps.renderSettings(); break;
      case 'set-wall': XZ.state.settings.wall = el.dataset.v; XZ.store.save(); applyTheme(); XZ.apps.renderSettings(); break;
      case 'set-provider': {
        const pr = XZ.engine.providerOf(el.dataset.v);
        const api = XZ.state.settings.api;
        api.provider = pr.id;
        if (pr.id !== 'custom') { api.baseUrl = pr.baseUrl; api.model = pr.model; }
        XZ.store.save(); XZ.apps.renderSettings();
        break;
      }
      case 'api-test': XZ.apps.apiTest(); break;
      case 'api-wizard': XZ.apps.apiWizard(1); break;
      case 'api-adv': XZ.apps.toggleAdv(); break;
      case 'wiz-prov': XZ.apps.wizPick(el.dataset.v); break;
      case 'wiz-next': XZ.apps.wizNext(); break;
      case 'wiz-back': XZ.apps.wizBack(); break;
      case 'wiz-open-site': XZ.apps.wizOpenSite(); break;
      case 'wiz-test': XZ.apps.wizTest(); break;
      case 'wiz-later': XZ.apps.wizLater(); break;

      case 'persona-edit': XZ.apps.personaSheet(p); break;
      case 'mem-open': XZ.apps.memorySheet(p); break;
      case 'mem-del': XZ.apps.memDel(el.dataset.id); break;
      case 'persona-new': XZ.apps.personaSheet(null); break;
      case 'persona-switch': XZ.apps.switchPersonaSheet(); break;
      case 'pick-persona': {
        XZ.chat.abort();
        XZ.state.activeId = el.dataset.id;
        XZ.store.save();
        XZ.shell.closeSheet();
        const np = XZ.activePersona();
        XZ.content.ensure(np);
        refreshHome();
        if (XZ.currentApp) openApp(XZ.currentApp);
        toast('换好了');
        break;
      }
      case 'pe-pick': XZ.apps.pePick(el.dataset.group, el.dataset.v); break;
      case 'pe-save': XZ.apps.peSave(false); break;
      case 'pe-create': XZ.apps.peSave(true); break;
      case 'pe-avatar': { const f = $('#peFile'); if (f) f.click(); break; }
      case 'pe-avatar-reset': XZ.apps.peAvatarReset(); break;
      case 'pe-routine': XZ.apps.routineSheet(p); break;
      case 'pe-quirks': XZ.apps.quirksSheet(p); break;
      case 'rt-add': XZ.apps.rtAdd(); break;
      case 'rt-del': XZ.apps.rtDel(el); break;
      case 'rt-save': XZ.apps.rtSave(); break;
      case 'qk-nostop': XZ.apps.qkToggleNoStop(el); break;
      case 'qk-save': XZ.apps.qkSave(); break;
      case 'gp-create': XZ.group.createSheet(); break;
      case 'gp-pick': XZ.group.gpPick(el.dataset.id); break;
      case 'gp-create-do': XZ.group.createDo(); break;
      case 'gp-leave': XZ.group.leave(); break;
      case 'gp-send': XZ.group.send(($('#gpInput') || {}).value || ''); break;
      case 'gp-more': XZ.group.moreSheet(); break;

      case 'export-all': XZ.apps.exportAll(); break;
      case 'export-chat': XZ.apps.exportChat(); break;
      case 'import-all': XZ.apps.importAll(); break;
      case 'wipe': XZ.apps.wipe(); break;
    }
  }

  function chatMore() {
    const p = XZ.activePersona();
    const hasG = XZ.group && XZ.group.hasGroup;
    sheet('<p class="sheet-title">' + esc(p.name) + '</p>'
      + '<button class="sheet-row" data-act="open-app" data-app="inspect"><svg class="ic"><use href="#i-magnify"/></svg>看看 TA 的手机</button>'
      + '<button class="sheet-row" data-act="open-app" data-app="moments"><svg class="ic"><use href="#i-moments"/></svg>TA 的动态</button>'
      + (hasG
        ? '<button class="sheet-row" data-act="open-app" data-app="group"><svg class="ic"><use href="#i-chat"/></svg>进群聊</button>'
        : '<button class="sheet-row" data-act="gp-create"><svg class="ic"><use href="#i-chat"/></svg>开个群聊（让 TA 们互相接话）</button>')
      + '<button class="sheet-row" data-act="open-app" data-app="settings"><svg class="ic"><use href="#i-gear"/></svg>改一改 TA 的样子</button>'
      + '<button class="sheet-row" data-act="export-chat"><svg class="ic"><use href="#i-down"/></svg>导出聊天记录</button>'
      + '<button class="sheet-cancel" data-act="sheet-close">关闭</button>');
  }

  /* ---------------- 演示数据（?demo=1） ---------------- */
  function seedDemo() {
    const s = XZ.store.blankState();
    s.installedAt = Date.now() - 6 * 864e5;
    const preset = XZ.PRESETS[0];
    const p = XZ.newPersona(preset, {});
    p.createdAt = Date.now() - 6 * 864e5;
    p.bond = 58;
    p.mood = 1;
    
    p.memories = [
      { id: 'm1', kind: 'like', text: '下雨天', ts: Date.now() - 5 * 864e5 },
      { id: 'm2', kind: 'event', text: '面试完了，感觉不太好', ts: Date.now() - 2 * 864e5 },
      { id: 'm3', kind: 'plan', text: '周三要去体检', ts: Date.now() - 864e5 },
      { id: 'm4', kind: 'like', text: '关东煮里的萝卜', ts: Date.now() - 3 * 864e5 },
    ];
    const now = Date.now();
    const convo = [
      [-3 * 864e5, 'me', '在吗'],
      [-3 * 864e5 + 60000, 'ta', '在。|刚把碗洗完'],
      [-3 * 864e5 + 120000, 'me', '我今天面试完了'],
      [-3 * 864e5 + 180000, 'ta', '怎么样。|慢慢说，我在听。'],
      [-3 * 864e5 + 240000, 'me', '感觉不太好，面试官一直在看表'],
      [-3 * 864e5 + 300000, 'ta', '那是他们的问题。|你已经准备得很认真了。'],
      [-2 * 864e5, 'me', '今天好累'],
      [-2 * 864e5 + 60000, 'ta', '嗯，我听出来了。|要不先别想工作了。'],
      [-2 * 864e5 + 90000, 'me', '想吃点东西'],
      [-2 * 864e5 + 150000, 'ta', '楼下便利店有热的东西。|别光买零食。'],
      [-864e5, 'ta', '外面下雨了。|带伞。'],
      [-864e5 + 3600e3, 'me', '带了带了'],
      [-864e5 + 7200e3, 'me', '今天想你了'],
      [-864e5 + 7260e3, 'ta', '……怎么突然说这个。|我也想你。'],
      [-3600e3, 'ta', '你什么时候回来啊。'],
      [-3500e3, 'me', '快了，还有一会儿'],
      [-3000e3, 'ta', '好。|我等你。'],
      [-600e3, 'ta', '灯我给你留着。'],
    ];
    convo.forEach((c, i) => {
      String(c[2]).split('|').forEach((txt, k) => {
        p.chat.msgs.push({ id: 'c' + i + '_' + k, from: c[1], text: txt, ts: now + c[0] + k * 1500 });
      });
    });
    p.chat.lastAt = now - 600e3;
    p.lastTaAt = now - 600e3;
    p.chat.unread = 1;
    p.chat.streak = 4;
    s.people[p.id] = p;
    s.activeId = p.id;
    XZ.content.ensure(p);
    // 保证日记够看
    [3, 2, 1].forEach((d) => {
      const key = time.dayKey(now - d * 864e5);
      if (!p.diaries.some((x) => x.day === key)) p.diaries.push(XZ.content.genDiary(p, key));
    });
    p.diaries.sort((a, b) => b.ts - a.ts);
    return s;
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    hideBootHint();
    const params = new URLSearchParams(location.search);
    const wantDemo = params.get('demo') === '1';
    if (params.get('noanim') === '1') document.documentElement.classList.add('no-anim');

    // 存储写不进去的时候，必须让用户知道（而不是静默丢数据）
    XZ.store.onFail = function (msg) {
      XZ.shell.toast('保存失败：' + msg + '。先导出备份，别关页面', 6000);
    };
    XZ.store.onRecover = function () {
      XZ.shell.toast('存储恢复正常了', 2200);
    };

    XZ.state = XZ.store.load();

    if (wantDemo || (!XZ.state && params.get('fresh') !== '1' && false)) {
      demoMode = true;
      XZ.state = seedDemo();
      XZ.store.setDemo(true);
    }

    if (!XZ.state) {
      applyTheme();
      renderSetupCards();
      setupStep(1);
      showView('setup');
      tickClock();
      clockTimer = setInterval(tickClock, 1000);
      renderLockHintDefault();
      bindAll();
      if (params.get('step') === '2') setupNext();
      return;
    }

    applyTheme();
    const p = XZ.activePersona() || Object.values(XZ.state.people)[0];
    if (!p) { XZ.store.hardReset(); location.reload(); return; }
    XZ.state.activeId = p.id;
    if (!XZ.state.settings.theme) XZ.state.settings.theme = 'light';
    XZ.content.ensure(p);
    buildGrid();
    refreshHome();
    refreshLockNotifs();

    clockTimer = setInterval(tickClock, 1000);
    tickClock();
    bindAll();

    const target = params.get('app');
    if (params.get('lock') === '1') {
      showView('lockscreen');
    } else if (target && document.querySelector('.app[data-app="' + target + '"]')) {
      showView('home');
      setTimeout(() => openApp(target), 120);
    } else if (demoMode) {
      showView('home');
    } else {
      showView('lockscreen');
    }

    tickTimer = setInterval(tick, 30000);
    setTimeout(() => { if (XZ.currentApp === null) refreshHome(); }, 4000);
    // 你不在的时候世界也在走：回来时补内容，他可能先开口
    setTimeout(() => catchUp(p), 900);
    watchPhotos(p);

    // 一周没备份就提醒一次（只在这次打开里提示，不烦人）
    if (XZ.state.settings.remindBackup !== false) {
      const lastExport = XZ.state.settings.lastExport || 0;
      const totalMsgs = p.chat.msgs.filter((m) => m.from !== 'sys').length;
      if (totalMsgs > 20 && Date.now() - lastExport > 7 * 864e5) {
        setTimeout(() => {
          toast(lastExport ? '一周没备份了，要不要导出一份？' : '还没备份过。设置 → 数据 → 导出备份，存网盘就行', 5200);
        }, 6000);
      }
    }

    if (params.get('debug') === '1') {
      setTimeout(() => {
        const b = $('.chat-body'), s = $('#chatScroll'), m = $('.msg-row'), a = $('.app.open');
        const r = (el) => el ? [Math.round(el.getBoundingClientRect().top), Math.round(el.getBoundingClientRect().height)].join('x') : 'null';
        const cs = a ? getComputedStyle(a) : null;
        document.title = ['B' + r(b), 'S' + r(s), 'M' + r(m),
          'sh' + (b ? b.scrollHeight : '-'), 'st' + (b ? Math.round(b.scrollTop) : '-'),
          'op' + (cs ? cs.opacity : '-'), 'vis' + (cs ? cs.visibility : '-'),
          'n' + document.querySelectorAll('.msg-row').length].join(' ');
      }, 1500);
    }
  }

  function renderLockHintDefault() {
    const h = $('#lockHint');
    if (h) h.textContent = '轻触屏幕';
  }

  function bindAll() {
    document.addEventListener('click', function (e) {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      handle(t.getAttribute('data-act'), t);
    });
    $('#lockscreen').addEventListener('click', () => unlock());
    $('#inspectTabs').addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (b) XZ.apps.setInspectTab(b.dataset.tab);
    });
    $('#settingsBody').addEventListener('input', (e) => {
      const t = e.target;
      const api = XZ.state.settings.api;
      if (t.id === 'apiKey') { api.key = t.value.trim(); XZ.store.save(); }
      else if (t.id === 'apiModel') { api.model = t.value.trim(); XZ.store.save(); }
      else if (t.id === 'apiBase') { api.baseUrl = t.value.trim(); XZ.store.save(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$('#sheet').hidden) closeSheet();
        else if (XZ.currentApp) closeApp();
      }
    });
    window.addEventListener('popstate', () => {
      if (XZ.currentApp) closeApp(true);
      else if ($('#home').classList.contains('active') === false && XZ.state) showView('home');
    });
    window.addEventListener('pagehide', () => XZ.store.save(true));
    document.addEventListener('visibilitychange', () => {
      const p2 = XZ.activePersona();
      if (document.hidden) { if (p2) { p2.lastActive = Date.now(); XZ.store.save(); } return; }
      if (p2) catchUp(p2);
      refreshHome();
    });
    XZ.chat.bind();
    if (XZ.group) XZ.group.bind();
  }

  /* ---------------- 对外 ---------------- */
  XZ.shell = {
    toast, sheet, closeSheet, confirmSheet, banner,
    openApp, closeApp, bootHome, unlock, showView,
    refreshHome, refreshBadge, bumpBadge, refreshLockNotifs,
    afterChat(p) { refreshHome(); },
    onProactive(p, text) { banner(p, text); refreshHome(); },
    bumpStreak(p) {
      const today = time.dayKey();
      if (p.chat.lastDay !== today) {
        p.chat.streak = (p.chat.streak || 1) + 1;
        p.chat.lastDay = today;
      }
    },
    afterImport() {
      applyTheme();
      built = false;
      buildGrid();
      refreshHome();
      refreshLockNotifs();
      $$('.app').forEach((a) => a.classList.remove('open'));
      XZ.currentApp = null;
      showView('home');
    },
    demo: () => demoMode,
    tickerRunning: () => !!tickTimer,
    catchUp,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

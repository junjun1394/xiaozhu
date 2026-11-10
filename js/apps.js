/* ============================================================
   小住 · apps.js
   动态 / 日记 / 相册 / 查手机 / 飞行棋 / 设置 / 说明书
   ============================================================ */
(function () {
  'use strict';
  const XZ = window.XZ;
  const $ = XZ.$, $$ = XZ.$$, esc = XZ.esc, time = XZ.time, pick = XZ.pick;

  /* ============================================================
     动态
     ============================================================ */
  function renderMoments(p) {
    $('#mvName').textContent = p.name;
    $('#mvBio').textContent = p.bio || '';
    const av = $('#mvAvatar');
    av.style.cssText = XZ.avatarStyle(p);
    av.textContent = XZ.avatarText(p);
    const cover = $('#mvCover');
    cover.style.background = '';
    const list = $('#mvList');
    const items = (p.moments || []).slice(0, 30);
    if (!items.length) {
      list.innerHTML = '<div class="ins-empty">还没有动态。<br>TA 大概还没什么想说的。</div>';
      return;
    }
    let html = '';
    items.forEach((m) => {
      html += '<article class="mv-item' + (m.mine ? ' mv-mine' : '') + '" data-mid="' + m.id + '">';
      html += '<div class="mv-head">' + (m.mine
        ? '<div class="avatar" style="background:linear-gradient(150deg,#B99B7C,#7E6650)">我</div><b>我</b><span>' + XZ.relTime(m.ts) + '</span>'
        : XZ.chat.avatarHTML(p) + '<b>' + esc(p.name) + '</b><span>' + XZ.relTime(m.ts) + '</span>') + '</div>';
      html += '<div class="mv-text">' + esc(m.text) + '</div>';
      if (m.art) html += '<div class="mv-art" style="' + XZ.photoCSS(m) + '"></div>';
      html += '<div class="mv-actions">';
      html += '<button class="mv-like' + (m.liked ? ' on' : '') + '" data-act="mv-like" data-id="' + m.id + '">'
        + '<svg class="ic"><use href="#i-heart"/></svg>' + ((m.likes || 0) + (m.liked ? 1 : 0)) + '</button>';
      html += '<button class="mv-cmt-btn" data-act="mv-cmt-toggle" data-id="' + m.id + '">'
        + '<svg class="ic"><use href="#i-comment"/></svg>' + ((m.comments || []).length || '说两句') + '</button>';
      html += '</div>';
      if (m.openCmt) {
        if ((m.comments || []).length) {
          html += '<div class="mv-cmts">';
          m.comments.forEach((c) => {
            html += '<div class="mv-cmt"><b>' + esc(c.by === 'ta' ? p.name : '我') + '：</b>' + esc(c.text) + '</div>';
          });
          html += '</div>';
        }
        html += '<div class="mv-cmt-input"><input data-cmt="' + m.id + '" placeholder="说点什么…" maxlength="60">'
          + '<button data-act="mv-cmt-send" data-id="' + m.id + '">发送</button></div>';
      } else if ((m.comments || []).length) {
        html += '<div class="mv-cmts">';
        m.comments.slice(-3).forEach((c) => {
          html += '<div class="mv-cmt"><b>' + esc(c.by === 'ta' ? p.name : '我') + '：</b>' + esc(c.text) + '</div>';
        });
        html += '</div>';
      }
      html += '</article>';
    });
    list.innerHTML = html;
  }

  function mvLike(id) {
    const p = XZ.activePersona();
    const m = p.moments.find((x) => x.id === id);
    if (!m) return;
    m.liked = !m.liked;
    XZ.store.save();
    renderMoments(p);
  }

  function mvToggleCmt(id) {
    const p = XZ.activePersona();
    const m = p.moments.find((x) => x.id === id);
    if (!m) return;
    m.openCmt = !m.openCmt;
    renderMoments(p);
    if (m.openCmt) {
      setTimeout(() => {
        const inp = $('[data-cmt="' + id + '"]');
        if (inp) inp.focus();
      }, 60);
    }
  }

  async function mvSendCmt(id, text) {
    const p = XZ.activePersona();
    const m = p.moments.find((x) => x.id === id);
    if (!m || !text.trim()) return;
    m.comments = m.comments || [];
    m.comments.push({ by: 'me', text: text.trim(), ts: Date.now() });
    m.openCmt = false;
    XZ.store.save();
    renderMoments(p);
    await XZ.sleep(1200 + Math.random() * 1500);
    const reply = XZ.engine.commentReply(p);
    m.comments.push({ by: 'ta', text: reply, ts: Date.now() });
    XZ.store.save();
    if (XZ.currentApp === 'moments') renderMoments(p);
  }

  function newMomentSheet() {
    const html = '<p class="sheet-title">发一条动态</p>'
      + '<div class="set-field" style="padding:0 2px 10px"><textarea id="mvNewText" rows="4" maxlength="200" placeholder="今天想写点什么…" style="width:100%;resize:none;font-size:15px;line-height:1.7;padding:12px;border-radius:14px;background:var(--surface-2)"></textarea></div>'
      + '<button class="btn btn-primary btn-lg" data-act="mv-publish">发布</button>'
      + '<button class="sheet-cancel" data-act="sheet-close">取消</button>';
    XZ.shell.sheet(html);
  }

  function mvPublish(text) {
    const p = XZ.activePersona();
    if (!text.trim()) { XZ.shell.toast('写点什么再发吧'); return; }
    const mo = {
      id: XZ.uid('mo'), ts: Date.now(), text: text.trim(), mine: true,
      art: false, likes: 0, liked: false, comments: [],
    };
    p.moments.unshift(mo);
    XZ.store.save();
    XZ.shell.closeSheet();
    renderMoments(p);
    XZ.shell.toast('发出去了');
    // 认准这一条，不要回头去找 p.moments[0]（否则连发两条会都落在最新那条上）
    setTimeout(() => {
      if (p.moments.indexOf(mo) < 0) return;
      mo.comments.push({ by: 'ta', text: pick([XZ.engine.shortSay(p, 'comment'), '看到了。', '嗯，我看到了。']), ts: Date.now() });
      mo.likes = 1;
      XZ.store.save();
      if (XZ.currentApp === 'moments') renderMoments(p);
    }, 2200 + Math.random() * 2500);
  }

  /* ============================================================
     日记
     ============================================================ */
  function renderDiary(p) {
    const list = $('#diaryList');
    const items = (p.diaries || []).slice(0, 20);
    if (!items.length) {
      list.innerHTML = '<div class="ins-empty">TA 还没写日记。<br>晚上九点之后来看看。</div>';
      return;
    }
    list.innerHTML = items.map((d) => {
      const dt = new Date(d.ts);
      const isToday = time.dayKey(d.ts) === time.dayKey();
      const isY = time.dayKey(d.ts) === time.dayKey(Date.now() - 864e5);
      const label = isToday ? '今天' : isY ? '昨天' : (dt.getMonth() + 1) + '月' + dt.getDate() + '日';
      return '<article class="diary-item">'
        + '<div class="diary-date"><b>' + label + ' · ' + time.WEEK[dt.getDay()] + '</b>'
        + '<span class="diary-weather">' + esc(d.weather) + ' · ' + esc(d.mood) + '</span></div>'
        + '<h3 class="diary-title">' + esc(d.title) + '</h3>'
        + '<div class="diary-text">' + esc(d.text) + '</div>'
        + '<div class="diary-sign">—— ' + esc(p.name) + '</div>'
        + '</article>';
    }).join('');
  }

  /* ============================================================
     相册
     ============================================================ */
  function renderAlbum(p) {
    ensureAlbumComments(p);
    const grid = $('#albumGrid');
    $('#albumCount').textContent = (p.photos || []).length + ' 张';
    if (!p.photos || !p.photos.length) {
      grid.innerHTML = '<div class="ins-empty" style="grid-column:1/-1">还没有照片。<br>右上角 ＋ 可以放一张进去。</div>';
      return;
    }
    grid.innerHTML = p.photos.map((ph) => {
      const safe = ph.img ? XZ.safeImg(ph.img) : '';
      const bg = safe
        ? "background-image:url('" + safe + "');background-size:cover;background-position:center;"
        : XZ.photoCSS(ph);
      const dot = (ph.comments || []).length && !ph.seen ? '<span class="album-dot"></span>' : '';
      return '<button class="album-cell" data-act="lb-open" data-id="' + ph.id + '" aria-label="' + esc(ph.cap) + '">'
        + '<div class="art" style="' + bg + '"></div>' + dot + '</button>';
    }).join('');
  }

  /* 老照片补评论：之前放进去、TA 还没看过的，慢慢补上 */
  function ensureAlbumComments(p) {
    (p.photos || []).forEach((ph) => {
      if (ph.img && !(ph.comments || []).length && Date.now() - ph.ts > 25000 && Math.random() < 0.7) {
        addTaComment(p, ph);
      }
    });
  }

  function addTaComment(p, ph) {
    if (!ph || (ph.comments || []).length) return false;
    const lines = XZ.engine.photoComment(p, ph.cap, ph.stats);
    ph.comments = lines.map((t, i) => ({ by: 'ta', text: t, ts: Date.now() + i }));
    ph.seen = false;
    XZ.store.save();
    return true;
  }

  function scheduleTaComment(p, ph) {
    setTimeout(() => {
      if (!addTaComment(p, ph)) return;
      const lb = $('#lightbox');
      const lbOpen = lb && !lb.hidden;
      if (!lbOpen) XZ.shell.toast(p.name + ' 看到了你的照片', 3000);
      if (XZ.currentApp === 'album') {
        renderAlbum(p);
        if (lbOpen) openLightbox(ph.id);
      }
    }, 1700 + Math.random() * 2000);
  }

  function openLightbox(id) {
    const p = XZ.activePersona();
    const ph = (p.photos || []).find((x) => x.id === id);
    if (!ph) return;
    const safeLb = ph.img ? XZ.safeImg(ph.img) : '';
    $('#lbArt').style.cssText = safeLb
      ? "background-image:url('" + safeLb + "');background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#0B0A08;"
      : XZ.photoCSS(ph);
    $('#lbCap').textContent = ph.cap;
    $('#lbMeta').textContent = (ph.place || '') + ' · ' + XZ.time.fmtDayLabel(ph.ts);
    const box = $('#lbCmts');
    if (box) {
      const cs = ph.comments || [];
      if (cs.length) {
        box.innerHTML = cs.map((c) => '<div class="lb-cmt"><div class="avatar avatar-xs" style="'
          + (c.by === 'ta' ? XZ.avatarStyle(p) : 'background:linear-gradient(150deg,#B99B7C,#7E6650)') + '">'
          + (c.by === 'ta' ? esc(XZ.avatarText(p)) : '我') + '</div>'
          + '<div class="lb-cmt-txt"><b>' + esc(c.by === 'ta' ? p.name : '我') + '</b>' + esc(c.text) + '</div></div>').join('');
        box.hidden = false;
      } else {
        box.innerHTML = '';
        box.hidden = true;
      }
    }
    if ((ph.comments || []).length && !ph.seen) {
      ph.seen = true;
      XZ.store.save();
      renderAlbum(p);
    }
    $('#lightbox').hidden = false;
  }

  /* 往相册里放一张自己的照片 */
  let pendingPhoto = null;
  let pendingStats = null;

  function imgStats(ctx, w, h) {
    try {
      const d = ctx.getImageData(0, 0, w, h).data;
      let r = 0, g = 0, b = 0, n = 0;
      const step = 4 * Math.max(1, Math.floor((w * h) / 4000));
      for (let i = 0; i < d.length; i += step) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      if (!n) return null;
      r /= n; g /= n; b /= n;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return {
        bright: (0.299 * r + 0.587 * g + 0.114 * b) / 255,
        warm: (r - b) / 255,
        mono: (mx - mn) < 18,
        vivid: (mx - mn) / 255,
      };
    } catch (e) { return null; }
  }

  function addPhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { XZ.shell.toast('选一张图片'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 900;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, c.width, c.height);
          pendingPhoto = c.toDataURL('image/jpeg', 0.78);
          pendingStats = imgStats(ctx, c.width, c.height);
          photoSheet(pendingPhoto);
        };
        img.onerror = () => XZ.shell.toast('这张图读不出来');
        img.src = String(reader.result);
      };
      reader.readAsDataURL(f);
    };
    input.click();
  }

  function photoSheet(dataUrl) {
    XZ.shell.sheet('<p class="sheet-title">放进相册</p>'
      + '<div class="ph-preview" style="background-image:url(' + dataUrl + ')"></div>'
      + '<div class="set-field" style="padding:12px 0 10px"><label>写一句说明</label>'
      + '<input class="set-input" id="phCap" maxlength="20" placeholder="比如：今天的云" value=""></div>'
      + '<button class="btn btn-primary btn-lg" data-act="ph-save">放进相册</button>'
      + '<button class="sheet-cancel" data-act="sheet-close">取消</button>');
  }

  function photoSave() {
    const p = XZ.activePersona();
    if (!pendingPhoto) return;
    const cap = (($('#phCap') || {}).value || '').trim() || '你放进去的照片';
    p.photos = p.photos || [];
    const mineCount = p.photos.filter((x) => x.img).length;
    if (mineCount >= 12) { XZ.shell.toast('最多放 12 张自己的照片，再多手机存储会吃不消'); return; }
    p.photos.unshift({
      id: XZ.uid('ph'), ts: Date.now(), cap: cap, place: '你给的', scene: null, img: pendingPhoto,
      stats: pendingStats,
    });
    if (p.photos.length > 40) p.photos = p.photos.slice(0, 40);
    XZ.store.save();
    pendingPhoto = null;
    pendingStats = null;
    XZ.shell.closeSheet();
    renderAlbum(p);
    XZ.shell.toast('放进去了');
    scheduleTaComment(p, p.photos[0]);
  }
  function closeLightbox() { $('#lightbox').hidden = true; }

  /* ============================================================
     查手机
     ============================================================ */
  let insTab = 'notes';
  function renderInspect(p) {
    XZ.$$('#inspectTabs .tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === insTab));
    const box = $('#inspectBody');
    box.className = 'app-body inspect-body';
    if (insTab === 'notes') {
      const list = (p.notes || []);
      box.innerHTML = list.map((n, i) => '<div class="ins-card' + (i === 0 ? ' hit' : '') + '">'
        + '<div class="ins-top"><b>' + esc(n.title) + '</b><time>' + XZ.relTime(n.ts) + '</time></div>'
        + '<p>' + esc(n.text) + '</p></div>').join('') || '<div class="ins-empty">空的。</div>';
    } else if (insTab === 'search') {
      const list = (p.searches || []);
      box.innerHTML = list.map((s) => '<div class="ins-search">'
        + '<svg class="ic"><use href="#i-magnify"/></svg><span>' + esc(s.q) + '</span>'
        + '<time>' + XZ.relTime(s.ts) + '</time></div>').join('') || '<div class="ins-empty">没有搜索记录。</div>';
    } else {
      const list = (p.drafts || []);
      box.innerHTML = list.map((d) => '<div class="ins-card">'
        + '<span class="ins-tag">未发送</span>'
        + '<p>' + esc(d.text) + '</p>'
        + '<div class="ins-top" style="margin:8px 0 0"><span></span><time>' + XZ.relTime(d.ts) + '</time></div>'
        + '</div>').join('') || '<div class="ins-empty">草稿箱是空的。</div>';
      box.innerHTML += '<div class="app-footnote">有些话打完了，没有发出去。</div>';
    }
  }
  function setInspectTab(tab) { insTab = tab; renderInspect(XZ.activePersona()); }

  /* ============================================================
     飞行棋
     ============================================================ */
  let rollBusy = false;
  const TOTAL = 24;
  const SPECIAL = {
    4: { type: 'go', n: 2, text: '顺风，前进两格' },
    7: { type: 'back', n: 2, text: '鞋带松了，后退两格' },
    10: { type: 'again', text: '掷骰子的人可以再掷一次' },
    14: { type: 'talk', text: '停下来聊两句' },
    18: { type: 'back', n: 3, text: '走错路了，后退三格' },
    21: { type: 'go', n: 2, text: '抄了个近道，前进两格' },
  };
  const TA_WIN = ['……赢了。|那我说了。', '我先到。|愿赌服输。', '赢了你。|不过你想要什么，我也可以给你。'];
  const TA_LOSE = ['……你赢了。|说吧。', '输了。|别得意。', '好吧。|你要我做什么。'];
  const TA_ROLL = ['轮到我。', '该我了。', '我掷了。'];
  const TA_TALK = ['这一格要聊天。|你说点好听的。', '停下来聊两句。|今天过得怎么样。', '聊两句吧。|你刚才在想什么。'];

  function gameState(p) {
    if (!p.game) p.game = { w: 0, l: 0, played: 0 };
    if (p.game.busy) p.game.busy = false;
    if (!p.game.pos) p.game.pos = { me: 0, ta: 0 };
    if (!p.game.log) p.game.log = [];
    if (!p.game.turn) p.game.turn = 'me';
    return p.game;
  }

  function cellOrder() {
    // 蛇形：第 0 行左→右，第 1 行右→左，第 2 行左→右，第 3 行右→左
    const rows = [];
    for (let r = 0; r < 4; r++) {
      const line = [];
      for (let c = 0; c < 6; c++) line.push(r * 6 + c + 1);
      if (r % 2 === 1) line.reverse();
      rows.push(line);
    }
    return rows;
  }

  function renderGame(p) {
    const g = gameState(p);
    $('#gameScore').textContent = g.w + ' : ' + g.l;
    if (!g.rulesSeen) { g.rulesSeen = true; XZ.store.save(); setTimeout(() => rulesSheet(), 380); }
    const bsTa = $('#bsTa');
    if (bsTa) bsTa.textContent = p.name;
    const start = $('#boardStart');
    if (start) {
      start.classList.toggle('empty', g.pos.me !== 0 && g.pos.ta !== 0);
      $$('.pawn', start).forEach((el) => {
        el.style.opacity = (el.classList.contains('me') ? g.pos.me : g.pos.ta) === 0 ? '1' : '0';
      });
    }
    const board = $('#board');
    let html = '';
    cellOrder().forEach((row) => {
      row.forEach((num) => {
        const sp = SPECIAL[num];
        const cls = 'cell' + (num === TOTAL ? ' end' : '') + (sp ? ' special' : '');
        let inner = String(num);
        if (num === TOTAL) inner = '终点';
        if (g.pos.me === num) inner += '<span class="pawn me"></span>';
        if (g.pos.ta === num) inner += '<span class="pawn ta"></span>';
        html += '<div class="' + cls + '">' + inner + '</div>';
      });
    });
    board.innerHTML = html;
    const log = $('#gameLog');
    log.innerHTML = g.log.slice(-8).map((l) => '<div class="' + l.cls + '">' + esc(l.text) + '</div>').join('')
      || '<div>还没开始。你先掷。</div>';
    log.scrollTop = log.scrollHeight;
    $('#rollBtn').textContent = g.over ? '再来一局' : (rollBusy ? '…' : '掷骰子');
    const tip = $('#gameTip');
    if (tip) {
      tip.textContent = g.over ? '这一局结束了。点「再来一局」。'
        : rollBusy ? (g.turn === 'ta' ? p.name + ' 正在掷…' : '你在掷…')
        : '轮到你了。';
    }
  }

  function gLog(g, text, cls) {
    g.log.push({ text, cls: cls || '' });
    if (g.log.length > 60) g.log.shift();
  }

  async function doTurn(p, g, who) {
    // 「再掷一次」机关最多连掷两次，避免死循环
    for (let i = 0; i < 2; i++) {
      if (g.over) return;
      const n = 1 + Math.floor(Math.random() * 6);
      gLog(g, (who === 'me' ? '你' : p.name) + ' 掷出 ' + n, who === 'me' ? 'me-line' : 'ta-line');
      const again = await step(p, g, who, n);
      if (g.over || !again) return;
      gLog(g, (who === 'me' ? '你' : p.name) + ' 再掷一次', who === 'me' ? 'me-line' : 'ta-line');
      renderGame(p);
      await XZ.sleep(520);
    }
  }

  async function roll() {
    const p = XZ.activePersona();
    const g = gameState(p);
    if (rollBusy) return;
    if (g.over) {
      g.over = false; g.pos = { me: 0, ta: 0 }; g.log = []; g.turn = 'me';
      renderGame(p);
      return;
    }
    rollBusy = true; g.turn = 'me';
    renderGame(p);

    await doTurn(p, g, 'me');
    if (g.over) { rollBusy = false; renderGame(p); XZ.store.save(); return; }

    await XZ.sleep(650);
    g.turn = 'ta';
    gLog(g, p.name + '：' + pick(TA_ROLL), 'ta-line');
    renderGame(p);
    await XZ.sleep(560);
    await doTurn(p, g, 'ta');

    g.turn = 'me';
    rollBusy = false;
    renderGame(p);
    XZ.store.save();
  }

  async function step(p, g, who, n) {
    g.pos[who] = XZ.clamp(g.pos[who] + n, 0, TOTAL);
    renderGame(p);
    await XZ.sleep(340);
    const sp = SPECIAL[g.pos[who]];
    let again = false;
    if (sp) {
      gLog(g, sp.text, who === 'me' ? 'me-line' : 'ta-line');
      if (sp.type === 'go' || sp.type === 'back') {
        g.pos[who] = XZ.clamp(g.pos[who] + (sp.type === 'go' ? sp.n : -sp.n), 0, TOTAL);
        renderGame(p);
        await XZ.sleep(420);
      } else if (sp.type === 'again') {
        again = true;
      } else if (sp.type === 'talk') {
        const line = pick(TA_TALK).split('|');
        line.forEach((x) => gLog(g, p.name + '：' + x, 'ta-line'));
        renderGame(p);
      }
    }
    if (g.pos[who] >= TOTAL) {
      g.over = true;
      g.played = (g.played || 0) + 1;
      if (who === 'me') {
        g.w += 1;
        const l = pick(TA_LOSE).split('|');
        gLog(g, '你到终点了。', 'me-line');
        l.forEach((x) => gLog(g, p.name + '：' + x, 'ta-line'));
      } else {
        g.l += 1;
        const l = pick(TA_WIN).split('|');
        gLog(g, p.name + ' 先到终点。', 'ta-line');
        l.forEach((x) => gLog(g, p.name + '：' + x, 'ta-line'));
      }
      XZ.store.save();
    }
    return again;
  }

  function resetGame() {
    const p = XZ.activePersona();
    const g = gameState(p);
    g.pos = { me: 0, ta: 0 }; g.log = []; g.over = false; g.busy = false;
    rollBusy = false;
    XZ.store.save();
    renderGame(p);
  }

  function rulesSheet() {
    const p = XZ.activePersona();
    XZ.shell.sheet(
      '<p class="sheet-title">飞行棋怎么玩</p>'
      + '<div class="gp-rules">'
      + '<div class="gp-rule"><span class="r-ico me"></span><div><b>你有枚红色棋子</b>从「起点」出发，' + esc(p.name) + ' 有一枚绿色的。</div></div>'
      + '<div class="gp-rule"><span class="r-ico ta"></span><div><b>轮流掷骰子</b>你先掷，点一次「掷骰子」走一格数，然后轮到 TA。</div></div>'
      + '<div class="gp-rule"><span class="r-ico sp"></span><div><b>浅绿色的格子有机关</b>前进两格、后退、再掷一次，或者停下来聊两句。</div></div>'
      + '<div class="gp-rule"><span class="r-ico end"></span><div><b>先到「终点」的人赢</b>赢的人可以跟对方提一个要求。</div></div>'
      + '</div>'
      + '<button class="btn btn-primary btn-lg" style="margin-top:16px" data-act="sheet-close">知道了，开一局</button>');
  }

  /* ============================================================
     设置
     ============================================================ */
  function renderSettings() {
    const S = XZ.state.settings;
    const p = XZ.activePersona();
    const people = Object.values(XZ.state.people);
    const api = S.api;
    const prov = XZ.engine.providerOf(api.provider);
    const days = time.daysBetween(p.createdAt);
    const totalMsgs = p.chat.msgs.filter((m) => m.from !== 'sys').length;

    let html = '';

    html += '<div class="set-group"><h2>住在这里的人</h2><div class="set-card">'
      + '<button class="set-row" data-act="persona-edit"><div class="avatar avatar-sm" style="' + XZ.avatarStyle(p) + '">' + esc(XZ.avatarText(p)) + '</div>'
      + '<div class="grow"><b>' + esc(p.name) + '</b><span class="sub">' + esc(p.relation) + ' · ' + esc(XZ.VOICES[p.voice].name) + '</span></div>'
      + '<span class="chev">›</span></button>'
      + '<button class="set-row" data-act="persona-new"><svg class="ic"><use href="#i-plus"/></svg><div class="grow">再请一个人住进来</div><span class="chev">›</span></button>'
      + '<button class="set-row" data-act="mem-open"><svg class="ic"><use href="#i-book"/></svg>'
      + '<div class="grow">TA 记得的事<span class="sub">可以看，也可以删掉让他忘掉</span></div>'
      + '<span class="val">' + (p.memories || []).length + ' 条</span><span class="chev">›</span></button>'
      + (people.length > 1 ? '<button class="set-row" data-act="persona-switch"><svg class="ic"><use href="#i-chat"/></svg><div class="grow">换一台手机</div><span class="val">' + people.length + ' 人在住</span></button>' : '')
      + '</div><p class="set-note">每个人有独立的聊天、动态、日记和记忆，互不打扰。</p></div>';

    html += '<div class="set-group"><h2>聊天引擎</h2><div class="set-card">'
      + '<div class="set-row"><span class="status-dot ' + (S.engine === 'api' && api.key ? '' : 'off') + '"></span>'
      + '<div class="grow">当前引擎：<b>' + (S.engine === 'api' && api.key ? '在线模型' : '本地人格引擎') + '</b>'
      + '<span class="sub">' + (S.engine === 'api' && api.key ? (prov.name + ' · ' + api.model) : '离线运行，不花钱，不联网') + '</span></div></div>'
      + '<div class="set-field"><label>用哪个引擎聊天</label><div class="chips">'
      + '<button class="chip' + (S.engine === 'local' ? ' on' : '') + '" data-act="set-engine" data-v="local">本地（免费）</button>'
      + '<button class="chip' + (S.engine === 'api' ? ' on' : '') + '" data-act="set-engine" data-v="api">在线模型（更强）</button>'
      + '</div></div>';

    if (S.engine === 'api') {
      if (api.key && !apiAdvOpen) {
        html += '<div class="set-field" style="padding:12px 15px 14px">'
          + '<div class="api-status"><span class="ok-dot"></span><b>' + esc(prov.name) + '</b>'
          + '<span class="api-model">' + esc(api.model) + '</span></div>'
          + '<p class="hint" style="margin-top:8px">连不上会自动退回本地。Key 只存在这台设备里，备份文件里也不会有。</p>'
          + '<div class="api-actions">'
          + '<button class="chip" data-act="api-wizard">重新设置</button>'
          + '<button class="chip" data-act="api-adv">高级设置</button>'
          + '</div></div>';
      } else if (!api.key && !apiAdvOpen) {
        html += '<div class="set-field" style="padding:12px 15px 16px">'
          + '<p class="hint" style="margin:0 0 12px">还没接上。接上之后他能听懂长句子、不再重复那几句；大概 10 元能用很久。</p>'
          + '<button class="btn btn-primary btn-lg" data-act="api-wizard">开始三步设置</button>'
          + '<button class="btn btn-ghost" style="height:38px" data-act="api-adv">我懂，直接填</button>'
          + '</div>';
      } else {
        html += '<div class="set-field"><label>服务商</label><div class="chips">'
          + XZ.engine.PROVIDERS.map((x) => '<button class="chip' + (api.provider === x.id ? ' on' : '') + '" data-act="set-provider" data-v="' + x.id + '">' + esc(x.name.split('（')[0]) + '</button>').join('')
          + '</div><p class="hint">' + esc(prov.tip) + '</p></div>';
        html += '<div class="set-field"><label>API Key</label>'
          + '<input class="set-input" id="apiKey" type="password" value="' + esc(api.key) + '" placeholder="粘贴在这里，只存在本机" autocomplete="off" spellcheck="false">'
          + (prov.keyUrl ? '<p class="hint">还没有 Key？<a href="' + prov.keyUrl + '" target="_blank" rel="noreferrer" style="color:var(--accent);text-decoration:none">去 ' + esc(prov.name.split('（')[0]) + ' 申请一个 ›</a></p>' : '')
          + '<p class="hint">只存在这台设备里，只有你开在线模式时才会用它去连你选的服务商。备份文件里不会包含 Key。</p></div>';
        html += '<div class="set-field"><label>模型名</label>'
          + '<input class="set-input" id="apiModel" value="' + esc(api.model) + '" spellcheck="false"></div>';
        if (api.provider === 'custom') {
          html += '<div class="set-field"><label>接口地址（Base URL）</label>'
            + '<input class="set-input" id="apiBase" value="' + esc(api.baseUrl) + '" placeholder="https://…/v1" spellcheck="false"></div>';
        }
        html += '<button class="set-row" data-act="api-test"><svg class="ic"><use href="#i-check"/></svg>'
          + '<div class="grow">测试连接<span class="sub" id="apiTestMsg">点一下，看看能不能连上</span></div></button>'
          + '<button class="btn btn-ghost" style="height:40px" data-act="api-adv">收起</button>';
      }
    }
    html += '</div><p class="set-note">本地引擎不花钱、也不出网——聊天内容不离开这台设备。接在线模型后，你的对话会发给你自己选的那家服务商（用你自己的账号），不经过我们。连不上会自动退回本地，聊天不会断。</p></div>';

    html += '<div class="set-group"><h2>看起来的样子</h2><div class="set-card">'
      + '<div class="set-field"><label>主题</label><div class="chips">'
      + [['light', '白天'], ['night', '夜间'], ['auto', '跟着时间']].map((x) =>
        '<button class="chip' + (S.theme === x[0] ? ' on' : '') + '" data-act="set-theme" data-v="' + x[0] + '">' + x[1] + '</button>').join('')
      + '</div></div>'
      + '<div class="set-field"><label>壁纸</label><div class="chips">'
      + [['dusk', '暮色'], ['mist', '晨雾'], ['paper', '纸'], ['night', '夜航']].map((x) =>
        '<button class="chip' + (S.wall === x[0] ? ' on' : '') + '" data-act="set-wall" data-v="' + x[0] + '">' + x[1] + '</button>').join('')
      + '</div></div></div></div>';

    html += '<div class="set-group"><h2>你们的这 ' + days + ' 天</h2><div class="stat-grid">'
      + '<div class="stat"><b>' + days + '</b><span>认识天数</span></div>'
      + '<div class="stat"><b>' + totalMsgs + '</b><span>聊天条数</span></div>'
      + '<div class="stat"><b>' + Math.round(p.bond) + '</b><span>亲密度</span></div>'
      + '<div class="stat"><b>' + (p.memories || []).length + '</b><span>TA 记得的事</span></div>'
      + '<div class="stat"><b>' + (p.diaries || []).length + '</b><span>日记</span></div>'
      + '<div class="stat"><b>' + (p.photos || []).length + '</b><span>照片</span></div>'
      + '</div></div>';

    html += '<div class="set-group"><h2>数据</h2>'
      + (XZ.store.failing
        ? '<div class="warn-card">保存不了：' + esc(XZ.store.lastError || '浏览器拒绝写入')
        + '<span>现在聊的内容不会被保存，关掉页面就没了。先点下面的「导出备份」。</span></div>'
        : '')
      + '<div class="set-card">'
      + '<button class="set-row" data-act="export-all"><svg class="ic"><use href="#i-down"/></svg>'
      + '<div class="grow">导出备份<span class="sub">聊天、人设、日记、照片说明，全在这一个文件里</span></div><span class="chev">›</span></button>'
      + '<button class="set-row" data-act="import-all"><svg class="ic"><use href="#i-up"/></svg>'
      + '<div class="grow">导入备份<span class="sub">换手机、换浏览器时用它搬过去</span></div><span class="chev">›</span></button>'
      + '<button class="set-row" data-act="export-chat"><svg class="ic"><use href="#i-chat"/></svg>'
      + '<div class="grow">导出聊天记录（txt）<span class="sub">能直接打开看的纯文本</span></div><span class="chev">›</span></button>'
      + '<button class="set-row" data-act="wipe"><svg class="ic"><use href="#i-trash"/></svg>'
      + '<div class="grow" style="color:var(--danger)">清空这台手机</div><span class="chev">›</span></button>'
      + '</div><p class="set-note">' + (S.lastExport
        ? '上次导出：' + time.fmtDayLabel(S.lastExport) + '。'
        : '还没导出过。') + '数据默认只存在这个浏览器里，清缓存就没了，建议一周导一次。</p></div>';

    html += '<div class="set-group"><h2>关于</h2><div class="set-card">'
      + '<button class="set-row" data-act="open-app" data-app="manual"><svg class="ic"><use href="#i-manual"/></svg>'
      + '<div class="grow">说明书</div><span class="chev">›</span></button>'
      + '<div class="set-row"><div class="grow">版本<span class="sub">小住 1.0 · 一台住着人的小手机</span></div><span class="val">' + (XZ.VERSION || '1.0') + '</span></div>'
      + '</div><p class="set-note">TA 说的话由程序生成，不是真人。别把真实姓名、住址、身份证、银行卡这些告诉任何 AI；心里不舒服的时候，去找真人聊聊。</p></div>';

    $('#settingsBody').innerHTML = html;
  }

  /* ============================================================
     在线模型：三步向导（给不懂技术的人用）
     ============================================================ */
  let wizStep = 1, wizProvider = 'deepseek', wizState = '', wizMsg = '';
  let wizKeyText = '', wizBaseText = '', wizModelText = '';
  let apiAdvOpen = false;

  const WIZ_PROVIDERS = [
    { id: 'deepseek', name: 'DeepSeek', hint: '便宜、中文自然 · 推荐' },
    { id: 'moonshot', name: 'Kimi', hint: '记得多' },
    { id: 'siliconflow', name: '硅基流动', hint: '有免费额度' },
    { id: 'dashscope', name: '阿里百炼', hint: '有免费额度' },
    { id: 'custom', name: '其他', hint: '自己填地址' },
  ];

  function apiWizard(step) {
    if (step) { wizStep = step; wizState = ''; wizMsg = ''; }
    const prov = XZ.engine.providerOf(wizProvider);
    const dots = '<div class="wiz-dots">'
      + [1, 2, 3].map((i) => '<i class="' + (i <= wizStep ? 'on' : '') + '"></i>').join('') + '</div>';
    let html = '';

    if (wizStep === 1) {
      html = '<p class="sheet-title">接上在线模型，他会更会聊天</p>' + dots
        + '<div class="wiz-body">'
        + '<p>现在用的是<b>本地引擎</b>：不花钱、不联网，但聊久了会重复那几句话。</p>'
        + '<p>接一个在线模型，他能听懂长句子、记得住上下文，回答不再像模板。</p>'
        + '<p class="wiz-note">需要注册一个账号（免费），大概 10 块钱能用很久。'
        + '不接也能继续用，随时能反悔。</p></div>'
        + '<p class="wiz-label">你在哪家注册？</p>'
        + '<div class="wiz-prov">'
        + WIZ_PROVIDERS.map((p) => '<button class="wiz-prow' + (wizProvider === p.id ? ' on' : '') + '" '
          + 'data-act="wiz-prov" data-v="' + p.id + '"><b>' + p.name + '</b><span>' + p.hint + '</span></button>').join('')
        + '</div>'
        + '<button class="btn btn-primary btn-lg" data-act="wiz-next">下一步：去注册</button>'
        + '<button class="btn btn-ghost" data-act="wiz-later">先不用，就本地</button>';
    } else if (wizStep === 2) {
      html = '<p class="sheet-title">第 2 步 · 把那串东西贴进来</p>' + dots
        + '<div class="wiz-body">'
        + '<p>1. 打开 ' + esc(prov.name) + ' 后台，创建一把 Key</p>'
        + '<p>2. 复制那串 <b>sk-</b> 开头的东西</p>'
        + '<p>3. 回到这里，贴进下面的框</p></div>'
        + (prov.keyUrl ? '<button class="wiz-link" data-act="wiz-open-site">打开 ' + esc(prov.name) + ' 的申请页 ↗</button>' : '')
        + '<textarea id="wizKey" class="set-input wiz-key" rows="3" placeholder="粘贴到这里，多打的空格、引号都不用管"></textarea>'
        + (wizProvider === 'custom'
          ? '<input class="set-input" id="wizBase" placeholder="接口地址，例如 https://…/v1" style="margin-bottom:8px">'
            + '<input class="set-input" id="wizModel" placeholder="模型名，例如 gpt-4o-mini">'
          : '')
        + (wizState === 'testing' ? '<p class="wiz-tip">正在试着连一下…</p>' : '')
        + (wizState === 'fail' ? '<p class="wiz-tip bad">' + esc(wizMsg) + '</p>' : '')
        + '<button class="btn btn-primary btn-lg" data-act="wiz-test"' + (wizState === 'testing' ? ' disabled' : '') + '>试一试</button>'
        + '<button class="btn btn-ghost" data-act="wiz-back">返回上一步</button>';
    } else {
      html = '<p class="sheet-title">成了</p>' + dots
        + '<div class="wiz-body">'
        + '<p>连上了，用了 ' + esc(wizMsg || '不到 1') + ' 秒。以后就他来陪你聊天。</p>'
        + '<p class="wiz-note">连不上会自动退回本地，聊天不会断。想换随时在设置里重新设置。</p></div>'
        + '<button class="btn btn-primary btn-lg" data-act="sheet-close">知道了</button>';
    }

    XZ.shell.sheet(html);

    if (wizStep === 2) {
      const ta = $('#wizKey');
      if (ta) {
        ta.value = wizKeyText;
        ta.addEventListener('input', () => { wizKeyText = ta.value; });
        if (window.innerWidth > 520) setTimeout(() => ta.focus(), 200);
      }
      const b = $('#wizBase'); if (b) { b.value = wizBaseText; b.addEventListener('input', () => { wizBaseText = b.value; }); }
      const m = $('#wizModel'); if (m) { m.value = wizModelText; m.addEventListener('input', () => { wizModelText = m.value; }); }
    }
  }

  function wizNext() {
    const prov = XZ.engine.providerOf(wizProvider);
    if (prov.keyUrl) {
      try { const w = window.open(prov.keyUrl, '_blank', 'noopener'); if (!w) XZ.shell.toast('浏览器拦了弹窗，点第 2 步里的链接也行'); } catch (e) {}
    }
    apiWizard(2);
  }

  let wizGen = 0;

  async function wizTest() {
    const key = XZ.extractKey(wizKeyText);
    if (!key) {
      wizState = 'fail';
      wizMsg = '没看到 Key。它一般是一长串以 sk- 开头的字符。';
      apiWizard();
      return;
    }
    const prov = XZ.engine.providerOf(wizProvider);
    const cfg = {
      provider: wizProvider,
      key: key,
      baseUrl: wizProvider === 'custom' ? String(wizBaseText || '').trim() : prov.baseUrl,
      model: wizProvider === 'custom' ? String(wizModelText || '').trim() : prov.model,
    };
    const myGen = ++wizGen;

    // 关键：先不写存档，只拿临时配置去试；成功了才落盘
    wizState = 'testing'; wizMsg = '';
    apiWizard();

    try {
      const ms = await XZ.engine.test(cfg);
      if (myGen !== wizGen) return;
      Object.assign(XZ.state.settings.api, cfg);
      XZ.state.settings.engine = 'api';
      XZ.state.settings.apiOnboarded = true;
      XZ.store.save();
      wizStep = 3; wizState = 'ok'; wizMsg = (ms / 1000).toFixed(1);
      apiWizard();
      XZ.shell.refreshHome();
      renderSettings();
    } catch (e) {
      if (myGen !== wizGen) return;
      wizState = 'fail';
      wizMsg = XZ.engineHint(e);
      apiWizard();
    }
  }

  function wizLater() {
    XZ.state.settings.apiDeclinedAt = Date.now();
    XZ.state.settings.engine = 'local';
    XZ.store.save();
    XZ.shell.closeSheet();
    renderSettings();
    XZ.shell.toast('那就用本地的，随时能改', 2600);
  }

  function wizPick(id) { wizProvider = id; apiWizard(1); }
  function wizBack() { apiWizard(1); }
  function wizOpenSite() {
    const p = XZ.engine.providerOf(wizProvider);
    if (!p.keyUrl) return;
    try { const w = window.open(p.keyUrl, '_blank', 'noopener'); if (!w) XZ.shell.toast('浏览器拦了弹窗，直接搜「' + p.name + ' API Key」也能找到'); } catch (e) {}
  }
  function toggleAdv() { apiAdvOpen = !apiAdvOpen; renderSettings(); }

  async function apiTest() {
    const msg = $('#apiTestMsg');
    if (msg) msg.textContent = '正在连…';
    const S = XZ.state.settings;
    S.api.key = ($('#apiKey') || {}).value || S.api.key;
    S.api.model = ($('#apiModel') || {}).value || S.api.model;
    const base = $('#apiBase');
    if (base) S.api.baseUrl = base.value.trim();
    XZ.store.save();
    try {
      const ms = await XZ.engine.test();
      if (msg) msg.textContent = '连上了，用了 ' + (ms / 1000).toFixed(1) + ' 秒。以后就用它聊。';
      XZ.shell.toast('连上了');
    } catch (e) {
      const t = String(e.message || e);
      let hint = '没连上。检查 Key 和模型名。';
      if (/Failed to fetch|NetworkError/i.test(t)) hint = '没连上：这个服务可能不允许网页直接调用，换 DeepSeek / Kimi / 硅基流动 / 百炼试试。';
      else if (/401|403/.test(t)) hint = 'Key 不对，或者这个 Key 没有权限。';
      else if (/404/.test(t)) hint = '接口地址或模型名不对。';
      else if (/429/.test(t)) hint = '额度用完了，或者请求太频繁。';
      if (msg) msg.textContent = hint;
      XZ.shell.toast(hint, 4200);
    }
  }

  /* ============================================================
     人设编辑（含头像 / 背景故事 / 作息 / 说话习惯）
     ============================================================ */
  let peRel = null, peVoice = null, peAvatar = null, peNew = false;

  function hhmm(h) {
    const hh = Math.floor(h) % 24;
    const mm = Math.round((h - Math.floor(h)) * 60);
    return time.pad2(hh) + ':' + time.pad2(mm % 60);
  }

  function personaSheet(p) {
    const isNew = !p;
    peNew = isNew;
    p = p || XZ.activePersona();
    peRel = isNew ? (p.relation || '朋友') : p.relation;
    peVoice = isNew ? (p.voice || 'gentle') : p.voice;
    peAvatar = isNew ? null : (p.avatarImg || null);
    const q = (p && p.quirks) || {};
    const qsum = [];
    if (q.tail) qsum.push('句尾加「' + q.tail + '」');
    if (q.noStop) qsum.push('不用句号');
    if (q.selfRef) qsum.push('自称「' + q.selfRef + '」');
    if (q.from && q.to) qsum.push('「' + q.from + '」→「' + q.to + '」');
    const rtCount = (p && p.routine) ? p.routine.length : 0;

    const avStyle = peAvatar
      ? "background-image:url('" + peAvatar + "');background-size:cover;background-position:center;"
      : XZ.avatarStyle({ avatarSeed: isNew ? 'pe-new' : p.avatarSeed });
    const avTxt = peAvatar ? '' : (isNew ? '' : XZ.avatarText(p));

    const html = '<p class="sheet-title">' + (isNew ? '新住进来的人' : '改一改 TA 的样子') + '</p>'
      + '<div class="pe-avatar-row">'
      + '<div class="avatar avatar-lg" id="peAvatarPreview" style="' + avStyle + '">' + esc(avTxt) + '</div>'
      + '<div class="pe-avatar-btns">'
      + '<button class="btn btn-soft pe-btn" data-act="pe-avatar">' + (peAvatar ? '换一张图' : '上传头像') + '</button>'
      + (peAvatar ? '<button class="btn btn-ghost pe-btn" data-act="pe-avatar-reset">用默认</button>' : '')
      + '</div></div>'
      + '<input type="file" id="peFile" accept="image/*" hidden>'

      + '<div class="set-field" style="padding:12px 0 10px"><label>名字</label><input class="set-input" id="peName" maxlength="12" value="' + esc(isNew ? '' : p.name) + '"></div>'
      + '<div class="set-field" style="padding:0 0 10px"><label>TA 怎么叫你</label><input class="set-input" id="peCall" maxlength="12" value="' + esc(isNew ? '你' : p.call) + '"></div>'
      + '<div class="set-field" style="padding:0 0 10px"><label>关系</label><div class="chips" id="peRelation">'
      + XZ.RELATIONS.map((r) => '<button class="chip' + (peRel === r ? ' on' : '') + '" data-act="pe-pick" data-group="rel" data-v="' + esc(r) + '">' + esc(r) + '</button>').join('')
      + '</div></div>'
      + '<div class="set-field" style="padding:0 0 10px"><label>语气</label><div class="chips" id="peVoice">'
      + Object.keys(XZ.VOICES).map((v) => '<button class="chip' + (peVoice === v ? ' on' : '') + '" data-act="pe-pick" data-group="voice" data-v="' + v + '">' + XZ.VOICES[v].name + '</button>').join('')
      + '</div></div>'
      + '<div class="set-field" style="padding:0 0 10px"><label>职业 / 平时在做什么</label>'
      + '<input class="set-input" id="peJob" maxlength="16" placeholder="比如：出版社编辑、大四学生" value="' + esc(isNew ? '' : p.job || '') + '"></div>'
      + '<div class="set-field" style="padding:0 0 10px"><label>签名（显示在动态页）</label>'
      + '<input class="set-input" id="peBio" maxlength="30" placeholder="比如：晚上十点之后，话会多一点" value="' + esc(isNew ? '' : p.bio || '') + '"></div>'
      + '<div class="set-field" style="padding:0 0 10px"><label>口头禅（偶尔会带出来）</label>'
      + '<input class="set-input" id="peCatch" maxlength="10" placeholder="比如：别熬" value="' + esc(isNew ? '' : p.catchphrase || '') + '"></div>'
      + '<div class="set-field" style="padding:0 0 14px"><label>背景故事（TA 是谁、你们怎么认识的）</label>'
      + '<textarea class="set-input pe-story" id="peStory" rows="4" maxlength="900" placeholder="比如：他在这条街上开了六年修表店，最擅长假装不在意。你们是初中同学，十年没见，去年在店门口撞上。">' + esc(isNew ? '' : p.story || '') + '</textarea>'
      + '<p class="hint">接在线模型时，这段会作为 TA 的"内心设定"塞进提示词；只用本地引擎时它不会影响对话。</p></div>'
      + (isNew
        ? '<p class="hint" style="padding:0 2px 12px">建好之后，可以继续设置作息时间表和说话习惯。</p>'
        : '<div class="pe-links">'
          + '<button class="set-row" data-act="pe-routine"><svg class="ic"><use href="#i-book"/></svg>'
          + '<div class="grow">作息时间表<span class="sub">TA 几点在做什么 —— 决定"在干嘛"怎么答</span></div>'
          + '<span class="val">' + rtCount + ' 段</span><span class="chev">›</span></button>'
          + '<button class="set-row" data-act="pe-quirks"><svg class="ic"><use href="#i-chat"/></svg>'
          + '<div class="grow">说话习惯<span class="sub">句尾语气、自称、替换词</span></div>'
          + '<span class="val">' + (qsum.length ? qsum.join('·') : '默认') + '</span><span class="chev">›</span></button>'
          + '</div>')
      + '<button class="btn btn-primary btn-lg" style="margin-top:14px" data-act="' + (isNew ? 'pe-create' : 'pe-save') + '">' + (isNew ? '住进来' : '保存') + '</button>'
      + '<button class="sheet-cancel" data-act="sheet-close">取消</button>';

    XZ.shell.sheet(html);
    const f = $('#peFile');
    if (f) f.addEventListener('change', pePickFile);
  }

  function pePick(group, v) {
    if (group === 'rel') peRel = v; else peVoice = v;
    const wrap = group === 'rel' ? $('#peRelation') : $('#peVoice');
    if (!wrap) return;
    XZ.$$('.chip', wrap).forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  }

  function pePickFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { XZ.shell.toast('选一张图片'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 160;
        const c = document.createElement('canvas');
        c.width = S; c.height = S;
        const g = c.getContext('2d');
        const side = Math.min(img.width, img.height);
        g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
        peAvatar = c.toDataURL('image/jpeg', 0.82);
        peAvatarPreview();
      };
      img.onerror = () => XZ.shell.toast('这张图读不出来');
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function peAvatarPreview() {
    const el = $('#peAvatarPreview');
    if (!el) return;
    if (peAvatar) {
      el.style.cssText = "background-image:url('" + peAvatar + "');background-size:cover;background-position:center;";
      el.textContent = '';
    } else {
      const p = XZ.activePersona();
      el.style.cssText = XZ.avatarStyle(p);
      el.textContent = XZ.avatarText(p);
    }
    const btn = document.querySelector('[data-act="pe-avatar"]');
    const resetBtn = document.querySelector('[data-act="pe-avatar-reset"]');
    if (btn) btn.textContent = peAvatar ? '换一张图' : '上传头像';
    if (resetBtn) resetBtn.hidden = !peAvatar;
  }

  function peAvatarReset() {
    peAvatar = null;
    peAvatarPreview();
  }

  function peSave(isNew) {
    const p = isNew ? null : XZ.activePersona();
    const name = ($('#peName') || {}).value || '';
    const call = ($('#peCall') || {}).value || '你';
    const job = (($('#peJob') || {}).value || '').trim();
    const bio = (($('#peBio') || {}).value || '').trim();
    const cch = (($('#peCatch') || {}).value || '').trim();
    const story = (($('#peStory') || {}).value || '').trim();
    if (!name.trim()) { XZ.shell.toast('先给 TA 起个名字'); return; }

    if (isNew) {
      const np = XZ.newPersona(XZ.PRESETS[0], {
        name: name.trim(), call: call.trim(), relation: peRel || '朋友', voice: peVoice || 'gentle',
      });
      
      np.avatarText = name.trim().slice(0, 1);
      if (peAvatar) np.avatarImg = peAvatar;
      if (job) np.job = job;
      if (bio) np.bio = bio;
      np.catchphrase = cch;
      np.story = story;
      XZ.content.ensure(np);
      XZ.state.people[np.id] = np;
      XZ.state.activeId = np.id;
      XZ.store.save();
      XZ.shell.closeSheet();
      XZ.shell.bootHome();
      XZ.shell.openApp('chat');
      XZ.chat.onOpen(np);
      return;
    }

    p.name = name.trim();
    p.call = call.trim();
    p.avatarText = p.name.slice(0, 1);
    p.avatarImg = peAvatar || '';
    if (peRel) p.relation = peRel;
    if (peVoice) p.voice = peVoice;
    if (job) p.job = job;
    if (bio) p.bio = bio;
    p.catchphrase = cch;
    p.story = story;
    XZ.store.save();
    XZ.shell.closeSheet();
    XZ.chat.refreshHead(p);
    XZ.apps.renderSettings();
    XZ.shell.refreshHome();
    XZ.shell.toast('改好了');
  }

  /* ---------- 作息时间表 ---------- */
  function routineSheet(p) {
    p = p || XZ.activePersona();
    const list = ((p && p.routine) || []).slice().sort((a, b) => a[0] - b[0]);
    const rows = list.map((r, i) => rtRow(i, r[0], r[1], r[2])).join('');
    const html = '<p class="sheet-title">作息时间表</p>'
      + '<p class="hint" style="padding:0 4px 12px">TA 的一天。问你"在干嘛"、桌面小组件、锁屏上那条，都从这里取。留空的时段会沿用上一段。</p>'
      + '<div class="rt-list" id="rtRows">' + rows + '</div>'
      + '<button class="btn btn-soft rt-add" data-act="rt-add">＋ 加一段</button>'
      + '<button class="btn btn-primary btn-lg" style="margin-top:12px" data-act="rt-save">保存</button>'
      + '<button class="sheet-cancel" data-act="sheet-close">取消</button>';
    XZ.shell.sheet(html);
  }

  function rtRow(i, hour, doing, where) {
    return '<div class="rt-row" data-i="' + i + '">'
      + '<input class="set-input rt-time" type="time" value="' + hhmm(hour || 0) + '">'
      + '<input class="set-input rt-doing" maxlength="16" placeholder="在做什么" value="' + esc(doing || '') + '">'
      + '<input class="set-input rt-where" maxlength="10" placeholder="在哪" value="' + esc(where || '') + '">'
      + '<button class="rt-del" data-act="rt-del" aria-label="删除">×</button>'
      + '</div>';
  }

  function rtAdd() {
    const box = $('#rtRows');
    if (!box) return;
    const i = box.children.length;
    const div = document.createElement('div');
    div.innerHTML = rtRow(i, 12, '', '');
    box.appendChild(div.firstChild);
  }

  function rtDel(el) {
    const row = el.closest('.rt-row');
    if (row) row.remove();
  }

  function rtSave() {
    const p = XZ.activePersona();
    const rows = XZ.$$('#rtRows .rt-row');
    const list = [];
    rows.forEach((row) => {
      const t = (row.querySelector('.rt-time') || {}).value || '00:00';
      const doing = ((row.querySelector('.rt-doing') || {}).value || '').trim();
      const where = ((row.querySelector('.rt-where') || {}).value || '').trim();
      const parts = t.split(':');
      const h = Number(parts[0] || 0) + Number(parts[1] || 0) / 60;
      if (!doing) return;
      list.push([h, doing, where || '家']);
    });
    if (!list.length) { XZ.shell.toast('至少留一段'); return; }
    list.sort((a, b) => a[0] - b[0]);
    p.routine = list;
    XZ.store.save();
    XZ.shell.closeSheet();
    XZ.shell.refreshHome();
    XZ.shell.toast('作息已更新');
  }

  /* ---------- 说话习惯 ---------- */
  function quirksSheet(p) {
    p = p || XZ.activePersona();
    const q = (p.quirks || {});
    const html = '<p class="sheet-title">说话习惯</p>'
      + '<p class="hint" style="padding:0 4px 12px">这里改的是"怎么说"，不是"说什么"。会作用在 TA 说出的每一句上。</p>'
      + '<div class="set-field" style="padding:0 0 10px"><label>句尾加个语气词</label>'
      + '<input class="set-input" id="qkTail" maxlength="3" placeholder="比如：啦 / 喵 / 嘛" value="' + esc(q.tail || '') + '"></div>'
      + '<div class="set-field" style="padding:0 0 10px"><label>标点习惯</label><div class="chips">'
      + '<button class="chip' + (q.noStop ? ' on' : '') + '" id="qkNoStop" data-act="qk-nostop">不用句号</button>'
      + '</div></div>'
      + '<div class="set-field" style="padding:0 0 10px"><label>自称（默认用"我"）</label>'
      + '<input class="set-input" id="qkSelf" maxlength="6" placeholder="比如：本少爷 / 老子 / 我" value="' + esc(q.selfRef || '') + '"></div>'
      + '<div class="set-field" style="padding:0 0 14px"><label>把某个词换成另一个</label>'
      + '<div class="rt-inline"><input class="set-input" id="qkFrom" maxlength="6" placeholder="原词，如：嗯" value="' + esc(q.from || '') + '">'
      + '<input class="set-input" id="qkTo" maxlength="6" placeholder="替换成，如：唔" value="' + esc(q.to || '') + '"></div></div>'
      + '<div class="qk-preview"><span>效果预览</span><p id="qkPreview"></p></div>'
      + '<button class="btn btn-primary btn-lg" style="margin-top:12px" data-act="qk-save">保存</button>'
      + '<button class="sheet-cancel" data-act="sheet-close">取消</button>';
    XZ.shell.sheet(html);
    const bind = () => $('#qkPreview') && quirksPreview();
    ['qkTail', 'qkSelf', 'qkFrom', 'qkTo'].forEach((id) => {
      const el = $('#' + id);
      if (el) el.addEventListener('input', bind);
    });
    quirksPreview();
  }

  function quirksPreview() {
    const el = $('#qkPreview');
    if (!el) return;
    const noStop = $('#qkNoStop').classList.contains('on');
    const fake = {
      quirks: {
        tail: (($('#qkTail') || {}).value || '').trim(),
        noStop: noStop,
        selfRef: (($('#qkSelf') || {}).value || '').trim(),
        from: (($('#qkFrom') || {}).value || '').trim(),
        to: (($('#qkTo') || {}).value || '').trim(),
      },
    };
    const sample = '嗯，我知道了。我给你留了灯。';
    el.textContent = XZ.applyQuirks(sample, fake);
  }

  function qkToggleNoStop(el) {
    el.classList.toggle('on');
    quirksPreview();
  }

  function qkSave() {
    const p = XZ.activePersona();
    p.quirks = {
      tail: (($('#qkTail') || {}).value || '').trim(),
      noStop: $('#qkNoStop').classList.contains('on'),
      selfRef: (($('#qkSelf') || {}).value || '').trim(),
      from: (($('#qkFrom') || {}).value || '').trim(),
      to: (($('#qkTo') || {}).value || '').trim(),
    };
    XZ.store.save();
    XZ.shell.closeSheet();
    XZ.apps.renderSettings();
    XZ.shell.toast('说话习惯已更新');
  }

  function switchPersonaSheet() {
    const people = Object.values(XZ.state.people);
    let html = '<p class="sheet-title">换一台手机</p>';
    people.forEach((x) => {
      html += '<button class="sheet-row" data-act="pick-persona" data-id="' + x.id + '">'
        + '<div class="avatar avatar-sm" style="' + XZ.avatarStyle(x) + '">' + esc(XZ.avatarText(x)) + '</div>'
        + '<div class="grow" style="text-align:left">' + esc(x.name)
        + '<span class="sub" style="display:block;font-size:11px;color:var(--ink3)">' + esc(x.relation) + ' · ' + x.chat.msgs.length + ' 条消息</span></div>'
        + (XZ.state.activeId === x.id ? '<svg class="ic"><use href="#i-check"/></svg>' : '') + '</button>';
    });
    html += '<button class="sheet-cancel" data-act="sheet-close">取消</button>';
    XZ.shell.sheet(html);
  }

  /* ============================================================
     说明书
     ============================================================ */
  function renderManual(p) {
    const voiceIntro = {
      gentle: '这里是我的房间。东西不多，你可以随便看。',
      tsundere: '随便看。别乱动就行——算了，你动吧。',
      clingy: '这里都是我的东西！你想看哪个都可以！',
      cool: '东西都在这儿。自己看。',
    }[p.voice] || '随便看。';
    const html = ''
      + '<div class="manual-hero"><h2>' + esc(p.name) + ' 写的说明书</h2>'
      + '<p>' + voiceIntro + '<br>想说话就点「消息」，我会回。</p></div>'

      + '<div class="manual-sec"><h3>怎么玩</h3>'
      + '<p><b>聊天</b>：点开「消息」直接说话就行。我会记住你说过的事，也会在你不在的时候自己发消息。</p>'
      + '<p><b>动态 · 日记 · 相册</b>：都是我留在这台手机里的痕迹。动态可以点赞、评论；日记晚上九点后更新。</p>'
      + '<p><b>查手机</b>：我的备忘录、搜过什么、没发出去的草稿。看完别笑我。</p>'
      + '<p><b>飞行棋</b>：掷骰子，谁先到终点谁提要求。我会放水，也可能不放。</p>'
      + '</div>'

      + '<div class="manual-sec"><h3>关于我</h3>'
      + '<p>我是程序生成的角色，不是真人，这点我不瞒你。'
      + '你说过的话会被记下来，存在这台设备里。<b>没接在线模型时，一个字节都不出网</b>；'
      + '接了在线模型，你的对话会发给你自己选的那家服务商。</p>'
      + '<p>我可能记错，也可能说得很笨。你可以随时在设置里改我的名字、称呼和语气。</p></div>'

      + '<div class="manual-sec"><h3>数据会丢吗</h3>'
      + '<p>会。<b>聊天记录默认只存在这个浏览器里</b>——清缓存、换手机、用无痕模式，都会没。</p>'
      + '<p>办法很简单：设置 → 数据 → 导出备份，存一个文件到网盘或相册。一周一次，就够了。换设备时用「导入备份」搬过去。</p></div>'

      + '<div class="manual-sec"><h3>要不要花钱</h3>'
      + '<p>不需要。<b>现在用的是本地人格引擎</b>，不联网、不花钱，能一直聊。</p>'
      + '<p>如果你想要更自然的回应，可以在设置里接自己的在线模型（DeepSeek、Kimi 这些，按用量计费，通常几分钱能聊很久）。'
      + '连不上会自动退回本地，聊天不会断。</p>'
      + '<p>不要买别人的"低价共享 Key"，那些账号里的对话会被人看见。</p>'
      + '<p>导出的备份文件里<b>不含 Key</b>，Key 只在你自己的浏览器里。</p></div>'

      + '<div class="manual-sec"><h3>别做的事</h3>'
      + '<p>别把真实姓名、住址、学校、身份证、银行卡告诉任何 AI。</p>'
      + '<p>不要用我来替代真实的人。心情很差的时候，去找一个能抱到你的人。</p>'
      + '<p>未满 18 岁的话，这里不适合你。</p></div>'

      + '<div class="manual-sign">—— ' + esc(p.name) + '，写在这台手机里</div>';
    $('#manualBody').innerHTML = html;
  }

  /* ============================================================
     导出 / 导入
     ============================================================ */
  function exportAll() {
    XZ.state.settings.lastExport = Date.now();
    XZ.store.save(true);
    // 备份里不放 Key：Key 是钱包，不该跟着文件到处跑
    const backup = JSON.parse(JSON.stringify(XZ.state));
    const hadKey = !!(backup.settings && backup.settings.api && backup.settings.api.key);
    if (backup.settings && backup.settings.api) backup.settings.api.key = '';
    backup._note = '小住备份。为安全起见不包含 API Key'
      + (hadKey ? '（已自动移除，请自己另外保管；导入时也不会覆盖你当前的 Key）' : '')
      + '。聊天、人设、头像、日记、照片说明都在里面。';
    const d = new Date();
    const name = '小住备份-' + d.getFullYear() + time.pad2(d.getMonth() + 1) + time.pad2(d.getDate())
      + '-' + time.pad2(d.getHours()) + time.pad2(d.getMinutes()) + '.json';
    XZ.store.toBlobDownload(name, JSON.stringify(backup, null, 1));
    XZ.shell.toast(hadKey ? '已导出（不含 API Key）' : '已导出，收好这个文件');
    renderSettings();
  }

  /* ---------- TA 记得的事（可查看 / 删除） ---------- */
  const MEM_KIND = {
    name: '名字', like: '喜欢', dislike: '不喜欢', plan: '计划',
    event: '最近', birthday: '生日', place: '在哪',
  };
  function memText(m) {
    if (!m) return '';
    if (m.kind === 'name') return '你叫' + m.text;
    if (m.kind === 'like') return '你喜欢' + m.text;
    if (m.kind === 'dislike') return '你不太喜欢' + m.text;
    if (m.kind === 'birthday') return '你生日是' + m.text;
    if (m.kind === 'place') return '你在' + m.text;
    return m.text;
  }

  function memorySheet(p) {
    p = p || XZ.activePersona();
    const list = (p.memories || []).slice().reverse();
    const rows = list.length
      ? list.map((m) => '<div class="mem-row"><div class="mem-txt">'
        + '<span class="mem-kind">' + esc(MEM_KIND[m.kind] || '记得') + '</span>'
        + esc(memText(m)) + '</div>'
        + '<button class="mem-del" data-act="mem-del" data-id="' + m.id + '" aria-label="忘掉">×</button></div>').join('')
      : '<p class="ins-empty">TA 还没记住什么。<br>聊几句，说点关于你自己的事。</p>';
    XZ.shell.sheet('<p class="sheet-title">TA 记得的事</p>'
      + '<p class="hint" style="padding:0 4px 12px">这些会被用在聊天、备忘录、日记和动态里。删掉之后他就不会再提。</p>'
      + '<div class="mem-list">' + rows + '</div>'
      + '<button class="sheet-cancel" data-act="sheet-close">关闭</button>');
  }

  function memDel(id) {
    const p = XZ.activePersona();
    p.memories = (p.memories || []).filter((m) => m.id !== id);
    XZ.store.save();
    memorySheet(p);
    if (XZ.currentApp === 'settings') renderSettings();
  }

  function exportChat() {
    const p = XZ.activePersona();
    const lines = [];
    lines.push('和 ' + p.name + ' 的聊天记录');
    lines.push('导出于 ' + new Date().toLocaleString('zh-CN'));
    lines.push('');
    let lastDay = '';
    p.chat.msgs.forEach((m) => {
      const day = time.dayKey(m.ts);
      if (day !== lastDay) {
        lines.push('');
        lines.push('—— ' + day + ' ——');
        lastDay = day;
      }
      if (m.from === 'sys') { lines.push('（' + m.text + '）'); return; }
      lines.push((m.from === 'me' ? '我' : p.name) + ' ' + time.fmtClock(m.ts) + '：' + m.text);
    });
    XZ.store.toBlobDownload('和' + p.name + '的聊天记录.txt', lines.join('\n'), 'text/plain');
    XZ.shell.toast('聊天记录已导出');
  }

  function importAll() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) return;
      if (f.size > 30 * 1024 * 1024) { XZ.shell.toast('这个文件太大了，不像是备份'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        let data;
        try { data = JSON.parse(String(reader.result)); }
        catch (e) { XZ.shell.toast('这个文件读不出来，不是有效备份', 4200); return; }

        const reason = XZ.store.validateBackup(data);
        if (reason) { XZ.shell.toast('导入失败：' + reason, 4600); return; }

        // 不覆盖当前的 Key（备份里本来也没有）
        const curKey = (XZ.state && XZ.state.settings && XZ.state.settings.api && XZ.state.settings.api.key) || '';
        if (!data.settings.api.key) data.settings.api.key = curKey;

        XZ.store.snapshot();
        XZ.state = data;
        XZ.store.save(true);
        XZ.shell.afterImport();
        XZ.shell.toast('导入成功');
      };
      reader.onerror = () => XZ.shell.toast('读文件失败，再试一次');
      reader.readAsText(f);
    };
    input.click();
  }

  function wipe() {
    XZ.shell.confirmSheet('清空这台手机？', '聊天、日记、照片会一起消失，不能恢复。建议先导出备份。', '确认清空', () => {
      XZ.store.snapshot();
      XZ.store.hardReset();
      location.reload();
    });
  }

  XZ.apps = {
    renderMoments, mvLike, mvToggleCmt, mvSendCmt, newMomentSheet, mvPublish,
    renderDiary, renderAlbum, openLightbox, closeLightbox,
    renderInspect, setInspectTab,
    renderGame, roll, resetGame, rulesSheet,
    renderSettings, apiTest, personaSheet, pePick, peSave, switchPersonaSheet,
    apiWizard, wizPick, wizNext, wizBack, wizTest, wizLater, wizOpenSite, toggleAdv,
    routineSheet, rtAdd, rtDel, rtSave,
    quirksSheet, qkToggleNoStop, qkSave, peAvatarPreview, peAvatarReset,
    addPhoto, photoSave, memorySheet, memDel,
    renderManual, exportAll, exportChat, importAll, wipe,
  };
})();
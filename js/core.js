/* ============================================================
   小住 · core.js
   工具函数 / 数据存储 / 人设预设 / 时间 / 图像生成
   ============================================================ */
(function () {
  'use strict';
  const XZ = (window.XZ = window.XZ || {});

  /* ---------------- 基础工具 ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = (p) => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < String(str).length; i++) {
      h ^= String(str).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }
  function seeded(seed) {
    let s = hash(seed) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }
  function delegate(root, evt, handler) {
    root.addEventListener(evt, function (e) {
      const t = e.target.closest('[data-act]');
      if (t && root.contains(t)) handler(t.getAttribute('data-act'), t, e);
    });
  }

  /* ---------------- 时间 ---------------- */
  const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const WEEK_S = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const pad2 = (n) => String(n).padStart(2, '0');

  function hourNow(d) { d = d || new Date(); return d.getHours() + d.getMinutes() / 60; }
  function period(d) {
    const h = hourNow(d);
    if (h < 5) return 'late';
    if (h < 7) return 'dawn';
    if (h < 9) return 'morning';
    if (h < 11.5) return 'am';
    if (h < 13.5) return 'noon';
    if (h < 17.5) return 'pm';
    if (h < 19.5) return 'evening';
    if (h < 23) return 'night';
    return 'late';
  }
  const PERIOD_WORD = {
    late: '深夜', dawn: '清晨', morning: '早上', am: '上午',
    noon: '中午', pm: '下午', evening: '傍晚', night: '晚上',
  };
  const periodWord = (d) => PERIOD_WORD[period(d)];
  const fmtClock = (d) => { d = d ? new Date(d) : new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
  const fmtClock12 = (d) => { d = d ? new Date(d) : new Date(); return d.getHours() + ':' + pad2(d.getMinutes()); };
  function dayKey(ts) {
    const d = ts ? new Date(ts) : new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function fmtDayLabel(ts) {
    const d = new Date(ts), now = new Date();
    const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const y = new Date(now.getTime() - 864e5);
    if (same(d, now)) return '今天 ' + fmtClock(d);
    if (same(d, y)) return '昨天 ' + fmtClock(d);
    if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + fmtClock(d);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function relTime(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return '刚刚';
    if (s < 3600) return Math.floor(s / 60) + '分钟前';
    if (s < 86400) return Math.floor(s / 3600) + '小时前';
    const d = Math.floor(s / 86400);
    if (d < 30) return d + '天前';
    return Math.floor(d / 30) + '个月前';
  }
  function daysBetween(a, b) {
    return Math.max(1, Math.round((new Date(b || Date.now()).setHours(0, 0, 0, 0) -
      new Date(a).setHours(0, 0, 0, 0)) / 864e5) + 1);
  }

  /* ---------------- 图像：程序化生成 ---------------- */
  function artCSS(seed) {
    const h = hash(seed);
    const h1 = h % 360;
    const h2 = (h1 + 34 + (h % 58)) % 360;
    const h3 = (h1 + 200) % 360;
    const x1 = 18 + (h % 44), y1 = 8 + ((h >> 3) % 32);
    const x2 = 52 + ((h >> 5) % 36), y2 = 70 + ((h >> 7) % 22);
    return 'background:' +
      'radial-gradient(64% 54% at ' + x1 + '% ' + y1 + '%, hsl(' + h1 + ' 58% 84%) 0%, hsla(' + h1 + ',58%,84%,0) 62%),' +
      'radial-gradient(82% 66% at ' + x2 + '% ' + y2 + '%, hsl(' + h2 + ' 38% 56%) 0%, hsla(' + h2 + ',38%,56%,0) 64%),' +
      'radial-gradient(120% 80% at 50% 108%, hsl(' + h3 + ' 22% 34%) 0%, hsla(' + h3 + ',22%,34%,0) 70%),' +
      'linear-gradient(' + (140 + (h % 70)) + 'deg, hsl(' + ((h1 + 18) % 360) + ' 42% 74%), hsl(' + ((h2 + 8) % 360) + ' 34% 46%));';
  }
  function avatarCSS(seed) {
    const HUES = [14, 24, 34, 8, 350, 40, 20];
    const h = HUES[hash(seed) % HUES.length];
    return 'background:linear-gradient(150deg, hsl(' + h + ' 44% 66%), hsl(' + ((h + 14) % 360) + ' 42% 42%));';
  }

  /* 头像：有上传图片就用图片，否则用配色 + 首字 */
  function avatarStyle(p) {
    const img = p ? safeImg(p.avatarImg, 400000) : '';
    if (img) {
      return "background-image:url('" + img + "');background-size:cover;background-position:center;background-color:#B96A46;";
    }
    return avatarCSS(p ? p.avatarSeed : 'x');
  }
  function avatarText(p) {
    if (!p) return '';
    if (safeImg(p.avatarImg, 400000)) return '';
    return p.avatarText || (p.name || '').slice(0, 1);
  }
  function avatarHTML(p, cls, id) {
    return '<div class="avatar ' + (cls || '') + '"' + (id ? ' id="' + id + '"' : '')
      + ' style="' + avatarStyle(p) + '">' + esc(avatarText(p)) + '</div>';
  }

  /* 说话习惯：在最终文本上跑一遍 */
  function applyQuirks(text, p) {
    const q = (p && p.quirks) || {};
    let s = String(text == null ? '' : text);
    if (!s) return s;
    if (q.selfRef) s = s.replace(/我(?!们)/g, q.selfRef);
    if (q.from && q.to) s = s.split(q.from).join(q.to);
    if (q.noStop) s = s.replace(/。/g, '');
    if (q.tail && !/[？?]\s*$/.test(s)) {
      const m = s.match(/[。！？!?…~]*$/)[0];
      const body = s.slice(0, s.length - m.length);
      s = body + q.tail + (m || '。');
    }
    return s;
  }

  /* ---------------- 程序化"照片"：按场景画 ----------------
     scene: sky / window / desk / street / rain / night / plant / food / room
     —— 文案说什么，就画什么，避免"图不对文"。
     ---------------------------------------------------------- */
  const PALETTES = [
    { sky: ['#FBE7CE', '#F2C09A', '#CE9073'], ridge: ['#C09680', '#96705F', '#634C43'], sun: '#FFF6E4' },
    { sky: ['#F7D6B8', '#E2A484', '#9E6A5A'], ridge: ['#96705F', '#6F4E48', '#453531'], sun: '#FFEBCB' },
    { sky: ['#EFF2EB', '#D2DCCF', '#A3B6A7'], ridge: ['#93A697', '#71877A', '#506358'], sun: '#FFFFFF' },
    { sky: ['#DFE9F1', '#ADC2D4', '#7F97AC'], ridge: ['#748B9E', '#586D80', '#3C4C5B'], sun: '#FBF7EE' },
    { sky: ['#3D4559', '#576282', '#828CA6'], ridge: ['#3C4560', '#2D3549', '#1D2332'], sun: '#F2EAD4' },
    { sky: ['#F4E3CC', '#E3C49D', '#BB9367'], ridge: ['#AB815D', '#846340', '#56402A'], sun: '#FFFAEC' },
  ];

  function photoSVG(seed, scene) {
    scene = scene || 'sky';
    const r = seeded(String(seed) + '|' + scene);
    const W = 300, H = 300;
    const palOf = (list) => PALETTES[list[Math.floor(r() * list.length)]];
    const light = { sky: [0, 1, 2, 3, 5], window: [0, 1, 2, 3, 5], plant: [2, 3, 0], street: [1, 3, 5, 0], rain: [3, 2], desk: [0, 5, 1], room: [0, 5, 1], food: [0, 5, 1], night: [4] };
    const pal = palOf(light[scene] || light.sky);
    const dark = pal.ridge[2];
    const mid = pal.ridge[1];

    function glow(x, y, rr, op) {
      return '<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="url(#g)" opacity="' + (op || 0.55) + '"/>'
        + '<circle cx="' + x + '" cy="' + y + '" r="' + (rr / 3.2) + '" fill="' + pal.sun + '" opacity=".85"/>';
    }
    function ridge(baseY, amp, color, op) {
      let d = 'M0 ' + H;
      for (let x = 0; x <= W; x += 20) {
        const n = Math.sin((x / W) * 3.4 + r() * 2) * 0.5 + Math.sin((x / W) * 7.7) * 0.3 + Math.sin((x / W) * 13.1) * 0.14;
        d += ' L' + x + ' ' + (baseY - n * amp).toFixed(1);
      }
      return '<path d="' + d + ' L' + W + ' ' + H + ' Z" fill="' + color + '" opacity="' + (op || 1) + '"/>';
    }
    function stars(n) {
      let s = '';
      for (let i = 0; i < n; i++) {
        s += '<circle cx="' + (r() * W).toFixed(1) + '" cy="' + (r() * H * 0.6).toFixed(1)
          + '" r="' + (0.5 + r() * 1.3).toFixed(1) + '" fill="#fff" opacity="' + (0.25 + r() * 0.6).toFixed(2) + '"/>';
      }
      return s;
    }
    const grain = '<rect width="' + W + '" height="' + H + '" fill="url(#s)" opacity=".07"/>';

    let body = '';

    /* ---- 天空 / 风景 ---- */
    if (scene === 'sky') {
      const type = Math.floor(r() * 4);
      const horizon = H * (0.46 + r() * 0.2);
      const sx = 40 + r() * 220, sy = 26 + r() * Math.max(10, horizon - 60);
      const sr = 10 + r() * 18;
      if (type === 0) {
        body = glow(sx, sy, sr * 3.4) + [0, 1, 2].map((i) =>
          ridge(horizon + i * 16, (26 - i * 7) * (0.7 + r() * 0.6), pal.ridge[i])).join('');
      } else if (type === 1) {
        body = [0, 1, 2, 3].map((i) =>
          ridge(horizon + i * 14, 34 - i * 6, pal.ridge[Math.min(2, i)], 0.22 + i * 0.2)).join('');
      } else if (type === 2) {
        body = glow(sx, sy, sr * 2.6, 0.4) + stars(18)
          + ridge(horizon + 40, 26, mid, 0.9) + ridge(horizon + 66, 18, dark);
      } else {
        body = glow(sx, sy, sr * 3.2, 0.5)
          + '<rect x="0" y="' + horizon.toFixed(0) + '" width="' + W + '" height="' + (H - horizon).toFixed(0) + '" fill="' + pal.sky[1] + '" opacity=".5"/>'
          + '<ellipse cx="' + sx + '" cy="' + (horizon + 18) + '" rx="' + (sr * 1.9) + '" ry="' + (sr * 0.2) + '" fill="' + pal.sun + '" opacity=".5"/>'
          + ridge(horizon - 10, 14, mid, 0.5);
      }
    }

    /* ---- 窗：木框 + 外面的光 ---- */
    if (scene === 'window') {
      const sillY = H * 0.78;
      body = glow(60 + r() * 80, 80 + r() * 40, 90, 0.5)
        + ridge(sillY - 20, 22, mid, 0.55)
        + ridge(sillY - 6, 14, dark, 0.7)
        // 窗外的一点点亮
        + '<polygon points="0,0 120,0 40,' + H + ' 0,' + H + '" fill="#fff" opacity=".07"/>'
        // 窗框
        + '<rect x="0" y="0" width="' + W + '" height="14" fill="' + dark + '" opacity=".92"/>'
        + '<rect x="0" y="' + (sillY - 8) + '" width="' + W + '" height="10" fill="' + dark + '" opacity=".92"/>'
        + '<rect x="0" y="' + (sillY + 2) + '" width="' + W + '" height="26" fill="' + mid + '" opacity=".95"/>'
        + '<rect x="96" y="0" width="9" height="' + (sillY + 2) + '" fill="' + dark + '" opacity=".9"/>'
        + '<rect x="196" y="0" width="9" height="' + (sillY + 2) + '" fill="' + dark + '" opacity=".9"/>';
    }

    /* ---- 桌面：台灯 + 书 + 杯子 ---- */
    if (scene === 'desk') {
      const topY = H * 0.62;
      body = '<rect x="0" y="0" width="' + W + '" height="' + topY + '" fill="' + pal.sky[1] + '" opacity=".55"/>'
        + glow(228, 92, 70, 0.75)
        // 灯罩
        + '<polygon points="196,118 260,118 250,74 206,74" fill="' + dark + '" opacity=".92"/>'
        + '<rect x="223" y="118" width="6" height="30" fill="' + dark + '" opacity=".8"/>'
        // 桌面
        + '<rect x="0" y="' + topY + '" width="' + W + '" height="' + (H - topY) + '" fill="' + dark + '" opacity=".95"/>'
        + '<rect x="0" y="' + topY + '" width="' + W + '" height="6" fill="' + mid + '" opacity=".6"/>'
        // 书
        + '<g transform="rotate(-6 96 218)"><rect x="46" y="200" width="104" height="34" rx="4" fill="' + pal.sun + '" opacity=".9"/>'
        + '<rect x="46" y="208" width="104" height="3" fill="' + mid + '" opacity=".5"/></g>'
        // 杯子
        + '<ellipse cx="196" cy="224" rx="26" ry="9" fill="' + pal.sun + '" opacity=".85"/>'
        + '<path d="M170 224 q0 34 26 34 q26 0 26 -34" fill="' + pal.sun + '" opacity=".72"/>'
        + '<path d="M206 216 q16 6 0 26" stroke="' + dark + '" stroke-width="4" fill="none" opacity=".5"/>';
    }

    /* ---- 街景：楼、路灯、路 ---- */
    if (scene === 'street') {
      const gy = H * 0.66;
      let blocks = '';
      let x = -10;
      while (x < W) {
        const bw = 26 + r() * 34;
        const bh = 40 + r() * 78;
        blocks += '<rect x="' + x.toFixed(0) + '" y="' + (gy - bh).toFixed(0) + '" width="' + bw.toFixed(0) + '" height="' + bh.toFixed(0) + '" fill="' + mid + '" opacity="' + (0.55 + r() * 0.3).toFixed(2) + '"/>';
        for (let wy = gy - bh + 10; wy < gy - 12; wy += 16) {
          for (let wx = x + 6; wx < x + bw - 8; wx += 12) {
            if (r() > 0.55) blocks += '<rect x="' + wx.toFixed(0) + '" y="' + wy.toFixed(0) + '" width="5" height="6" fill="' + pal.sun + '" opacity="' + (0.3 + r() * 0.5).toFixed(2) + '"/>';
          }
        }
        x += bw + 3;
      }
      body = glow(W * 0.72, gy - 96, 46, 0.5)
        + blocks
        + '<rect x="0" y="' + gy + '" width="' + W + '" height="' + (H - gy) + '" fill="' + dark + '" opacity=".95"/>'
        + '<rect x="' + (W * 0.72) + '" y="' + (gy - 96) + '" width="3" height="96" fill="' + dark + '" opacity=".8"/>'
        + '<rect x="0" y="' + (H - 40) + '" width="' + W + '" height="3" fill="' + pal.sun + '" opacity=".18"/>';
    }

    /* ---- 雨：玻璃上的水 ---- */
    if (scene === 'rain') {
      let rain = '';
      for (let i = 0; i < 70; i++) {
        const x = r() * W, y = r() * H, len = 12 + r() * 26;
        rain += '<line x1="' + x.toFixed(0) + '" y1="' + y.toFixed(0) + '" x2="' + (x - 5).toFixed(0) + '" y2="' + (y + len).toFixed(0)
          + '" stroke="#fff" stroke-width="1" opacity="' + (0.08 + r() * 0.18).toFixed(2) + '"/>';
      }
      let drops = '';
      for (let i = 0; i < 22; i++) {
        drops += '<ellipse cx="' + (r() * W).toFixed(0) + '" cy="' + (r() * H).toFixed(0) + '" rx="' + (1.5 + r() * 2.5).toFixed(1)
          + '" ry="' + (2 + r() * 4).toFixed(1) + '" fill="#fff" opacity="' + (0.1 + r() * 0.2).toFixed(2) + '"/>';
      }
      body = '<g filter="url(#blur)">'
        + '<circle cx="80" cy="70" r="70" fill="' + pal.sky[1] + '" opacity=".6"/>'
        + '<circle cx="220" cy="130" r="60" fill="' + pal.sun + '" opacity=".35"/>'
        + '</g>' + rain + drops
        + '<rect x="0" y="' + (H - 34) + '" width="' + W + '" height="34" fill="' + dark + '" opacity=".9"/>';
    }

    /* ---- 夜：月亮 + 楼 ---- */
    if (scene === 'night') {
      const my = 62 + r() * 30, mx = 60 + r() * 180;
      let blocks = '';
      let x = -10;
      while (x < W) {
        const bw = 30 + r() * 40, bh = 30 + r() * 70;
        blocks += '<rect x="' + x.toFixed(0) + '" y="' + (H - bh).toFixed(0) + '" width="' + bw.toFixed(0) + '" height="' + bh.toFixed(0) + '" fill="#11131C" opacity=".92"/>';
        x += bw + 2;
      }
      body = stars(34)
        + '<circle cx="' + mx + '" cy="' + my + '" r="' + (14 + r() * 8) + '" fill="' + pal.sun + '" opacity=".92"/>'
        + '<circle cx="' + mx + '" cy="' + my + '" r="' + (40 + r() * 20) + '" fill="url(#g)" opacity=".35"/>'
        + blocks;
    }

    /* ---- 植物：窗台 + 盆栽 ---- */
    if (scene === 'plant') {
      const sillY = H * 0.72;
      const px = 90 + r() * 60;
      body = glow(40 + r() * 60, 60 + r() * 40, 90, 0.45)
        + '<rect x="0" y="' + sillY + '" width="' + W + '" height="' + (H - sillY) + '" fill="' + mid + '" opacity=".85"/>'
        + '<rect x="0" y="' + sillY + '" width="' + W + '" height="5" fill="' + dark + '" opacity=".6"/>'
        // 叶子
        + '<g transform="rotate(-18 ' + px + ' ' + (sillY - 40) + ')"><ellipse cx="' + px + '" cy="' + (sillY - 42) + '" rx="13" ry="30" fill="' + dark + '" opacity=".85"/></g>'
        + '<g transform="rotate(16 ' + (px + 16) + ' ' + (sillY - 44) + ')"><ellipse cx="' + (px + 16) + '" cy="' + (sillY - 44) + '" rx="12" ry="27" fill="' + mid + '" opacity=".9"/></g>'
        + '<g transform="rotate(-40 ' + (px - 16) + ' ' + (sillY - 34) + ')"><ellipse cx="' + (px - 16) + '" cy="' + (sillY - 34) + '" rx="10" ry="22" fill="' + dark + '" opacity=".7"/></g>'
        // 花盆
        + '<path d="M' + (px - 26) + ' ' + (sillY - 16) + ' L' + (px + 26) + ' ' + (sillY - 16) + ' L' + (px + 19) + ' ' + (sillY + 30) + ' L' + (px - 19) + ' ' + (sillY + 30) + ' Z" fill="' + pal.sun + '" opacity=".8"/>'
        + '<rect x="' + (px - 28) + '" y="' + (sillY - 20) + '" width="56" height="8" rx="2" fill="' + pal.sun + '" opacity=".9"/>';
    }

    /* ---- 吃的：碗 + 热气 ---- */
    if (scene === 'food') {
      const cy = H * 0.62;
      body = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + pal.sky[1] + '" opacity=".5"/>'
        + '<rect x="0" y="' + (H * 0.34) + '" width="' + W + '" height="' + (H * 0.66) + '" fill="' + dark + '" opacity=".9"/>'
        + '<rect x="0" y="' + (H * 0.34) + '" width="' + W + '" height="4" fill="' + mid + '" opacity=".5"/>'
        + glow(240, 40, 60, 0.5)
        // 碗
        + '<ellipse cx="' + (W / 2) + '" cy="' + cy + '" rx="74" ry="18" fill="' + pal.sun + '" opacity=".92"/>'
        + '<path d="M' + (W / 2 - 74) + ' ' + cy + ' q0 62 74 62 q74 0 74 -62" fill="' + pal.sun + '" opacity=".85"/>'
        + '<ellipse cx="' + (W / 2) + '" cy="' + (cy - 2) + '" rx="58" ry="12" fill="' + mid + '" opacity=".45"/>'
        // 热气
        + '<path d="M' + (W / 2 - 24) + ' ' + (cy - 34) + ' q10 -22 0 -40" stroke="#fff" stroke-width="3" fill="none" opacity=".3" stroke-linecap="round"/>'
        + '<path d="M' + (W / 2 + 16) + ' ' + (cy - 30) + ' q12 -26 0 -46" stroke="#fff" stroke-width="3" fill="none" opacity=".22" stroke-linecap="round"/>'
        // 筷子
        + '<g transform="rotate(-30 246 200)"><rect x="206" y="196" width="86" height="4" rx="2" fill="' + pal.sun + '" opacity=".8"/>'
        + '<rect x="206" y="206" width="86" height="4" rx="2" fill="' + pal.sun + '" opacity=".7"/></g>';
    }

    /* ---- 室内：沙发 + 灯光 ---- */
    if (scene === 'room') {
      const fy = H * 0.66;
      body = '<rect x="0" y="0" width="' + W + '" height="' + fy + '" fill="' + pal.sky[1] + '" opacity=".5"/>'
        + '<rect x="0" y="' + fy + '" width="' + W + '" height="' + (H - fy) + '" fill="' + mid + '" opacity=".55"/>'
        + glow(70, 70, 110, 0.55)
        + '<polygon points="180,0 300,0 300,' + (fy - 10) + ' 220,' + fy + '" fill="' + pal.sun + '" opacity=".12"/>'
        // 沙发
        + '<rect x="40" y="' + (fy - 54) + '" width="220" height="46" rx="16" fill="' + dark + '" opacity=".9"/>'
        + '<rect x="30" y="' + (fy - 34) + '" width="240" height="44" rx="14" fill="' + dark + '" opacity=".95"/>'
        + '<rect x="44" y="' + (fy - 28) + '" width="60" height="34" rx="10" fill="' + mid + '" opacity=".55"/>'
        + '<rect x="116" y="' + (fy - 28) + '" width="60" height="34" rx="10" fill="' + mid + '" opacity=".45"/>';
    }

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'
      + '<defs><linearGradient id="s" x1="0" y1="0" x2="0.35" y2="1">'
      + '<stop offset="0" stop-color="' + pal.sky[0] + '"/>'
      + '<stop offset="0.62" stop-color="' + pal.sky[1] + '"/>'
      + '<stop offset="1" stop-color="' + pal.sky[2] + '"/>'
      + '</linearGradient>'
      + '<radialGradient id="g"><stop offset="0" stop-color="' + pal.sun + '" stop-opacity=".95"/><stop offset="1" stop-color="' + pal.sun + '" stop-opacity="0"/></radialGradient>'
      + '<filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>'
      + '</defs>'
      + '<rect width="' + W + '" height="' + H + '" fill="url(#s)"/>'
      + body + grain
      + '</svg>';
    return svg;
  }

  function photoStyle(seed, scene) {
    const svg = photoSVG(seed, scene);
    const data = encodeURIComponent(svg).replace(/'/g, '%27');
    return "background-image:url('data:image/svg+xml," + data + "');background-size:cover;background-position:center;";
  }

  /* 实拍照片库（js/photos.js）——有照片就用照片，没有才退回程序画的图 */
  function photoById(id) {
    const list = window.XZ_PHOTOS || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function photoCSS(item) {
    if (item && item.photoId) {
      const ph = photoById(item.photoId);
      if (ph) return "background-image:url(" + ph.data + ");background-size:cover;background-position:center;";
    }
    return photoStyle((item && (item.artSeed || item.seed || item.id)) || 'x', item && item.artScene);
  }

  /* 图片字段白名单：只接受 data:image/base64，防止恶意备份注入 HTML/CSS */
  function safeImg(s, maxLen) {
    if (typeof s !== 'string') return '';
    const v = s.trim();
    if (v.length < 24 || v.length > (maxLen || 500000)) return '';
    if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(v)) return '';
    return v;
  }

  /* ---------------- 存储 ---------------- */
  const KEY = 'xiaozhu.v1';
  const SNAP = 'xiaozhu.snapshot';
  let dead = false;          // 清空/销毁后禁止再写回
  let demo = false;          // 演示模式（?demo=1）不落盘
  let failing = false;       // 当前是否写入失败
  let lastErr = '';

  function blankState() {
    return {
      v: 1,
      installedAt: Date.now(),
      activeId: null,
      people: {},
      groups: [],
      settings: {
        theme: 'light',        // light | night | auto
        wall: 'dusk',          // dusk | mist | paper | night
        engine: 'local',       // local | api
        api: {
          provider: 'deepseek',
          baseUrl: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat',
          key: '',
        },
        autoNight: true,
        lastExport: 0,
        remindBackup: true,
        opened: 0,
        tourDone: false,
      },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.v !== 1) return null;
      s.settings = Object.assign(blankState().settings, s.settings || {});
      s.settings.api = Object.assign(blankState().settings.api, s.settings.api || {});
      return s;
    } catch (e) {
      console.warn('读取存档失败', e);
      return null;
    }
  }
  let saveTimer = null;
  function save(now) {
    if (dead || demo) return;
    clearTimeout(saveTimer);
    const run = () => {
      if (dead) return;
      try {
        localStorage.setItem(KEY, JSON.stringify(XZ.state));
        if (failing) {
          failing = false; lastErr = '';
          if (XZ.store.onRecover) XZ.store.onRecover();
        }
      } catch (e) {
        failing = true;
        lastErr = (e && e.name === 'QuotaExceededError') ? '存储空间满了' : String((e && e.message) || e);
        console.warn('保存失败', e);
        if (XZ.store.onFail) XZ.store.onFail(lastErr);
      }
    };
    if (now) run(); else saveTimer = setTimeout(run, 220);
  }
  function snapshot() {
    try { localStorage.setItem(SNAP, JSON.stringify(XZ.state)); } catch (e) {}
  }
  function restoreSnapshot() {
    try {
      const raw = localStorage.getItem(SNAP);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function hardReset() {
    dead = true;
    try { localStorage.removeItem(KEY); localStorage.removeItem(SNAP); } catch (e) {}
  }

  /* 备份校验：形状不对就拒绝，绝不覆盖现有存档 */
  function validateBackup(data) {
    if (!data || typeof data !== 'object') return '这个文件不是备份';
    if (data.v !== 1) return '版本对不上（不是小住的备份）';
    if (!data.people || typeof data.people !== 'object') return '备份里没有人设数据';
    const ids = Object.keys(data.people);
    if (!ids.length) return '备份里没有任何角色';
    for (let i = 0; i < ids.length; i++) {
      const p = data.people[ids[i]];
      if (!p || typeof p !== 'object') return '角色数据损坏';
      if (typeof p.name !== 'string' || !p.name) return '角色缺少名字';
      if (!p.chat || !Array.isArray(p.chat.msgs)) return '角色缺少聊天记录';
      p.chat.msgs = p.chat.msgs.filter((m) => m && typeof m.text === 'string'
        && typeof m.ts === 'number').slice(-800);
      p.memories = Array.isArray(p.memories) ? p.memories.slice(-60) : [];
      p.moments = Array.isArray(p.moments) ? p.moments.slice(0, 60) : [];
      p.diaries = Array.isArray(p.diaries) ? p.diaries.slice(0, 40) : [];
      p.photos = Array.isArray(p.photos) ? p.photos.slice(0, 40) : [];
      p.avatarImg = safeImg(p.avatarImg, 400000);
      p.photos.forEach((ph) => { if (ph && ph.img) ph.img = safeImg(ph.img, 400000); });
      if (!p.routine || !p.routine.length) p.routine = findPreset(p.presetKey).routine;
      p.quirks = p.quirks || { tail: '', noStop: false, selfRef: '', from: '', to: '' };
      if (typeof p.bond !== 'number') p.bond = 10;
    }
    if (!data.settings || typeof data.settings !== 'object') data.settings = blankState().settings;
    Object.assign(data.settings, { api: Object.assign({}, blankState().settings.api, data.settings.api || {}) });
    if (!data.groups || !Array.isArray(data.groups)) data.groups = [];
    if (!data.activeId || !data.people[data.activeId]) data.activeId = ids[0];
    return '';
  }

  function toBlobDownload(filename, text, mime) {
    const blob = new Blob([text], { type: (mime || 'application/json') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1200);
  }

  /* ---------------- 人设预设 ---------------- */
  const VOICES = {
    gentle: { name: '温柔', hint: '语气软，句子长一点，爱照顾人' },
    tsundere: { name: '嘴硬', hint: '先说反话，后半句才是真的' },
    clingy: { name: '黏人', hint: '直球，情绪写在脸上' },
    cool: { name: '清冷', hint: '话少，一句顶三句' },
  };
  const RELATIONS = ['同居的人', '青梅竹马', '恋人', '认识很久的朋友', '学弟学妹', '隔壁邻居', '同事'];

  const PRESETS = [
    {
      key: 'shenyu', name: '沈屿', call: '你', voice: 'gentle', relation: '同居的人',
      age: 26, job: '出版社编辑',
      bio: '晚上十点之后，话会多一点。',
      line: '水有点凉，别又光着脚在地上走。',
      likes: '做饭、修旧书、老唱片',
      avatar: 'SH',
      routine: [
        [0, '翻了两页书，还没睡', '在家'],
        [6.5, '还没醒', '在家'],
        [8, '在厨房煎蛋', '在家'],
        [9.5, '在办公室看稿子', '公司'],
        [12, '在楼下吃饭', '公司附近'],
        [14, '在开会', '公司'],
        [18.5, '在超市买菜', '路上'],
        [20, '在厨房做饭', '在家'],
        [21.5, '在客厅看书', '在家'],
        [23, '准备睡了，灯还亮着', '在家'],
      ],
    },
    {
      key: 'jiangyan', name: '江砚', call: '你', voice: 'tsundere', relation: '青梅竹马',
      age: 24, job: '修表店的老板',
      bio: '不熟的人以为我脾气差。熟的知道是真的差。',
      line: '你钥匙又落我这儿了，第三回了。',
      likes: '拆表、打游戏、夜里散步',
      avatar: 'JY',
      routine: [
        [0, '还在打游戏', '店里'],
        [8, '在挤地铁', '路上'],
        [10, '在店里修表', '店里'],
        [13, '随便吃了点', '店里'],
        [19, '在关店门', '店里'],
        [21, '在打游戏，别吵', '家'],
        [1.5, '还不困', '家'],
      ],
    },
    {
      key: 'linzhao', name: '林昭', call: '姐姐', voice: 'clingy', relation: '学弟',
      age: 21, job: '大三在读',
      bio: '消息秒回，除了在上课。',
      line: '今天食堂的糖醋排骨特别好吃，我帮你留了一份。',
      likes: '打球、拍云、给人带饭',
      avatar: 'LZ',
      routine: [
        [0, '在写作业，写不完', '宿舍'],
        [8, '在去教室的路上', '路上'],
        [10, '在上课，偷偷看手机', '教室'],
        [15, '在图书馆', '图书馆'],
        [18, '在球场', '操场'],
        [21, '在宿舍打游戏', '宿舍'],
        [23.5, '在等你回消息', '宿舍'],
      ],
    },
    {
      key: 'suwan', name: '苏晚', call: '小朋友', voice: 'cool', relation: '隔壁邻居',
      age: 27, job: '咖啡店店主',
      bio: '不太会讲话。但会记得你要几分糖。',
      line: '豆子换了一批，明天来试。',
      likes: '烘豆、下雨天、安静',
      avatar: 'SW',
      routine: [
        [0, '在看书，还没关灯', '家'],
        [7.5, '在开店门', '店里'],
        [11, '在吧台后面', '店里'],
        [15, '在烘豆', '店里'],
        [22, '在关店', '店里'],
        [23.5, '在阳台抽烟', '家'],
      ],
    },
  ];

  function findPreset(key) { return PRESETS.find((p) => p.key === key) || PRESETS[0]; }

  function routineAt(persona, d) {
    const src = persona.routine && persona.routine.length ? persona.routine
      : findPreset(persona.presetKey).routine;
    const list = src.slice().sort((a, b) => a[0] - b[0]);
    const h = hourNow(d);
    let found = null;
    for (let i = 0; i < list.length; i++) {
      if (h >= list[i][0]) found = list[i];
    }
    const cur = found || list[list.length - 1];
    return { doing: cur[1], where: cur[2], hour: h };
  }

  function newPersona(preset, opts) {
    opts = opts || {};
    const p = preset && preset.key ? preset : null;
    const base = p || PRESETS[0];
    const id = uid('p');
    return {
      id,
      presetKey: base.key,
      name: opts.name || base.name,
      call: opts.call || base.call,
      voice: opts.voice || base.voice,
      relation: opts.relation || base.relation,
      age: opts.age || base.age,
      job: opts.job || base.job,
      bio: opts.bio || base.bio,
      line: base.line,
      likes: base.likes,
      catchphrase: opts.catchphrase || '',
      avatarImg: '',
      story: '',
      quirks: { tail: '', noStop: false, selfRef: '', from: '', to: '' },
      avatarText: (opts.name || base.name).slice(0, 1),
      avatarSeed: (base.key || 'x') + '|' + (opts.name || base.name),
      routine: base.routine || PRESETS[0].routine,
      bond: 8,
      mood: 0,
      lastTaAt: 0,
      createdAt: Date.now(),
      chat: { msgs: [], unread: 0, streak: 1, lastAt: 0, todayCount: 0 },
      memories: [],
      moments: [],
      diaries: [],
      photos: [],
      notes: [],
      searches: [],
      drafts: [],
      game: { w: 0, l: 0, played: 0 },
      flags: {},
    };
  }

  /* ---------------- 导出 ---------------- */
  XZ.$ = $; XZ.$$ = $$;
  XZ.rnd = rnd; XZ.pick = pick; XZ.chance = chance; XZ.clamp = clamp;
  XZ.uid = uid; XZ.sleep = sleep; XZ.esc = esc; XZ.nl2br = nl2br;
  XZ.hash = hash; XZ.seeded = seeded; XZ.delegate = delegate;
  XZ.time = {
    hourNow, period, periodWord, fmtClock, fmtClock12, dayKey, fmtDayLabel,
    relTime, daysBetween, WEEK, WEEK_S, pad2,
  };
  XZ.artCSS = artCSS;
  XZ.avatarCSS = avatarCSS;
  XZ.avatarStyle = avatarStyle;
  XZ.avatarText = avatarText;
  XZ.avatarHTML = avatarHTML;
  XZ.applyQuirks = applyQuirks;
  XZ.photoStyle = photoStyle;
  XZ.photoSVG = photoSVG;
  XZ.photoById = photoById;
  XZ.photoCSS = photoCSS;
  XZ.safeImg = safeImg;
  XZ.relTime = relTime;
  XZ.daysBetween = daysBetween;
  XZ.store = {
    KEY, load, save, snapshot, restoreSnapshot, hardReset, blankState,
    validateBackup, toBlobDownload,
    setDemo: function (v) { demo = !!v; },
    get demo() { return demo; },
    get failing() { return failing; },
    get lastError() { return lastErr; },
  };
  XZ.PRESETS = PRESETS;
  XZ.VOICES = VOICES;
  XZ.RELATIONS = RELATIONS;
  XZ.findPreset = findPreset;
  XZ.routineAt = routineAt;
  XZ.newPersona = newPersona;
  XZ.state = null;
})();

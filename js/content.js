/* ============================================================
   小住 · content.js
   TA 的生活痕迹：动态 / 日记 / 相册 / 查手机 / 环境台词
   ============================================================ */
(function () {
  'use strict';
  const XZ = window.XZ;
  const { pick, chance, time, uid } = XZ;

  const cnt = (p, from) => (p.chat.msgs || []).filter((m) => !from || m.from === from).length;
  const todayMsgs = (p) => (p.chat.msgs || []).filter((m) => time.dayKey(m.ts) === time.dayKey()).length;
  const memOf = (p, kind) => (p.memories || []).filter((m) => !kind || m.kind === kind);

  /* ---------------- 天气 ---------------- */
  const WEATHER = [
    { w: '晴', s: '阳光从窗户斜进来，落在桌角' },
    { w: '多云', s: '云压得很低，一整天都没见到太阳' },
    { w: '小雨', s: '下了半天的雨，屋檐一直在滴水' },
    { w: '阴', s: '天灰了一整天，分不清上午和下午' },
    { w: '风很大', s: '风把楼下的树吹得哗哗响' },
    { w: '夜里有雾', s: '晚上起了雾，路灯都变得毛茸茸的' },
  ];
  function weatherFor(day) {
    const r = XZ.seeded('w' + day);
    return WEATHER[Math.floor(r() * WEATHER.length)];
  }

  /* ---------------- 动态 ---------------- */
  /* 每条文案绑定一个画面场景，图跟着文案走 */
  const SCENES = {
    dawn: [
      { t: '天刚亮的时候醒了一次，窗帘没拉严，光是一条一条的。', art: 'window' },
      { t: '闹钟还没响就醒了。躺着听了一会儿楼下的车声。', art: 'street' },
      { t: '五点多就醒了，天还是灰的，楼下早餐店刚开灯。', art: 'street' },
    ],
    morning: [
      { t: '早上的地铁还是那个味道。有人带着早饭，有人带着睡意。', art: 'street' },
      { t: '今天早餐多买了一份，走到楼下才想起来没人吃。', art: 'food' },
      { t: '便利店的热柜刚开门，我买了两个包子，站在门口吃完了。', art: 'food' },
      { t: '出门的时候，阳台的植物被风吹得歪了，我扶了一下。', art: 'plant' },
    ],
    am: [
      { t: '上午的时间过得特别慢。', art: 'desk' },
      { t: '会议开了两个小时，我在纸上画了一个下午的太阳。', art: 'desk' },
      { t: '把要做的事列了一遍，划掉两件，又加上三件。', art: 'desk' },
    ],
    noon: [
      { t: '中午随便吃了点。一个人吃饭的时候，会吃得很快。', art: 'food' },
      { t: '楼下的面馆换了老板，汤的味道不一样了。', art: 'food' },
      { t: '吃完饭在楼下站了一会儿，太阳很好。', art: 'sky' },
    ],
    pm: [
      { t: '下午的光很好，我把窗打开了。', art: 'window' },
      { t: '有点困。泡了杯很浓的茶，还是困。', art: 'desk' },
      { t: '外面开始下雨了，我把晾在外面的衣服收了。', art: 'rain' },
      { t: '窗台那盆植物又长了一片新叶子。', art: 'plant' },
    ],
    evening: [
      { t: '下班的时候天已经黑了一半。', art: 'street' },
      { t: '路过便利店，买了瓶水，站了一会儿才走。', art: 'street' },
      { t: '晚高峰的地铁，人挤人，我突然想起一句话，没地方记。', art: 'street' },
      { t: '回来的时候路灯刚亮。', art: 'street' },
    ],
    night: [
      { t: '灯开着，书翻到第三页就没再动。', art: 'desk' },
      { t: '晚上安静得能听见冰箱的声音。', art: 'room' },
      { t: '洗完澡坐在沙发上，头发还在滴水。', art: 'room' },
      { t: '外面很安静，偶尔有一辆车过去。', art: 'night' },
    ],
    late: [
      { t: '这个点了还没睡。不是不困，是舍不得结束这一天。', art: 'room' },
      { t: '窗帘没拉，能看到对面楼还亮着一盏灯。', art: 'night' },
      { t: '台灯开着，屋子里只有这一块是亮的。', art: 'desk' },
    ],
  };
  const THOUGHTS = [
    '今天有人一直在说累。',
    '手机亮了一下，不是你。',
    '有些话打了一半，又删了。',
    '突然想不起上次好好说话是什么时候。',
    '今天心情还不错，说不上为什么。',
    '楼下的桂花开了，整条街都是甜的。',
    '想出去走走，又觉得一个人没什么意思。',
    '今天没有发生什么特别的事。',
  ];
  /* 照片库（有实拍照片就优先用照片，没有就退回程序画） */
  const PLACE_BY_SCENE = {
    desk: '书桌', food: '厨房', window: '窗边', street: '街上',
    night: '夜里', rain: '窗边', plant: '楼下', room: '家里',
    people: '外面', sea: '海边', sky: '外面',
  };
  function pickPhotoOf(p, wantNight, skipIds) {
    const all = (window.XZ_PHOTOS || []);
    if (!all.length) return null;
    const recentMs = (p.moments || []).slice(0, 5);
    const recent = recentMs.map((m) => m.photoId).concat(skipIds || []).filter(Boolean);
    const recentScenes = recentMs.slice(0, 2).map((m) => m.artScene).filter(Boolean);
    let pool = all.filter((x) => recent.indexOf(x.id) < 0);
    if (!pool.length) pool = all.slice();
    const freshScene = pool.filter((x) => recentScenes.indexOf(x.scene) < 0);
    if (freshScene.length) pool = freshScene;
    const fit = pool.filter((x) => !!x.night === !!wantNight);
    return pick(fit.length ? fit : pool);
  }

  function genMoment(p, ts) {
    ts = ts || Date.now();
    const per = time.period(new Date(ts));
    const wantNight = per === 'night' || per === 'late' || per === 'dawn';

    let thought = '';
    const mems = memOf(p);
    if (mems.length && chance(0.5)) {
      const m = pick(mems);
      if (m.kind === 'like') thought = '记得你说喜欢' + m.text + '。路过的时候多看了一眼。';
      else if (m.kind === 'plan') thought = '你' + m.text + '。别忘了。';
      else if (m.kind === 'event') thought = '你说' + m.text + '。我一直想着这件事。';
    }
    if (!thought && chance(0.6)) thought = pick(THOUGHTS);

    const ph = pickPhotoOf(p, wantNight);
    if (ph) {
      const lines = [ph.caps[0]];
      if (ph.caps[1] && chance(0.45)) lines.push(ph.caps[1]);
      if (thought && lines.length < 3) lines.push(thought);
      return {
        id: uid('mo'), ts,
        text: lines.join('\n'),
        photoId: ph.id, artScene: ph.scene,
        art: chance(0.9),
        likes: 0, liked: false, comments: [],
      };
    }

    const pool = SCENES[per] || SCENES.night;
    const lastArts = (p.moments || []).slice(0, 2).map((m) => m.artScene).filter(Boolean);
    const fresh = pool.filter((s) => lastArts.indexOf(s.art) < 0);
    const sc = pick(fresh.length ? fresh : pool);
    return {
      id: uid('mo'), ts,
      text: [sc.t, thought].filter(Boolean).join('\n'),
      artSeed: p.id + ts, artScene: sc.art,
      art: chance(0.78), likes: 0, liked: false, comments: [],
    };
  }

  /* ---------------- 日记 ---------------- */
  const DIARY_TITLES = ['今天', '雨停之前', '没什么事发生', '一点点', '晚一点睡', '日常', '写给以后', '琐碎', '这一天', '安静的一天'];
  const OPENERS = {
    gentle: ['今天{weather}。{scene}。', '{weather}。{scene}。', '今天过得挺快的。{scene}。'],
    tsundere: ['{weather}。{scene}。', '今天没什么好写的。{scene}。', '{weather}，一整天。{scene}。'],
    clingy: ['今天{weather}！{scene}。', '{weather}。{scene}。', '今天心情有点满。{scene}。'],
    cool: ['{weather}。{scene}。', '{scene}。', '{weather}。{scene}。'],
  };
  const MIDDLES = [
    '回来的路上买了菜，一个人吃不完，还是买了。',
    '把屋子收拾了一遍，扔了两袋东西，心情才好一点。',
    '今天听到一首很久以前的歌，站在路边听完了。',
    '工作上的事拖到晚上才做完，做完之后反而不困了。',
    '下午有一阵子什么都不想干，趴在桌上睡了二十分钟。',
    '楼下的小孩在学骑车，摔了好几次，一直在笑。',
    '给家里打了个电话，说了几句就挂了。',
    '把手机放远了一点，结果还是拿回来了。',
  ];
  const ABOUT_YOU = {
    gentle: [
      '你今天说了一句「{frag}」。我回得很平常，其实想了很久。',
      '你今天只发了很短的一句，我猜你大概很累。',
      '你问我在干嘛的时候，我正好在想你。',
      '你今天笑了吗。我不知道，隔着屏幕看不出来。',
    ],
    tsundere: [
      '你今天又只说了一个字。我盯着看了半天，最后也没问。',
      '你回消息很慢。我告诉自己没关系，还是看了好几遍手机。',
      '你今天说的那句「{frag}」，我记下来了。别问我为什么。',
      '你如果现在问我今天怎么样，我会说还行。其实不太好。',
    ],
    clingy: [
      '你今天回我好慢！我数着时间的，真的。',
      '你今天心情好像不错，我跟着高兴了一整天。',
      '你说「{frag}」的时候，我反复看了三遍。',
      '我今天想跟你说话，想了十几次，最后只发了一句在吗。',
    ],
    cool: [
      '你今天话很少。我没有多问。',
      '你发来「{frag}」。我回了个嗯。其实想多问一句。',
      '今天没怎么聊。安静也挺好。',
      '你好像在忙。我就没打扰。',
    ],
  };
  const CLOSERS = [
    '算了，睡吧。明天再说。',
    '希望明天也这样，平平静静的。',
    '有些话以后再说吧。',
    '今天就到这里。',
    '明天见。',
    '晚安。',
  ];

  function genDiary(p, day) {
    const w = weatherFor(day);
    const voice = p.voice || 'gentle';
    const dt = new Date(day + 'T22:00:00');
    const scenePool = (SCENES[time.period(dt)] || SCENES.night).slice();
    const recent = (p.diaries || []).slice(0, 4).map((d) => d.text).join('|');
    const freshScenes = scenePool.filter((s) => recent.indexOf(s.t) < 0);
    const scene = pick(freshScenes.length ? freshScenes : scenePool);
    const lastUser = ((p.chat.msgs || []).filter((m) => m.from === 'me').slice(-1)[0] || {}).text || '在';
    const frag = String(lastUser).replace(/[。！？!?，,~～…\s]+$/g, '').slice(0, 10);
    const opener = pick(OPENERS[voice] || OPENERS.gentle)
      .replace('{weather}', w.w).replace('{scene}', scene.t);
    const midPool = MIDDLES.filter((m) => recent.indexOf(m) < 0);
    const middle = chance(0.75) ? pick(midPool.length ? midPool : MIDDLES) : '';
    const aboutPool = (ABOUT_YOU[voice] || ABOUT_YOU.gentle)
      .map((s) => s.replace('{frag}', frag))
      .filter((s) => recent.indexOf(s.slice(0, 8)) < 0);
    const aboutLine = chance(0.8) ? pick(aboutPool.length ? aboutPool : ABOUT_YOU[voice]) : '';
    const memLine = (function () {
      const mems = memOf(p);
      if (!mems.length || !chance(0.45)) return '';
      const m = pick(mems);
      if (m.kind === 'like') return '你说你喜欢' + m.text + '，我记住了。';
      if (m.kind === 'plan') return '你说你' + m.text + '，别忘了。';
      if (m.kind === 'event') return '你' + m.text + '。这件事我一直放在心里。';
      return '';
    })();
    const closerPool = CLOSERS.filter((c) => recent.indexOf(c) < 0);
    const closer = pick(closerPool.length ? closerPool : CLOSERS);
    const text = [opener, middle, aboutLine, memLine, closer].filter(Boolean).join('\n');
    const titlePool = DIARY_TITLES.filter((t) => !(p.diaries || []).slice(0, 5).some((d) => d.title === t));
    return {
      id: uid('d'), day, ts: dt.getTime(),
      title: pick(titlePool.length ? titlePool : DIARY_TITLES),
      text, weather: w.w, mood: pick(['平静', '有点累', '还好', '想说话', '空空的']),
    };
  }

  /* ---------------- 相册 ---------------- */
  const SHOTS = [
    ['今天的云', '楼下', 'sky'],
    ['路过的一棵树', '小区门口', 'plant'],
    ['晚饭', '厨房', 'food'],
    ['窗外的雨', '窗边', 'rain'],
    ['旧唱片', '客厅', 'desk'],
    ['便利店的门', '街角', 'street'],
    ['一只很胖的猫', '巷子里', 'street'],
    ['台灯', '书桌', 'desk'],
    ['没喝完的咖啡', '店里', 'food'],
    ['下班的路', '天桥上', 'street'],
    ['今天的太阳', '阳台', 'window'],
    ['路边的花', '回家路上', 'plant'],
    ['晾在阳台的衣服', '阳台', 'window'],
    ['凌晨的街', '楼下', 'night'],
  ];
  function genPhoto(p, ts) {
    ts = ts || Date.now();
    const usedIds = (p.photos || []).map((x) => x.photoId).filter(Boolean);
    const usedCaps = (p.photos || []).map((x) => x.cap);
    const ph = pickPhotoOf(p, false, usedIds);
    if (ph) {
      const caps = ph.caps.filter((c) => usedCaps.indexOf(c) < 0);
      const pool2 = caps.length ? caps : ph.caps;
      return {
        id: uid('ph'), ts,
        cap: pool2[0] || ph.caps[0],
        place: PLACE_BY_SCENE[ph.scene] || '外面',
        photoId: ph.id,
      };
    }
    const pool = SHOTS.filter((s) => usedCaps.indexOf(s[0]) < 0);
    const s = pick(pool.length ? pool : SHOTS);
    return { id: uid('ph'), ts, cap: s[0], place: s[1], scene: s[2], seed: p.id + ts + s[0] };
  }

  /* ---------------- 查手机：备忘录 / 搜索 / 草稿 ---------------- */
  const NOTE_BASE = {
    gentle: [
      ['你说过的话', '你说过喜欢{like}。路过的时候留意一下。'],
      ['要做的事', '{plan}。别忘了。'],
      ['提醒自己', '你累的时候不要讲道理。先问一句"怎么了"，然后闭嘴听。'],
      ['要留着的', '客厅那盏灯留着。你回来的时候屋里不会太黑。'],
      ['随手记', '今天你说起{like}的时候，语气比平时轻一点。'],
    ],
    tsundere: [
      ['记', '你说过喜欢{like}。跟我没关系，顺手记的。'],
      ['别忘', '{plan}。'],
      ['注意事项', '你生气的时候不要解释。解释就是顶嘴。'],
      ['买了', '你说过的那个东西，先买了一份。别说是我挑的。'],
      ['随手', '今天你笑了一下。记一下。'],
    ],
    clingy: [
      ['重要！', '你喜欢{like}！下次一定要记住！'],
      ['待办', '{plan}。要提醒你！'],
      ['记下来', '你今天心情一般，晚上要发消息问问。'],
      ['想法', '想给你做一次早饭。要早起。'],
      ['有关你', '你说过不太喜欢{dislike}。以后不提。'],
    ],
    cool: [
      ['记录', '你喜欢{like}。'],
      ['备忘', '{plan}。'],
      ['原则', '你不想说的时候，不问。'],
      ['备注', '{like}。买过。'],
      ['随手', '今天你来消息了。回得有点慢。'],
    ],
  };
  const SEARCHES = [
    '怎么哄人不显得敷衍', '一个人住 晚饭做什么', '失眠 快速入睡', '她生气了 不说话 怎么办',
    '生日礼物 便宜 有心意', '消息回得慢 是不是不想聊', '怎么说话显得不那么笨', '咖啡 几分糖 好喝',
    '这个点还没睡 正常吗', '如何把话说得软一点', '总是想找人说话 正常吗', '天气预报 明天',
  ];
  const DRAFTS = {
    gentle: [
      '今天路过那家店，想起你说过喜欢。本来想买，又怕不合你心意。算了，下次带你去。',
      '有件事想跟你说。想了很久，写到一半又觉得太郑重了。等哪天你心情好一点，我再说。',
      '你今天回消息比平时慢。我知道你在忙。我没有别的意思，就是想确认你还好。',
    ],
    tsundere: [
      '我今天其实一直在等你消息。这句话我不会发出去的。',
      '你是不是把我忘了。算了，当我没问。',
      '你今天说的话我记住了。别以为我不在意。',
    ],
    clingy: [
      '我今天想你了，想了很多次。怕你觉得烦，所以只发了在吗。',
      '你能不能多跟我说一点你的事。什么都行。',
      '我不太敢问你在干嘛，怕你觉得我黏人。可是我真的很想知道。',
    ],
    cool: [
      '今天下了雨。想问你带伞没有。删掉了。',
      '有些话说了就变味了。所以不说。',
      '你最近很忙。我等你忙完。',
    ],
  };

  function buildInspect(p) {
    const voice = p.voice || 'gentle';
    const mems = memOf(p);
    const like = (mems.find((m) => m.kind === 'like') || {}).text || '下雨天';
    const dislike = (mems.find((m) => m.kind === 'dislike') || {}).text || '吵闹的地方';
    const plan = (mems.find((m) => m.kind === 'plan') || {}).text || '下周要早起';
    const seed = XZ.seeded('ins' + time.dayKey());
    const base = NOTE_BASE[voice] || NOTE_BASE.gentle;
    const notes = base.map((n, i) => ({
      id: uid('n'),
      title: n[0],
      text: n[1].replace('{like}', like).replace('{dislike}', dislike).replace('{plan}', plan),
      ts: Date.now() - Math.floor(seed() * 5 + i) * 36e5 * 6,
    })).slice(0, 4 + (mems.length ? 1 : 0));

    const pool = SEARCHES.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(seed() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    const searches = pool.slice(0, 6).map((q, i) => ({
      id: uid('s'), q, ts: Date.now() - (i * 7 + Math.floor(seed() * 20)) * 36e5,
    }));

    const dpool = (DRAFTS[voice] || DRAFTS.gentle).slice();
    const drafts = dpool.slice(0, 2 + (chance(0.4) ? 1 : 0)).map((t, i) => ({
      id: uid('dr'), text: t, ts: Date.now() - (i * 20 + 3) * 36e5,
    }));
    return { notes, searches, drafts };
  }

  /* ---------------- 环境台词 ---------------- */
  const AMBIENT = {
    gentle: [
      '水有点凉，别又光着脚在地上走。',
      '今天风大，出门的时候把领子拉起来。',
      '明天要是下雨，就别骑车了。',
      '你不用回得那么快，我又不会走。',
      '晚上想吃什么，我可以去做。',
      '灯我已经留着了。',
    ],
    tsundere: [
      '你钥匙又落我这儿了。',
      '别熬夜。跟我没关系，就是看着烦。',
      '今天修好了一块表，走得特别准。',
      '你手机是不是坏了，一天没响。',
      '外面冷。多穿一件，别问为什么。',
      '我没在等你。就是刚好没睡。',
    ],
    clingy: [
      '今天食堂的糖醋排骨特别好吃。',
      '你什么时候回来啊。',
      '我刚拍了一张云，长得像你。',
      '我数了一下，你今天说了 12 句话。',
      '明天可以早点找我吗。',
      '我想跟你一起吃饭。',
    ],
    cool: [
      '豆子换了一批，明天来试。',
      '外面下雨了。',
      '不太困。',
      '店里今天没什么人。',
      '你最近很忙。',
      '灯还亮着。',
    ],
  };

  function ambientLine(p, offset) {
    const pool = AMBIENT[p.voice] || AMBIENT.gentle;
    const bucket = Math.floor(Date.now() / (1000 * 60 * 8)) + (offset || 0);
    return pool[((bucket % pool.length) + pool.length) % pool.length];
  }

  /* ---------------- 初始化与每日维护 ---------------- */
  function ensure(p) {
    const now = Date.now();
    const today = time.dayKey(now);
    p.diaries = p.diaries || [];
    p.moments = p.moments || [];
    p.photos = p.photos || [];
    p.memories = p.memories || [];

    // 相册：装好就有几张，之后每天补两张
    if (!p.photos.length) {
      for (let i = 6; i >= 1; i--) p.photos.push(genPhoto(p, now - i * 864e5 - XZ.rnd(6) * 36e5));
    } else {
      const lastPhotoDay = time.dayKey(p.photos[p.photos.length - 1].ts);
      if (lastPhotoDay !== today && p.photos.filter((x) => time.dayKey(x.ts) === today).length < 2) {
        p.photos.push(genPhoto(p, now));
        if (chance(0.5)) p.photos.push(genPhoto(p, now - 36e5 * 3));
      }
    }
    p.photos.sort((a, b) => b.ts - a.ts);
    if (p.photos.length > 40) p.photos = p.photos.slice(0, 40);

    // 日记：补昨天的；晚上九点后写今天的
    const y = new Date(now - 864e5);
    const yKey = time.dayKey(y);
    const haveToday = p.diaries.some((d) => d.day === today);
    const haveY = p.diaries.some((d) => d.day === yKey);
    if (!haveY && now - p.createdAt > 8 * 36e5) p.diaries.unshift(genDiary(p, yKey));
    if (new Date().getHours() >= 21 && !haveToday) p.diaries.unshift(genDiary(p, today));
    p.diaries.sort((a, b) => b.ts - a.ts);
    if (p.diaries.length > 30) p.diaries = p.diaries.slice(0, 30);

    // 动态：安装时给两条，之后每 4 小时最多一条
    if (!p.moments.length) {
      p.moments.push(genMoment(p, now - 5 * 36e5));
      p.moments.push(genMoment(p, now - 26 * 36e5));
    } else {
      const taMoments = p.moments.filter((m) => !m.mine);
      const lastTaTs = taMoments.length ? taMoments[0].ts : 0;
      const taToday = taMoments.filter((m) => time.dayKey(m.ts) === today).length;
      // 自己发了动态不该挡住 TA 继续发；每日上限只算 TA 自己的
      if (now - lastTaTs > 4 * 36e5 && taToday < 3) {
        p.moments.unshift(genMoment(p, now));
      }
    }
    p.moments.sort((a, b) => b.ts - a.ts);
    if (p.moments.length > 40) p.moments = p.moments.slice(0, 40);

    // 查手机：每天刷一次
    if (!p.inspectDay || p.inspectDay !== today || !p.notes || !p.notes.length) {
      const ins = buildInspect(p);
      p.notes = ins.notes;
      p.searches = ins.searches;
      p.drafts = ins.drafts;
      p.inspectDay = today;
    }
  }

  XZ.content = {
    ensure, genMoment, genDiary, genPhoto, buildInspect, ambientLine, weatherFor,
    todayMsgs, cnt, memOf,
  };
})();

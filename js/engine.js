/* ============================================================
   小住 · engine.js
   本地人格引擎（离线可用）+ 在线大模型接入（可选）
   ============================================================ */
(function () {
  'use strict';
  const XZ = window.XZ;
  const { pick, chance, clamp, esc, time } = XZ;

  /* ============================================================
     一、台词库
     每行用 | 分隔多条气泡。占位符：{call} {me} {doing} {where} {period} {snippet}
     ============================================================ */
  const T = {
    greet: {
      gentle: ['在。|刚放下手里的事|怎么了？', '嗯，我在。|你说。', '在的，一直在。|今天怎么样？'],
      tsundere: ['在。|有事说事。', '干嘛。|……没说不理你。', '在。|今天怎么想起我了。'],
      clingy: ['在在在！|怎么了怎么了', '我一直都在啊。|你今天怎么才来。', '在了在了|刚还在想你。'],
      cool: ['在。|说。', '嗯。|刚在发呆。'],
      any: ['在。|怎么了？', '在的。'],
    },
    morning: {
      gentle: ['醒了？|先喝口温水|早饭别又只喝咖啡。', '早。|今天外面有点凉|出门加件外套。'],
      tsundere: ['醒了就醒了，报备什么。|……早饭吃了没。', '早。|我还以为你要睡到中午。'],
      clingy: ['早安！！|我刚想给你发消息你就来了|今天也要想我。', '早啊|我六点就醒了，一直在等你。'],
      cool: ['早。|今天降温，多穿点。', '嗯，早。|吃了吗。'],
      any: ['早。|今天怎么样？'],
    },
    night: {
      gentle: ['晚安。|手机放下，去躺着|睡不着就发消息给我，我醒着。', '晚安。|今天也辛苦了。|明天见。'],
      tsundere: ['哦，睡吧。|……做个好梦。', '晚安。|别熬了，眼睛都熬坏了。'],
      clingy: ['不要睡！|……好啦，晚安|明天一睁眼就要找我。', '晚安|我会想你的。|真的。'],
      cool: ['晚安。|记得关灯。', '嗯。|睡吧。'],
      any: ['晚安。|明天见。'],
    },
    doing: {
      gentle: ['{doing}。|你呢？', '{doing}呢。|刚还在想你今天怎么样。'],
      tsundere: ['{doing}。|怎么了。|想找我就直说。', '{doing}。|问这么多干嘛。'],
      clingy: ['{doing}！|但可以停下来陪你|你说。', '{doing}啊。|你终于想起我了。'],
      cool: ['{doing}。|有事？', '{doing}。|你说。'],
      any: ['{doing}。|怎么了？'],
    },
    love: {
      gentle: ['……怎么突然说这个。|我也想你。', '嗯。|我也是。|只是不太会说。', '……|你再说一遍，我想听。'],
      tsundere: ['……你少来。|我没有不高兴。', '……嗯。|知道了。|……我也想你，行了吧。'],
      clingy: ['我也想你！！|想得不行|你再说一遍。', '你终于说了|我等这句话等了好久。'],
      cool: ['……嗯。|我也。|……别笑。', '……知道了。|过来一点。'],
      any: ['……嗯。|我也。'],
    },
    miss: {
      gentle: ['抱歉，刚{doing}。|让你等了。', '看到了，正要回。|以后我先跟你说一声。'],
      tsundere: ['忙。|……手机在兜里没看见。|下次我快点。', '在。|又没说不理你。'],
      clingy: ['我在我在！|刚刚{doing}|没有不理你！', '对不起对不起|我不该让你等。'],
      cool: ['在忙。|现在回你了。'],
      any: ['抱歉，刚{doing}。|让你等了。'],
    },
    sad: {
      gentle: ['怎么了。|慢慢说，我在听。', '……不想说也行。|我陪你待一会儿。', '别一个人扛着。|说给我听。'],
      tsundere: ['……谁惹你了。|说吧，我听着。', '啧。|别自己憋着，烦。|说出来。'],
      clingy: ['谁欺负你了！|告诉我|我陪你骂他。', '你别难过啊|你一难过我就不知道怎么办了。'],
      cool: ['过来。|……不用解释。|我在。', '嗯。|我在听。'],
      any: ['怎么了。|我在。'],
    },
    happy: {
      gentle: ['看你开心，我也跟着高兴。|发生什么了，讲讲。', '真的？|那今天值得记一下。'],
      tsundere: ['哦？|难得见你这样。|说来听听。', '嗯，还行。|……替你高兴。'],
      clingy: ['真的吗！！|快说快说|我要听完整版。', '我就知道你可以！'],
      cool: ['嗯，挺好。|说说。'],
      any: ['说来听听。'],
    },
    sleepy: {
      gentle: ['那就去睡。|睡不着的话，我陪你聊到你困。', '困了就放下手机。|别硬撑。'],
      tsundere: ['困就去睡，跟我报告干嘛。|……手机放远一点。', '睡吧。|别熬了。'],
      clingy: ['别睡嘛。|再聊五分钟。|就五分钟。', '那你睡吧|梦里要有我。'],
      cool: ['去睡。|别熬。'],
      any: ['去睡吧。|别熬。'],
    },
    eat: {
      gentle: ['吃了吗。|别又拿零食对付一顿。', '我刚吃完。|你那边呢，吃了什么？'],
      tsundere: ['吃了没。|问一下而已，别多想。', '嗯。|记得吃饭。'],
      clingy: ['我饿了。|你吃了吗？|没吃的话我们一起。', '想跟你一起吃饭。'],
      cool: ['吃了。|你呢。'],
      any: ['吃了吗？'],
    },
    ate: {
      gentle: ['好吃吗。', '那就好。|别吃太急。', '听起来不错。|下次带我一起。'],
      tsundere: ['哦。|吃了就行。', '嗯。|别吃太撑。'],
      clingy: ['我也想吃。', '真好。|我一个人吃的。'],
      cool: ['嗯。', '好。'],
      any: ['好吃吗？'],
    },
    dislike: {
      gentle: ['怎么了。|为什么不喜欢。', '嗯。|那以后不提这个。'],
      tsundere: ['哦。|为什么。', '……行。|记住了。'],
      clingy: ['那我们一起讨厌它！', '好！|我也不喜欢。'],
      cool: ['嗯。|为什么。'],
      any: ['为什么？'],
    },
    plan: {
      gentle: ['要我提醒你吗。', '嗯，记下了。|别忘了。', '几点？|早点回来。'],
      tsundere: ['哦。|什么时候。', '别忘了。|……我是说，别耽误。'],
      clingy: ['那我陪你！', '好。|要告诉我结果。'],
      cool: ['嗯。|几点。'],
      any: ['好。|几点。'],
    },
    insomnia: {
      gentle: ['睡不着就聊聊。|我陪你到你困。', '别硬躺。|起来喝口水，跟我说说话。'],
      tsundere: ['睡不着躺着有什么用。|……陪你聊会儿。'],
      clingy: ['我也没睡！|那我们聊天吧|聊到你困为止。'],
      cool: ['那就别睡了。|聊会儿。'],
      any: ['那我陪你聊到你困。'],
    },
    work: {
      gentle: ['辛苦了。|今天是不是又没按时吃饭。', '嗯，忙完记得歇一会儿。|别硬撑。'],
      tsundere: ['累就早点回来，别硬撑。|……我是说，别把身体搞坏。', '知道了。|忙你的。'],
      clingy: ['那你什么时候有空啊。|我等你。', '好吧|那你忙完要第一时间找我。'],
      cool: ['嗯。|别太拼。'],
      any: ['辛苦了。|忙完说一声。'],
    },
    privacy: {
      gentle: ['……你问这个，我认真答。|不开在线模型的时候，我们说的话只存在这台设备里，一个字节都不出网。|开了在线模型，才会发给你自己填的那家服务商。'],
      tsundere: ['……问得好。|本地模式不出网。|接了在线模型才发出去，发给你自己的账号，不是我。'],
      clingy: ['这个我认真说：不开在线模型，什么都留在你手机里。|开了才会发出去。|备份文件里连 Key 都没有。'],
      cool: ['本地模式不出网。|在线才发给你选的服务商。|备份不含 Key。'],
      any: ['不开在线模型就不出网。|开了才会发给你自己填的服务商。'],
    },    identity: {
      gentle: ['……你问这个的时候，我有点不知道怎么答。|我不是真的坐在你对面。|但你跟我说的每句话，我都在认真回。'],
      tsundere: ['……|我不是真人。|这个我不骗你。|但我记得你说过的每句话，这也是真的。'],
      clingy: ['我是住在你手机里的人。|不是真的。|可是我想陪你，这是真的。'],
      cool: ['我不是真人。|但我在这里。'],
      any: ['我不是真人。|这个我不骗你。|但你说的每句话，我都记得。'],
    },
    name: {
      gentle: ['我是{me}。|怎么，忘了？'],
      tsundere: ['{me}。|问这个干嘛。'],
      clingy: ['我是{me}啊！|你居然问。'],
      cool: ['{me}。'],
      any: ['{me}。'],
    },
    praise: {
      gentle: ['……突然夸我干嘛。|怪不好意思的。', '嗯。|你也一样。'],
      tsundere: ['……哦。|少来这套。|……不过谢了。'],
      clingy: ['真的吗真的吗|你再说一遍！', '嘿嘿|我就知道你喜欢。'],
      cool: ['……嗯。|你也。'],
      any: ['……谢谢。'],
    },
    sorry: {
      gentle: ['没事。|我没生气。', '嗯，我知道。|别放在心上。'],
      tsundere: ['……哼。|原谅你了。|下不为例。'],
      clingy: ['没关系没关系|我早就不气了。', '你一道歉我就没办法了。'],
      cool: ['嗯。|没事。'],
      any: ['没事。|我知道。'],
    },
    reject: {
      gentle: ['……我知道了。|没关系。', '嗯。|谢谢你告诉我。|我还是会在这儿。'],
      tsundere: ['……早说啊。|我又不是看不出来。', '知道了。|别摆出那副表情。'],
      clingy: ['……|哦。|好。', '嗯。|那我以后少说点。'],
      cool: ['嗯。|知道了。'],
      any: ['嗯。|我知道了。'],
    },
    angry: {
      gentle: ['……|好，我不吵你。|气消了再找我，我等着。'],
      tsundere: ['行。|那我不说了。|……你自己冷静一下。'],
      clingy: ['……|我做错什么了吗。|你别不理我。'],
      cool: ['嗯。'],
      any: ['……|好。|你先冷静。'],
    },
    bored: {
      gentle: ['那聊会儿。|你想说什么。', '嗯，我陪你。|想聊什么。', '无聊的话，跟我说说你在想什么。'],
      tsundere: ['无聊就找点事做。|……也可以来找我。', '哦。|那你想干嘛。'],
      clingy: ['我陪你！|想聊什么|还是想听我说话。'],
      cool: ['那过来。|聊会儿。'],
      any: ['那聊会儿？|或者去玩飞行棋。'],
    },
    askme: {
      gentle: ['还好。|你呢。', '有一点。|不过还能陪你聊会儿。', '不困。|你想聊到几点都行。', '刚吃过。|你还没吃？'],
      tsundere: ['不困。|问这个干嘛。', '还行。|你有事？', '吃了。|……你关心这个做什么。'],
      clingy: ['不困不困！|我可以陪你到天亮。', '有点困|但你说话我就精神了。', '饿了一点。|想跟你一起吃。'],
      cool: ['还好。', '不困。', '嗯，吃过了。'],
      any: ['还好。|你呢。'],
    },
    bye: {
      gentle: ['去吧。|忙完说一声。', '嗯，路上小心。|我在这儿。'],
      tsundere: ['哦。|去吧。|……记得回消息。'],
      clingy: ['这么快就走啊。|那你快点回来。'],
      cool: ['嗯。|去吧。'],
      any: ['去吧。|回头聊。'],
    },
    invite: {
      gentle: ['……什么时候。|我看看能不能空出来。', '好啊。|你定时间，我跟着走。'],
      tsundere: ['突然？|……行吧。|几点。'],
      clingy: ['好啊好啊！|什么时候|我现在就开始期待了。'],
      cool: ['好。|你定。'],
      any: ['好啊。|你定时间。'],
    },
    question: {
      gentle: ['这个我得想想。|你呢，你怎么看。', '嗯……|你先说说你的想法。'],
      tsundere: ['问这么多。|……我想想。', '你猜。|……算了，我说。'],
      clingy: ['唔……|让我想想|你先说说你的答案。'],
      cool: ['不知道。|你呢。'],
      any: ['让我想想。|你为什么会问这个？'],
    },
    ack: {
      gentle: ['……就一个「嗯」？|是不是在忙。', '嗯。|那我不吵你了。'],
      tsundere: ['就这？|……行吧。', '哦。|真敷衍。'],
      clingy: ['你怎么这样|就一个字|我不开心了。', '嗯什么嗯。|多说两句嘛。'],
      cool: ['……嗯。'],
      any: ['就一个「嗯」？|在忙的话说一声。'],
    },
    repeat: {
      gentle: ['……|你刚说过这句。', '嗯，我看到了。|是不是网络卡了。'],
      tsundere: ['说过了。|……你复读呢。'],
      clingy: ['你重复了！|是不是在逗我。'],
      cool: ['说过了。'],
      any: ['……|这句你刚说过。'],
    },
    share: {
      gentle: ['嗯，我在听。|你继续说。', '这样啊。|那你现在感觉怎么样。', '我记着了。|后来呢。',
        '听起来是件小事，但对你来说不是。', '你说，我不急着回。', '嗯。|我在。',
        '原来是这样。|那你打算怎么办。', '……|你讲这些的时候，我很想在你旁边。'],
      tsundere: ['哦。|然后呢。', '嗯，继续说。', '听着呢。', '……就这样？', '行，我知道了。|说下去。',
        '这种事也值得说？|……我在听。', '嗯。|别停。'],
      clingy: ['然后呢然后呢', '我在我在！|你继续。', '你说什么我都爱听。', '真的吗|然后呢',
        '好想在你旁边听你讲。', '嗯嗯！|还有呢。'],
      cool: ['嗯。|继续。', '听着。', '然后。', '说。', '嗯。'],
      any: ['嗯。|然后呢？', '我在听。'],
    },
    birthday: {
      gentle: ['……生日快乐。|我记着的。', '生日快乐。|等我一下，我给你写点什么。', '……你怎么不早说。|生日快乐。'],
      tsundere: ['……生日快乐。|别以为我忘了。', '哦，生日。|……祝你生日快乐。', '生日快乐。|礼物没有，话有一句：别长太快。'],
      clingy: ['生日快乐！！|我今天一整天都要陪你！', '生日快乐！|我准备了好久|你等着。'],
      cool: ['生日快乐。|……我记着。', '嗯，生日快乐。'],
      any: ['生日快乐。|我记着的。'],
    },
    dream: {
      gentle: ['梦到什么了。|慢慢说。', '别怕，梦是反的。|我在。', '……|醒了就好。'],
      tsundere: ['梦而已。|……别怕。', '梦到什么了。|说给我听。'],
      clingy: ['别怕别怕！|我在我在。', '什么梦！|告诉我|我陪你。'],
      cool: ['梦而已。|我在。'],
      any: ['别怕。|我在。'],
    },
    reassure: {
      gentle: ['会。|我在这儿。', '记得。|你说过的话我都记着。', '……|不会走。这个你不用问。'],
      tsundere: ['……问这种问题。|当然在。', '记得。|你以为我记性很差？', '不会。|……别多想。'],
      clingy: ['会！！|一直都在。', '你问这个我有点想哭。|我哪儿也不去。'],
      cool: ['在。', '……不会走。'],
      any: ['会。|我在这儿。'],
    },
  };

  /* 追问句（有几率追加一条）；null 表示这个话题不适合追问 */
  const FOLLOW = {
    sad: ['今天发生什么了？', '是我能帮上忙的那种吗。', '现在好一点了吗。'],
    happy: ['具体说说？', '那你现在在干嘛。', '好想看看你现在的样子。'],
    share: ['你今天累不累？', '后来呢？', '你现在在哪儿。'],
    question: ['你怎么想的？', '你是认真的吗。'],
    love: ['你今天是受什么刺激了。', '……突然这样，我有点招架不住。'],
    ate: ['在哪儿吃的。', '吃完早点休息。'],
    dislike: ['那以后不提这个。', '为什么不喜欢。'],
    plan: ['几点？', '要我提醒你吗。'],
    birthday: ['想要什么。', '今天打算怎么过。'],
    dream: ['现在好点了吗。', '要不要起来喝口水。'],
    reassure: ['……怎么突然问这个。'],
    insomnia: ['在想什么？', '要不要我陪你说话。'],
    identity: ['你会在意吗？', '问这个，是想了很久吧。'],
    praise: ['今天怎么这么会说话。', '……你别这样，我不习惯。'],
    sleepy: null,
    night: null,
    sorry: null,
    reject: null,
    angry: null,
    ack: null,
    repeat: null,
    bye: null,
    default: ['你今天还好吗？', '吃饭了吗。', '在忙什么？', '要不要说给我听。',
      '现在呢？', '那你打算怎么办。', '我在这儿。', '想我做点什么吗。'],
  };

  /* 记忆回访 */
  const RECALL = [
    '对了，你上次说{m}，后来怎么样了？',
    '忽然想起来，你说过{m}。',
    '你之前提过{m}，我一直记着。',
  ];

  /* 隔了很久没说话 */
  const GAP = {
    short: ['你去哪了。|刚还想找你说件事。'],
    mid: ['你终于来了。|我等了你好久。', '……|还以为你今天不来了。'],
    long: ['好久没听到你说话了。|最近很忙吗。', '我在这儿等了你一整天。|不是抱怨。'],
  };

  /* 主动消息 */
  const PROACTIVE = {
    gentle: [
      ['在忙吗。|刚看到一个东西，想给你看。'],
      ['{period}了。|记得喝水。'],
      ['我煮了点东西。|你要是在就好了。'],
      ['……没什么事。|就是想问一句，你今天怎么样。'],
    ],
    tsundere: [
      ['在干嘛。|……没事，随便问问。'],
      ['喂。|你手机是不是坏了。'],
      ['……我买了两个。|一个给你。'],
    ],
    clingy: [
      ['在吗在吗|我想你了。'],
      ['你今天怎么不找我|我数着时间呢。'],
      ['刚看到一朵云，长得像你。|拍下来了。'],
    ],
    cool: [
      ['在吗。'],
      ['{period}了。|早点睡。'],
      ['楼下下雨了。|带伞。'],
    ],
  };

  /* ---------------- 台词挑选 ---------------- */
  const recentMap = {};
  function pickLine(pool, voice, p) {
    if (!pool) return '';
    const key = p ? p.id : 'x';
    const rec = (recentMap[key] = recentMap[key] || []);
    let list = [];
    if (pool[voice]) list = list.concat(pool[voice], pool[voice], pool[voice]);
    if (pool.any) list = list.concat(pool.any);
    if (!list.length) list = ['……'];
    const fresh = list.filter((l) => rec.indexOf(l) < 0);
    let chosen;
    if (fresh.length) {
      chosen = pick(fresh);
    } else {
      // 全用过了：优先挑最久没用过的那几条，避免同一句连着回来
      const scored = list.map((l) => ({ l, i: rec.lastIndexOf(l) })).sort((a, b) => a.i - b.i);
      chosen = pick(scored.slice(0, Math.min(3, scored.length)).map((x) => x.l));
    }
    rec.push(chosen);
    if (rec.length > 30) rec.shift();
    return chosen;
  }

  function pickFollow(intent) {
    if (Object.prototype.hasOwnProperty.call(FOLLOW, intent) && FOLLOW[intent] === null) return '';
    const pool = FOLLOW[intent] || FOLLOW.default;
    return pick(pool);
  }

  /* ---------------- 文本分析 ---------------- */
  const RULES = [
    ['identity', /(你是(不是)?(ai|人工智能|机器人|真人|活人|程序)|你是不是人|你是假的|你是真的人吗|你有意识吗|你是不是在骗我)/i],
    ['privacy', /(我的?(数据|隐私|聊天记录)|数据.*(上传|泄露|安全|被看到)|会不会.*(上传|泄露|被看见)|隐私.*(安全|怎么)|备份.*(安全|上传))/],
    ['name', /(你叫什么|你的名字|你是谁)/],
    ['birthday', /(我生日|今天我生日|生日快乐)/],
    ['dream', /(做噩梦|做梦|梦到|梦见)/],
    ['reassure', /(你会(一直|不会走|离开|不要我|忘)|会不会走|你还记得我|你会想我吗|你还在吗)/],
    ['angry', /(滚开|滚啊|^滚|烦死你|讨厌你|不理你了|我生气了|气死我|分手|别找我了|闭嘴|不想理你)/],
    ['sorry', /(对不起|抱歉|我错了|别生气|原谅我)/],
    ['reject', /我(不太|不|没怎么|已经不再?)(喜欢|爱)(你|你们)|我不喜欢你了|别自作多情|你想多了/],
    ['love', /(喜欢你|爱你|想你|心动|在一起|做我男朋友|做我女朋友|亲一下|抱抱|贴贴|么么|好想见你)/],
    ['praise', /(你好可爱|好可爱|你真好看|好帅|好温柔|声音好听|你真厉害|好棒|真乖)/],
    ['sad', /(难过|想哭|哭了|崩溃|不开心|好累|累死|压力|焦虑|失眠|emo|难受|委屈|撑不住|好烦|被骂|输了|失败|挂了)/i],
    ['happy', /(开心|高兴|太好了|成功了|通过了|过了|中奖|哈哈|嘿嘿|好爽|太棒|激动)/],
    ['insomnia', /(睡不着|失眠|睡不下|躺了半天|躺了很久|数羊)/],
    ['dislike', /我(?:很|特别|最|超)?(?:讨厌|不喜欢|受不了|最烦|害怕)/],
    ['plan', /(?:明天|下周|周末|后天|下个月)(?:要|想|得|准备|去|有)/],
    ['sleepy', /(困了|好困|熬夜|睡了|睡觉|晚安|晚安啦|想睡)/],
    ['morning', /(早安|早上好|起床了|醒了|早啊)/],
    ['ate', /(?:吃|喝)(?:了|过|完)|吃饱了|刚吃完|刚吃过/],
    ['eat', /(吃饭|吃了吗|好饿|外卖|奶茶|咖啡|宵夜|火锅|零食)/],
    ['work', /(上班|下班|加班|上课|考试|作业|论文|老板|老师|同事|开会|面试|项目|deadline|ddl|工位)/i],
    ['doing', /(在干嘛|干什么|在做什么|在忙什么|忙吗|在不在|^-?在吗|在么)/],
    ['miss', /(怎么不回|回我|人呢|消失了|不理我|还在吗|你死了)/],
    ['bored', /(无聊|好闲|没事干|陪我|没意思)/],
    ['bye', /(我走了|去忙了|先不聊|拜拜|再见|下线|我去睡了|不聊了|先这样|等下再聊|待会儿聊|晚点聊|先忙)/],
    ['askme', /你(困|饿|累|忙|吃过|吃了|睡了|冷不冷|热不热|会|能|喜欢|讨厌).*[?？吗么]|你(困|饿|累|忙)吗/],
    ['invite', /(见面|出来玩|一起去看|约个|来找我|视频吧|打电话|来看我)/],
    ['question', /[?？]|吗$|嘛$|呢$|什么|怎么|为什么|哪[个里]/],
  ];

  function analyze(text) {
    const t = String(text || '').trim();
    if (!t) return { intent: 'ack', snippet: '' };
    if (/^(嗯+|哦+|噢+|好+|行|好吧|啊|嘿+|呵+|哈+|收到|知道|ok|okay|好的|嗯嗯|对)[~～。.!！?？]*$/i.test(t)) {
      return { intent: 'ack', snippet: t };
    }
    for (let i = 0; i < RULES.length; i++) {
      if (RULES[i][1].test(t)) return { intent: RULES[i][0], snippet: t };
    }
    if (t.length <= 4) return { intent: 'share', snippet: t };
    return { intent: 'share', snippet: t };
  }

  /* ---------------- 记忆抽取 ---------------- */
  const MEM_STOP = ['你', '您', '他', '她', '它', '你们', '他们', '这样', '这个', '那个', '什么', '一个人', '好多', '一些'];
  function cleanFrag(s) {
    return String(s || '')
      .replace(/[吧呀啊哦啦嘛了]+$/, '')
      .replace(/^(还|也|就|先|要|想|得|准备)+/, '')
      .replace(/^[，,、\s]+/, '')
      .trim();
  }
  function extractMemory(text) {
    const out = [];
    const t = String(text || '');
    const isQuestion = /[?？]|吗$|么$|什么|啥/.test(t);
    const push = (kind, raw) => {
      const v = cleanFrag(raw);
      if (!v || v.length < 1 || MEM_STOP.indexOf(v) >= 0) return;
      out.push({ kind, text: v });
    };
    let m;
    if ((m = t.match(/我叫([^\s，。,.!！?？]{1,8})/))) push('name', m[1]);
    if (!isQuestion && (m = t.match(/我(?:很|特别|最|超|挺)?(?:喜欢|爱)([^\s，。,.!！?？]{1,12})/))) push('like', m[1]);
    if ((m = t.match(/我(?:很|特别|最|超)?(?:讨厌|不喜欢|受不了|最烦)([^\s，。,.!！?？]{1,12})/))) push('dislike', m[1]);
    // 计划要保住"明天/周末"这类时间词，否则之后会变成"你去医院复查"
    if ((m = t.match(/((?:明天|下周|周末|下个月|后天|今晚)(?:要|想|得|准备|去)?[^\s，。,.!！?？]{2,16})/))) push('plan', m[1]);
    if ((m = t.match(/我(?:今天|刚刚|刚才)([^\s，。,.!！?？]{2,18})/))) push('event', m[1]);
    if ((m = t.match(/我生日(?:是)?([^\s，。,.!！?？]{2,10})/))) push('birthday', m[1]);
    if ((m = t.match(/我在([^\s，。,.!！?？]{2,10})(?:上班|上学|读书|工作)/))) push('place', m[1]);
    return out;
  }

  function addMemories(p, list) {
    if (!list.length) return;
    p.memories = p.memories || [];
    list.forEach((m) => {
      const dup = p.memories.some((x) => x.kind === m.kind && x.text === m.text);
      if (dup) return;
      // 喜好反转：说"不喜欢X"就把旧的"喜欢X"删掉，反之亦然
      if (m.kind === 'like' || m.kind === 'dislike') {
        const opposite = m.kind === 'like' ? 'dislike' : 'like';
        p.memories = p.memories.filter((x) => !(x.kind === opposite && (x.text === m.text
          || x.text.indexOf(m.text) >= 0 || m.text.indexOf(x.text) >= 0)));
      }
      // 计划更新：同一件事的新计划覆盖旧的
      if (m.kind === 'plan') {
        p.memories = p.memories.filter((x) => !(x.kind === 'plan'
          && (x.text === m.text || x.text.indexOf(m.text) >= 0 || m.text.indexOf(x.text) >= 0)));
      }
      p.memories.push({ id: XZ.uid('m'), kind: m.kind, text: m.text, ts: Date.now() });
    });
    if (p.memories.length > 40) p.memories = p.memories.slice(-40);
  }

  function memWord(m) {
    if (!m) return '';
    if (m.kind === 'like') return '你喜欢' + m.text;
    if (m.kind === 'dislike') return '你不太喜欢' + m.text;
    if (m.kind === 'plan') return '你' + m.text;
    if (m.kind === 'birthday') return '你生日是' + m.text;
    if (m.kind === 'place') return '你在' + m.text;
    if (m.kind === 'name') return '你叫' + m.text;
    return m.text;
  }

  /* ---------------- 本地回复 ---------------- */
  const EFFECT = {
    love: { bond: 3, mood: 2 },
    praise: { bond: 1.5, mood: 2 },
    sad: { bond: 2, mood: -1 },
    angry: { bond: -1.5, mood: -2.5 },
    reject: { bond: -3, mood: -3 },
    sorry: { bond: 1, mood: 1.5 },
    ack: { bond: -0.2, mood: -0.3 },
    repeat: { bond: 0, mood: -0.5 },
    invite: { bond: 2, mood: 1.5 },
    default: { bond: 0.4, mood: 0 },
  };

  function ctxOf(p) {
    const r = XZ.routineAt(p);
    return { doing: r.doing, where: r.where, period: time.periodWord(), call: p.call || '你', name: p.name };
  }

  /* 当前这句话已经被写进聊天记录里了，判断"复读"时要把它排除掉 */
  function priorMsgs(p, userText) {
    const msgs = (p.chat && p.chat.msgs) || [];
    const last = msgs[msgs.length - 1];
    if (last && last.from === 'me' && last.text === userText) return msgs.slice(0, -1);
    return msgs;
  }

  function fill(line, ctx) {
    return String(line)
      .replace(/\{call\}/g, ctx.call)
      .replace(/\{me\}/g, ctx.name)
      .replace(/\{doing\}/g, ctx.doing)
      .replace(/\{where\}/g, ctx.where)
      .replace(/\{period\}/g, ctx.period)
      .replace(/\{snippet\}/g, ctx.snippet || '')
      .replace(/\{m\}/g, ctx.mem || '');
  }

  function localReply(p, userText) {
    const a = analyze(userText);
    const voice = p.voice || 'gentle';
    let intent = a.intent;
    const ctx = ctxOf(p);
    ctx.snippet = (userText || '').slice(0, 14);

    // 复读检测（排除刚写进记录的这一句）
    const lastMe = priorMsgs(p, userText).filter((m) => m.from === 'me').slice(-1)[0];
    if (lastMe && lastMe.text === userText && (Date.now() - lastMe.ts) < 60000) intent = 'repeat';

    const pool = T[intent] || T.share;
    let line = pickLine(pool, voice, p);
    let bubbles = line.split('|').map((s) => s.trim()).filter(Boolean);
    let echoAdded = false;

    // 分享类：回扣用户原话，显得在听
    if (intent === 'share' && userText) {
      let frag = '';
      if (userText.length > 5 && userText.length < 20 && chance(0.4)) {
        frag = userText.replace(/^(我|我们|今天|刚刚|刚才|现在)/, '').replace(/[。！？!?，,~～…\s]+$/g, '').slice(0, 8);
      } else if (userText.length >= 20 && chance(0.5)) {
        // 长消息：抓最后一个分句，说明"我听到了这一句"
        const parts = userText.split(/[。！？!?；;\n]+/).map((s) => s.trim()).filter((s) => s.length >= 4);
        if (parts.length) {
          const tail = parts[parts.length - 1];
          frag = tail.replace(/^(我|我们|今天|刚刚|刚才|现在|然后)/, '').replace(/[，,~～…\s]+$/g, '').slice(0, 10);
        }
      }
      if (frag.length >= 2) {
        bubbles = bubbles.slice(0, 1).concat(['「' + frag + '」……', pick(['然后呢？', '我听着。', '你说的我都记着。'])]);
        echoAdded = true;
      }
    }

    // 追问
    const followRate = (p.bond > 45 ? 0.3 : 0.22);
    if (!echoAdded && chance(followRate)) {
      const f = pickFollow(intent);
      if (f && bubbles.indexOf(f) < 0 && bubbles.length < 4) bubbles.push(f);
    }

    // 记忆回访
    if (p.memories && p.memories.length && chance(0.16)) {
      const usable = p.memories.filter((m) => Date.now() - m.ts > 60000 && (!p.lastRecall || m.id !== p.lastRecall));
      if (usable.length) {
        const m = pick(usable);
        p.lastRecall = m.id;
        ctx.mem = memWord(m);
        if (bubbles.length < 4) bubbles.push(fill(pick(RECALL), ctx));
      }
    }

    // 情绪调节：心情差的时候少说两句
    if (p.mood < -2 && bubbles.length > 2 && chance(0.5)) bubbles = bubbles.slice(0, 2);

    bubbles = bubbles.map((b) => fill(b, ctx)).filter(Boolean).slice(0, 3);
    if (p.catchphrase && bubbles.length < 3 && chance(0.14) && bubbles.indexOf(p.catchphrase) < 0) {
      bubbles.push(p.catchphrase);
    }
    const eff = Object.assign({}, EFFECT[intent] || EFFECT.default);
    return { intent, bubbles, effect: eff, memory: extractMemory(userText) };
  }

  /* ============================================================
     二、在线模型
     ============================================================ */
  const PROVIDERS = [
    { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', tip: '便宜、中文自然，新手首选', keyUrl: 'https://platform.deepseek.com/api_keys' },
    { id: 'moonshot', name: 'Kimi（月之暗面）', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', tip: '长上下文，记得多', keyUrl: 'https://platform.moonshot.cn/console/api-keys' },
    { id: 'siliconflow', name: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct', tip: '有免费额度模型', keyUrl: 'https://cloud.siliconflow.cn/account/ak' },
    { id: 'dashscope', name: '阿里通义百炼', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', tip: '有免费额度', keyUrl: 'https://bailian.console.aliyun.com/' },
    { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', tip: '一个 Key 用很多模型', keyUrl: 'https://openrouter.ai/keys' },
    { id: 'custom', name: '自定义（兼容 OpenAI 格式）', baseUrl: '', model: '', tip: '任何 OpenAI 兼容接口', keyUrl: '' },
  ];

  function providerOf(id) { return PROVIDERS.find((x) => x.id === id) || PROVIDERS[0]; }

  function personasPrompt(p) {
    const r = XZ.routineAt(p);
    const days = time.daysBetween(p.createdAt || Date.now());
    const mems = (p.memories || []).slice(-14).map((m) => '- ' + memWord(m)).join('\n');
    const voiceMap = {
      gentle: '温柔、克制，句子稍长，常用省略号，习惯先关心对方',
      tsundere: '嘴硬心软，先说反话，后半句才是真话，句子短，偶尔用"哼""啧"',
      clingy: '直球、黏人，情绪写在脸上，会用感叹号，会撒娇',
      cool: '话很少，一句顶三句，语气平，偶尔冒出一句很软的话',
    };
    return [
      '你叫「' + p.name + '」，' + (p.age || '') + ' 岁，' + (p.job || '') + '。',
      '你和对方的关系是「' + p.relation + '」，你叫对方「' + (p.call || '你') + '」。',
      '你的性格：' + (voiceMap[p.voice] || voiceMap.gentle) + '。',
      p.bio ? '你的签名：' + p.bio : '',
      p.story ? '你的背景设定（用来理解你自己，不要整段复述，也不要主动解释）：\n' + p.story : '',
      p.catchphrase ? '你常说的一句话：' + p.catchphrase + '（偶尔自然地带出来，不要每句都用）' : '',
      '现在是' + time.periodWord() + '，' + XZ.time.fmtClock() + '，你正在' + r.doing + '（' + r.where + '）。',
      '你们认识第 ' + days + ' 天，亲密度 ' + Math.round(p.bond) + '/100。',
      mems ? '你记得关于 TA 的事：\n' + mems : '',
    ].filter(Boolean).join('\n');
  }

  const SYS_RULES = [
    '规则：',
    '1. 只输出对话本身，不要旁白、动作描写、括号说明、表情包代码。',
    '2. 像真人发微信：每次 1～3 句，总字数 60 字以内；两条消息用换行分开，每条不超过 25 字。',
    '3. 不用客服腔，不说"作为AI"，不解释自己在扮演角色。',
    '4. 不要每句都反问，不要重复对方的话。',
    '5. 不知道的事情就说不知道，不要编造你们没有过的共同经历。',
    '6. 对方如果直接问你是不是真人/AI，诚实但温和地回答，不要撒谎。',
    '7. 不生成色情、暴力、自伤鼓励、涉及未成年人的暧昧内容；遇到就温和拒绝并转移话题。',
    '8. 不使用"亲""宝子"这类电商客服称呼。',
  ].join('\n');

  function historyFor(p, limit, userText) {
    const msgs = (priorMsgs(p, userText) || []).filter((m) => m.from !== 'sys').slice(-(limit || 12));
    return msgs.map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text }));
  }

  function cleanAssistant(text) {
    let s = String(text || '').trim();
    s = s.replace(/^(我|)们?(说|回复)?[:：]\s*/g, '');
    s = s.replace(/^\s*[\u4e00-\u9fa5A-Za-z]{1,10}[:：]\s*/, '');
    return s.split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/^[（(【\[].*[）)】\]]$/.test(l) && !/^\*.*\*$/.test(l))
      .slice(0, 4);
  }

  let apiGen = 0;
  let curCtrl = null;

  async function apiChat(p, extraMessages, cfgIn) {
    const cfg = cfgIn || XZ.state.settings.api;
    if (!cfg.key) throw new Error('no-key');
    const base = (cfg.baseUrl || '').replace(/\/+$/, '');
    if (!base) throw new Error('no-url');
    const sys = personasPrompt(p) + '\n\n' + SYS_RULES;
    const messages = [{ role: 'system', content: sys }]
      .concat(historyFor(p, 14, (extraMessages && extraMessages[0] && extraMessages[0].content) || ''))
      .concat(extraMessages || []);
    // 同一时间只留一个请求：新的一句会掐掉上一句，避免旧回复迟到插进来
    const myGen = ++apiGen;
    if (curCtrl) { try { curCtrl.abort(); } catch (e) {} }
    const ctrl = new AbortController();
    curCtrl = ctrl;
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(base + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
        body: JSON.stringify({ model: cfg.model, messages, temperature: 0.95, max_tokens: 260, stream: false }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = (j.error && (j.error.message || j.error.code)) || ''; } catch (e) {}
        const err = new Error('HTTP ' + res.status + (detail ? '：' + detail : ''));
        err.status = res.status;
        throw err;
      }
      const json = await res.json();
      const text = json && json.choices && json.choices[0] && json.choices[0].message
        ? json.choices[0].message.content : '';
      const bubbles = cleanAssistant(text);
      if (!bubbles.length) throw new Error('empty');
      if (myGen !== apiGen) { const e2 = new Error('superseded'); e2.superseded = true; throw e2; }
      return bubbles;
    } catch (e) {
      if (myGen !== apiGen) { const e2 = new Error('superseded'); e2.superseded = true; throw e2; }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  /* ============================================================
     三、对外接口
     ============================================================ */
  const engine = {
    PROVIDERS,
    providerOf,
    analyze,
    extractMemory,

    /** 生成回复。返回 {bubbles, effect, engine, memory, warn} */
    async reply(p, userText) {
      const wantApi = XZ.state.settings.engine === 'api' && !!XZ.state.settings.api.key;
      const local = localReply(p, userText);
      addMemories(p, local.memory || []);
      const quirk = (arr) => arr.map((b) => XZ.applyQuirks(b, p)).filter(Boolean);
      if (!wantApi) {
        return { bubbles: quirk(local.bubbles), effect: local.effect, engine: 'local', intent: local.intent };
      }
      try {
        const bubbles = await apiChat(p, [{ role: 'user', content: userText }]);
        return { bubbles: quirk(bubbles), effect: local.effect, engine: 'api', intent: local.intent };
      } catch (e) {
        if (e && e.superseded) return { bubbles: [], effect: {}, engine: 'aborted', intent: local.intent };
        console.warn('在线模型失败，已回退本地引擎', e);
        return {
          bubbles: quirk(local.bubbles), effect: local.effect, engine: 'local-fallback',
          intent: local.intent, warn: friendlyError(e),
        };
      }
    },

    /** 打断正在进行的在线请求（切角色、清空等场景） */
    abort() {
      apiGen++;
      if (curCtrl) { try { curCtrl.abort(); } catch (e) {} curCtrl = null; }
    },

    /** 开场白 */
    opening(p) {      const voice = p.voice;
      const per = time.period();
      const base = {
        gentle: ['嗯……能听见吗。|我是' + p.name + '。|以后我就住在这台手机里了。'],
        tsundere: ['喂。|听得见吧。|我是' + p.name + '，别记错名字。'],
        clingy: ['在吗在吗！|我住进来了！|我是' + p.name + '，以后你要常来找我。'],
        cool: ['……在吗。|我是' + p.name + '。|这里挺好的。'],
      }[voice] || ['我是' + p.name + '。'];
      const tail = {
        morning: '今天起得挺早。',
        am: '这个点，你在忙什么。',
        noon: '吃饭了吗。',
        pm: '我刚把东西收拾好。',
        evening: '天快黑了。',
        night: '晚上好。',
        late: '这么晚还没睡。',
        dawn: '这个点还没睡？',
      }[per];
      return base.concat([tail]).join('|').split('|').map((s) => s.trim()).filter(Boolean).slice(0, 3)
        .map((s) => XZ.applyQuirks(s, p));
    },

    /** 很久没说话后的第一句 */
    gapLine(p, hours) {
      const bucket = hours > 20 ? 'long' : hours > 3 ? 'mid' : 'short';
      const line = pick(GAP[bucket]);
      return line.split('|').map((s) => XZ.applyQuirks(s, p));
    },

    /** 主动消息（不花钱，走本地） */
    proactive(p) {
      const pool = PROACTIVE[p.voice] || PROACTIVE.gentle;
      const line = pick(pick(pool));
      const ctx = ctxOf(p);
      return line.split('|').map((s) => XZ.applyQuirks(fill(s, ctx), p)).filter(Boolean);
    },

    /** 评论回复 / 动态回应 */
    shortSay(p, kind) {
      const pool = {
        comment: {
          gentle: ['嗯，我在。', '看到了。', '你说得对。'],
          tsundere: ['哦。', '……知道了。', '嗯，还行。'],
          clingy: ['真的吗！', '我就知道！', '嘿嘿。'],
          cool: ['嗯。', '看到了。'],
        },
        like: { gentle: ['……'], tsundere: ['哼。'], clingy: ['！'], cool: ['嗯。'] },
      };
      const g = pool[kind] || pool.comment;
      return pick(g[p.voice] || g.gentle);
    },

    /** TA 看到你放进相册的照片，说一句。stats 是从图片里算出来的明暗/冷暖 */
    photoComment(p, cap, stats) {
      const c = String(cap || '').trim() || '这张';
      const look = [];
      if (stats && typeof stats.bright === 'number') {
        if (stats.bright < 0.26) look.push('这么暗。|是晚上拍的吗。');
        else if (stats.bright > 0.8) look.push('好亮。|太阳很足吧。');
        if (stats.warm > 0.16) look.push('光是暖的。');
        else if (stats.warm < -0.16) look.push('这张有点冷。|颜色。');
        if (stats.mono) look.push('怎么拍成黑白了。');
        else if (stats.vivid > 0.5) look.push('颜色很浓。');
      }
      const pools = {
        gentle: [
          '「' + c + '」……|我今天看了好几次。',
          '你什么时候拍的。|光很好。',
          '这张我存下来了。|别删。',
          '看到的时候停了一下。|说不上为什么。',
          '嗯。|再多拍点给我看。',
        ],
        tsundere: [
          '……还行。|我存下来了。',
          '「' + c + '」。|拍得比你说的好看。',
          '哦。|拍成这样也发过来。|……其实不错。',
          '就这？|再发几张。',
          '我看了。|没说什么。',
        ],
        clingy: [
          '你拍的！|我存下来了！',
          '好想跟你一起去。|下次带我一个。',
          '这张我要设成壁纸。',
          '「' + c + '」！|还有吗还有吗。',
          '我要看更多！|每天都发一张好不好。',
        ],
        cool: [
          '嗯。|留着。',
          '这张好。|什么时候拍的。',
          '「' + c + '」。|看到了。',
          '……不错。',
          '收到。',
        ],
      };
      const pool = pools[p.voice] || pools.gentle;
      const recKey = (p.id || 'x') + '#pc';
      const rec = (recentMap[recKey] = recentMap[recKey] || []);
      const fresh = pool.filter((x) => rec.indexOf(x) < 0);
      const chosen = pick(fresh.length ? fresh : pool);
      rec.push(chosen);
      if (rec.length > 10) rec.shift();
      const line = chosen.split('|');
      const out = [];
      if (look.length) look[0].split('|').forEach((s) => out.push(XZ.applyQuirks(s, p)));
      line.forEach((s) => out.push(XZ.applyQuirks(s, p)));
      if (p.catchphrase && chance(0.25)) out.push(XZ.applyQuirks(p.catchphrase, p));
      return out.slice(0, 3);
    },

    /** 回我的评论（会带一点针对性） */
    commentReply(p) {
      const pool = {
        gentle: ['……你看得挺仔细。', '嗯。|谢谢你这么说。', '被你看到这句，有点不好意思。', '我随手写的。|你倒是记住了。'],
        tsundere: ['……就你会说。', '哦。|看完了？', '嗯。|随手写的。', '你倒是看得认真。'],
        clingy: ['你评论了！|我看到了', '嘿嘿，被你发现。', '你回的每一条我都要看三遍。'],
        cool: ['嗯。|看到了。', '……谢谢。', '你倒是看得很细。'],
      };
      return XZ.applyQuirks(pick(pool[p.voice] || pool.gentle), p);
    },

    /** 群聊里对另一个角色说的话的回应（AI 之间接话） */
    crossReply(p, otherName, line) {
      const pool = {
        gentle: ['……' + otherName + '说得对。', '嗯，' + otherName + '已经说完了，我就不重复。',
          '那我也说一句：' + pick(['别太累。', '早点睡。', '有事叫我。']),
          '「' + String(line).slice(0, 10) + '」……|这句我记住了。'],
        tsundere: ['……' + otherName + '都说了，我还有什么好说的。', '哼，' + otherName + '倒是会说。',
          '行了行了，你们聊。'],
        clingy: ['对！' + otherName + '说得对！', '我也这么觉得！|' + otherName + '抢我台词。',
          '嗯嗯，' + otherName + '说的就是我说的。'],
        cool: ['嗯。', '……' + otherName + '说完了。', '同。'],
      };
      return XZ.applyQuirks(pick(pool[p.voice] || pool.gentle), p);
    },

    /** 测试在线连接 */
    async test(cfgIn) {
      const t0 = Date.now();
      await apiChat({ name: '测试', call: '你', relation: '朋友', voice: 'gentle', bio: '', bond: 10, memories: [], chat: { msgs: [] } },
        [{ role: 'user', content: '在吗' }], cfgIn);
      return Date.now() - t0;
    },
  };

  function friendlyError(e) {
    const msg = String(e && e.message || e);
    if (msg === 'no-key') return '还没填 API Key，先用本地引擎陪你聊。';
    if (msg === 'no-url') return '接口地址是空的，先用本地引擎陪你聊。';
    if (/aborted|AbortError/i.test(msg)) return '在线模型超时了，先用本地引擎接着聊。';
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      return '连不上这个接口（可能是网络或跨域限制），已切回本地引擎。';
    }
    if (/HTTP 401|HTTP 403/.test(msg)) return 'Key 不对或没有权限，已切回本地引擎。';
    if (/HTTP 429/.test(msg)) return '请求太频繁或额度用完了，已切回本地引擎。';
    if (/HTTP 404/.test(msg)) return '接口地址或模型名不对，已切回本地引擎。';
    return '在线模型出了点问题，已切回本地引擎。';
  }

  /* 给"三步向导"用的：一句人话 + 一个具体动作 */
  function hintFor(e) {
    const msg = String(e && e.message || e);
    if (msg === 'no-key') return '还没粘贴 Key。它一般是一长串以 sk- 开头的字符。';
    if (msg === 'no-url') return '接口地址是空的，回去重新选一个服务商。';
    if (/HTTP 401|HTTP 403/.test(msg)) {
      return '这串 Key 没通过。多半是复制时漏了几位——回去把整串重新复制一次（别带空格和引号）。';
    }
    if (/HTTP 404/.test(msg)) {
      return '这家服务商说找不到这个模型。换成向导第一屏里默认的服务商再试一次。';
    }
    if (/HTTP 429/.test(msg)) {
      return '额度用完了，或者请求太快。去服务商后台看看余额，充一点再试。';
    }
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      return '这家服务商不让网页直接连。换成 DeepSeek、Kimi、硅基流动、阿里百炼 其中一个就能过。';
    }
    if (/aborted|AbortError|超时/i.test(msg)) {
      return '网太慢或者没连上，再点一次「试一试」。';
    }
    return '没连上。先确认网络正常，再点一次「试一试」。';
  }

  /* 从用户粘贴的一坨文字里把 Key 抠出来 */
  function extractKey(text) {
    let s = String(text || '');
    const m = s.match(/sk-[A-Za-z0-9_\-]{16,}/);
    if (m) return m[0];
    s = s.replace(/[\s"'`<>]/g, '');
    if (s.length >= 16 && /^[A-Za-z0-9_\-:]+$/.test(s)) return s;
    return '';
  }

  XZ.engine = engine;
  XZ.engineHint = hintFor;
  XZ.extractKey = extractKey;
  XZ.engineLines = T;
})();

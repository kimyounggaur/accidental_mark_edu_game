// ══ 임시표 마법 공방 · 이론 엔진 ══
// 순수 함수만 둔다. DOM과 오디오를 만지지 않는다.
// 적어 두는 것은 음이름의 차례와 장음계의 온음·반음 공식 하나뿐이다. 높이, 조표, 효력, 정답, 오답 원인은 규칙으로 만든다.

// ── 분수: 길이는 분수로만 계산한다 ──
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const F = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
const eq = (a, b) => a.n === b.n && a.d === b.d;
const num = (a) => a.n / a.d;
const noteWhole = (den, dots = 0) => F(2 ** (dots + 1) - 1, den * 2 ** dots);            // 온음표 = 1

// ── 높이 ──
const LETTERS = "CDEFGAB";
const MAJOR = [2, 2, 1, 2, 2, 2, 1];                                                    // 장음계: 온 온 반 온 온 온 반
const natPc = (L) => MAJOR.slice(0, L).reduce((s, x) => s + x, 0);                       // C 0 · D 2 · E 4 · F 5 · G 7 · A 9 · B 11
const midiOf = (L, o, alter = 0) => 12 * (o + 1) + natPc(L) + alter;                     // C4 = 60
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const isWhite = (midi) => MAJOR.some((_, L) => natPc(L) === ((midi % 12) + 12) % 12);
const stepOf = (L, o) => o * 7 + L;                                                      // 오선의 계단. 줄이나 칸 하나가 한 계단이다

// ── 조표: 5도권 규칙 ──
const sharpAt = (k) => (3 + 4 * k) % 7;                                                  // F C G D A E B (5도씩 위)
const flatAt = (k) => (6 + 3 * k) % 7;                                                   // B E A D G C F (4도씩 위)
const keyLetters = (key) => Array.from({ length: Math.abs(key) }, (_, k) => (key > 0 ? sharpAt(k) : flatAt(k)));
const keyAlter = (key, L) => (keyLetters(key).includes(L) ? Math.sign(key) : 0);
// 조표 기호를 그리는 계단(높은음자리표). 샵은 A4~G5, 플랫은 F4~E5의 일곱 계단 안에 하나씩 놓인다
const keySteps = (key) => keyLetters(key).map((L) => { const lo = key > 0 ? stepOf(5, 4) : stepOf(3, 4); let s = stepOf(L, 4); while (s < lo) s += 7; while (s > lo + 6) s -= 7; return s; });

// ── 악보 씨앗 읽기 ──
// "k1 4/4 | r/2. F#4/4~ | F4/4 F4/4* r/2 |"  k = 조표(샵 +, 플랫 −) · 박자 · | 마디선
// 음표 = 음이름 [# b n x bb ?] 옥타브 / 음표 분모 [.]   ? = 빈 표 자리(플레이어가 채운다)
// 뒤에 붙는 표시: ~ 붙임줄  * 표적  @ 효력의 출발  ^ 종류를 묻는 곡선  ( ) 이음줄
const ACC = { "#": 1, x: 2, b: -1, bb: -2, n: 0 };
function parseScore(src) {
  const t = src.trim().split(/\s+/), [mn, md] = t[1].split("/").map(Number);
  const sc = { key: Number(t[0].slice(1)), mn, md, meter: F(mn, md), notes: [], slurs: [], bars: 0 };
  let bar = -1, open = -1;
  for (const w of t.slice(2)) {
    if (w === "|") { bar++; continue; }
    const m = /^(\()?(r|[A-G])(bb|b|#|x|n|\?)?(\d)?\/(\d+)(\.*)([~*@^]*)(\))?$/.exec(w);
    if (!m) throw new Error("씨앗을 읽을 수 없다: " + w);
    const i = sc.notes.length, rest = m[2] === "r", fl = m[7];
    if (m[1]) open = i;
    sc.notes.push({ rest, L: rest ? -1 : LETTERS.indexOf(m[2]), o: rest ? 0 : Number(m[4]), acc: m[3] === undefined || m[3] === "?" ? null : ACC[m[3]], dur: noteWhole(Number(m[5]), m[6].length), bar,
      tie: fl.includes("~"), target: fl.includes("*"), source: fl.includes("@"), blank: m[3] === "?", curve: fl.includes("^") });
    if (m[8]) { sc.slurs.push([open, i]); open = -1; }
  }
  sc.bars = bar;
  return sc;
}
const withAcc = (sc, i, acc) => Object.assign({}, sc, { notes: sc.notes.map((n, k) => (k === i ? Object.assign({}, n, { acc }) : n)) });
const sameSlot = (a, b) => !a.rest && !b.rest && a.L === b.L && a.o === b.o;
// 곡선 읽기: 같은 줄·칸의 이웃한 두 음을 잇고 뒤 음에 새 표가 없으면 붙임줄, 아니면 이음줄
const linkKind = (sc, i) => { const a = sc.notes[i], b = sc.notes[i + 1]; return b && sameSlot(a, b) && b.acc === null ? "tie" : "slur"; };
const tiedOn = (sc, i) => { const n = sc.notes[i]; return !!n && !n.rest && (n.tie || (n.curve && linkKind(sc, i) === "tie")); };

// ── 효력 계산 ──
// 새로 내는 음: 이 음표의 표 → 같은 마디·같은 줄칸의 기억 → 조표.  이어받는 음(붙임줄): 앞 소리 그대로. 기억을 고쳐 쓰지 않는다.
// m은 오개념 모델이다. 비워 두면 표준 규칙이다.
function evaluate(sc, m = {}) {
  const out = [];
  let mem = new Map(), bar = 0;
  const slotOf = (n) => (m.memByLetter ? n.L : stepOf(n.L, n.o));
  const keyOf = (n) => (m.ignoreKey ? 0 : m.keyOneOctave ? (keySteps(sc.key).includes(stepOf(n.L, n.o)) ? Math.sign(sc.key) : 0) : keyAlter(sc.key, n.L));
  sc.notes.forEach((n, i) => {
    if (n.bar !== bar) {                                                                  // 마디선: 마디 기억을 비운다
      bar = n.bar;
      if (!(m.noBarReset || (m.slurHoldsMem && sc.slurs.some(([a, b]) => a < i && i <= b)))) mem = new Map();
    }
    if (n.rest) { out.push({ i, rest: true }); return; }
    const p = i > 0 ? sc.notes[i - 1] : null, cont = tiedOn(sc, i - 1) && sameSlot(p, n);
    const kd = keyOf(n), slot = slotOf(n), cur = mem.has(slot) ? mem.get(slot) : { alter: kd, by: kd ? -1 : null };
    let r;
    if (cont && !(m.tieBreaksAtBar && p.bar !== n.bar)) {                                 // 붙임줄로 이어받는 음
      const q = out[i - 1];
      r = { alter: q.alter, src: "tie", by: q.by };
      if (m.tieWritesMem) mem.set(slot, { alter: q.alter, by: q.by });
    } else if (n.acc !== null && !m.ignoreSigns) {                                        // 이 음표의 표: 더하지 않고 자리를 정한다
      let a = n.acc;
      if (m.flip) a = -a;
      if (m.doubleAsSingle) a = Math.sign(a);
      if (n.acc === 0) { if (m.natToKey) a = kd; else if (m.natOneStep) a = cur.alter - Math.sign(cur.alter); else if (m.natAsFlat) a = cur.alter - 1; }
      else if (m.additive) a = cur.alter + a;                                           // 믿는 대로 계산한다. 두 칸을 넘어도 자르지 않는다
      r = { alter: a, src: "sign", by: i };
      if (!m.noMemory && !(m.natNoMem && n.acc === 0)) mem.set(slot, { alter: a, by: i });
    } else {                                                                              // 표가 없는 음: 마디 기억 → 조표
      let c = cur, viaMem = mem.has(slot);
      if (m.backward && !viaMem) { const j = sc.notes.findIndex((x, k) => k > i && x.bar === n.bar && !x.rest && x.acc !== null && slotOf(x) === slot); if (j >= 0) { c = { alter: sc.notes[j].acc, by: j }; viaMem = true; } }
      r = { alter: c.alter, src: viaMem ? "mem" : kd ? "key" : "plain", by: c.by };
    }
    let midi = midiOf(n.L, n.o, r.alter);
    if (r.src === "sign" && Math.abs(n.acc) === 1) {                                      // 건반 색 오개념은 한 칸짜리 표에만 건다
      const d = Math.sign(r.alter) || n.acc;
      if (m.blackOnly) while (isWhite(midi)) midi += d;
      if (m.whiteStep) { midi = midiOf(n.L, n.o) + d; while (!isWhite(midi)) midi += d; }
    }
    out.push({ i, midi, alter: r.alter, src: r.src, by: r.by, onset: !cont });
  });
  return out;
}
const pitches = (sc, m) => evaluate(sc, m).map((r) => (r.rest ? null : r.midi));
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
// 없어도 소리가 같은 표
const redundant = (sc) => sc.notes.map((_, i) => i).filter((i) => !sc.notes[i].rest && sc.notes[i].acc !== null && sameList(pitches(withAcc(sc, i, null)), pitches(sc)));

// ── 오개념 모델: 같은 계산기에 스위치 하나씩. 적힌 차례가 오답 원인을 찾는 차례다 ──
const MODELS = {
  TIE_BAR: { tieBreaksAtBar: true },      // 붙임줄도 마디선에서 풀린다고 읽는다
  TIE_CARRY: { tieWritesMem: true },      // 붙임줄이 표를 새 마디로 옮긴다고 읽는다
  SLUR_CARRY: { slurHoldsMem: true },     // 이음줄이 표를 새 마디로 옮긴다고 읽는다
  NAT_KEY: { natToKey: true },            // 내추럴 = 조표로 돌아가기
  NAT_ONE: { natOneStep: true },          // 내추럴 = 한 칸만 지우기
  NAT_DOWN: { natAsFlat: true },          // 내추럴 = 한 칸 내리기
  NAT_ONCE: { natNoMem: true },           // 내추럴은 그 음표에만
  ADD: { additive: true },                // 표를 더한다
  HALF: { doubleAsSingle: true },         // 더블샵·더블플랫을 한 칸으로
  ALL_OCT: { memByLetter: true },         // 표가 다른 옥타브에도 닿는다
  NO_BAR: { noBarReset: true },           // 표가 마디선을 넘는다
  WHOLE_BAR: { backward: true },          // 표가 마디의 앞쪽 음에도 닿는다
  SIGN_ONLY: { noMemory: true },          // 표는 붙은 음표에만
  KEY_OCT: { keyOneOctave: true },        // 조표는 그려진 줄·칸에만
  NO_KEY: { ignoreKey: true },            // 조표를 빠뜨린다
  BLACK: { blackOnly: true },             // 샵·플랫 = 검은 건반
  WHITE: { whiteStep: true },             // 한 칸 = 옆 흰 건반
  DIR: { flip: true },                    // 위아래를 바꿔 읽는다
  PLAIN: { ignoreSigns: true, ignoreKey: true },   // 표를 빼고 읽는다
};

// ── 출제 검사 ──
const RANGE = [stepOf(6, 3), stepOf(6, 5)];                                              // B3~B5: 덧줄은 위아래 하나까지
function check(sc) {
  const bad = [];
  for (let b = 0; b < sc.bars; b++) if (!eq(sc.notes.filter((n) => n.bar === b).reduce((s, n) => add(s, n.dur), F(0)), sc.meter)) bad.push("BAR_LEN:" + b);
  sc.notes.forEach((n, i) => {
    if (n.rest) { if (n.tie || n.curve || n.target || n.blank) bad.push("REST_FLAG:" + i); return; }
    const s = stepOf(n.L, n.o), x = sc.notes[i + 1];
    if (s < RANGE[0] || s > RANGE[1]) bad.push("RANGE:" + i);
    if (n.tie && !(x && sameSlot(n, x))) bad.push("TIE_SLOT:" + i);                       // 붙임줄은 같은 줄·칸의 이웃한 음끼리만
    else if (n.tie && (x.acc !== null || x.blank)) bad.push("TIE_SIGN:" + i);             // 이어받는 음에는 표를 적지 않는다(높이가 달라지면 충돌)
    if (n.curve && !(x && !x.rest)) bad.push("CURVE_END:" + i);
  });
  sc.slurs.forEach(([a, b]) => {
    if (!(a >= 0 && b > a) || sc.notes[a].rest || sc.notes[b].rest) bad.push("SLUR_ENDS:" + a);
    else if (b - a === 1 && linkKind(sc, a) === "tie") bad.push("SLUR_READS_AS_TIE:" + a);  // 두 음만 잇는 곡선이 붙임줄로 읽히면 이음줄로 내지 않는다
  });
  return bad;
}

// ── 이름과 조사 ──
const SIGN_CH = { 2: "𝄪", 1: "♯", 0: "♮", "-1": "♭", "-2": "𝄫" };
const signKo = (a, style = "loan") => (Math.abs(a) === 2 ? (style === "ko" ? "겹" : "더블") : "") + (style === "ko" ? (a > 0 ? "올림표" : a < 0 ? "내림표" : "제자리표") : a > 0 ? "샵" : a < 0 ? "플랫" : "내추럴");
const signEn = (a) => (Math.abs(a) === 2 ? "double " : "") + (a > 0 ? "sharp" : a < 0 ? "flat" : "natural");
const notchKo = (a) => (a > 0 ? `위로 ${a}칸` : a < 0 ? `아래로 ${-a}칸` : "제자리");
const noteKo = (L, o, a = 0) => LETTERS[L] + (a ? SIGN_CH[a] : "") + (o === undefined ? "" : o);
const keyKo = (midi) => { const o = Math.floor(midi / 12) - 1, L = MAJOR.findIndex((_, k) => natPc(k) === ((midi % 12) + 12) % 12); return L >= 0 ? noteKo(L, o) : keyKo(midi - 1).replace(/(\d)$/, "♯$1") + "·" + keyKo(midi + 1).replace(/(\d)$/, "♭$1"); };
const hasBatchim = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : /[013678]$/.test(w); };
const josa = (w, pair) => w + pair.split("/")[hasBatchim(w) ? 0 : 1];                    // josa("샵", "은/는") → "샵은"
const be = (w) => w + (hasBatchim(w) ? "이에요" : "예요");                                 // "G♯4예요", "F 자연음이에요"
const ro = (w) => { const c = w.charCodeAt(w.length - 1), rieul = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 === 8 : /[178]$/.test(w); return w + (hasBatchim(w) && !rieul ? "으로" : "로"); };   // "샵으로", "내추럴로", "F♯4로"

// Reference tests extracted verbatim from design Appendix C.4 (Node CommonJS runner).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { writeFileSync } = fs;
const ctx = vm.createContext({console});
const src = ['01-theory.js', '02-model.js', '03-content.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
vm.runInContext(src + '\nglobalThis.E = { gcd, F, add, eq, num, noteWhole, LETTERS, MAJOR, natPc, midiOf, hz, isWhite, stepOf, sharpAt, flatAt, keyLetters, keyAlter, keySteps, ACC, parseScore, withAcc, sameSlot, linkKind, tiedOn, evaluate, pitches, sameList, redundant, MODELS, RANGE, check, SIGN_CH, signKo, signEn, notchKo, noteKo, keyKo, hasBatchim, josa, be, ro, CARDS, cardKo, targetOf, answerUnder, fixes, solve, isRight, diagnose, ctxOf, why, WHY_KO, LINK_KO, TAG_KO, orderText, choices, explain, giveText, say, keyWindow, sounds, hasPlay, beats, DAYS, SCENES, RULE_CARDS, categoryOf, staffUnits, unitPx };', ctx);
const E = ctx.E;
// 엔진·의뢰 모델·내용 검사. node test.mjs  → 묶음별 통과 수와 실패 목록, review.txt(의뢰별 표)



const G = {};                                  // 묶음별 [통과, 실패]
const fails = [];
let group = "";
const ok = (c, msg) => { const g = (G[group] = G[group] || [0, 0]); if (c) g[0]++; else { g[1]++; fails.push(group + " " + msg); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const P = (s, m) => E.pitches(E.parseScore(s), m).filter((x) => x !== null);
const ON = (s) => E.evaluate(E.parseScore(s)).filter((r) => !r.rest).map((r) => r.onset);

// ── A. 초안의 필수 정답 테스트 11개 ──
group = "A 초안 필수";
ok(same(P("k0 4/4 | C#4/1 |"), [61]), "A1 C4+샵 = 61");
ok(same(P("k0 4/4 | E#4/1 |"), [65]) && E.isWhite(65), "A2 E♯4 = 65, F 건반");
ok(same(P("k0 4/4 | Cx4/1 |"), [62]), "A3 C𝄪4 = 62");
ok(same(P("k0 4/4 | Dbb4/1 |"), [60]), "A4 D𝄫4 = 60");
ok(same(P("k0 2/4 | C#4/4 Cx4/4 |"), [61, 62]) && same(P("k0 2/4 | C#4/4 Cx4/4 |", E.MODELS.ADD), [61, 63]), "A5 C♯ 뒤 C𝄪 = 62, 누적이면 63");
ok(same(P("k0 2/4 | G#4/4 G4/4 |"), [68, 68]), "A6 같은 마디 G♯4 G4 = 68 68");
ok(same(P("k0 2/4 | G#4/4 G5/4 |"), [68, 79]), "A7 G♯4 G5 = 68 79");
ok(same(P("k0 2/4 | G#4/4 r/4 | G4/4 r/4 |"), [68, 67]), "A8 다음 마디 G4 = 67");
ok(same(P("k1 2/4 | Fn4/4 r/4 | F4/4 r/4 |"), [65, 66]), "A9 F♯ 조표: F♮4 = 65, 다음 마디 F4 = 66");
ok(same(P("k0 2/4 | Cx4/4 Cn4/4 |"), [62, 60]), "A10 C𝄪4 뒤 C♮4 = 60");
ok(same(P("k0 2/4 | r/4 G#4/4~ | G4/4 r/4 |"), [68, 68]) && same(ON("k0 2/4 | r/4 G#4/4~ | G4/4 r/4 |"), [true, false]), "A11 붙임줄로 넘어간 G = 68, 새로 내지 않음");

// ── B. v1.1 초안의 회귀 테스트 T1~T10 ──
group = "B 붙임줄 회귀";
ok(same(P("k0 4/4 | r/2. F#4/4~ | F4/4 F4/4 r/2 |"), [66, 66, 65]) && same(ON("k0 4/4 | r/2. F#4/4~ | F4/4 F4/4 r/2 |"), [true, false, true]), "T1");
ok(same(P("k1 4/4 | r/2. Fn4/4~ | F4/4 F4/4 r/2 |"), [65, 65, 66]), "T2");
ok(same(P("k1 4/4 | r/2. Fn4/4~ | F4/4 Fn4/4 r/2 |"), [65, 65, 65]), "T3");
ok(same(P("k0 2/4 | (G#4/4 A4/4 | G4/4) r/4 |"), [68, 69, 67]), "T4");
ok(same(P("k0 2/4 | G#4/4 G5/4 |"), [68, 79]), "T5");
ok(same(P("k3 2/4 | G4/4 G5/4 |"), [68, 80]), "T6");
{ const s = "k0 2/4 | r/4 C#4/4~ | C4/2~ | C4/4 C4/4 |", so = E.sounds(E.parseScore(s));
  ok(same(P(s), [61, 61, 61, 60]) && so.length === 2 && E.beats(so[0].len, 4) === 4 && so[0].notes.length === 3, "T7 사슬은 한 소리 4박, 마지막은 60"); }
ok(E.check(E.parseScore("k0 2/4 | F#4/4~ Fn4/4 |")).includes("TIE_SIGN:0"), "T8 붙임줄 안의 명시 내추럴 = 충돌");
{ const s = "k0 4/4 | r/2. F#4/4~ | F4/4 F#4/4 F4/4 r/4 |", ev = E.evaluate(E.parseScore(s)).filter((r) => !r.rest);
  ok(same(P(s), [66, 66, 66, 66]) && same(ev.map((r) => r.src), ["sign", "tie", "sign", "mem"]), "T9 새 샵과 그 뒤 = 66 66"); }
ok(E.sounds(E.parseScore("k0 4/4 | (E4/4 E4/4 G4/4) r/4 |")).length === 3 && !E.check(E.parseScore("k0 4/4 | (E4/4 E4/4 G4/4) r/4 |")).length, "T10a 같은 음이 낀 이음줄은 붙임줄이 아니다");
ok(E.check(E.parseScore("k0 2/4 | (E4/4 E4/4) |")).includes("SLUR_READS_AS_TIE:0"), "T10b 붙임줄로 읽히는 두 음 이음줄은 내지 않는다");

// ── C. 기초 공식 ──
group = "C 공식";
ok(same([0, 1, 2, 3, 4, 5, 6].map(E.natPc), [0, 2, 4, 5, 7, 9, 11]), "자연음의 반음 자리");
ok(E.midiOf(0, 4) === 60 && E.midiOf(5, 4) === 69, "C4 = 60, A4 = 69");
ok(E.hz(69) === 440 && Math.abs(E.hz(81) - 880) < 1e-9 && Math.abs(E.hz(60) - 261.6256) < 1e-3, "주파수 공식");
ok(same(E.keyLetters(7).map((L) => E.LETTERS[L]).join(""), "FCGDAEB") && same(E.keyLetters(-7).map((L) => E.LETTERS[L]).join(""), "BEADGCF"), "조표의 차례");
ok(same(E.keySteps(7), [38, 35, 39, 36, 33, 37, 34]) && same(E.keySteps(-7), [34, 37, 33, 36, 32, 35, 31]), "조표를 그리는 계단");
for (let k = -7; k <= 7; k++) ok([0, 1, 2, 3, 4, 5, 6].filter((L) => E.keyAlter(k, L) !== 0).length === Math.abs(k), "조표 " + k + "의 음이름 수");
{ let w = 0; for (let m = 60; m < 72; m++) if (E.isWhite(m)) w++; ok(w === 7, "한 옥타브의 흰 건반 7"); }
ok(E.keyKo(65) === "F4" && E.keyKo(61) === "C♯4·D♭4", "건반 이름");
ok(E.josa("샵", "은/는") === "샵은" && E.josa("올림표", "은/는") === "올림표는" && E.be("G♯4") === "G♯4예요" && E.be("B3") === "B3이에요" && E.ro("내추럴") === "내추럴로" && E.ro("샵") === "샵으로" && E.ro("F♯4") === "F♯4로", "조사");

// ── D. 전수 불변식: 독립된 느린 계산(오라클)과 엔진을 맞춘다 ──
group = "D 전수";
const ACCS = [null, 1, -1, 0, 2, -2];
function oracle(sc) {                           // 규칙을 문장 그대로 옮긴 느린 계산
  const out = [];
  sc.notes.forEach((n, i) => {
    if (n.rest) { out.push(null); return; }
    const p = sc.notes[i - 1];
    if (p && p.tie) { out.push(out[i - 1]); return; }                                   // 이어받는 음: 앞 소리 그대로
    let a = null;
    if (n.acc !== null) a = n.acc;                                                       // 1 이 음표의 표
    else { for (let j = i - 1; j >= 0 && a === null; j--) { const x = sc.notes[j]; if (x.bar !== n.bar) break; if (!x.rest && x.L === n.L && x.o === n.o && x.acc !== null) a = x.acc; } }   // 2 같은 마디·같은 줄칸의 가장 가까운 앞 표
    if (a === null) a = E.keyAlter(sc.key, n.L);                                         // 3 조표
    out.push(E.midiOf(n.L, n.o, a));
  });
  return out;
}
const SLOTS = [[4, 4], [4, 5], [5, 4]];        // G4, G5, A4
let scores = 0, tieScores = 0;
for (const key of [0, 3, -3]) for (let len = 1; len <= 4; len++) {
  const total = Math.pow(SLOTS.length * ACCS.length, len);
  for (let code = 0; code < total; code++) for (let bars = 0; bars < 1 << (len - 1); bars++) {
    const notes = []; let c = code, bar = 0;
    for (let i = 0; i < len; i++) { const s = SLOTS[c % 3]; c = Math.floor(c / 3); const acc = ACCS[c % 6]; c = Math.floor(c / 6); if (i > 0 && (bars >> (i - 1)) & 1) bar++; notes.push({ rest: false, L: s[0], o: s[1], acc, bar, tie: false, curve: false }); }
    const sc = { key, notes, slurs: [], bars: bar + 1 };
    scores++;
    const got = E.pitches(sc), want = oracle(sc);
    if (!same(got, want)) { ok(false, "오라클 불일치 " + JSON.stringify(notes.map((n) => [n.L, n.o, n.acc, n.bar])) + " key " + key); }
    // 붙임줄을 넣을 수 있는 자리마다 넣어 본다
    for (let i = 0; i + 1 < len; i++) if (E.sameSlot(notes[i], notes[i + 1]) && notes[i + 1].acc === null) {
      const t = { key, slurs: [], bars: bar + 1, notes: notes.map((n, k) => (k === i ? Object.assign({}, n, { tie: true }) : n)) };
      tieScores++;
      const g2 = E.pitches(t), w2 = oracle(t), ev = E.evaluate(t);
      if (!same(g2, w2) || ev[i + 1].onset || g2[i + 1] !== g2[i]) ok(false, "붙임줄 불일치 " + JSON.stringify(t.notes.map((n) => [n.L, n.o, n.acc, n.bar, n.tie])));
    }
  }
}
ok(scores === 3 * (18 + 18 * 18 * 2 + 18 ** 3 * 4 + 18 ** 4 * 8), "전수 악보 수 " + scores);
ok(true, "붙임줄 악보 수 " + tieScores);
// 앞쪽만 보고 정해진다(뒤 음을 바꿔도 앞 음의 높이는 그대로)
{ let bad = 0; const base = E.parseScore("k1 4/4 | F4/4 Fn4/4 F5/4 F4/4 | F4/4 F#4/4 F4/4 r/4 |");
  for (let i = 0; i < base.notes.length; i++) for (const a of ACCS) { if (base.notes[i].rest) continue; const x = E.withAcc(base, i, a); const p0 = E.pitches(base), p1 = E.pitches(x); for (let j = 0; j < i; j++) if (p0[j] !== p1[j]) bad++; }
  ok(bad === 0, "뒤 음의 표는 앞 음을 바꾸지 않는다"); }
// 표가 붙은 음은 언제나 자연음 + 표(더하지 않는다)
{ let bad = 0; for (const a1 of ACCS) for (const a2 of [1, -1, 0, 2, -2]) { const sc = { key: 3, notes: [{ rest: false, L: 4, o: 4, acc: a1, bar: 0, tie: false }, { rest: false, L: 4, o: 4, acc: a2, bar: 0, tie: false }], slurs: [], bars: 1 }; if (E.pitches(sc)[1] !== E.midiOf(4, 4, a2)) bad++; }
  ok(bad === 0, "표는 자리를 정한다"); }
// 모델은 저마다 표준과 다른 답을 내는 악보가 있다(빈 모델이 없다)
{ const probes = ["k0 4/4 | E#4/1 |", "k0 2/4 | C#4/4 Cx4/4 |", "k0 2/4 | Cx4/4 Cn4/4 |", "k0 2/4 | Db4/4 Dn4/4 |", "k1 4/4 | Fn4/4 G4/4 F4/4 F5/4 |", "k0 2/4 | G#4/4 G5/4 |", "k0 2/4 | G#4/4 A4/4 | G4/4 r/4 |", "k0 4/4 | F4/4 G4/4 F#4/4 F4/4 |", "k3 2/4 | G5/4 G4/4 |", "k0 4/4 | r/2. F#4/4~ | F4/4 F4/4 r/2 |", "k0 2/4 | (G#4/4 A4/4 | G4/4) r/4 |", "k0 4/4 | Cx4/1 |"];
  for (const [code, m] of Object.entries(E.MODELS)) ok(probes.some((s) => !same(P(s), P(s, m))), "모델 " + code + "가 표준과 갈리는 악보가 있다"); }

// ── E. 의뢰 66건 ──
group = "E 의뢰";
const W320 = 302, lines = [], texts = [];
const em = (s) => [...s].reduce((w, ch) => w + (/[가-힣]/.test(ch) ? 1 : ch === " " ? 0.28 : /[.,·:]/.test(ch) ? 0.3 : /[♯♭♮]/.test(ch) ? 0.5 : /[𝄪𝄫]/u.test(ch) ? 0.7 : 0.58), 0);
const wrapLines = (s, per) => { let n = 1, w = 0; for (const word of s.split(" ")) { const x = em(word); if (w && w + 0.28 + x > per) { n++; w = x; } else w += (w ? 0.28 : 0) + x; } return n; };
const READ = (W320 - 20) / 13.5, CARD = (W320 - 20 - 64) / 14;                            // 판독 줄과 의뢰 카드의 한 줄 폭(em)
const show = (ms, a) => (a === undefined ? "?" : ms.ask === "key" ? E.keyKo(a) + "(" + a + ")" : ms.ask === "sign" || ms.ask === "name" ? E.cardKo(a) : ms.ask === "notch" ? E.notchKo(a) : ms.ask === "why" ? E.WHY_KO[a] : ms.ask === "link" ? a : ms.ask === "reach" ? "{" + a + "}" : JSON.stringify(a));
let total = 0, minUnit = 1e9, minUnitId = "", maxWhites = 0, maxWhitesId = "", aimed = new Set(), asks = {}, twoPane = [];
E.DAYS.forEach((day, d) => {
  ok(day.list.filter((m) => m.final).length === 1 && day.list[day.list.length - 1].final, day.id + " 마감 의뢰는 하나이고 마지막");
  day.list.forEach((ms) => {
    total++; asks[ms.ask] = (asks[ms.ask] || 0) + 1;
    let sol; try { sol = E.solve(ms); } catch (e) { ok(false, ms.id + " 풀이 오류 " + e.message); return; }
    const { sc, view, t, answer, traps } = sol;
    ok(E.check(sc).length === 0 && E.check(view).length === 0, ms.id + " 출제 검사 " + E.check(sc).concat(E.check(view)).join(" "));
    ok(t >= 0, ms.id + " 표적이 있다");
    ok(ms.ask === "fix" ? answer.length === 1 && answer[0].i === ms.bad.i && answer[0].acc === sc.notes[ms.bad.i].acc : answer !== undefined, ms.id + " 답이 하나다 " + JSON.stringify(answer));
    if (!["name", "notch"].includes(ms.ask)) ok(E.redundant(ms.ask === "sign" ? E.withAcc(sc, t, answer) : sc).length === 0, ms.id + " 군더더기 표가 없다");
    if (ms.aim && !["fix", "link", "name"].includes(ms.ask)) { ok(ms.aim in traps, ms.id + " 겨누는 오개념 " + ms.aim + "이 정답과 갈린다 " + JSON.stringify(traps)); aimed.add(ms.aim); }
    if (ms.aim) ok(ms.aim in E.MODELS, ms.id + " aim이 모델 목록에 있다");
    const ch = E.choices(sol); if (ch.length) ok(ch.some((c) => c.v === answer), ms.id + " 보기에 답이 있다");
    if (ms.ask === "sign") ok(E.CARDS.slice(ms.cards === 5 ? 1 : 0).includes(answer), ms.id + " 카드에 답이 있다");
    const u = E.unitPx(view, W320); if (u < minUnit) { minUnit = u; minUnitId = ms.id; }
    ok(u >= 26, ms.id + " 음표 간격 " + u.toFixed(1) + "px");
    const kw = E.keyWindow(sol); if (kw.whites > maxWhites) { maxWhites = kw.whites; maxWhitesId = ms.id; } if (kw.panes.length > 1) twoPane.push(ms.id);
    ok(kw.whites <= 7, ms.id + " 건반 창 흰 건반 " + kw.whites);
    const need = new Set(E.pitches(sc).concat(E.pitches(view)).filter((x) => x !== null)); if (ms.ask === "key") Object.values(traps).forEach((x) => need.add(x));
    ok([...need].every((k) => kw.panes.some((p) => k >= p.lo && k <= p.hi)), ms.id + " 필요한 건반과 함정 건반이 창 안에 있다");
    // 문장
    const order = E.orderText(sol), exp = E.explain(sol);
    ok(wrapLines(order, CARD) <= 2, ms.id + " 의뢰 문장 2줄 초과: " + order);
    ok(wrapLines(exp, READ) <= 2, ms.id + " 풀이 2줄 초과(" + wrapLines(exp, READ) + "): " + exp);
    const give = E.giveText(sol);
    ok(wrapLines(give, READ) <= 2 && !/undefined|NaN|null/.test(give), ms.id + " 답 문장: " + give);
    texts.push(order, exp, give);
    // 오답마다 원인과 안내문이 나온다
    const wrongs = ms.ask === "key" ? Array.from({ length: kw.panes.reduce((s, p) => s + p.hi - p.lo + 1, 0) }, (_, i) => { let k = i; for (const p of kw.panes) { if (k <= p.hi - p.lo) return p.lo + k; k -= p.hi - p.lo + 1; } return null; })
      : ms.ask === "sign" ? E.CARDS.slice(ms.cards === 5 ? 1 : 0) : ms.ask === "fix" ? sc.notes.flatMap((n, i) => (n.rest ? [] : E.CARDS.map((c) => ({ i, acc: c }))))
      : ms.ask === "reach" ? (() => { const idx = sc.notes.map((n, i) => i).filter((i) => !sc.notes[i].rest && i !== t), out = []; for (let b = 0; b < 1 << idx.length; b++) out.push(idx.filter((_, k) => (b >> k) & 1).join(",")); return out; })()
      : ch.map((c) => c.v);
    const codes = new Set();
    for (const g of wrongs) { if (ms.ask === "fix" && g.acc === view.notes[g.i].acc) continue; const code = E.diagnose(sol, g); if (code === null) continue; codes.add(code); const txt = E.say(sol, code, g); texts.push(txt); ok(typeof txt === "string" && txt.length > 4 && !/undefined|NaN|null/.test(txt), ms.id + " 안내문 " + code + ": " + txt); ok(wrapLines(txt, READ) <= 2, ms.id + " 안내문 2줄 초과 " + code + "(" + wrapLines(txt, READ) + "): " + txt); }
    if (ms.aim && ms.aim in traps) ok(E.diagnose(sol, traps[ms.aim]) === (ms.ask === "why" ? "WHY" : ms.ask === "sign" && answer === null ? "REDUNDANT" : ms.aim), ms.id + " 겨눈 오답의 원인이 " + ms.aim + "로 나온다: " + E.diagnose(sol, traps[ms.aim]));
    lines.push([ms.id, ms.ask, E.orderText(sol), show(ms, ms.ask === "fix" ? answer[0] : answer), Object.entries(traps).map(([c, a]) => c + "→" + show(ms, a)).join(" "), kw.panes.map((p) => E.keyKo(p.lo) + "~" + E.keyKo(p.hi)).join(" + ") + " (" + kw.whites + ")", u.toFixed(1), E.explain(sol), [...codes].join(" ")].join(" | "));
  });
});
ok(total === 66 && same(E.DAYS.map((d) => d.list.length), [8, 8, 8, 8, 8, 8, 10, 8]), "의뢰 수 66");
ok(Object.keys(E.SCENES).length === 7 && E.DAYS.flatMap((d) => [d.scene].concat(d.list.map((m) => m.after))).filter(Boolean).sort().join("") === "S1S2S3S4S5S6S7", "발견 장면 일곱이 한 번씩 놓인다");
for (const [id, sc] of Object.entries(E.SCENES)) { sc.rows.forEach((r) => ok(E.check(E.parseScore(r)).length === 0, id + " 장면 악보")); ok(wrapLines(sc.text, READ) <= 3, id + " 장면 문장 3줄 초과"); }
for (const code of Object.keys(E.MODELS)) ok(aimed.has(code), "오개념 " + code + "를 겨누는 의뢰가 있다");
ok(E.RULE_CARDS.flatMap((c) => c.aims).sort().join() === Object.keys(E.MODELS).sort().join(), "규칙 카드가 오개념 열아홉 개를 빠짐없이 나눈다");
{ const cats = {}; E.DAYS.forEach((day, d) => day.list.forEach((ms) => { const c = E.categoryOf(ms, d); cats[c] = (cats[c] || 0) + 1; })); ok(Object.keys(cats).length === 4, "정답률 네 갈래 " + JSON.stringify(cats)); G.__cats = cats; }

{ const banned = ["원래 음", "두 번 올", "두 번 내", "같은 음이면", "병행조"]; ok(texts.concat(Object.values(E.SCENES).map((s) => s.text)).every((x) => !banned.some((b) => x.includes(b))), "금지 표현이 없다"); }
// ── 결과 ──
const sum = Object.entries(G).filter(([k]) => !k.startsWith("__")).map(([k, v]) => k + " " + v[0] + "/" + (v[0] + v[1]));
console.log(sum.join("\n"));
console.log("전수 악보", scores, "· 붙임줄 악보", tieScores, "· 의뢰", total, JSON.stringify(asks), "· 갈래", JSON.stringify(G.__cats));
console.log("가장 좁은 음표 간격", minUnit.toFixed(1) + "px", minUnitId, "· 가장 넓은 건반 창", maxWhites, maxWhitesId, "· 두 쪽 창", twoPane.join(","));
console.log("문장 수", texts.length, "· 서로 다른 문장", new Set(texts).size, "· 가장 긴 문장(em)", Math.max(...texts.map(em)).toFixed(1));
console.log(fails.length ? "실패 " + fails.length + "\n" + fails.slice(0, 40).join("\n") : "실패 0");
writeFileSync(path.join(__dirname, "review.txt"), lines.join("\n") + "\n");
if (fails.length) process.exitCode = 1;

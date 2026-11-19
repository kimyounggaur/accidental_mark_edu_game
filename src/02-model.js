// ══ 임시표 마법 공방 · 의뢰 모델 ══
// 의뢰에는 씨앗만 적는다. 정답, 함정, 오답 원인, 문장, 건반 창, 소리 목록은 여기서 만든다.

const CARDS = [null, 1, -1, 0, 2, -2];                                                   // 없음 · 샵 · 플랫 · 내추럴 · 더블샵 · 더블플랫
const cardKo = (c) => (c === null ? "없음" : signKo(c));
const targetOf = (ms, sc) => (ms.ask === "fix" ? ms.bad.i : sc.notes.findIndex((n) => (ms.ask === "sign" ? n.blank : ms.ask === "reach" ? n.source : ms.ask === "link" ? n.curve : n.target)));

// 모델 m을 믿는 사람이 낼 답. 표준 규칙이면 m = {}
function answerUnder(ms, sc, m) {
  const t = targetOf(ms, sc), n = sc.notes[t];
  switch (ms.ask) {
    case "name": return n.acc;
    case "notch": return evaluate(sc, m)[t].midi - midiOf(n.L, n.o);
    case "key": return evaluate(sc, m)[t].midi;
    case "why": return evaluate(sc, m)[t].src;
    case "reach": return evaluate(sc, m).filter((r) => !r.rest && r.i !== t && r.by === t).map((r) => r.i).join(",");
    case "sign": { const want = midiOf(n.L, n.o, ms.want); return CARDS.find((c) => evaluate(withAcc(sc, t, c), m)[t].midi === want); }
    case "link": return linkKind(sc, t);
    default: return undefined;
  }
}
// 수리: 한 곳만 고쳐 바른 소리가 나고 군더더기 표가 없는 방법을 모두 찾는다
function fixes(sc, bad) {
  const want = pitches(sc), out = [];
  bad.notes.forEach((n, i) => {
    if (n.rest || tiedOn(bad, i - 1)) return;
    CARDS.forEach((c) => { if (c === n.acc) return; const x = withAcc(bad, i, c); if (sameList(pitches(x), want) && !redundant(x).length && !check(x).length) out.push({ i, acc: c }); });
  });
  return out;
}
function solve(ms) {
  const sc = parseScore(ms.s), t = targetOf(ms, sc);
  const view = ms.ask === "fix" ? withAcc(sc, ms.bad.i, ms.bad.acc) : sc;                // 화면에 그리는 악보
  const answer = ms.ask === "fix" ? fixes(sc, view) : answerUnder(ms, sc, {});
  const traps = {};                                                                      // 오개념 모델마다 표준과 다르게 나오는 답
  if (!["fix", "link", "name"].includes(ms.ask)) for (const [code, m] of Object.entries(MODELS)) { const a = answerUnder(ms, sc, m); if (a !== undefined && a !== answer) traps[code] = a; }
  return { ms, sc, view, t, answer, traps };
}
const isRight = (sol, given) => (sol.ms.ask === "fix" ? sol.answer.some((f) => f.i === given.i && f.acc === given.acc) : given === sol.answer);

// 오답의 원인 코드. 의뢰가 겨누는 오개념(aim)을 먼저 보고, 그다음 MODELS에 적힌 차례로 본다
function diagnose(sol, given) {
  const { ms, sc, view, t, answer, traps } = sol;
  if (isRight(sol, given)) return null;
  if (ms.ask === "fix") {
    if (given.i === t) return "FIX_CARD";
    const now = pitches(view), want = pitches(sc);
    return now[given.i] === want[given.i] ? "FIX_FINE" : "FIX_ROOT";
  }
  if (ms.ask === "link") return answer === "tie" ? "LINK_IS_TIE" : sameSlot(sc.notes[t], sc.notes[t + 1]) ? "LINK_SIGN" : "LINK_SLOT";
  if (ms.ask === "why") return "WHY";
  if (ms.ask === "name") return "NAME";
  const n = sc.notes[t];
  if (ms.ask === "sign" && answer === null && evaluate(withAcc(sc, t, given))[t].midi === midiOf(n.L, n.o, ms.want)) return "REDUNDANT";
  const hit = [ms.aim].concat(Object.keys(MODELS)).find((c) => c && traps[c] === given);
  if (hit) return hit;
  if (ms.ask === "key") return Math.abs(given - midiOf(n.L, n.o)) > 2 ? "FAR" : "OTHER";
  if (ms.ask === "reach") { const G = new Set(given.split(",")); return answer.split(",").some((x) => x && !G.has(x)) ? "MISS" : "EXTRA"; }
  return "OTHER";
}

// ── 문장 ── 수치와 이름은 전부 여기서 넣는다. 해요체, 두 문장 이내
function ctxOf(sc, t) {
  const n = sc.notes[t], ev = evaluate(sc), r = ev[t];
  const before = (f) => { for (let j = t - 1; j >= 0; j--) { const x = sc.notes[j]; if (!x.rest && f(x, j)) return j; } return -1; };
  const last = before((x) => x.bar === n.bar && sameSlot(x, n));
  return { n, r, L: LETTERS[n.L], here: noteKo(n.L, n.o), sounds: noteKo(n.L, n.o, r.alter),
    inBar: before((x) => x.acc !== null && x.bar === n.bar && sameSlot(x, n)),           // 같은 마디·같은 줄칸의 앞 표
    otherOct: before((x) => x.acc !== null && x.bar === n.bar && x.L === n.L && x.o !== n.o),
    prevBar: before((x) => x.acc !== null && x.bar < n.bar && sameSlot(x, n)),
    afterTie: last >= 0 && ev[last].src === "tie",                                       // 붙임줄이 막 끝난 자리
    later: sc.notes.findIndex((x, k) => k > t && x.bar === n.bar && sameSlot(x, n) && x.acc !== null),   // 같은 마디 뒤쪽의 표
    signs: sc.notes.filter((x, k) => k < t && x.bar === n.bar && sameSlot(x, n) && x.acc !== null).length,
    slurIn: sc.slurs.some(([a, b]) => a < t && t <= b && sc.notes[a].bar < n.bar),       // 앞 마디에서 넘어온 이음줄 안
    keyA: keyAlter(sc.key, n.L) };
}
const signAt = (sc, j) => signKo(sc.notes[j].acc);
// 표적 음이 그 높이인 까닭
function why(sc, t) {
  const c = ctxOf(sc, t), { n, r, L } = c;
  if (r.src === "tie") return `붙임줄로 이어받은 소리예요. 새로 누르지 않고 ${c.sounds} 소리를 이어 가요.`;
  if (r.src === "sign") {
    if (n.acc === 0) return `내추럴은 ${L} 자연음 자리예요. 앞의 표와 조표를 덮어요.`;
    const head = `${josa(signKo(n.acc), "은/는")} ${L} 자연음에서 반음 ${Math.abs(n.acc)}칸 ${n.acc > 0 ? "위" : "아래"}예요.`;
    return isWhite(r.midi) ? `${head} 흰 건반 ${josa(keyKo(r.midi), "과/와")} 같은 건반이에요.` : `${head} ${c.sounds} 건반이에요.`;
  }
  if (r.src === "mem") return `${c.signs > 1 ? "가장 가까운 앞의" : "같은 마디 앞의"} ${josa(signAt(sc, r.by), "이/가")} ${c.signs > 1 ? "닿아요" : "아직 닿아요"}. 이 음도 ${be(r.alter ? c.sounds : L + " 자연음")}.`;
  if (r.src === "key") {
    if (c.afterTie) return `붙임줄은 끝났어요. 새로 내는 음은 조표대로 ${be(c.sounds)}.`;
    if (c.otherOct >= 0) return `앞의 표는 ${noteKo(n.L, sc.notes[c.otherOct].o)} 자리에 붙었어요. ${josa(c.here, "은/는")} 조표대로 ${be(c.sounds)}.`;
    if (c.prevBar >= 0) return `앞 마디의 표는 마디선에서 풀렸어요. 조표대로 ${be(c.sounds)}.`;
    if (c.later >= 0) return `뒤에 나오는 표는 앞의 음에 닿지 않아요. 조표대로 ${be(c.sounds)}.`;
    return `조표의 ${josa(signKo(r.alter), "은/는")} 모든 ${L}에 걸려요. ${c.sounds} 건반이에요.`;
  }
  if (c.afterTie) return `붙임줄은 끝났어요. 새로 내는 ${josa(c.here, "은/는")} 자연음이에요.`;
  if (c.otherOct >= 0) return `앞의 표는 ${noteKo(n.L, sc.notes[c.otherOct].o)} 자리에 붙었어요. ${c.here}에는 닿지 않아요.`;
  if (c.prevBar >= 0) return `${c.slurIn ? "이음줄 안이어도 앞 마디의 표는 마디선에서 풀려요." : "앞 마디의 표는 마디선에서 풀렸어요."} ${L} 자연음이에요.`;
  if (c.later >= 0) return `뒤에 나오는 표는 앞의 음에 닿지 않아요. ${L} 자연음이에요.`;
  return `표도 조표도 닿지 않아요. ${L} 자연음이에요.`;
}
const WHY_KO = { sign: "이 음표의 표", mem: "같은 마디 앞의 표", key: "조표", tie: "붙임줄", plain: "아무것도 없음" };
const LINK_KO = { tie: "붙임줄 · 유지 통로", slur: "이음줄 · 선율길" };
const TAG_KO = { name: "표", notch: "시소", key: "건반", sign: "표 붙이기", reach: "효력", why: "까닭", link: "곡선", fix: "수리" };
// 의뢰 문장
function orderText(sol) {
  const { ms, sc, t } = sol, n = sc.notes[t];
  switch (ms.ask) {
    case "name": return "이 표의 이름을 골라요.";
    case "notch": return "이 표는 소리를 몇 칸 보낼까요?";
    case "key": return "화살표 음은 어느 건반일까요?";
    case "why": return "화살표 음의 높이는 무엇이 정했을까요?";
    case "reach": return `빛나는 ${signAt(sc, t)}의 힘이 닿는 음표를 모두 골라요.`;
    case "sign": return ms.by === "notch" ? `소리를 ${notchKo(ms.want)} 보내는 표를 골라요.` : ms.by === "name" ? `${josa(signKo(ms.want), "을/를")} 골라요.` : "빛나는 건반 소리가 나게 표를 골라요. 필요 없으면 없음.";
    case "link": return ms.given ? "곡선에 유지 통로가 놓였어요. 맞는지 보고 골라요." : "이 곡선은 붙임줄일까요, 이음줄일까요?";
    default: { const ev = evaluate(sc), same = sc.notes.map((x, i) => i).filter((i) => !sc.notes[i].rest && sc.notes[i].L === n.L && ev[i].onset); return `${LETTERS[n.L]} 음이 차례로 ${ro(same.map((i) => noteKo(n.L, sc.notes[i].o, ev[i].alter)).join(", "))} 들리게 한 곳을 고쳐요.`; }
  }
}
// 보기(고르기 의뢰)
function choices(sol) {
  const { ms } = sol;
  if (ms.ask === "name") return (ms.five ? [1, -1, 0, 2, -2] : [1, -1, 0]).map((a) => ({ v: a, label: signKo(a) }));
  if (ms.ask === "notch") return (ms.five ? [2, 1, 0, -1, -2] : [1, 0, -1]).map((a) => ({ v: a, label: notchKo(a) }));
  if (ms.ask === "why") return ["sign", "mem", "plain", "key", "tie"].slice(0, ms.n || 5).map((v) => ({ v, label: WHY_KO[v] }));
  if (ms.ask === "link") return ["tie", "slur"].map((v) => ({ v, label: LINK_KO[v] }));
  return [];
}
// 정답의 풀이(납품 문장)
function explain(sol) {
  const { ms, sc, t, answer } = sol, n = sc.notes[t], L = LETTERS[n.L];
  switch (ms.ask) {
    case "name": return `이 표는 ${be(signKo(n.acc))}. ${signKo(n.acc, "ko")}${hasBatchim(signKo(n.acc, "ko")) ? "이라고도" : "라고도"} 해요.`;
    case "notch": return n.acc === 0 ? "내추럴은 소리를 자연음 자리에 놓아요. 시소가 수평이에요." : `${josa(signKo(n.acc), "은/는")} 소리를 자연음에서 반음 ${Math.abs(n.acc)}칸 ${n.acc > 0 ? "위" : "아래"}로 보내요.`;
    case "key": case "why": return why(sc, t);
    case "reach": return answer ? `표는 붙은 곳부터 마디 끝까지, 같은 줄·칸에만 닿아요. 닿는 음표는 ${answer.split(",").length}개예요.` : "표는 붙은 곳부터 마디 끝까지, 같은 줄·칸에만 닿아요. 닿는 음표가 없어요.";
    case "link": return answer === "tie" ? "같은 줄·칸의 이웃한 두 음이고 새 표가 없어요. 붙임줄이라 뒤의 음은 다시 내지 않아요." : sameSlot(n, sc.notes[t + 1]) ? `뒤 음에 ${josa(signAt(sc, t + 1), "이/가")} 있어 높이가 달라요. 높이가 다르면 이음줄이에요.` : "두 음은 줄·칸이 달라 높이가 달라요. 붙임줄은 같은 높이끼리만 돼요.";
    default: {                                                                           // sign, fix
      const card = ms.ask === "fix" ? answer[0].acc : answer, c = ctxOf(withAcc(sol.view, t, null), t), now = c.r.alter ? c.sounds : L + " 자연음";
      if (card === null) {                                                               // 표가 없어야 맞는 자리
        if (ms.ask === "fix") return `표가 없으면 ${c.r.src === "mem" ? `앞의 ${josa(signAt(sc, c.r.by), "이/가")} 닿아 ` : c.r.src === "key" ? "조표대로 " : ""}${be(now)}. ${josa(signKo(sol.view.notes[t].acc), "을/를")} 지워요.`;
        return `${c.r.src === "mem" ? `같은 마디 앞의 ${josa(signAt(sc, c.r.by), "이/가")} 아직 닿아요.` : c.r.src === "key" ? "조표가 이미 걸려 있어요." : "표도 조표도 닿지 않아요."} 표가 없어도 ${be(now)}.`;
      }
      const S = signKo(card);
      if (ms.by === "notch" || ms.by === "name") return `${josa(S, "은/는")} 소리를 자연음에서 ${notchKo(card)}${card ? " 보내요" : "에 놓아요"}.`;
      if (ms.ask === "fix" && evaluate(withAcc(sol.view, t, card)).some((r) => !r.rest && r.i !== t && r.by === t)) return `${josa(S, "을/를")} 붙이면 같은 마디 뒤의 ${L}에도 닿아요. 한 곳만 고치면 돼요.`;
      if (c.afterTie) return `붙임줄은 끝났어요. 새로 내는 음에는 ${josa(S, "을/를")} 다시 붙여요.`;
      if (c.r.src === "mem") return `앞의 ${josa(signAt(sc, c.r.by), "이/가")} 아직 닿아요. ${ro(S)} 자리를 새로 정해요.`;
      if (c.otherOct >= 0 && sc.notes[c.otherOct].acc === card) return `앞의 표는 ${noteKo(n.L, sc.notes[c.otherOct].o)} 자리 것이에요. ${c.here}에도 ${josa(S, "을/를")} 붙여요.`;
      if (c.prevBar >= 0 && sc.notes[c.prevBar].acc === card) return `앞 마디의 표는 마디선에서 풀렸어요. ${josa(S, "을/를")} 다시 붙여요.`;
      if (c.r.src === "key") return `조표는 ${be(signKo(c.keyA))}. ${ro(S)} 자리를 새로 정해요.`;
      return `${josa(S, "은/는")} ${L} 자연음에서 반음 ${Math.abs(card)}칸 ${card > 0 ? "위" : "아래"}예요.`;
    }
  }
}
// 두 번 틀렸을 때: 답을 놓아 주고 확정을 기다린다
function giveText(sol) {
  const { ms, sc, t, answer } = sol, n = sc.notes[t];
  switch (ms.ask) {
    case "key": return `답은 ${isWhite(answer) ? keyKo(answer) : noteKo(n.L, n.o, answer - midiOf(n.L, n.o))} 건반이에요. 확정을 눌러요.`;
    case "sign": return answer === null ? "표가 필요 없어요. 없음을 골라 두었어요. 확정을 눌러요." : `답은 ${be(signKo(answer))}. 확정을 눌러요.`;
    case "reach": return answer ? "닿는 음표를 골라 두었어요. 확정을 눌러요." : "닿는 음표가 없어요. 그대로 확정을 눌러요.";
    case "fix": return "고칠 음표와 표를 골라 두었어요. 확정을 눌러요.";
    default: return `답은 ${be(choices(sol).find((c) => c.v === answer).label.split(" · ")[0])}. 확정을 눌러요.`;
  }
}
// 오답 안내(1차). code는 diagnose의 결과다
function say(sol, code, given) {
  const { ms, sc, view, t } = sol, c = ctxOf(ms.ask === "sign" || ms.ask === "fix" ? withAcc(view, t, null) : sc, t), { n, L } = c, reach = ms.ask === "reach";
  const own = n.acc !== null ? signKo(n.acc) : "표", d = n.acc > 0 ? "위" : "아래";
  switch (code) {
    case "PLAIN": return `표를 빼고 읽었어요. ${josa(own, "이/가")} 붙으면 자리가 바뀌어요.`;
    case "DIR": return "방향이 반대예요. 샵은 위로, 플랫은 아래로 보내요.";
    case "HALF": return `${josa(own, "은/는")} 2칸이에요. 한 칸 더 가요.`;
    case "BLACK": return `검은 건반이 아니어도 돼요. ${L}에서 반음 1칸 ${d}는 흰 건반 ${be(keyKo(midiOf(n.L, n.o, n.acc)))}.`;
    case "WHITE": return "흰 건반 한 칸이 아니에요. 반음 1칸은 바로 옆 건반이에요.";
    case "ADD": return n.acc !== null ? `표는 더하지 않아요. ${josa(own, "은/는")} ${L} 자연음에서 ${notchKo(n.acc)} 자리예요.` : "표는 더하지 않아요. 새 표는 자연음에서 센 자리를 새로 정해요.";
    case "NAT_ONE": return `내추럴은 한 칸만 지우지 않아요. 곧바로 ${L} 자연음으로 가요.`;
    case "NAT_DOWN": return `내추럴은 내리는 표가 아니에요. ${L} 자연음 자리로 가요.`;
    case "NAT_KEY": return `내추럴은 조표로 돌아가는 표가 아니에요. ${L} 자연음이에요.`;
    case "NAT_ONCE": return "내추럴도 마디 끝까지 닿아요. 그 앞의 표는 이미 덮였어요.";
    case "SIGN_ONLY": return reach ? "표는 붙은 음표에서 끝나지 않아요. 같은 줄·칸이면 마디 끝까지 닿아요." : `같은 마디 앞의 ${josa(c.inBar >= 0 ? signAt(sc, c.inBar) : "표", "이/가")} 아직 닿아요. 표는 마디 끝까지 가요.`;
    case "WHOLE_BAR": return reach ? "표는 붙은 곳부터 닿아요. 표보다 앞에 있는 음은 빼요." : "표는 붙은 곳부터 닿아요. 표보다 앞에 있는 음은 그대로예요.";
    case "ALL_OCT": return reach ? "옥타브가 다른 음에는 닿지 않아요. 같은 줄·칸만 골라요." : `앞의 표는 ${noteKo(n.L, sc.notes[c.otherOct].o)} 자리에 붙었어요. ${c.here}에는 닿지 않아요.`;
    case "NO_BAR": return reach ? "표는 마디선을 넘지 못해요. 같은 마디 안에서만 골라요." : "앞 마디의 표는 마디선에서 풀렸어요. 새 마디는 조표부터 봐요.";
    case "NO_KEY": return `조표를 빠뜨렸어요. 조표의 ${josa(signKo(c.keyA), "은/는")} 모든 ${L}에 걸려요.`;
    case "KEY_OCT": return `조표는 그려진 줄만이 아니에요. 모든 옥타브의 ${L}에 걸려요.`;
    case "TIE_BAR": return "마디선은 지났지만 붙임줄로 같은 소리가 이어지고 있어요.";
    case "TIE_CARRY": return "붙임줄은 끝났어요. 이제 새 음이에요. 조표와 새 표를 봐요.";
    case "SLUR_CARRY": return "이음줄은 소리를 부드럽게 이을 뿐이에요. 앞 마디의 표를 옮기지 않아요.";
    case "FAR": return `이 건반은 ${L}에서 ${Math.abs(given - midiOf(n.L, n.o))}칸 떨어져 있어요. 표 하나는 2칸까지만 보내요.`;
    case "REDUNDANT": return `소리는 맞아요. 그런데 ${c.r.src === "mem" ? `앞의 ${josa(signAt(sc, c.r.by), "이/가")} 아직 닿아서` : c.r.src === "key" ? "조표가 이미 걸려 있어서" : "표도 조표도 닿지 않아서"} 표가 없어도 돼요.`;
    case "MISS": return "닿는 음표가 더 있어요. 같은 마디, 같은 줄·칸을 끝까지 봐요.";
    case "EXTRA": return "닿지 않는 음표가 들어 있어요. 같은 마디, 같은 줄·칸인지 봐요.";
    case "WHY": return given === "sign" ? "이 음표 앞에는 표가 없어요. 다른 까닭을 찾아요." : given === "tie" ? "이 음은 붙임줄로 이어받지 않았어요. 새로 내는 음이에요." : given === "key" ? (c.keyA ? "조표보다 마디 안의 표와 붙임줄이 먼저예요." : `조표에 ${L}는 없어요.`) : given === "mem" ? (c.otherOct >= 0 ? `앞의 표는 ${noteKo(n.L, sc.notes[c.otherOct].o)} 자리에 붙었어요. ${c.here}에는 닿지 않아요.` : c.prevBar >= 0 ? "앞 마디의 표는 마디선에서 풀렸어요." : "같은 마디 앞에 같은 줄·칸의 표가 없어요.") : "이 음에는 무언가 걸려 있어요. 표, 조표, 붙임줄을 봐요.";
    case "NAME": return `이 표는 ${cardKo(given)}${hasBatchim(cardKo(given)) ? "이" : "가"} 아니에요. 모양을 다시 봐요.`;
    case "LINK_IS_TIE": return "줄·칸이 같고 뒤 음에 새 표가 없어요. 이웃한 두 음만 잇는 이 곡선은 붙임줄이에요.";
    case "LINK_SLOT": return "두 음은 줄·칸이 달라요. 높이가 다르면 한 소리로 이을 수 없어요.";
    case "LINK_SIGN": return `뒤 음에 ${josa(signAt(sc, t + 1), "이/가")} 있어요. 높이가 달라져서 한 소리로 이을 수 없어요.`;
    case "FIX_FINE": return "이 음표는 주문대로 소리 나요. 다른 음표를 찾아요.";
    case "FIX_ROOT": return "이 음이 틀리게 들리는 것은 앞의 음표 때문이에요. 앞에서 고치면 여기도 고쳐져요.";
    default: {                                                                           // OTHER, FIX_CARD
      if (ms.ask === "key") return `이 건반은 ${L}에서 ${be(notchKo(given - midiOf(n.L, n.o)))}. 악보의 표를 다시 봐요.`;
      if (ms.ask === "notch") return `${josa(own, "은/는")} ${notchKo(given)}${hasBatchim(notchKo(given)) ? "이" : "가"} 아니에요. 표의 모양을 다시 봐요.`;
      const acc = ms.ask === "fix" ? given.acc : given, got = evaluate(withAcc(view, t, acc))[t];
      return `이 표를 고르면 ${noteKo(n.L, n.o, got.alter)} 소리가 나요. 목표와 달라요.`;
    }
  }
}

// ── 건반 창: 의뢰에 필요한 건반만 보여 준다. 흰 건반이 cap을 넘으면 두 쪽으로 나눈다 ──
function keyWindow(sol, cap = 7) {
  const { sc, view, t } = sol, n = sc.notes[t], nat = midiOf(n.L, n.o), need = new Set(pitches(sc).concat(pitches(view)).filter((x) => x !== null));
  if (["reach", "why", "link"].includes(sol.ms.ask)) need.add(nat);                       // 고르기 의뢰: 악보의 소리와 표적의 자연음 자리만
  else for (let d = -2; d <= 2; d++) need.add(nat + d);                                  // 건반·표로 답하는 의뢰: 표적 음의 다섯 자리
  if (sol.ms.ask === "key") Object.values(sol.traps).forEach((k) => need.add(k));        // 오개념대로 누를 건반도 창 안에 둔다
  const ks = [...need].sort((a, b) => a - b), whites = (p) => { let w = 0; for (let k = p.lo; k <= p.hi; k++) if (isWhite(k)) w++; return w; };
  const pane = (lo, hi) => { while (!isWhite(lo)) lo--; while (!isWhite(hi)) hi++; const p = { lo, hi }; while (whites(p) < 3) { p.hi++; while (!isWhite(p.hi)) p.hi++; } return p; };
  let panes = [pane(ks[0], ks[ks.length - 1])];
  if (whites(panes[0]) > cap) {                                                          // 가장 넓은 빈틈에서 가른다
    let cut = 1; for (let i = 2; i < ks.length; i++) if (ks[i] - ks[i - 1] > ks[cut] - ks[cut - 1]) cut = i;
    if (ks[cut] - ks[cut - 1] > 4) panes = [pane(ks[0], ks[cut - 1]), pane(ks[cut], ks[ks.length - 1])];
  }
  return { panes, whites: panes.reduce((s, p) => s + whites(p), 0) };
}

// ── 소리 목록: 소리 하나 = 새로 내는 음 하나. 붙임줄로 이어진 음표는 한 소리로 합친다 ──
function sounds(sc) {
  const ev = evaluate(sc), out = [], inSlur = (i) => sc.slurs.some(([a, b]) => a <= i && i < b);
  let at = F(0);
  sc.notes.forEach((n, i) => {
    if (!n.rest) {
      if (ev[i].onset) out.push({ midi: ev[i].midi, at, len: n.dur, notes: [i], legato: inSlur(i) });
      else { const s = out[out.length - 1]; s.len = add(s.len, n.dur); s.notes.push(i); s.legato = inSlur(i); }
    }
    at = add(at, n.dur);
  });
  return out;
}
const hasPlay = (sc) => { const s = sounds(sc); return s.length >= 2 || s.some((x) => x.notes.length > 1); };   // 연주 단계가 있는 의뢰
const beats = (f, md) => num(f) * md;                                                    // 길이(온음표 = 1) → 박

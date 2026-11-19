// ══ 임시표 마법 공방 · 내용 씨앗 ══
// 작업일 여덟, 의뢰 66건, 발견 장면 일곱. 의뢰에는 악보 씨앗과 묻는 방식, 겨누는 오개념만 적는다.
// ask: name 이름 · notch 시소 눈금 · key 건반 · sign 표 붙이기 · reach 효력 · why 까닭 · link 곡선 · fix 수리
// after: 그 의뢰 뒤에 끼는 발견 장면.  scene: 작업일을 열 때의 발견 장면

const DAYS = [
  { id: "d0", name: "0단 다섯 가지 표", list: [
    { id: "d0-01", ask: "name", s: "k0 4/4 | G#4/1* |" },
    { id: "d0-02", ask: "name", s: "k0 4/4 | Gb4/1* |" },
    { id: "d0-03", ask: "notch", s: "k0 4/4 | G#4/1* |", aim: "DIR" },
    { id: "d0-04", ask: "notch", s: "k0 4/4 | Gb4/1* |", aim: "DIR" },
    { id: "d0-05", ask: "notch", s: "k0 4/4 | Gn4/1* |", after: "S1" },
    { id: "d0-06", ask: "notch", s: "k0 4/4 | Gx4/1* |", five: true, aim: "HALF" },
    { id: "d0-07", ask: "name", s: "k0 4/4 | Gbb4/1* |", five: true },
    { id: "d0-08", ask: "sign", s: "k0 4/4 | G?4/1 |", want: -2, by: "notch", cards: 5, aim: "DIR", final: true },
  ] },
  { id: "d1", name: "1단 반음 한 칸", list: [
    { id: "d1-01", ask: "key", s: "k0 4/4 | C#4/1* |", aim: "PLAIN" },
    { id: "d1-02", ask: "key", s: "k0 4/4 | Db4/1* |", aim: "DIR" },
    { id: "d1-03", ask: "sign", s: "k0 4/4 | A?4/1 |", want: -1, aim: "DIR" },
    { id: "d1-04", ask: "sign", s: "k0 4/4 | F?4/1 |", want: 1, aim: "DIR", after: "S2" },
    { id: "d1-05", ask: "key", s: "k0 4/4 | E#4/1* |", aim: "BLACK" },
    { id: "d1-06", ask: "key", s: "k0 4/4 | Cb5/1* |", aim: "BLACK" },
    { id: "d1-07", ask: "key", s: "k0 4/4 | B#4/1* |", aim: "BLACK" },
    { id: "d1-08", ask: "key", s: "k0 4/4 | Fb4/1* |", aim: "BLACK", final: true },
  ] },
  { id: "d2", name: "2단 두 칸과 제자리", list: [
    { id: "d2-01", ask: "key", s: "k0 4/4 | Cx4/1* |", aim: "HALF" },
    { id: "d2-02", ask: "key", s: "k0 4/4 | Dbb4/1* |", aim: "HALF" },
    { id: "d2-03", ask: "sign", s: "k0 4/4 | F?4/1 |", want: 2, aim: "WHITE", after: "S3" },
    { id: "d2-04", ask: "key", s: "k0 2/4 | C#4/4 Cx4/4* |", aim: "ADD" },
    { id: "d2-05", ask: "key", s: "k0 2/4 | Db4/4 Dn4/4* |", aim: "NAT_DOWN" },
    { id: "d2-06", ask: "key", s: "k0 2/4 | Cx4/4 Cn4/4* |", aim: "NAT_ONE" },
    { id: "d2-07", ask: "sign", s: "k0 2/4 | Ebb4/4 E?4/4 |", want: -1, aim: "ADD" },
    { id: "d2-08", ask: "sign", s: "k0 2/4 | Cx4/4 C?4/4 |", want: 1, aim: "ADD", final: true },
  ] },
  { id: "d3", name: "3단 마디 끝까지", scene: "S4", list: [
    { id: "d3-01", ask: "key", s: "k0 4/4 | G#4/4 A4/4 G4/4* r/4 |", aim: "SIGN_ONLY" },
    { id: "d3-02", ask: "reach", s: "k0 4/4 | F#4/4@ G4/4 F4/4 A4/4 |", aim: "SIGN_ONLY" },
    { id: "d3-03", ask: "key", s: "k0 4/4 | Bb4/4 A4/4 B4/4* r/4 |", aim: "SIGN_ONLY" },
    { id: "d3-04", ask: "sign", s: "k0 4/4 | G#4/4 A4/4 G?4/4 r/4 |", want: 1, aim: "SIGN_ONLY" },
    { id: "d3-05", ask: "key", s: "k0 4/4 | F4/4* G4/4 F#4/4 F4/4 |", aim: "WHOLE_BAR" },
    { id: "d3-06", ask: "sign", s: "k0 4/4 | Eb4/4 F4/4 E?4/4 r/4 |", want: 0, aim: "SIGN_ONLY" },
    { id: "d3-07", ask: "reach", s: "k0 4/4 | B4/4 Bb4/4@ A4/4 B4/4 |", aim: "WHOLE_BAR" },
    { id: "d3-08", ask: "key", s: "k0 4/4 | C#5/4 Cn5/4 D5/4 C5/4* |", aim: "NAT_ONCE", final: true },
  ] },
  { id: "d4", name: "4단 옥타브와 마디선", list: [
    { id: "d4-01", ask: "key", s: "k0 2/4 | G#4/4 G5/4* |", aim: "ALL_OCT" },
    { id: "d4-02", ask: "reach", s: "k0 4/4 | G#4/4@ G5/4 A4/4 G4/4 |", aim: "ALL_OCT", after: "S5" },
    { id: "d4-03", ask: "key", s: "k0 2/4 | G#4/4 A4/4 | G4/4* r/4 |", aim: "NO_BAR" },
    { id: "d4-04", ask: "sign", s: "k0 2/4 | Bb4/4 A4/4 | B?4/4 r/4 |", want: -1, aim: "NO_BAR" },
    { id: "d4-05", ask: "why", s: "k0 3/4 | F#5/4 E5/4 F4/4* |", n: 3, aim: "ALL_OCT" },
    { id: "d4-06", ask: "reach", s: "k0 3/4 | F#4/4@ A4/4 F4/4 | F4/4 F5/4 r/4 |", aim: "NO_BAR" },
    { id: "d4-07", ask: "key", s: "k0 4/4 | F#4/4 Fn4/4 F#4/4 F4/4* |", aim: "SIGN_ONLY" },
    { id: "d4-08", ask: "reach", s: "k0 3/4 | Eb5/4@ E4/4 E5/4 | E5/4 D5/4 r/4 |", aim: "ALL_OCT", final: true },
  ] },
  { id: "d5", name: "5단 조표와 함께", scene: "S6", list: [
    { id: "d5-01", ask: "key", s: "k1 4/4 | F4/4* G4/4 A4/4 r/4 |", aim: "NO_KEY" },
    { id: "d5-02", ask: "key", s: "k1 4/4 | G4/4 Fn4/4* E4/4 r/4 |", aim: "NAT_KEY" },
    { id: "d5-03", ask: "key", s: "k3 2/4 | G5/4 G4/4* |", aim: "KEY_OCT" },
    { id: "d5-04", ask: "why", s: "k3 3/4 | Gn4/4 A4/4 G5/4* |", n: 4, aim: "ALL_OCT" },
    { id: "d5-05", ask: "key", s: "k1 4/4 | Fn4/4 G4/4 F4/4* r/4 |", aim: "NAT_ONCE" },
    { id: "d5-06", ask: "key", s: "k1 2/4 | Fn4/4 G4/4 | F4/4* r/4 |", aim: "NO_BAR" },
    { id: "d5-07", ask: "sign", s: "k1 4/4 | Fn4/4 G4/4 F?4/4 r/4 |", want: 1, aim: "NAT_ONCE" },
    { id: "d5-08", ask: "key", s: "k-2 3/4 | En5/4 D5/4 E4/4* |", aim: "ALL_OCT", final: true },
  ] },
  { id: "d6", name: "6단 붙임줄과 이음줄", scene: "S7", list: [
    { id: "d6-01", ask: "key", s: "k0 4/4 | r/2. F#4/4~ | F4/4* r/2. |", aim: "TIE_BAR" },
    { id: "d6-02", ask: "key", s: "k0 4/4 | r/2. F#4/4~ | F4/4 F4/4* r/2 |", aim: "TIE_CARRY" },
    { id: "d6-03", ask: "sign", s: "k0 4/4 | r/2. F#4/4~ | F4/4 F?4/4 F4/4 r/4 |", want: 1, aim: "TIE_CARRY" },
    { id: "d6-04", ask: "key", s: "k0 2/4 | (G#4/4 A4/4 | G4/4*) r/4 |", aim: "SLUR_CARRY" },
    { id: "d6-05", ask: "key", s: "k1 4/4 | r/2. Fn4/4~ | F4/4 F4/4* r/2 |", aim: "TIE_CARRY" },
    { id: "d6-06", ask: "link", s: "k0 2/4 | G#4/4^ G5/4 |" },
    { id: "d6-07", ask: "link", s: "k0 2/4 | r/4 Bb4/4^ | B4/4 r/4 |" },
    { id: "d6-08", ask: "key", s: "k0 2/4 | r/4 C#4/4~ | C4/2~ | C4/4 C4/4* |", aim: "TIE_CARRY" },
    { id: "d6-09", ask: "link", s: "k0 2/4 | F#4/4^ Fn4/4 |", given: "tie" },
    { id: "d6-10", ask: "sign", s: "k1 4/4 | r/2. Fn4/4~ | F4/4 F?4/4 r/2 |", want: 0, aim: "TIE_CARRY", final: true },
  ] },
  { id: "d7", name: "7단 악보 수리점", list: [
    { id: "d7-01", ask: "key", s: "k1 3/4 | G4/4 F4/4 E4/4 | Fn4/4 G4/4 F4/4* |", aim: "NAT_ONCE" },
    { id: "d7-02", ask: "why", s: "k-1 3/4 | A4/4 Bn4/4 C5/4 | B4/4* A4/4 r/4 |", n: 5, aim: "NO_BAR" },
    { id: "d7-03", ask: "sign", s: "k1 3/4 | A4/4 Fn4/4 G4/4 | F?4/4 E4/4 r/4 |", want: 0, aim: "NO_BAR" },
    { id: "d7-04", ask: "fix", s: "k0 3/4 | E4/4 F#4/4 G4/4 | F#4/4 E4/4 r/4 |", bad: { i: 3, acc: null }, aim: "NO_BAR" },
    { id: "d7-05", ask: "fix", s: "k0 4/4 | Bb4/4 A4/4 B4/4 C5/4 |", bad: { i: 0, acc: null }, aim: "SIGN_ONLY" },
    { id: "d7-06", ask: "fix", s: "k0 4/4 | C#5/4 D5/4 C#4/4 D4/4 |", bad: { i: 2, acc: null }, aim: "ALL_OCT" },
    { id: "d7-07", ask: "key", s: "k2 3/4 | D5/4 Cn5/2~ | C5/4 C5/4* B4/4 |", aim: "TIE_CARRY" },
    { id: "d7-08", ask: "fix", s: "k1 3/4 | G4/4 Fn4/4 E4/4 | F4/4 G4/2 |", bad: { i: 3, acc: 0 }, aim: "NAT_KEY", final: true },
  ] },
];
// 발견 장면: 채점하지 않는 비교 화면. 악보 씨앗과 문장 두 개
const SCENES = {
  S1: { rows: ["k0 4/4 | G#4/1 |", "k0 4/4 | Gx4/1 |", "k0 4/4 | Gbb4/1 |"], text: "표가 겹치면 두 칸이에요. 더블샵은 위로 2칸, 더블플랫은 아래로 2칸 보내요." },
  S2: { rows: ["k0 4/4 | C#4/1 |", "k0 4/4 | E#4/1 |"], text: "E와 F, B와 C 사이에는 검은 건반이 없어요. 그래도 바로 옆 건반이 반음 1칸이에요." },
  S3: { rows: ["k0 2/4 | C#4/4 Cx4/4 |", "k0 2/4 | Cx4/4 Cn4/4 |"], text: "표는 더하지 않아요. 새 표는 자연음에서 센 자리를 새로 정해요." },
  S4: { rows: ["k0 4/4 | G#4/4 A4/4 G4/4 r/4 |"], text: "표의 힘은 빛띠처럼 그 줄·칸을 따라 마디 끝까지 가요. 표가 없는 뒤의 음도 같은 건반이에요." },
  S5: { rows: ["k0 2/4 | G#4/4 A4/4 | G4/4 r/4 |", "k0 2/4 | Gb4/4 G5/4 |"], text: "빛띠는 마디선에서 꺼져요. 옥타브가 다른 줄·칸에는 처음부터 닿지 않아요." },
  S6: { rows: ["k1 4/4 | F4/4 F5/4 Fn4/4 F4/4 |"], text: "조표는 문패예요. 모든 옥타브, 모든 마디에 걸려요. 마디 안의 표가 잠깐 덮을 뿐이에요." },
  S7: { rows: ["k0 2/4 | r/4 F#4/4~ | F4/4 F4/4 |", "k0 2/4 | (G#4/4 A4/4 | G4/4) r/4 |"], text: "붙임줄은 한 소리를 그대로 이어요. 이음줄은 다른 음으로 부드럽게 건너갈 뿐이에요." },
};
// 규칙 카드: 겨누는 오개념으로 묶는다. 표 카드 다섯 장은 0단의 의뢰에서 얻는다
const RULE_CARDS = [
  { id: "R1", title: "반음 한 칸은 바로 옆 건반", aims: ["PLAIN", "DIR", "BLACK", "WHITE"] },
  { id: "R2", title: "표는 더하지 않고 자리를 정한다", aims: ["HALF", "ADD", "NAT_ONE", "NAT_DOWN"] },
  { id: "R3", title: "표는 붙은 곳부터 마디 끝까지", aims: ["SIGN_ONLY", "WHOLE_BAR", "NAT_ONCE"] },
  { id: "R4", title: "같은 줄·칸에만 닿는다", aims: ["ALL_OCT"] },
  { id: "R5", title: "마디선에서 풀린다", aims: ["NO_BAR"] },
  { id: "R6", title: "조표는 모든 옥타브, 모든 마디", aims: ["NO_KEY", "KEY_OCT", "NAT_KEY"] },
  { id: "R7", title: "붙임줄은 소리를 잇고 표는 옮기지 않는다", aims: ["TIE_BAR", "TIE_CARRY"] },
  { id: "R8", title: "이음줄은 표를 옮기지 않는다", aims: ["SLUR_CARRY"] },
];
// 정답률의 네 갈래(초안): 기호 인식 · 반음 계산 · 적용 범위 · 악보 표기
const categoryOf = (ms, day) => (ms.ask === "name" || ms.ask === "notch" ? "sym" : ms.ask === "fix" ? "notate" : ms.ask === "sign" ? (day <= 2 ? "semi" : "notate") : ms.ask === "key" ? (day <= 2 ? "semi" : "reach") : "reach");
// 악보의 가로 자리: 음표·쉼표 1칸, 표나 빈 표 자리가 있으면 +0.55칸, 안쪽 마디선마다 +0.45칸
const staffUnits = (sc) => sc.notes.reduce((s, n) => s + 1 + (!n.rest && (n.acc !== null || n.blank) ? 0.55 : 0), 0) + 0.45 * (sc.bars - 1);
const unitPx = (sc, W) => (W - 34 - 10 * Math.abs(sc.key) - 18 - 8) / staffUnits(sc);   // 음자리표 34 · 조표 기호당 10 · 박자표 18 · 오른쪽 8

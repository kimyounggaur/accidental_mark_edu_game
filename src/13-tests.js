// 13 TESTS — pure, named checks. No DOM changes, storage writes, or audio playback.
// Full 2.59M-score regression remains a separate Node script.
function runSelfTests(options = {}) {
  const results = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const test = (id, name, checkFn) => {
    try {
      const passed = !!checkFn();
      results.push({ id, name, passed, ...(passed ? {} : { error: '검사 결과가 기대값과 달라요.' }) });
    } catch (error) { results.push({ id, name, passed: false, error: error.message }); }
  };
  const P = (seed, model) => pitches(parseScore(seed), model).filter(x => x !== null);
  const ON = seed => evaluate(parseScore(seed)).filter(r => !r.rest).map(r => r.onset);
  const missions = DAYS.flatMap(day => day.list);
  const sols = missions.map(solve);
  const solved = id => sols.find(sol => sol.ms.id === id);
  const allTexts = [];
  const feedback = [];
  for (const sol of sols) {
    allTexts.push(orderText(sol), explain(sol), giveText(sol));
    const { ms, sc, view, t } = sol;
    let wrongs;
    if (ms.ask === 'key') wrongs = keyWindow(sol).panes.flatMap(p => Array.from({ length: p.hi - p.lo + 1 }, (_, k) => p.lo + k));
    else if (ms.ask === 'sign') wrongs = CARDS.slice(ms.cards === 5 ? 1 : 0);
    else if (ms.ask === 'fix') wrongs = sc.notes.flatMap((n, i) => n.rest ? [] : CARDS.map(acc => ({ i, acc })));
    else if (ms.ask === 'reach') {
      const ids = sc.notes.map((n, i) => !n.rest && i !== t ? i : null).filter(i => i !== null);
      wrongs = Array.from({ length: 2 ** ids.length }, (_, mask) => ids.filter((_, k) => (mask >> k) & 1).join(','));
    } else wrongs = choices(sol).map(c => c.v);
    for (const given of wrongs) {
      if (ms.ask === 'fix' && given.acc === view.notes[given.i].acc) continue;
      const cause = diagnose(sol, given);
      if (cause === null) continue;
      const text = say(sol, cause, given);
      feedback.push({ cause, text }); allTexts.push(text);
    }
  }

  test('TH-01', '장음계 공식에서 자연음 반음 자리를 계산해요', () => same([...LETTERS].map((_, L) => natPc(L)), [0, 2, 4, 5, 7, 9, 11]));
  test('TH-02', 'MIDI와 A4 기준 주파수를 계산해요', () => midiOf(0, 4) === 60 && midiOf(5, 4) === 69 && hz(69) === 440 && hz(81) === 880 && Math.abs(hz(60) - 261.6256) < .001);
  test('TH-03', '조표의 차례와 일곱 조표의 개수가 맞아요', () => keyLetters(7).map(L => LETTERS[L]).join('') === 'FCGDAEB' && keyLetters(-7).map(L => LETTERS[L]).join('') === 'BEADGCF' && Array.from({ length: 15 }, (_, i) => i - 7).every(k => [...LETTERS].filter((_, L) => keyAlter(k, L)).length === Math.abs(k)));
  test('TH-04', '높은음자리 조표를 올바른 계단에 그려요', () => same(keySteps(7), [38, 35, 39, 36, 33, 37, 34]) && same(keySteps(-7), [34, 37, 33, 36, 32, 35, 31]));
  test('TH-05', '한 옥타브에는 흰 건반 일곱 개가 있어요', () => Array.from({ length: 12 }, (_, k) => 60 + k).filter(isWhite).length === 7 && keyKo(65) === 'F4' && keyKo(61) === 'C♯4·D♭4');
  test('TH-06', '음이름과 표 이름의 한국어 조사가 맞아요', () => josa('샵', '은/는') === '샵은' && josa('올림표', '은/는') === '올림표는' && be('G♯4') === 'G♯4예요' && be('B3') === 'B3이에요' && ro('내추럴') === '내추럴로' && ro('샵') === '샵으로');
  test('TH-07', '분수는 기약분수이고 분모가 양수예요', () => same(F(6, -8), { n: -3, d: 4 }) && same(F(0, 16), { n: 0, d: 1 }));
  test('TH-08', '서로 다른 분모의 음표 길이를 정확히 더해요', () => eq(add(F(1, 4), F(1, 2)), F(3, 4)) && eq(add(F(1, 3), F(1, 6)), F(1, 2)));
  test('TH-09', '점음표의 길이는 정확한 분수예요', () => eq(noteWhole(2, 1), F(3, 4)) && eq(noteWhole(4, 2), F(7, 16)) && beats(noteWhole(2, 1), 4) === 3);
  test('TH-10', '줄·칸 계단은 음이름과 옥타브로 정해요', () => stepOf(2, 4) === 30 && stepOf(3, 5) === 38 && stepOf(4, 5) - stepOf(4, 4) === 7);
  test('TH-11', '씨앗에서 쉼표와 빈 표 자리와 마디를 읽어요', () => { const sc = parseScore('k1 2/4 | r/4 F?4/4 | F4/2* |'); return sc.key === 1 && sc.bars === 2 && sc.notes[0].rest && sc.notes[1].blank && sc.notes[1].acc === null && sc.notes[2].target && sc.notes[2].bar === 1; });
  test('TH-12', '표를 바꿔도 원본 악보는 변하지 않아요', () => { const sc = parseScore('k0 4/4 | C#4/1 |'), before = JSON.stringify(sc), changed = withAcc(sc, 0, -1); return JSON.stringify(sc) === before && changed.notes[0].acc === -1 && sc.notes[0].acc === 1; });
  test('TH-13', '다섯 표의 한국어·영어 이름과 칸 수가 맞아요', () => signKo(2) === '더블샵' && signKo(-2, 'ko') === '겹내림표' && signEn(0) === 'natural' && notchKo(-2) === '아래로 2칸' && notchKo(0) === '제자리');
  test('TH-14', '곡선은 같은 줄·칸과 뒤의 새 표로 구분해요', () => linkKind(parseScore('k0 2/4 | Bb4/4^ B4/4 |'), 0) === 'tie' && linkKind(parseScore('k0 2/4 | F#4/4^ Fn4/4 |'), 0) === 'slur' && linkKind(parseScore('k0 2/4 | G#4/4^ G5/4 |'), 0) === 'slur');
  test('TH-15', '붙임줄 소리 목록은 길이를 합하고 새 발음을 하나로 세요', () => { const sc = parseScore('k0 2/4 | C#4/4~ C4/4 | C4/2 |'), list = sounds(sc); return list.length === 2 && same(list[0].notes, [0, 1]) && eq(list[0].len, F(1, 2)) && eq(list[1].at, F(1, 2)) && hasPlay(sc); });

  test('EV-01', 'C4에 샵을 붙이면 61이에요', () => same(P('k0 4/4 | C#4/1 |'), [61]));
  test('EV-02', 'E샵4는 흰 건반 F4예요', () => same(P('k0 4/4 | E#4/1 |'), [65]) && isWhite(65));
  test('EV-03', 'C더블샵4는 D4예요', () => same(P('k0 4/4 | Cx4/1 |'), [62]));
  test('EV-04', 'D더블플랫4는 C4예요', () => same(P('k0 4/4 | Dbb4/1 |'), [60]));
  test('EV-05', '더블샵은 앞의 샵에 더하지 않아요', () => same(P('k0 2/4 | C#4/4 Cx4/4 |'), [61, 62]) && same(P('k0 2/4 | C#4/4 Cx4/4 |', MODELS.ADD), [61, 63]));
  test('EV-06', '같은 마디의 같은 자리에 표가 닿아요', () => same(P('k0 2/4 | G#4/4 G4/4 |'), [68, 68]));
  test('EV-07', '표가 다른 옥타브에는 닿지 않아요', () => same(P('k0 2/4 | G#4/4 G5/4 |'), [68, 79]));
  test('EV-08', '마디선을 지나면 마디 기억을 비워요', () => same(P('k0 2/4 | G#4/4 r/4 | G4/4 r/4 |'), [68, 67]));
  test('EV-09', '내추럴 다음 마디에는 조표로 돌아가요', () => same(P('k1 2/4 | Fn4/4 r/4 | F4/4 r/4 |'), [65, 66]));
  test('EV-10', '더블샵 뒤 내추럴은 자연음이에요', () => same(P('k0 2/4 | Cx4/4 Cn4/4 |'), [62, 60]));
  test('EV-11', '붙임줄은 마디선을 지나 같은 소리를 이어요', () => same(P('k0 2/4 | r/4 G#4/4~ | G4/4 r/4 |'), [68, 68]) && same(ON('k0 2/4 | r/4 G#4/4~ | G4/4 r/4 |'), [true, false]));
  test('EV-12', 'T1 붙임줄 뒤 새 음은 자연음으로 계산해요', () => same(P('k0 4/4 | r/2. F#4/4~ | F4/4 F4/4 r/2 |'), [66, 66, 65]) && same(ON('k0 4/4 | r/2. F#4/4~ | F4/4 F4/4 r/2 |'), [true, false, true]));
  test('EV-13', 'T2 조표와 내추럴 붙임줄은 서로 다른 상태예요', () => same(P('k1 4/4 | r/2. Fn4/4~ | F4/4 F4/4 r/2 |'), [65, 65, 66]));
  test('EV-14', 'T3 붙임줄 뒤 새 내추럴을 붙일 수 있어요', () => same(P('k1 4/4 | r/2. Fn4/4~ | F4/4 Fn4/4 r/2 |'), [65, 65, 65]));
  test('EV-15', 'T4 이음줄은 표를 다음 마디로 옮기지 않아요', () => same(P('k0 2/4 | (G#4/4 A4/4 | G4/4) r/4 |'), [68, 69, 67]));
  test('EV-16', 'T5 같은 음이름의 다른 옥타브는 다른 자리예요', () => same(P('k0 2/4 | G#4/4 G5/4 |'), [68, 79]));
  test('EV-17', 'T6 조표는 모든 옥타브에 걸려요', () => same(P('k3 2/4 | G4/4 G5/4 |'), [68, 80]));
  test('EV-18', 'T7 붙임줄 사슬은 네 박짜리 한 소리예요', () => { const seed = 'k0 2/4 | r/4 C#4/4~ | C4/2~ | C4/4 C4/4 |', list = sounds(parseScore(seed)); return same(P(seed), [61, 61, 61, 60]) && list.length === 2 && beats(list[0].len, 4) === 4 && list[0].notes.length === 3; });
  test('EV-19', 'T8 붙임줄로 이어받는 음의 새 표는 충돌이에요', () => check(parseScore('k0 2/4 | F#4/4~ Fn4/4 |')).includes('TIE_SIGN:0'));
  test('EV-20', 'T9 새 샵은 이후의 마디 기억을 갱신해요', () => { const seed = 'k0 4/4 | r/2. F#4/4~ | F4/4 F#4/4 F4/4 r/4 |'; return same(P(seed), [66, 66, 66, 66]) && same(evaluate(parseScore(seed)).filter(r => !r.rest).map(r => r.src), ['sign', 'tie', 'sign', 'mem']); });
  test('EV-21', 'T10 같은 음이 낀 이음줄도 각각 새로 내요', () => { const sc = parseScore('k0 4/4 | (E4/4 E4/4 G4/4) r/4 |'); return sounds(sc).length === 3 && check(sc).length === 0 && check(parseScore('k0 2/4 | (E4/4 E4/4) |')).includes('SLUR_READS_AS_TIE:0'); });
  const maxLength = options.exhaustive ? 3 : 2;
  test('EV-22', `독립된 느린 계산과 길이 ${maxLength}까지의 모든 악보를 비교해요`, () => {
    const accs = [null, 1, -1, 0, 2, -2], slots = [[4, 4], [4, 5], [5, 4]];
    let seen = 0;
    for (const key of [0, 3, -3]) for (let len = 1; len <= maxLength; len++) {
      for (let code = 0; code < 18 ** len; code++) for (let bars = 0; bars < 2 ** (len - 1); bars++) {
        const notes = []; let c = code, bar = 0;
        for (let i = 0; i < len; i++) { const slot = slots[c % 3]; c = Math.floor(c / 3); const acc = accs[c % 6]; c = Math.floor(c / 6); if (i && ((bars >> (i - 1)) & 1)) bar++; notes.push({ rest: false, L: slot[0], o: slot[1], acc, bar, tie: false, curve: false }); }
        const sc = { key, notes, slurs: [], bars: bar + 1 };
        const oracle = notes.map((n, i) => { let a = n.acc; for (let j = i - 1; a === null && j >= 0 && notes[j].bar === n.bar; j--) if (sameSlot(notes[j], n) && notes[j].acc !== null) a = notes[j].acc; return midiOf(n.L, n.o, a === null ? keyAlter(key, n.L) : a); });
        if (!same(pitches(sc), oracle)) return false; seen++;
      }
    }
    return seen === (maxLength === 3 ? 71982 : 1998);
  });
  test('EV-23', '뒤 음의 표를 바꿔도 앞 음의 높이는 그대로예요', () => { const sc = parseScore('k1 4/4 | F4/4 Fn4/4 F5/4 F4/4 | F4/4 F#4/4 F4/4 r/4 |'), before = pitches(sc); return sc.notes.every((n, i) => n.rest || CARDS.every(acc => pitches(withAcc(sc, i, acc)).slice(0, i).every((p, j) => p === before[j]))); });
  test('EV-24', '새 표는 앞의 표와 관계없이 자연음에서 계산해요', () => CARDS.every(a => [1, -1, 0, 2, -2].every(b => pitches({ key: 3, bars: 1, slurs: [], notes: [{ rest: false, L: 4, o: 4, acc: a, bar: 0 }, { rest: false, L: 4, o: 4, acc: b, bar: 0 }] })[1] === midiOf(4, 4, b))));

  test('MD-01', '오개념 열아홉 개 모두 표준과 다른 결과를 내요', () => { const probes = ['k0 4/4 | E#4/1 |', 'k0 2/4 | C#4/4 Cx4/4 |', 'k0 2/4 | Cx4/4 Cn4/4 |', 'k0 2/4 | Db4/4 Dn4/4 |', 'k1 4/4 | Fn4/4 G4/4 F4/4 F5/4 |', 'k0 2/4 | G#4/4 G5/4 |', 'k0 2/4 | G#4/4 A4/4 | G4/4 r/4 |', 'k0 4/4 | F4/4 G4/4 F#4/4 F4/4 |', 'k3 2/4 | G5/4 G4/4 |', 'k0 4/4 | r/2. F#4/4~ | F4/4 F4/4 r/2 |', 'k0 2/4 | (G#4/4 A4/4 | G4/4) r/4 |', 'k0 4/4 | Cx4/1 |']; return Object.keys(MODELS).length === 19 && Object.values(MODELS).every(m => probes.some(seed => !same(P(seed), P(seed, m)))); });
  test('MD-02', '겨눈 오답의 원인을 우선 진단하고 정답은 원인이 없어요', () => sols.every(sol => { const answer = sol.ms.ask === 'fix' ? sol.answer[0] : sol.answer; if (diagnose(sol, answer) !== null) return false; if (!sol.ms.aim || !(sol.ms.aim in sol.traps)) return true; const expected = sol.ms.ask === 'why' ? 'WHY' : sol.ms.ask === 'sign' && sol.answer === null ? 'REDUNDANT' : sol.ms.aim; return diagnose(sol, sol.traps[sol.ms.aim]) === expected; }));
  test('MD-03', '모든 오개념에 의뢰와 규칙 카드가 있어요', () => { const aimed = new Set(sols.filter(s => s.ms.aim in s.traps).map(s => s.ms.aim)); return Object.keys(MODELS).every(code => aimed.has(code)) && same(RULE_CARDS.flatMap(c => c.aims).sort(), Object.keys(MODELS).sort()); });

  test('GN-01', '의뢰 66건과 발견 장면 악보가 출제 검사를 통과해요', () => sols.length === 66 && sols.every(sol => !check(sol.sc).length && !check(sol.view).length) && Object.values(SCENES).every(scene => scene.rows.every(seed => !check(parseScore(seed)).length)));
  test('GN-02', '의뢰의 답은 하나이고 수리 방법도 하나예요', () => sols.every(sol => sol.t >= 0 && (sol.ms.ask === 'fix' ? sol.answer.length === 1 && sol.answer[0].i === sol.ms.bad.i && sol.answer[0].acc === sol.sc.notes[sol.ms.bad.i].acc : sol.answer !== undefined)));
  test('GN-03', '겨누는 오개념은 정답과 다른 답을 내요', () => sols.every(sol => !sol.ms.aim || ['fix', 'link', 'name'].includes(sol.ms.ask) || sol.ms.aim in sol.traps));
  test('GN-04', '완성 악보에는 없어도 되는 표가 없어요', () => sols.every(sol => ['name', 'notch'].includes(sol.ms.ask) || redundant(sol.ms.ask === 'sign' ? withAcc(sol.sc, sol.t, sol.answer) : sol.sc).length === 0));
  test('GN-05', '건반 창은 흰 건반 일곱 개 이하이고 필요한 음을 모두 담아요', () => sols.every(sol => { const window = keyWindow(sol), need = pitches(sol.sc).concat(pitches(sol.view)).filter(n => n !== null); if (sol.ms.ask === 'key') need.push(...Object.values(sol.traps)); return window.whites <= 7 && window.panes.every(p => isWhite(p.lo) && isWhite(p.hi)) && need.every(n => window.panes.some(p => n >= p.lo && n <= p.hi)); }));
  test('GN-06', '302px 악보에서 음표 한 칸은 26px 이상이에요', () => sols.every(sol => unitPx(sol.view, 302) >= 26));
  test('GN-07', '작업일별 의뢰 수는 8·8·8·8·8·8·10·8이에요', () => same(DAYS.map(day => day.list.length), [8, 8, 8, 8, 8, 8, 10, 8]));
  test('GN-08', '작업일마다 마감 의뢰가 하나이고 마지막이에요', () => DAYS.every(day => day.list.filter(ms => ms.final).length === 1 && day.list[day.list.length - 1].final));
  test('GN-09', '발견 장면 일곱 개는 한 번씩 배치되어 있어요', () => Object.keys(SCENES).length === 7 && DAYS.flatMap(day => [day.scene, ...day.list.map(ms => ms.after)]).filter(Boolean).sort().join('') === 'S1S2S3S4S5S6S7');
  test('GN-10', '모든 의뢰의 겨냥 코드가 실제 모델에 있어요', () => missions.every(ms => !ms.aim || ms.aim in MODELS));
  test('GN-11', '모든 보기와 카드 목록에 정답이 들어 있어요', () => sols.every(sol => { const opts = choices(sol); return (!opts.length || opts.some(c => c.v === sol.answer)) && (sol.ms.ask !== 'sign' || CARDS.slice(sol.ms.cards === 5 ? 1 : 0).includes(sol.answer)); }));

  test('CT-01', '가능한 모든 오답에 원인과 유효한 안내문이 나와요', () => feedback.length > 0 && feedback.every(f => typeof f.cause === 'string' && typeof f.text === 'string' && f.text.length > 4 && !/undefined|NaN|null/.test(f.text)));
  test('CT-02', '의뢰·풀이·정답 안내문에 누락된 계산값이 없어요', () => sols.every(sol => [orderText(sol), explain(sol), giveText(sol)].every(text => typeof text === 'string' && text.length > 4 && !/undefined|NaN|null/.test(text))));
  test('CT-03', '학습 문장에 금지한 오해 표현이 없어요', () => allTexts.concat(Object.values(SCENES).map(s => s.text)).every(text => !['원래 음', '두 번 올', '두 번 내', '같은 음이면', '병행조'].some(word => text.includes(word))));
  test('CT-04', '정답률 네 갈래의 의뢰 수는 7·17·31·11이에요', () => { const counts = { sym: 0, semi: 0, reach: 0, notate: 0 }; DAYS.forEach((day, i) => day.list.forEach(ms => counts[categoryOf(ms, i)]++)); return same(counts, { sym: 7, semi: 17, reach: 31, notate: 11 }); });

  const emptySave = () => ({ days: {}, review: [] });
  const resultsFor = (dayIndex, count, hand = '기계') => DAYS[dayIndex].list.map((ms, i) => ({ id: ms.id, mark: i < count ? 'full' : 'half', hand }));
  test('ST-01', '새 작업일은 정해진 순서와 빈 결과로 시작해요', () => DAYS.every((day, i) => { const s = Session.create(i, emptySave()); return s.day === day.id && s.index === 0 && !s.results.length && same(s.queue, day.list.map(ms => ms.id)); }));
  test('ST-02', '이전 작업일 복습은 앞에서 두 건까지만 끼워요', () => { const save = { days: {}, review: ['d1-01', 'd0-01', 'd0-02', 'd2-01'] }; return same(Session.create(1, save).queue.slice(0, 3), ['d0-01', 'd0-02', 'd1-01']); });
  test('ST-03', '작업일 생성은 저장 데이터와 원본 씨앗을 바꾸지 않아요', () => { const save = { days: {}, review: ['d0-01'] }, before = JSON.stringify([save, DAYS]); Session.create(1, save); return JSON.stringify([save, DAYS]) === before; });
  test('ST-04', '복습과 다시 나온 의뢰는 통과용 의뢰와 구분해요', () => { const s = Session.create(1, { days: {}, review: ['d0-01'] }); s.queue.push('d1-01'); return Session.isExtra(s, 'd0-01', 0) && !Session.isExtra(s, 'd1-01', 1) && Session.isExtra(s, 'd1-01', s.queue.length - 1); });
  test('ST-05', '다시 내기는 세 의뢰 뒤에 넣고 원래 줄은 보존해요', () => { const s = Session.create(0, emptySave()), before = JSON.stringify(s.queue), q = Session.repeat(s, DAYS[0].list[0]); return q[4] === 'd0-01' && q.length === 9 && JSON.stringify(s.queue) === before; });
  test('ST-06', '남은 의뢰가 적으면 마감 의뢰 바로 앞에 다시 내요', () => { const s = Session.create(0, emptySave()); s.index = 6; const q = Session.repeat(s, DAYS[0].list[6]); return q[q.length - 2] === 'd0-07' && q[q.length - 1] === 'd0-08'; });
  test('ST-07', '마감 의뢰는 다시 내지 않아요', () => { const s = Session.create(0, emptySave()); s.index = 7; return same(Session.repeat(s, DAYS[0].list[7]), s.queue); });
  test('ST-08', '복습과 다시 내기는 재귀적으로 반복하지 않아요', () => { const s = Session.create(1, { days: {}, review: ['d0-01'] }); if (!same(Session.repeat(s, DAYS[0].list[0]), s.queue)) return false; s.index = 3; s.queue = Session.repeat(s, DAYS[1].list[2]); s.index = s.queue.lastIndexOf('d1-03'); return same(Session.repeat(s, DAYS[1].list[2]), s.queue); });
  test('ST-09', '여덟 의뢰는 첫 정답 일곱 개부터 통과해요', () => { const s = Session.create(0, emptySave()); s.results = resultsFor(0, 6); if (Session.summary(s).passed || Session.summary(s).needed !== 7) return false; s.results = resultsFor(0, 7); return Session.summary(s).passed && Session.summary(s).full === 7; });
  test('ST-10', '열 의뢰는 첫 정답 여덟 개부터 통과해요', () => { const s = Session.create(6, emptySave()); s.results = resultsFor(6, 7); if (Session.summary(s).passed || Session.summary(s).needed !== 8) return false; s.results = resultsFor(6, 8); return Session.summary(s).passed && Session.summary(s).total === 10; });
  test('ST-11', '복습과 다시 내기의 정답은 통과 계산에서 빼요', () => { const s = Session.create(0, emptySave()); s.results = resultsFor(0, 6).concat([{ id: 'd0-01', mark: 'full', hand: '매끈', again: true }, { id: 'd1-01', mark: 'full', hand: '매끈', again: true }]); const sum = Session.summary(s); return sum.full === 6 && !sum.passed; });
  test('ST-12', '다음 작업일은 바로 앞 작업일을 통과하면 열려요', () => Session.unlock(emptySave(), 0) && !Session.unlock(emptySave(), 1) && Session.unlock({ days: { d0: { passed: true } } }, 1) && !Session.unlock({ days: { d0: { passed: true } } }, 2));
  test('ST-13', '연주 기록은 통과와 별개이고 매끈 도장은 따로 계산해요', () => { const s = Session.create(2, emptySave()); s.results = resultsFor(2, 8, '기계'); const a = Session.summary(s); s.results = resultsFor(2, 8, '매끈'); const b = Session.summary(s); return a.passed && b.passed && a.full === b.full && !a.smooth && b.smooth; });

  const report = { passed: results.filter(r => r.passed).length, total: results.length, results };
  if (typeof window !== 'undefined') window.__tests = report;
  return report;
}

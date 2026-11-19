// Pure browser smoke checks plus exhaustive Session progression combinations.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const sourceFiles = ['01-theory.js', '02-model.js', '03-content.js', '04-state.js', '13-tests.js'];
const fakeDocument = new Proxy({}, { get() { throw new Error('Pure tests must not touch the DOM'); } });
const window = {};
const context = vm.createContext({ console, window, document: fakeDocument });
vm.runInContext(sourceFiles.map(file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')).join('\n') + '\nglobalThis.TestAPI = { DAYS, Session, solve, hasPlay, runSelfTests };', context);
const { DAYS, Session, runSelfTests } = context.TestAPI;
const started = performance.now();
const result = runSelfTests({ exhaustive: true });
console.log(`Browser pure checks: ${result.passed}/${result.total} (${Math.round(performance.now() - started)}ms; 71,982-score oracle enabled)`);
for (const item of result.results.filter(item => !item.passed)) console.error(`${item.id}: ${item.name}: ${item.error}`);
assert.equal(result.passed, result.total, 'Named browser checks failed');
assert.equal(window.__tests, result, 'Browser self-check result must be exposed');

let combinations = 0;
DAYS.forEach((day, dayIndex) => {
  const emptySave = { days: {}, review: [] };
  for (let mask = 0; mask < 2 ** day.list.length; mask++) {
    const session = Session.create(dayIndex, emptySave);
    session.results = day.list.map((mission, i) => ({ id: mission.id, mark: (mask >> i) & 1 ? 'full' : 'half', hand: '기계' }));
    const expected = session.results.filter(r => r.mark === 'full').length;
    const summary = Session.summary(session);
    assert.equal(summary.full, expected, `${day.id} full count at mask ${mask}`);
    assert.equal(summary.passed, expected >= Math.ceil(day.list.length * .8), `${day.id} 80% gate at mask ${mask}`);
    session.results.push({ id: day.list[0].id, mark: 'full', hand: '매끈', again: true });
    assert.equal(Session.summary(session).full, expected, 'Repeat must not increase the progress count');
    combinations++;
  }
  for (let i = 0; i < day.list.length; i++) {
    const session = Session.create(dayIndex, emptySave);
    session.index = i;
    const queueBefore = Array.from(session.queue);
    const queue = Session.repeat(session, day.list[i]);
    assert.deepEqual(Array.from(session.queue), queueBefore, 'Repeat must not mutate the current session');
    assert.equal(queue[queue.length - 1], day.list[day.list.length - 1].id, 'Final mission must remain last');
    assert.equal(queue.length, day.list.length + (day.list[i].final ? 0 : 1));
  }
});
console.log(`Session progression: ${combinations} outcome combinations and all 66 repeat positions passed`);

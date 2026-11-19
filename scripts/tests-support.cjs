const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const audioSource = fs.readFileSync(path.join(root, 'src/08-audio.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(root, 'src/10-storage.js'), 'utf8');
let passed = 0;
function test(name, action) {
  action(); passed++; console.log('PASS ' + name);
}
function storage(initial = null, blocked = false) {
  const map = new Map(); if (initial !== null) map.set('amw_save_v1', initial);
  const localStorage = {
    getItem(k) { if (blocked) throw new Error('blocked'); return map.get(k) ?? null; },
    setItem(k, v) { if (blocked) throw new Error('quota'); map.set(k, v); },
    removeItem(k) { if (blocked) throw new Error('blocked'); map.delete(k); }
  };
  const ctx = vm.createContext({ localStorage });
  vm.runInContext(storageSource + '\nthis.Store = Store;', ctx);
  return { Store: ctx.Store, map };
}
test('SV-01 fresh progress has independent category counters', () => {
  const { Store } = storage(); const a = Store.defaults(), b = Store.defaults();
  a.stats.cat.sym[0] = 9; assert.equal(b.stats.cat.sym[0], 0); assert.equal(a.version, 1);
});
test('SV-02 successful save/load preserves anonymous progress', () => {
  const { Store } = storage(); const data = Store.defaults();
  data.days.d0 = { passed: true, stamp: 2, runs: 1, best: 8 };
  data.stats.cat.sym = [8, 8]; data.review = ['d0-01'];
  assert.equal(Store.save(data), true); const restored = Store.load();
  assert.equal(restored.days.d0.stamp, 2); assert.equal(restored.stats.cat.sym[1], 8); assert.equal(restored.review[0], 'd0-01');
});
test('SV-03 missing optional version-1 fields merge defaults', () => {
  const { Store } = storage('{"version":1,"settings":{"muted":true}}'); const data = Store.load();
  assert.equal(data.settings.muted, true); assert.equal(data.settings.volume, 0.8); assert.equal(data.stats.orders, 0);
});
test('SV-04 malformed JSON is backed up exactly', () => {
  const raw = '{broken'; const { Store, map } = storage(raw); const restored = Store.load();
  assert.equal(map.get('amw_save_v1_backup'), raw); assert.equal(Store.recovered, true); assert.equal(restored.version, 1);
});
test('SV-05 future version backed up without migration', () => {
  const raw = '{"version":2,"days":{"d7":{"passed":true}}}'; const { Store, map } = storage(raw);
  const data = Store.load(); assert.equal(map.get('amw_save_v1_backup'), raw); assert.equal(Object.keys(data.days).length, 0);
});
test('SV-06 corrupt field triggers safe backup', () => {
  const raw = '{"version":1,"settings":{"volume":"loud"}}'; const { Store, map } = storage(raw);
  assert.equal(Store.load().settings.volume, 0.8); assert.equal(map.get('amw_save_v1_backup'), raw);
});
test('SV-07 blocked localStorage retains in-memory progress', () => {
  const { Store } = storage(null, true); Store.load(); assert.equal(Store.available, false);
  const data = Store.defaults(); data.stats.orders = 4; assert.equal(Store.save(data), false); assert.equal(Store.load().stats.orders, 4);
});
test('SV-08 loaded copies cannot mutate stored memory', () => {
  const { Store } = storage(null, true); const data = Store.defaults(); Store.save(data);
  const a = Store.load(); a.settings.volume = 0; assert.equal(Store.load().settings.volume, 0.8);
});
test('SV-09 reset removes progress and corrupt backup', () => {
  const { Store, map } = storage('bad'); Store.load(); Store.reset(); assert.equal(map.size, 0); assert.equal(Store.recovered, false);
});
test('SV-10 review is deduplicated and capped to two', () => {
  const { Store } = storage('{"version":1,"review":["a","a","b","c"]}'); assert.equal(Store.load().review.join(','), 'a,b');
});
function audio(withAudio = true, behavior = {}) {
  const log = [], frames = new Map(); let frameId = 0, now = 0;
  class Param {
    constructor() { this.values = []; this.value = 0; }
    setValueAtTime(v, t) { this.values.push({ type: 'set', v, t }); this.value = v; return this; }
    linearRampToValueAtTime(v, t) { this.values.push({ type: 'ramp', v, t }); return this; }
    cancelScheduledValues(t) { this.values.push({ type: 'cancel', t }); }
  }
  class FakeContext {
    constructor() { this.currentTime = 10; this.state = behavior.suspended ? 'suspended' : 'running'; this.baseLatency = 0; this.destination = {}; this.sampleRate = 44100; }
    createGain() { return { gain: new Param(), connect() {}, disconnect() {} }; }
    createOscillator() {
      const node = { frequency: new Param(), type: '', starts: [], stops: [], connect(target) { this.destination = target; }, disconnect() {}, start(t) { this.starts.push(t); }, stop(t) { this.stops.push(t); } };
      log.push(node); return node;
    }
    addEventListener() {}
    resume() { if (behavior.neverResume) return new Promise(() => {}); if (behavior.rejectResume) return Promise.reject(new Error('transient resume rejection')); this.state = 'running'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  const ctx = vm.createContext({ AudioContext: withAudio ? FakeContext : undefined, performance: { now: () => now }, requestAnimationFrame: cb => { frames.set(++frameId, cb); return frameId; }, cancelAnimationFrame: id => frames.delete(id), sounds: sc => sc.sounds });
  vm.runInContext(audioSource + '\nthis.AudioEngine = AudioEngine;', ctx);
  const engine = new ctx.AudioEngine();
  function frame(ms, audioTime) { now = ms; if (engine.ctx && audioTime !== undefined) engine.ctx.currentTime = audioTime; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(ms)); }
  return { engine, log, frame, frames };
}
const fraction = (n, d = 1) => ({ n, d });
const tiedPlan = () => ({ md: 4, sounds: [
  { midi: 66, at: fraction(3, 4), len: fraction(1, 2), notes: [1, 2], legato: false },
  { midi: 65, at: fraction(5, 4), len: fraction(1, 4), notes: [3], legato: false }
] });
test('AU-01 direct piano uses exact equal temperament and triangle wave', () => {
  const { engine, log } = audio(); const voice = engine.press(69);
  assert.equal(log.length, 1); assert.equal(log[0].type, 'triangle'); assert.equal(log[0].frequency.values[0].v, 440); assert.equal(voice.midi, 69);
});
test('AU-02 direct key minimum duration is 0.12 seconds', () => {
  const { engine, log } = audio(); const voice = engine.press(60); engine.release(voice);
  assert.ok(Math.abs(voice.end - 10.12) < 1e-9); assert.ok(Math.abs(log[0].stops[0] - 10.205) < 1e-9);
});
test('AU-03 score reserves every oscillator immediately from shared t0', () => {
  const { engine, log } = audio(); const run = engine.schedule(tiedPlan());
  assert.equal(log.length, 2); assert.equal(log[0].starts[0], 10.12);
  assert.ok(Math.abs(log[1].starts[0] - (10.12 + 2 * 60 / 72)) < 1e-9);
  assert.ok(Math.abs(run.events[0].end - (2 * 60 / 72 - 0.08)) < 1e-9);
});
test('AU-04 tied note sequence produces one oscillator for tied sound', () => {
  const { engine, log } = audio(); const run = engine.schedule(tiedPlan());
  assert.equal(log.length, 2); assert.equal(run.events[0].notes.join(','), '1,2');
});
test('AU-05 stop cancels future oscillators as a group', () => {
  const { engine, log, frames } = audio(); engine.schedule(tiedPlan()); engine.stop();
  assert.ok(log.every(node => node.stops.some(t => t === undefined))); assert.equal(frames.size, 0); assert.equal(engine.running, false);
});
test('AU-06 a new key cancels a scheduled score', () => {
  const { engine, log } = audio(); engine.schedule(tiedPlan()); engine.press(67);
  assert.equal(engine.running, false); assert.ok(log[0].stops.includes(undefined)); assert.equal(log.length, 3);
});
test('AU-07 slow playback uses quarter note 54', () => {
  const { engine } = audio(); const run = engine.schedule(tiedPlan(), { slow: true });
  assert.ok(Math.abs(run.events[1].start - 2 * 60 / 54) < 1e-9);
});
test('AU-08 legato sound has no pre-next-note gap', () => {
  const { engine } = audio(); const plan = tiedPlan(); plan.sounds[0].legato = true; const run = engine.schedule(plan);
  assert.ok(Math.abs(run.events[0].end - run.events[1].start) < 1e-9);
});
test('AU-09 visual-only playback completes without AudioContext', () => {
  const { engine, frame } = audio(false); let done = false, step = -1;
  engine.schedule(tiedPlan(), { onStep: i => { step = i; }, onDone: () => { done = true; } });
  frame(200); assert.equal(step, 0); frame(4000); assert.equal(done, true); assert.equal(engine.running, false);
});
test('AU-10 audio interruption notifies once and cancels playback', () => {
  const { engine, log } = audio(); let called = 0;
  engine.schedule(tiedPlan(), { onInterrupt: () => called++ }); engine.interrupt('paused'); engine.interrupt('again');
  assert.equal(called, 1); assert.ok(log[0].stops.includes(undefined));
});
test('AU-11 mute and volume affect master gain', () => {
  const { engine } = audio(); engine.press(60); engine.volume = 0.4; assert.equal(engine.master.gain.value, 0.4);
  engine.muted = true; assert.equal(engine.master.gain.value, 0); engine.muted = false; assert.equal(engine.master.gain.value, 0.4);
});
test('AU-12 explicit sound array supports meter override', () => {
  const { engine } = audio(); const plan = tiedPlan(); const run = engine.schedule(plan.sounds, { md: 8 });
  assert.ok(Math.abs(run.events[1].start - 4 * 60 / 72) < 1e-9);
});
test('AU-13 null sentinel clears active note during rests', () => {
  const { engine, frame } = audio(false); const calls = [];
  engine.schedule(tiedPlan(), { onStep: (i, event, progress) => calls.push({i, event, progress}) });
  frame(0); assert.equal(calls[0].i, -1); assert.equal(calls[0].event, null); assert.equal(calls[0].progress, 0);
  frame(200); assert.equal(calls.at(-1).i, 0); assert.equal(calls.at(-1).event.midi, 66);
  frame(1730); assert.equal(calls.at(-1).i, -1); assert.equal(calls.at(-1).event, null);
});
test('AU-14 leading rests are omitted while internal rests remain', () => {
  const { engine } = audio(); const plan = tiedPlan(); plan.sounds[1].at = fraction(7, 4);
  const run = engine.schedule(plan); assert.equal(run.events[0].start, 0);
  assert.ok(Math.abs(run.events[1].start - 4 * 60 / 72) < 1e-9);
});
test('AU-15 scheduled release fits inside note length and retains gap', () => {
  const { engine, log } = audio(); const run = engine.schedule(tiedPlan());
  const firstEnd = run.startAt + run.events[0].end;
  assert.ok(Math.abs(log[0].stops[0] - firstEnd) < 1e-9);
  const envelope = log[0].destination.gain.values;
  assert.ok(envelope.some(v => v.type === 'ramp' && v.v === 0.3 && Math.abs(v.t - (run.startAt + 0.01)) < 1e-9));
  assert.ok(envelope.some(v => v.type === 'set' && v.v === 0.3 && Math.abs(v.t - (firstEnd - 0.08)) < 1e-9));
  assert.ok(envelope.some(v => v.type === 'ramp' && v.v === 0 && Math.abs(v.t - firstEnd) < 1e-9));
  assert.ok(Math.abs(log[1].starts[0] - log[0].stops[0] - 0.08) < 1e-9);
});
test('AU-16 frozen initial audio clock falls back to visual playback', () => {
  const { engine, frame, log } = audio(); let step = -1, completed = false;
  engine.schedule(tiedPlan(), { onStep: i => { step = i; }, onDone: () => { completed = true; } });
  frame(1300, 10); assert.equal(engine.status, 'silent'); assert.equal(step, 0);
  assert.ok(log.every(node => node.stops.includes(undefined))); frame(4000, 10); assert.equal(completed, true);
});
async function testAsync(name, action) {
  await action(); passed++; console.log('PASS ' + name);
}
(async () => {
  await testAsync('AU-17 pending iframe resume resolves visual fallback at 1.2s and retries', async () => {
    const behavior = { suspended: true, neverResume: true };
    const { engine, frame, frames } = audio(true, behavior);
    let completed = false;
    const pending = engine.unlock().then(ready => { completed = true; return ready; });
    assert.equal(frames.size, 1);
    frame(1199); await Promise.resolve(); assert.equal(completed, false);
    frame(1200); assert.equal(await pending, false);
    assert.equal(engine.status, 'silent'); assert.equal(engine._unavailable, false);
    assert.equal(engine._unlocking, null); assert.equal(engine._finishResume, null); assert.equal(frames.size, 0);
    behavior.neverResume = false;
    assert.equal(await engine.unlock(), true); assert.equal(engine.status, 'running'); assert.equal(frames.size, 0);
  });
  await testAsync('AU-18 transient resume rejection is retryable and clears deadline frame', async () => {
    const behavior = { suspended: true, rejectResume: true };
    const { engine, frames } = audio(true, behavior);
    assert.equal(await engine.unlock(), false); assert.equal(engine._unavailable, false); assert.equal(frames.size, 0);
    behavior.rejectResume = false;
    assert.equal(await engine.unlock(), true); assert.equal(engine.status, 'running'); assert.equal(frames.size, 0);
  });
  console.log(`Support checks: ${passed}/${passed} passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });

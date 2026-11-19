// 8 AUDIO — one piano voice; complete scores scheduled on the audio clock.
class AudioEngine {
  constructor(options = {}) {
    this.options = options;
    this.ctx = null;
    this.master = null;
    this.voices = new Set();
    this.run = null;
    this._volume = 0.8;
    this._muted = false;
    this._unavailable = false;
    this._clockFailed = false;
    this._unlocking = null;
    this._finishResume = null;
    this._raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame.bind(globalThis) : null;
    this._caf = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame.bind(globalThis) : null;
    this._gesture = () => { if (!this.ctx || this.ctx.state !== 'running') this.unlock(); };
    if (typeof window !== 'undefined') {
      ['click', 'touchstart', 'keydown'].forEach(type => window.addEventListener(type, this._gesture, { passive: true }));
      this._hide = () => { if (document.hidden) { if (this._finishResume) this._finishResume(false); this.interrupt('화면이 가려져 소리를 멈췄어요. 다시 시작해요.'); } };
      document.addEventListener('visibilitychange', this._hide);
    }
  }
  get available() { return !this._unavailable && !!this.ctx; }
  get status() { return this._unavailable || this._clockFailed || !this.ctx ? 'silent' : this.ctx.state; }
  get running() { return !!this.run; }
  get volume() { return this._volume; }
  set volume(v) { this._volume = Math.min(1, Math.max(0, Number(v) || 0)); this._syncGain(); }
  get muted() { return this._muted; }
  set muted(v) { this._muted = !!v; this._syncGain(); }
  _syncGain() {
    if (this.master && this.ctx) this.master.gain.setValueAtTime(this._muted ? 0 : this._volume, this.ctx.currentTime);
  }
  _notify() { if (this.options.onStateChange) this.options.onStateChange(this.status); }
  // A suspended iframe can leave resume() pending indefinitely. Bound the
  // attempt with the same visual clock as playback, keeping retries possible.
  _resumeWithDeadline() {
    return new Promise(resolve => {
      const started = performance.now();
      let settled = false, frame = null;
      const finish = ready => {
        if (settled) return;
        settled = true;
        if (frame !== null && this._caf) this._caf(frame);
        if (this._finishResume === finish) this._finishResume = null;
        resolve(ready);
      };
      this._finishResume = finish;
      let pending;
      try { pending = this.ctx.resume(); }
      catch (error) { finish(false); return; }
      Promise.resolve(pending).then(() => finish(this.ctx.state === 'running'), () => finish(false));
      if (this.ctx.state === 'running') { finish(true); return; }
      if (!this._raf) { finish(false); return; }
      const check = now => {
        if (settled) return;
        if (this.ctx.state === 'running') { finish(true); return; }
        if (now - started >= 1200) { finish(false); return; }
        frame = this._raf(check);
      };
      frame = this._raf(check);
    });
  }
  async unlock() {
    if (this._unavailable) return false;
    if (this._unlocking) return this._unlocking;
    this._unlocking = (async () => {
      try {
        if (!this.ctx) {
          const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
          if (!AC) { this._unavailable = true; this._notify(); return false; }
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.connect(this.ctx.destination);
          this._syncGain();
          this.ctx.addEventListener('statechange', () => {
            if (this.ctx.state === 'running') {
              this._clockFailed = false;
              if (this._finishResume) this._finishResume(true);
            } else if (this.run || this.voices.size) this.interrupt('소리가 멈췄어요. 소리 켜기를 눌러요.');
            this._notify();
          });
        }
      } catch (error) {
        this._unavailable = true;
        this._notify();
        return false;
      }
      const ready = this.ctx.state === 'running' || await this._resumeWithDeadline();
      this._clockFailed = !ready;
      this._notify();
      return ready;
    })();
    try { return await this._unlocking; } finally { this._unlocking = null; }
  }
  _voice(midi, start, end = null) {
    const voice = { midi, start, oscillator: null, gain: null, released: false, canceled: false };
    if (!this.ctx || this.ctx.state !== 'running') return voice;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.01);
    osc.connect(gain); gain.connect(this.master);
    osc.start(start);
    voice.oscillator = osc; voice.gain = gain;
    this.voices.add(voice);
    osc.onended = () => { this.voices.delete(voice); osc.disconnect(); gain.disconnect(); };
    if (end !== null) {
      const at = Math.max(start + 0.01, end);
      // Scheduled duration includes the release; preserve the designed rest gap.
      const releaseStart = Math.max(start + 0.01, at - 0.08);
      gain.gain.setValueAtTime(0.3, releaseStart);
      gain.gain.linearRampToValueAtTime(0, at);
      osc.stop(at);
      voice.end = at;
    }
    return voice;
  }
  press(midi) {
    this.stop();
    this.unlock();
    return this._voice(midi, this.ctx ? this.ctx.currentTime : 0);
  }
  release(voice) {
    if (!voice || voice.released || voice.canceled) return;
    voice.released = true;
    if (!voice.oscillator || !this.ctx) return;
    const end = Math.max(this.ctx.currentTime, voice.start + 0.12);
    voice.gain.gain.cancelScheduledValues(end);
    voice.gain.gain.setValueAtTime(0.3, end);
    voice.gain.gain.linearRampToValueAtTime(0, end + 0.08);
    voice.oscillator.stop(end + 0.085);
    voice.end = end;
  }
  playNote(midi, duration = 0.5) {
    this.stop();
    this.unlock();
    const now = this.ctx ? this.ctx.currentTime : 0;
    return this._voice(midi, now, now + Math.max(0.12, duration));
  }
  _cancelVoice(voice) {
    if (!voice || voice.canceled) return;
    voice.canceled = true;
    if (voice.oscillator) {
      try { voice.oscillator.stop(); } catch (error) { if (error.name !== 'InvalidStateError') throw error; }
    }
    this.voices.delete(voice);
  }
  stop() {
    if (this.run) {
      this.run.canceled = true;
      if (this.run.frame !== null && this._caf) this._caf(this.run.frame);
      this.run = null;
    }
    [...this.voices].forEach(voice => this._cancelVoice(voice));
  }
  interrupt(message) {
    const running = this.run;
    const hadSound = !!running || this.voices.size > 0;
    this.stop();
    if (hadSound) {
      if (running && running.options.onInterrupt) running.options.onInterrupt(message);
      if (this.options.onInterrupt) this.options.onInterrupt(message);
    }
  }
  // Public plan uses rational whole-note durations, exactly like sounds(sc).
  // onStep(index, event, progress) receives (-1, null, 0) during silence.
  // Consumers must clear their active decoration for this null sentinel.
  schedule(scoreOrPlan, options = {}) {
    this.stop();
    this.unlock();
    const fraction = f => typeof f === 'number' ? f : f.n / f.d;
    const list = Array.isArray(scoreOrPlan) ? scoreOrPlan : scoreOrPlan.sounds || sounds(scoreOrPlan);
    const md = options.md || scoreOrPlan.md || 4;
    const sec = 60 / (options.slow ? 54 : 72);
    const first = list.length ? fraction(list[0].at) : 0;
    const events = list.map((s, index) => {
      const start = (fraction(s.at) - first) * md * sec;
      const length = fraction(s.len) * md * sec;
      const gap = s.legato ? 0 : Math.min(0.08, length * 0.2);
      return { midi: s.midi, start, end: start + length - gap, length, notes: s.notes.slice(), legato: s.legato, index };
    });
    const audible = !!this.ctx && this.ctx.state === 'running';
    const clockStart = audible ? this.ctx.currentTime + 0.12 : 0;
    const visualStart = performance.now() + 120;
    const duration = events.length ? events[events.length - 1].end + 0.3 : 0.3;
    const run = { options, events, canceled: false, frame: null, audible, clockStart, visualStart, lastClock: this.ctx ? this.ctx.currentTime : 0, lastMove: performance.now(), startedAt: performance.now(), lastStep: -2 };
    this.run = run;
    if (audible) events.forEach(event => this._voice(event.midi, clockStart + event.start, clockStart + event.end));
    const tick = now => {
      if (run.canceled || this.run !== run) return;
      let elapsed;
      if (run.audible) {
        const current = this.ctx.currentTime;
        if (current > run.lastClock) { run.lastClock = current; run.lastMove = now; }
        else if (now - run.lastMove > 800 && current > clockStart) {
          this.interrupt('소리가 멈췄어요. 다시 듣기를 눌러요.'); return;
        } else if (now - run.startedAt > 1200 && current <= clockStart) {
          [...this.voices].forEach(voice => this._cancelVoice(voice));
          run.audible = false;
          this._clockFailed = true;
          this._notify();
        }
        elapsed = current - (this.ctx.outputLatency || this.ctx.baseLatency || 0) - clockStart;
      }
      if (!run.audible) elapsed = (now - visualStart) / 1000;
      let active = -1;
      for (let i = 0; i < events.length; i++) if (elapsed >= events[i].start && elapsed <= events[i].end) active = i;
      if (options.onStep && (active !== run.lastStep || active >= 0)) {
        run.lastStep = active;
        const event = events[active];
        options.onStep(active, event || null, event ? Math.max(0, Math.min(1, (elapsed - event.start) / event.length)) : 0);
      }
      if (elapsed >= duration) {
        this.run = null;
        run.frame = null;
        if (options.onDone) options.onDone();
        return;
      }
      if (this._raf) run.frame = this._raf(tick);
    };
    if (this._raf) run.frame = this._raf(tick);
    return { events, startAt: clockStart, endAt: clockStart + duration, cancel: () => { if (this.run === run) this.stop(); } };
  }
  // Feedback is filtered noise, never an additional musical pitch.
  effect(kind) {
    if (!this.ctx || this.ctx.state !== 'running' || this._muted) return;
    const recipes = kind === 'good' ? [[2400, 0.04, 0], [3200, 0.04, 0.11]] : kind === 'stamp' ? [[1200, 0.12, 0]] : [[700, 0.09, 0]];
    recipes.forEach(([frequency, length, delay]) => {
      const at = this.ctx.currentTime + delay;
      const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * length), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.12;
      const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
      source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.setValueAtTime(frequency, at); filter.Q.value = 1.2;
      gain.gain.setValueAtTime(1, at); gain.gain.linearRampToValueAtTime(0, at + length);
      source.connect(filter); filter.connect(gain); gain.connect(this.master);
      const voice = { oscillator: source, gain, canceled: false };
      this.voices.add(voice);
      source.onended = () => { this.voices.delete(voice); source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start(at); source.stop(at + length);
    });
  }
  destroy() {
    if (this._finishResume) this._finishResume(false);
    this.stop();
    if (typeof window !== 'undefined') {
      ['click', 'touchstart', 'keydown'].forEach(type => window.removeEventListener(type, this._gesture));
      document.removeEventListener('visibilitychange', this._hide);
    }
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close();
  }
}

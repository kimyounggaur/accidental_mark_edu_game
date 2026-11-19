// 10 STORAGE — anonymous local progress, schema 1, memory fallback.
const Store = (() => {
  const key = 'amw_save_v1', backupKey = 'amw_save_v1_backup';
  const clone = value => JSON.parse(JSON.stringify(value));
  const defaults = () => ({
    version: 1,
    settings: { volume: 0.8, muted: false, slow: false, names: 'loan', solfege: false, motion: 'system', tutorialSeen: false },
    days: {}, cards: { signs: [], rules: [] },
    stats: { cat: { sym: [0, 0], semi: [0, 0], reach: [0, 0], notate: [0, 0] }, causes: {}, ms: 0, orders: 0 },
    review: [], active: null
  });
  let memory = defaults(), available = true, recovered = false;
  const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const nonnegative = value => Number.isFinite(value) && value >= 0;
  const own = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
  // Reject corrupt known fields; missing version-1 fields receive defaults.
  function normalize(source) {
    if (!isObject(source) || source.version !== 1) throw new Error('Unsupported save version');
    const result = defaults();
    if (own(source, 'settings')) {
      if (!isObject(source.settings)) throw new Error('Invalid settings');
      for (const prop of ['muted', 'slow', 'solfege', 'tutorialSeen']) {
        if (own(source.settings, prop)) {
          if (typeof source.settings[prop] !== 'boolean') throw new Error('Invalid setting: ' + prop);
          result.settings[prop] = source.settings[prop];
        }
      }
      if (own(source.settings, 'volume')) {
        if (!Number.isFinite(source.settings.volume) || source.settings.volume < 0 || source.settings.volume > 1) throw new Error('Invalid volume');
        result.settings.volume = source.settings.volume;
      }
      for (const [prop, values] of [['names', ['loan', 'ko']], ['motion', ['system', 'reduced', 'full']]]) {
        if (own(source.settings, prop)) {
          if (!values.includes(source.settings[prop])) throw new Error('Invalid setting: ' + prop);
          result.settings[prop] = source.settings[prop];
        }
      }
    }
    if (own(source, 'days')) {
      if (!isObject(source.days)) throw new Error('Invalid days');
      for (const [day, record] of Object.entries(source.days)) {
        if (!/^d[0-7]$/.test(day) || !isObject(record)) continue;
        const merged = Object.assign({ passed: false, stamp: 0, runs: 0, best: 0 }, record);
        if (typeof merged.passed !== 'boolean' || ![0, 1, 2].includes(merged.stamp) || !nonnegative(merged.runs) || !nonnegative(merged.best)) throw new Error('Invalid day record');
        result.days[day] = { passed: merged.passed, stamp: merged.stamp, runs: Math.floor(merged.runs), best: Math.floor(merged.best) };
      }
    }
    if (own(source, 'cards')) {
      if (!isObject(source.cards)) throw new Error('Invalid cards');
      if (own(source.cards, 'signs') && (!Array.isArray(source.cards.signs) || source.cards.signs.some(n => ![-2, -1, 0, 1, 2].includes(n)))) throw new Error('Invalid sign cards');
      if (own(source.cards, 'rules') && (!Array.isArray(source.cards.rules) || source.cards.rules.some(n => !/^R[1-8]$/.test(n)))) throw new Error('Invalid rule cards');
      result.cards.signs = [...new Set(source.cards.signs || [])];
      result.cards.rules = [...new Set(source.cards.rules || [])];
    }
    if (own(source, 'stats')) {
      if (!isObject(source.stats)) throw new Error('Invalid stats');
      if (own(source.stats, 'cat')) {
        if (!isObject(source.stats.cat)) throw new Error('Invalid categories');
        for (const cat of Object.keys(result.stats.cat)) {
          if (!own(source.stats.cat, cat)) continue;
          const counts = source.stats.cat[cat];
          if (!Array.isArray(counts) || counts.length !== 2 || counts.some(n => !nonnegative(n)) || counts[0] > counts[1]) throw new Error('Invalid category counts');
          result.stats.cat[cat] = counts.map(Math.floor);
        }
      }
      if (own(source.stats, 'causes')) {
        if (!isObject(source.stats.causes)) throw new Error('Invalid causes');
        for (const [cause, count] of Object.entries(source.stats.causes)) {
          if (!/^[A-Z_]+$/.test(cause) || !nonnegative(count)) throw new Error('Invalid cause');
          result.stats.causes[cause] = Math.floor(count);
        }
      }
      for (const prop of ['ms', 'orders']) if (own(source.stats, prop)) {
        if (!nonnegative(source.stats[prop])) throw new Error('Invalid statistics');
        result.stats[prop] = source.stats[prop];
      }
    }
    if (own(source, 'review')) {
      if (!Array.isArray(source.review) || source.review.some(id => typeof id !== 'string')) throw new Error('Invalid review');
      result.review = [...new Set(source.review)].slice(0, 2);
    }
    if (source.active !== undefined && source.active !== null) {
      const active = source.active;
      if (!isObject(active) || !/^d[0-7]$/.test(active.day) || !Number.isInteger(active.index) || active.index < 0 || !Array.isArray(active.queue) || active.queue.some(id => typeof id !== 'string') || !Array.isArray(active.results)) throw new Error('Invalid active shift');
      result.active = clone(active);
    }
    return result;
  }
  function load() {
    let raw;
    try { raw = localStorage.getItem(key); available = true; } catch (error) { available = false; return clone(memory); }
    if (raw === null) { memory = defaults(); return clone(memory); }
    try { memory = normalize(JSON.parse(raw)); recovered = false; }
    catch (error) {
      recovered = true;
      try { localStorage.setItem(backupKey, raw); } catch (storageError) { available = false; }
      memory = defaults();
    }
    return clone(memory);
  }
  function save(data) {
    memory = clone(data);
    try { localStorage.setItem(key, JSON.stringify(memory)); available = true; return true; }
    catch (error) { available = false; return false; }
  }
  function reset() {
    memory = defaults(); recovered = false;
    try { localStorage.removeItem(key); localStorage.removeItem(backupKey); available = true; } catch (error) { available = false; }
    return clone(memory);
  }
  return { defaults, normalize, load, save, reset, get available() { return available; }, get recovered() { return recovered; } };
})();

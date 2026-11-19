// STATE: pure session operations; judgment is always delegated to the theory model.
const Session = {
  create(dayIndex, save) {
    const day = DAYS[dayIndex];
    const review = (save.review || []).filter(id => id.slice(0,2) !== day.id).slice(0,2);
    return { day: day.id, index: 0, queue: review.concat(day.list.map(x => x.id)), results: [] };
  },
  isExtra(session, id, index=session.index) {
    return !id.startsWith(session.day+'-') || session.queue.slice(0,index).includes(id);
  },
  repeat(session, mission) {
    if (mission.final || Session.isExtra(session, mission.id)) return session.queue;
    const queue = session.queue.slice();
    const final = queue.findIndex((id,i) => i > session.index && DAYS.flatMap(d=>d.list).find(m=>m.id===id)?.final);
    queue.splice(Math.min(session.index+4,final < 0 ? queue.length : final),0,mission.id);
    return queue;
  },
  summary(session) {
    const day = DAYS.find(d=>d.id===session.day);
    const main = session.results.filter(r=>!r.again);
    const full = main.filter(r=>r.mark===1 || r.mark==='full').length;
    const needed = Math.ceil(day.list.length*.8);
    const playable = main.filter(r=>hasPlay(solve(day.list.find(m=>m.id===r.id)).sc));
    const smooth = playable.length>0 && playable.every(r=>r.hand===1 || r.hand==='매끈');
    return {full,needed,total:day.list.length,passed:full>=needed,smooth};
  },
  unlock(save, index) { return index===0 || !!save.days[DAYS[index-1].id]?.passed; }
};

// APP: five stable rows, deliberate choices, and local learning records.
const $ = id => document.getElementById(id);
const escapeHtml = text => String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function musicalHtml(value) {
  let text=String(value??'');
  if (typeof Game!=='undefined' && Game.save?.settings.names==='ko') {
    for (const [a,b] of [['더블플랫','겹내림표'],['더블샵','겹올림표'],['내추럴','제자리표'],['플랫','내림표'],['샵','올림표']]) text=text.replaceAll(a,b);
  }
  return escapeHtml(text).replace(/𝄪|𝄫|♯|♭|♮/gu,g=>`<span class="inline-sign">${Visuals.sign({'𝄪':2,'𝄫':-2,'♯':1,'♭':-1,'♮':0}[g],18)}</span>`);
}
const icon = (name,size=22) => {
 const paths={sound:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',mute:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6m0-6-5 6"/>',settings:'<path d="m10 3-1 3-3 1-3 3 2 3-1 3 3 3 3-1 3 1 3-2 3-1 1-4-2-2 1-3-3-3-3 1z"/><circle cx="12" cy="12" r="3"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',book:'<path d="M12 6C9 3 4 4 3 5v15c3-2 6-2 9 0 3-2 6-2 9 0V5c-3-1-6-1-9 1v14"/>',play:'<path d="m9 5 11 7-11 7z"/>',star:'<path d="m12 3 2 6 7 3-7 2-2 7-2-7-7-2 7-3z"/>',lock:'<rect x="6" y="10" width="12" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',check:'<path d="m5 12 4 4L19 6"/>',home:'<path d="m3 11 9-8 9 8M6 9v12h12V9m-9 12v-7h6v7"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',back:'<path d="m14 5-7 7 7 7"/>',wand:'<path d="m5 20 12-12 3 3L8 23zM5 2v6M2 5h6M19 1v4m-2-2h4M20 18v5m-2-2h5"/>'};
 return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.star}</svg>`;
};
const ASK_NAMES={name:'표의 이름',notch:'시소 눈금',key:'건반 찾기',sign:'표 붙이기',reach:'효력 찾기',why:'까닭 찾기',link:'곡선 읽기',fix:'악보 수리'};
const DAY_DESCRIPTIONS=['이름과 방향, 다섯 표와 인사해요','바로 옆 건반이 반음 한 칸이에요','더블샵·더블플랫과 내추럴을 만나요','표가 닿는 곳을 빛띠로 살펴요','다른 자리와 새 마디를 구별해요','문패처럼 걸린 조표를 읽어요','이어지는 소리와 새로운 음을 느껴요','배운 규칙으로 악보를 고쳐요'];
const ALL_MISSIONS=DAYS.flatMap(d=>d.list);
const Game={save:null,audio:null,screens:null,screen:'title',dayIndex:0,session:null,sol:null,phase:'ask',sub:'ready',pick:undefined,selectedNotes:[],tries:0,given:false,off:[],wrongKeys:[],hand:'–',slips:0,noteSlips:0,step:0,presses:0,voices:new Map(),run:null,returnTo:'title',recorded:false,askTime:0,sceneResume:null,playbackNote:null,playbackScore:null,barFlashUntil:0,barFlashFrame:null,tutorialDemos:new Set()};
function persist() { Store.save(Game.save); }
function applySettings() {
 const s=Game.save.settings;Game.audio.volume=s.volume;Game.audio.muted=s.muted;
 document.body.classList.toggle('reduced',s.motion==='reduced'||(s.motion==='system'&&matchMedia('(prefers-reduced-motion:reduce)').matches));
 $('sound-toggle').innerHTML=icon(s.muted?'mute':'sound');$('sound-toggle').setAttribute('aria-label',s.muted?'소리 켜기':'소리 끄기');
}
function closeMenu(){ $('navigation').classList.remove('open'); }
function abortRun(message) {
 Game.audio.stop();Game.voices.clear();Game.run=null;Game.playbackNote=null;Game.playbackScore=null;
 if(Game.barFlashFrame!==null){cancelAnimationFrame(Game.barFlashFrame);Game.barFlashFrame=null;}if($('bar-flash'))$('bar-flash').hidden=true;
 if(Game.screen==='shift'&&Game.phase==='play'&&Game.sub==='run'){Game.sub='ready';renderControls();if(message)feedback(message,'warn');}
 if(Game.screen==='shift'){Visuals.releaseKeys($('keys'));Visuals.updateKeys($('keys'),{active:null});}
}
function navigate(screen) {
 const restore=screen==='shift'&&Game.screen==='settings'&&Game.sol&&Game.session; abortRun();Game.screens?.stop();closeMenu();Game.screen=screen;document.body.classList.toggle('game-mode',screen==='shift');
 $('page').hidden=screen==='shift';$('game').hidden=screen!=='shift';$('shift-hud').hidden=screen!=='shift';
 for(const b of document.querySelectorAll('[data-nav]'))b.classList.toggle('active',b.dataset.nav===screen);
 if(screen==='title')renderTitle();else if(screen==='map')renderMap();else if(screen==='close')renderClose();else if(screen==='shift'){if(restore){Visuals.keyboard($('keys'),keyWindow(Game.sol),{onPress:pressKey,onRelease:releaseKey,solfege:Game.save.settings.solfege});buildChoices();$('order-text').innerHTML=musicalHtml(orderText(Game.sol));renderControls();renderSelection();}else renderOrder();}else Game.screens.render(screen,{returnTo:Game.returnTo});
 if(screen!=='shift'){window.scrollTo(0,0);$('page').querySelector('h1,h2')?.setAttribute('tabindex','-1');}
}
function renderTitle() {
 const next=DAYS.findIndex((d,i)=>Session.unlock(Game.save,i)&&!Game.save.days[d.id]?.passed);
 const current=next<0?7:next;
 $('page').innerHTML=`<section class="hero"><div class="hero-copy"><div class="eyebrow">A LITTLE SIGN. A NEW SOUND.</div><h1>악보는 그대로,<br>소리에는 <em>마법을.</em></h1><p class="description">다섯 가지 표가 들려주는 작은 변화.<br>고르고, 듣고, 연주하며 임시표의 비밀을 발견해요.</p><div class="hero-buttons"><button id="start-work" class="button primary">${icon('wand')} ${Game.save.active?'이어서 영업':'영업 시작'}</button><button id="home-book" class="button secondary">${icon('book')} 마법 도감</button></div><div class="text-note">${icon('clock',15)} 한 작업일 3~6분 <span>·</span> 시간 제한 없이, 내 속도로</div></div><div class="hero-art">${Visuals.illustration('workshop')}<div class="hero-label">다섯 가지 표, <b>새로운 소리의 시작</b></div></div></section><section class="lesson-preview"><div class="section-top"><h2>작은 발견이 쌓이는 여덟 작업일</h2><span>총 66개 의뢰</span></div><div class="path-preview">${DAYS.map((d,i)=>`<button class="path-tile ${i===current?'current':''}" data-day="${i}" aria-label="${d.name}"><small>DAY ${String(i+1).padStart(2,'0')}</small><span class="tile-symbol">${i<5?Visuals.sign([1,-1,2,0,-2][i],24):icon(i===5?'book':i===6?'sound':'wand')}</span><b>${escapeHtml(d.name.replace(/^\d단 /,''))}</b></button>`).join('')}</div></section><p class="footer-note">듣는 즐거움에서, 읽는 자신감으로. CHARM · 임시표 마법 공방</p>`;
 $('start-work').onclick=()=>{Game.audio.unlock();if(Game.save.active)resumeDay();else navigate('map');};$('home-book').onclick=()=>navigate('book');
 $('page').querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.day);if(Session.unlock(Game.save,i))startDay(i);else navigate('map');});
}
function renderMap() {
 $('page').innerHTML=`<div class="screen-heading"><div><div class="eyebrow">YOUR WORKSHOP JOURNEY</div><h1>오늘은 어떤 마법을 배울까요?</h1><p>한 번에 하나씩. 작은 의뢰를 해결하며 공방의 문을 열어요.</p></div><button id="map-home" class="button secondary">공방 홈</button></div><div class="map-grid">${DAYS.map((d,i)=>{const p=Game.save.days[d.id],unlocked=Session.unlock(Game.save,i);return `<button class="day-card ${!unlocked?'locked':!p?.passed?'current':''}" data-start="${i}" ${!unlocked?'aria-disabled="true"':''}><div class="day-icon">${!unlocked?icon('lock'):i<5?Visuals.sign([1,-1,2,0,-2][i],27):icon(i===5?'book':i===6?'sound':'wand',27)}</div>${p?.passed?`<span class="stamp">${p.stamp===2?'매끈<br>도장':'공방<br>도장'}</span>`:''}<small>DAY ${String(i+1).padStart(2,'0')} · ${d.list.length}개 의뢰</small><h2>${d.name.replace(/^\d단 /,'')}</h2><p>${DAY_DESCRIPTIONS[i]}</p><div class="day-bottom">${unlocked?`<span class="chip">${p?.passed?'다시 도전':'영업 준비'}</span><span>최고 ${p?.best||0} / ${d.list.length}</span>`:`${i-1}단을 통과하면 열려요`}</div></button>`;}).join('')}</div><div class="map-note"><span>● ${DAYS[0].list.length===8?'7/8':'80%'} 이상 맞히면 다음 작업일이 열려요. 6단은 8/10이에요.</span><span>연주는 자유롭게 · 기계 연주도 가능해요</span></div>`;
 $('map-home').onclick=()=>navigate('title');$('page').querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{let i=Number(b.dataset.start);if(Session.unlock(Game.save,i))startDay(i);});
}
function saveActive(nextIndex=Game.session.index) {
 Game.save.active={...Game.session,index:nextIndex,queue:Game.session.queue.slice(),results:Game.session.results.map(x=>({...x}))};persist();
}
async function startDay(index) {
 if(!Session.unlock(Game.save,index))return;
 Game.audio.unlock();Game.dayIndex=index;Game.session=Session.create(index,Game.save);saveActive();navigate('shift');
 if(index===0&&!Game.save.settings.tutorialSeen)showSoundCheck();else if(DAYS[index].scene)showScene(DAYS[index].scene);
}
function resumeDay() {
 const a=Game.save.active;const index=DAYS.findIndex(d=>d.id===a.day);if(index<0||!a.queue.every(id=>ALL_MISSIONS.some(m=>m.id===id))){Game.save.active=null;persist();navigate('map');return;}
 Game.dayIndex=index;Game.session=structuredClone(a);if(a.index>=a.queue.length){finishDay();return;}navigate('shift');
}
function openCurrent() {
 Game.sol=solve(ALL_MISSIONS.find(m=>m.id===Game.session.queue[Game.session.index]));Game.pick=undefined;Game.selectedNotes=[];Game.tries=0;Game.given=false;Game.off=[];Game.wrongKeys=[];Game.phase='ask';Game.sub='ready';Game.hand='–';Game.slips=0;Game.noteSlips=0;Game.step=0;Game.presses=0;Game.recorded=false;Game.askTime=performance.now();
}
function renderOrder() {
 openCurrent();const {sol}=Game,day=DAYS[Game.dayIndex];
 $('day-label').textContent=day.name;$('count-label').textContent=`${Game.session.index+1} / ${Game.session.queue.length}`;
 $('progress-dots').innerHTML=day.list.map(m=>{const r=Game.session.results.find(x=>x.id===m.id&&!x.again);return `<i class="${r?(r.mark===1?'done':'half'):m.id===sol.ms.id?'current':''}"></i>`;}).join('');
 $('order-tag').textContent=ASK_NAMES[sol.ms.ask];$('order-text').innerHTML=musicalHtml(orderText(sol));$('phase-label').textContent='판단';
 $('score-caption').textContent=sol.ms.final?'마감 의뢰 · 도움 없이 해 봐요':Session.isExtra(Game.session,sol.ms.id)?'다시 만난 의뢰':'손님의 악보';
 Visuals.score($('score'),sol.view,{target:sol.t,source:sol.ms.ask==='reach'?sol.t:undefined,onNote:['reach','fix'].includes(sol.ms.ask)?selectNote:undefined});
 const compact=['name','notch','sign','fix','link'].includes(sol.ms.ask);
 $('input-block').classList.toggle('compact',compact);
 Visuals.keyboard($('keys'),keyWindow(sol),{onPress:pressKey,onRelease:releaseKey,solfege:Game.save.settings.solfege,compact});
 buildChoices();renderControls();renderSelection();feedback(sol.ms.final?'도움 없이 해요. 답을 고르고 확정을 눌러요.':sol.ms.ask==='reach'?'악보에서 표의 힘이 닿는 뒤 음표를 모두 골라요.':sol.ms.ask==='fix'?'악보에서 고칠 음표를 고른 뒤 표를 골라요.':'답을 고른 뒤 확정을 눌러요.');
 $('play-meter').hidden=true;$('confirm').focus({preventScroll:true});
}
function buildChoices() {
 const {sol}=Game,ask=sol.ms.ask,el=$('choices');el.replaceChildren();el.className='choices';el.hidden=!['name','notch','sign','fix','why','link'].includes(ask);
 if(el.hidden)return;
 const cards=ask==='sign'||ask==='fix';if(cards)el.classList.add('cards');if(ask==='why')el.classList.add('why-choices');
 const list=cards?CARDS.filter(v=>!(sol.ms.cards===5&&v===null)).map(v=>({v,label:cardKo(v)})):choices(sol);
 for(const c of list){const b=document.createElement('button');b.type='button';b.dataset.value=JSON.stringify(c.v);b.setAttribute('aria-label',c.label);b.setAttribute('aria-pressed','false');
 b.innerHTML=cards?`${c.v===null?'<span style="font-size:20px;line-height:25px">—</span>':Visuals.sign(c.v,26)}<span class="card-title">${escapeHtml(signKo(c.v,Game.save.settings.names))}</span>`:musicalHtml(c.label);
 if(cards&&c.v===null)b.querySelector('.card-title').textContent='없음';
 b.onclick=()=>pickChoice(c.v);el.append(b);}
}
function pickChoice(value) {
 if(Game.phase!=='ask'||Game.off.some(v=>v===value))return;
 if(Game.sol.ms.ask==='fix'&&Game.pick?.i===undefined){feedback('악보에서 고칠 음표를 먼저 골라요.','warn');return;}
 Game.pick=Game.sol.ms.ask==='fix'?{i:Game.pick.i,acc:value}:value;
 renderSelection();
 if(Game.sol.ms.ask==='notch')previewTone(midiOf(Game.sol.sc.notes[Game.sol.t].L,Game.sol.sc.notes[Game.sol.t].o,value));
}
function selectNote(i) {
 if(Game.phase!=='ask'||Game.sol.view.notes[i].rest)return;
 if(Game.sol.ms.ask==='reach') {if(i===Game.sol.t){feedback('빛나는 표 뒤의 음표를 골라요. 출발 음표는 빼요.');return;}Game.selectedNotes.includes(i)?Game.selectedNotes.splice(Game.selectedNotes.indexOf(i),1):Game.selectedNotes.push(i);Game.selectedNotes.sort((a,b)=>a-b);Game.pick=Game.selectedNotes.join(',');}
 else if(Game.sol.ms.ask==='fix'){Game.pick={i};Game.selectedNotes=[i];}
 else return;
 renderSelection();
}
function chosenScore() {
 const {sol,pick}=Game;if(sol.ms.ask==='sign'&&pick!==undefined)return withAcc(sol.view,sol.t,pick);
 if(sol.ms.ask==='fix'&&pick&&Object.hasOwn(pick,'acc'))return withAcc(sol.view,pick.i,pick.acc);
 return sol.view;
}
function renderSelection() {
 const {sol,pick,phase}=Game;if(!sol)return;
 const sc=phase==='ask'?chosenScore():sol.sc,r=evaluate(sc),n=sc.notes[sol.t];let alter=r[sol.t].alter;
 if(phase==='ask'&&sol.ms.ask==='key')alter=pick===undefined?0:pick-midiOf(n.L,n.o);
 if(phase==='ask'&&sol.ms.ask==='notch')alter=pick===undefined?0:pick;
 const show=phase!=='ask'||(Game.tries>0&&sol.ms.ask!=='name')||(['key','sign','notch'].includes(sol.ms.ask)&&!sol.ms.final&&pick!==undefined);
 const showBand=phase!=='ask'||Game.tries>0;
 let override=null;if(sol.ms.ask==='sign'&&pick!==undefined)override={i:sol.t,acc:pick};if(sol.ms.ask==='fix'&&pick&&Object.hasOwn(pick,'acc'))override=pick;
 Visuals.updateScore($('score'),{selected:Game.selectedNotes,showBand,override,active:phase==='play'?sounds(sol.sc)[Game.step]?.notes[0]:null});
 Visuals.device($('device'),n,r[sol.t],{show,showChips:Game.dayIndex>=3&&showBand,showSource:showBand,score:sc,index:sol.t,alter});
 const selected=sol.ms.ask==='key'?pick:sol.ms.ask==='sign'&&pick!==undefined?evaluate(sc)[sol.t].midi:null;
 const target=sol.ms.ask==='sign'?midiOf(n.L,n.o,sol.ms.want):null;
 Visuals.updateKeys($('keys'),{selected:typeof selected==='number'?selected:null,target,wrong:Game.wrongKeys});
 $('selection-caption').innerHTML=pick===undefined?'':sol.ms.ask==='key'?musicalHtml(keyKo(pick)):sol.ms.ask==='reach'?`${Game.selectedNotes.length}개 선택`:sol.ms.ask==='fix'?`${pick.i+1}번째 음표${Object.hasOwn(pick,'acc')?' · '+escapeHtml(cardKo(pick.acc)):''}`:sol.ms.ask==='sign'?musicalHtml(cardKo(pick)):'';
 for(const b of $('choices').children){let v=JSON.parse(b.dataset.value);const current=sol.ms.ask==='fix'?pick?.acc:pick;const selected=current===v&&!(sol.ms.ask==='fix'&&!Object.hasOwn(pick||{},'acc'));b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-disabled',String((Game.off.some(x=>x===v))||(sol.ms.ask==='fix'&&pick?.i===undefined)));}
}
function feedback(text,tone='') {$('readout').className='readout '+tone;$('readout-text').innerHTML=musicalHtml(text);$('readout-icon').textContent=tone==='good'?'●':tone==='bad'?'×':tone==='warn'?'◐':'';}
function renderControls() {
 const {phase,sol,sub}=Game;const ask=sol.ms.ask,isAsk=phase==='ask',playing=phase==='play';
 for(const id of ['confirm','target-listen','own-listen','play-start','machine-play','deliver','listen-again','next-order'])$(id).hidden=true;
 $('confirm').hidden=!isAsk;$('target-listen').hidden=!(isAsk&&['sign','fix'].includes(ask));$('own-listen').hidden=!(isAsk&&['sign','fix'].includes(ask));
 $('play-start').hidden=!playing;$('machine-play').hidden=!playing;$('deliver').hidden=!playing;
 if(playing){$('play-start').textContent=sub==='run'?'연주 중':sub==='result'?'다시 연주':'연주 시작';$('play-start').setAttribute('aria-disabled',String(sub==='run'));$('machine-play').setAttribute('aria-disabled',String(sub==='run'));$('deliver').setAttribute('aria-disabled',String(sub==='run'));}
 $('listen-again').hidden=phase!=='deliver';$('next-order').hidden=phase!=='deliver';$('next-order').textContent=Game.session.index===Game.session.queue.length-1?'마감하기':'다음 의뢰';
 $('keys').hidden=isAsk&&ask==='why';$('keys-caption').hidden=isAsk&&ask==='why';
 $('phase-label').textContent=phase==='ask'?'판단':phase==='play'?'연주':'납품';
 $('keys-caption').textContent=phase==='play'?'차례대로 눌러요 · 박은 맞추지 않아요':phase==='deliver'?'정답을 듣고 규칙을 확인해요':ask==='key'?'건반을 눌러 고르세요':ask==='reach'?'건반은 듣기용이에요':'소리를 듣고 표와 보기를 골라요';
 const compact=isAsk&&['name','notch','sign','fix','link'].includes(ask);$('input-block').classList.toggle('compact',compact);
 $('choices').hidden=!isAsk||!['name','notch','sign','fix','why','link'].includes(ask);
}
function confirmAnswer() {
 if(Game.phase!=='ask')return;const {sol}=Game;let given=Game.pick;
 if(sol.ms.ask==='reach')given=Game.selectedNotes.join(',');
 if(given===undefined||(sol.ms.ask==='fix'&&(!given||!Object.hasOwn(given,'acc')))){feedback(sol.ms.ask==='key'?'건반을 먼저 눌러요.':sol.ms.ask==='fix'?'고칠 음표와 표를 먼저 골라요.':'보기나 카드를 먼저 골라요.','warn');return;}
 if(Game.off.some(v=>v===given)&&!Game.given){feedback('다른 보기나 카드를 골라요.','warn');return;}
 if(isRight(sol,given)) {Game.audio.effect('good');const cat=categoryOf(sol.ms,Game.dayIndex);Game.save.stats.cat[cat][1]++;if(!Game.tries)Game.save.stats.cat[cat][0]++;Game.save.stats.ms+=performance.now()-Game.askTime;Game.save.stats.orders++;if(hasPlay(sol.sc)){Game.phase='play';Game.sub='ready';Game.step=0;renderControls();renderSelection();feedback(Game.given?'답을 함께 확인했어요. 이제 차례대로 쳐 봐요.':'차례대로 건반을 눌러요. 박은 맞추지 않아도 돼요.','good');$('play-start').focus({preventScroll:true});maybeTutorialDemo();}else toDeliver();return;}
 Game.tries++;Game.audio.effect('warn');const cause=diagnose(sol,given);Game.save.stats.causes[cause]=(Game.save.stats.causes[cause]||0)+1;
 if(Game.tries>=2){Game.given=true;Game.pick=sol.ms.ask==='fix'?{...sol.answer[0]}:sol.answer;if(sol.ms.ask==='reach')Game.selectedNotes=sol.answer.split(',').filter(Boolean).map(Number);if(sol.ms.ask==='fix')Game.selectedNotes=[Game.pick.i];feedback(giveText(sol),'warn');}
 else {if(sol.ms.ask==='key')Game.wrongKeys.push(given);else if(['name','notch','sign','why','link'].includes(sol.ms.ask))Game.off.push(given);feedback(say(sol,cause,given),'warn');}
 renderSelection();
}
// Update existing score/device nodes only when the currently sounding note changes.
function flashBarReset() {
 const flash=$('bar-flash');if(!flash)return;flash.hidden=false;Game.barFlashUntil=performance.now()+600;
 if(Game.barFlashFrame!==null)return;
 const frame=now=>{if(now>=Game.barFlashUntil){flash.hidden=true;Game.barFlashFrame=null;}else Game.barFlashFrame=requestAnimationFrame(frame);};
 Game.barFlashFrame=requestAnimationFrame(frame);
}
function segmentNoteAt(sc,event,progress=0) {
 if(!event?.notes?.length)return null;
 const valid=event.notes.filter(i=>sc.notes[i]&&!sc.notes[i].rest);if(!valid.length)return null;
 const total=valid.reduce((length,i)=>length+num(sc.notes[i].dur),0),elapsed=Math.max(0,Math.min(1,progress))*total;
 let at=0;for(const i of valid){at+=num(sc.notes[i].dur);if(elapsed<at-1e-9)return i;}return valid[valid.length-1];
}
function setPlaybackNote(sc,index,showBand=true) {
 if(index===null||!sc.notes[index]||sc.notes[index].rest){Visuals.updateScore($('score'),{active:null,showBand});return;}
 if(Game.playbackScore===sc&&Game.playbackNote===index)return;
 const previous=Game.playbackScore===sc?sc.notes[Game.playbackNote]:null,n=sc.notes[index];
 if(previous&&n.bar>previous.bar)flashBarReset();
 Game.playbackScore=sc;Game.playbackNote=index;
 Visuals.updateScore($('score'),{active:index,showBand});
 const r=evaluate(sc)[index];
 Visuals.device($('device'),n,r,{show:true,showChips:Game.dayIndex>=3,showSource:true,score:sc,index,alter:r.alter});
}
function performanceSolution(index) {
 const sc=Game.sol.sc,answer=evaluate(sc)[index].midi,traps={};
 for(const [cause,model] of Object.entries(MODELS)){const pitch=evaluate(sc,model)[index].midi;if(pitch!==answer)traps[cause]=pitch;}
 return {...Game.sol,ms:{...Game.sol.ms,ask:'key'},sc,view:sc,t:index,answer,traps};
}
function maybeTutorialDemo() {
 const id=Game.sol.ms.id,day=id==='d2-04'?'d2':id==='d6-01'?'d6':null;
 if(!day||Game.save.days[day]?.runs||Game.tutorialDemos.has(id))return;
 Game.tutorialDemos.add(id);startPlay(true);
}
function previewTone(midi){Game.audio.playNote(midi,.55);}
function pressKey(midi) {
 if(Game.run&&Game.phase==='play'&&Game.sub==='run')return;
 if(Game.run&&Game.phase!=='play')abortRun();
 Game.audio.unlock();const voice=Game.audio.press(midi);Game.voices.set(midi,{voice,start:performance.now(),valid:false});
 if(Game.screen!=='shift')return;
 if(Game.phase==='ask'&&Game.sol.ms.ask==='key'){Game.pick=midi;renderSelection();}
 if(Game.phase!=='play'||Game.sub!=='run')return;
 const ev=sounds(Game.sol.sc)[Game.step];if(!ev)return;
 Game.presses++;
 if(midi!==ev.midi){Game.slips++;Game.noteSlips++;Game.wrongKeys=[midi];Visuals.updateKeys($('keys'),{active:midi,wrong:Game.wrongKeys,target:Game.noteSlips>=2?ev.midi:null});const sol=performanceSolution(ev.notes[0]),cause=diagnose(sol,midi);feedback(say(sol,cause,midi),'warn');return;}
 Game.voices.get(midi).valid=true;Game.voices.get(midi).required=ev.notes.length>1?beats(ev.len,Game.sol.sc.md)*.5:.12;
 if(ev.notes.length>1)feedback('붙임줄이에요. 통로가 다 찰 때까지 누르고 있어요.');
 Visuals.updateKeys($('keys'),{active:midi,wrong:[]});animateHold(midi);
}
function animateHold(midi) {
 const tick=()=>{const key=Game.voices.get(midi);if(!key||Game.phase!=='play'||Game.sub!=='run'||!key.valid)return;const amount=Math.min(1,(performance.now()-key.start)/(key.required*1000));$('hold-fill').style.transform=`scaleX(${amount})`;const ev=sounds(Game.sol.sc)[Game.step];setPlaybackNote(Game.sol.sc,segmentNoteAt(Game.sol.sc,ev,amount));if(amount<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);
}
function releaseKey(midi) {
 const entry=Game.voices.get(midi);if(!entry)return;Game.audio.release(entry.voice);Game.voices.delete(midi);
 if(Game.screen!=='shift'||Game.phase!=='play'||Game.sub!=='run'||!entry.valid)return;
 const ev=sounds(Game.sol.sc)[Game.step];if(!ev||midi!==ev.midi)return;
 if(ev.notes.length>1&&(performance.now()-entry.start)/1000+.035<entry.required){Game.slips++;Game.noteSlips++;$('hold-fill').style.transform='scaleX(0)';setPlaybackNote(Game.sol.sc,ev.notes[0]);Visuals.updateKeys($('keys'),{active:null,target:Game.noteSlips>=2?ev.midi:null});feedback('붙임줄은 끝까지 누르고 있어요. 이 음은 새로 치지 않고 이어 가요.','warn');return;}
 Game.step++;Game.noteSlips=0;$('hold-fill').style.transform='scaleX(0)';
 const all=sounds(Game.sol.sc);if(Game.step>=all.length){Game.sub='result';const hand=Game.slips===0?'매끈':Game.slips===1?'한 번 삐끗':'여러 번 삐끗';const rank=['매끈','한 번 삐끗','여러 번 삐끗','기계','–'];if(rank.indexOf(hand)<rank.indexOf(Game.hand))Game.hand=hand;renderControls();feedback(Game.slips===0?`매끈해요. ${Game.presses}번 눌렀어요(악보의 소리 ${all.length}개).`:`${Game.slips===1?'한 번':'여러 번'} 삐끗했어요. ${all.length}번에 끝낼 수 있어요.`,'good');$('deliver').focus({preventScroll:true});}
 else updatePlayStep();
}
function updatePlayStep() {
 const all=sounds(Game.sol.sc),ev=all[Game.step];if(!ev)return;
 setPlaybackNote(Game.sol.sc,ev.notes[0]);
 Visuals.updateKeys($('keys'),{active:null,selected:null,target:Game.noteSlips>=2?ev.midi:null,wrong:[]});$('play-meter').hidden=false;$('play-instruction').textContent=`${Game.step+1} / ${all.length} · ${ev.notes.length>1?'계속 유지':'다음 음으로'}`;
 feedback(ev.notes.length>1?'붙임줄이에요. 통로가 다 찰 때까지 누르고 있어요.':'차례 표시를 보고 다음 건반을 눌러요.');
}
function startPlay(machine=false) {
 if(Game.phase!=='play'||Game.sub==='run')return;abortRun();Game.sub='run';Game.step=0;Game.slips=0;Game.noteSlips=0;Game.presses=0;Game.wrongKeys=[];renderControls();$('play-meter').hidden=false;
 if(!machine){updatePlayStep();$('keys').querySelector('button')?.focus({preventScroll:true});return;}
 feedback('기계가 악보대로 눌러요. 소리와 차례를 함께 봐요.');
 Game.run=Game.audio.schedule(Game.sol.sc,{slow:Game.save.settings.slow,onStep:(idx,ev,progress)=>{if(!ev){Visuals.updateScore($('score'),{active:null});Visuals.updateKeys($('keys'),{active:null});return;}Game.step=idx;setPlaybackNote(Game.sol.sc,segmentNoteAt(Game.sol.sc,ev,progress));Visuals.updateKeys($('keys'),{active:ev.midi});$('play-instruction').textContent=`${idx+1} / ${sounds(Game.sol.sc).length} · 기계 연주`;$('hold-fill').style.transform=`scaleX(${progress})`;},onDone:()=>{Game.run=null;Game.sub='result';if(Game.hand==='–')Game.hand='기계';renderControls();Visuals.updateScore($('score'),{active:null});Visuals.updateKeys($('keys'),{active:null});feedback('기계가 악보대로 눌렀어요. 보고 따라 해 보세요.');},onInterrupt:()=>abortRun('소리가 멈춰서 중단했어요. 다시 시작해 주세요.')});
}
function recordDelivery() {
 if(Game.recorded)return;Game.recorded=true;
 const {sol,session,save}=Game,again=Session.isExtra(session,sol.ms.id),mark=Game.tries===0?1:2;
 session.results.push({id:sol.ms.id,mark,hand:['–','매끈','한 번 삐끗','여러 번 삐끗','기계'].indexOf(Game.hand),again});
 if(mark===2&&!again&&!sol.ms.final)session.queue=Session.repeat({...session,results:session.results},sol.ms);
 if(mark===1){if(Game.dayIndex===0){let a=sol.ms.ask==='sign'?sol.ms.want:sol.sc.notes[sol.t].acc;if(!save.cards.signs.includes(a))save.cards.signs.push(a);}else{const rule=RULE_CARDS.find(r=>r.aims.includes(sol.ms.aim));if(rule&&!save.cards.rules.includes(rule.id))save.cards.rules.push(rule.id);}}
 saveActive(session.index+1);$('count-label').textContent=`${session.index+1} / ${session.queue.length}`;
}
function toDeliver() {
 if(Game.phase==='play'&&Game.sub==='run')return;abortRun();Game.phase='deliver';Game.sub='ready';Game.pick=Game.sol.answer;renderControls();renderSelection();$('play-meter').hidden=true;feedback(explain(Game.sol),'good');recordDelivery();listenScore(Game.sol.sc);$('next-order').focus({preventScroll:true});
}
function listenScore(sc) {
 abortRun();Game.run=Game.audio.schedule(sc,{slow:Game.save.settings.slow,onStep:(i,e,progress)=>{if(!e){Visuals.updateScore($('score'),{active:null});Visuals.updateKeys($('keys'),{active:null});return;}setPlaybackNote(sc,segmentNoteAt(sc,e,progress),Game.phase!=='ask'||Game.tries>0);Visuals.updateKeys($('keys'),{active:e.midi});},onDone:()=>{Game.run=null;Visuals.updateScore($('score'),{active:null});Visuals.updateKeys($('keys'),{active:null});},onInterrupt:()=>{Game.run=null;feedback('소리가 멈춰서 중단했어요. 다시 들어 주세요.','warn');}});
}
function nextOrder() {
 if(Game.phase!=='deliver')return;const scene=Game.sol.ms.after;abortRun();Game.session.index++;
 if(Game.session.index>=Game.session.queue.length){finishDay();return;}saveActive();renderOrder();
 if(scene&&!Session.isExtra(Game.session,Game.session.queue[Game.session.index-1],Game.session.index-1))showScene(scene);
}
function finishDay() {
 const {session,save}=Game,sum=Session.summary(session),previous=save.days[session.day]||{passed:false,stamp:0,runs:0,best:0};
 save.days[session.day]={passed:previous.passed||sum.passed,stamp:Math.max(previous.stamp,sum.passed?(sum.smooth?2:1):0),runs:previous.runs+1,best:Math.max(previous.best,sum.full)};
 save.review=session.results.filter(r=>r.mark===2&&!r.again).map(r=>r.id).slice(0,2);save.active=null;persist();navigate('close');
}
function renderClose() {
 const sum=Session.summary(Game.session);
 $('page').innerHTML=`<div class="screen-heading"><div><div class="eyebrow">A GOOD DAY AT THE WORKSHOP</div><h1>${DAYS[Game.dayIndex].name} · 영업 마감</h1></div><button id="close-map" class="button secondary">작업일 지도</button></div><div class="close-summary"><div class="panel close-hero"><div class="assistant">${Visuals.illustration('assistant')}</div><h2>${sum.passed?'오늘의 마법을 발견했어요!':'하나씩 다시 살펴봐요'}</h2><div class="close-score">${sum.full}<small> / ${sum.total} ●</small></div><p>${sum.passed?(Game.dayIndex===DAYS.length-1?'공방 도장을 받았어요. 여덟 작업일을 모두 마쳤어요.':'공방 도장을 받았어요. 다음 작업일의 문이 열렸어요.'):`${sum.needed}개를 한 번에 맞히면 다음 작업일이 열려요. 틀린 의뢰는 짧게 다시 만나요.`}</p><div class="sheet-actions"><button id="retry-day" class="button secondary">다시 영업</button><button id="continue-day" class="button primary">${sum.passed&&Game.dayIndex<7?'다음 작업일':'지도로'}</button></div></div><div class="panel"><div class="section-top"><h2>오늘의 발견 기록</h2><span>판단 · 손 기록</span></div><div class="results-list">${Game.session.results.map(r=>`<div class="result-row"><span class="result-mark">${r.mark===1?'●':'◐'}</span><span>${r.id}${r.again?' · 복습':''}</span><small>${['–','매끈','한 번 삐끗','여러 번 삐끗','기계'][r.hand]||'–'}</small></div>`).join('')}</div><p style="margin-top:18px;font-size:13px;color:var(--ink-2)">복습 의뢰와 연주는 작업일 통과 계산에 넣지 않아요.</p></div></div>`;
 $('close-map').onclick=()=>navigate('map');$('retry-day').onclick=()=>startDay(Game.dayIndex);$('continue-day').onclick=()=>sum.passed&&Game.dayIndex<7?startDay(Game.dayIndex+1):navigate('map');
}
function openSheet(){abortRun();$('sheet').hidden=false;Game.sheetFocus=document.activeElement;document.body.style.overflow='hidden';$('sheet-close').focus();}
function closeSheet(){Game.audio.stop();$('sheet').hidden=true;document.body.style.overflow='';Game.sheetFocus?.focus({preventScroll:true});}
function showScene(id) {
 const scene=SCENES[id];if(!scene)return;openSheet();
 $('sheet-content').innerHTML=`<div class="scene-header"><div class="eyebrow">A MOMENT OF DISCOVERY</div><h2>공방에서 발견한 규칙</h2></div><p class="scene-text">${musicalHtml(scene.text)}</p><div class="scene-scores">${scene.rows.map((s,i)=>`<div class="scene-score" id="scene-${i}"></div>`).join('')}</div>${id==='S5'?'<p class="scene-tag">교정 재작성 예시 · G 플랫 4 다음 G5</p>':''}<div class="sheet-actions"><button id="scene-listen" class="button secondary">${icon('sound',18)} 들어 보기</button><button id="scene-ok" class="button primary">알겠어요</button></div>`;
 scene.rows.forEach((s,i)=>Visuals.score($('scene-'+i),parseScore(s),{showBand:true}));
 $('scene-ok').onclick=closeSheet;$('scene-listen').onclick=()=>{let all=[],offset=F(0);scene.rows.forEach(s=>{const sc=parseScore(s);sounds(sc).forEach(e=>all.push({...e,at:add(e.at,offset)}));offset=add(offset,add(F(sc.meter.n*sc.bars,sc.meter.d),F(1,4)));});Game.audio.schedule(all,{md:4,slow:Game.save.settings.slow});};
}
function showSoundCheck() {
 openSheet();$('sheet-content').innerHTML=`<div class="scene-header"><div class="eyebrow">WELCOME TO THE WORKSHOP</div><h2>작은 소리로 시작해요</h2></div><div style="height:160px;text-align:center">${Visuals.illustration('assistant')}</div><p class="scene-text">건반을 눌러 소리를 들어 보세요. 소리 없이도 모든 의뢰를 풀 수 있어요.</p><div id="tutorial-keys" style="height:100px;margin-top:16px"></div><div class="sheet-actions"><button id="no-sound" class="button secondary">안 들려요</button><button id="yes-sound" class="button primary">들려요</button></div>`;
 Visuals.keyboard($('tutorial-keys'),{panes:[{lo:60,hi:64}],whites:3},{onPress:m=>previewTone(m)});
 $('yes-sound').onclick=()=>{Game.save.settings.tutorialSeen=true;persist();closeSheet();};$('no-sound').onclick=()=>{Game.save.settings.muted=true;Game.save.settings.tutorialSeen=true;applySettings();persist();closeSheet();feedback('소리 없이도 괜찮아요. 고르고 확정해 보세요.');};
}
function boot() {
 Game.save=Store.load();Game.audio=new AudioEngine();applySettings();
 Game.screens=new Screens({save:Game.save,audio:Game.audio,root:$('page'),onNavigate:navigate,onSave:()=>persist(),onStartDay:startDay,onScene:showScene,onTutorial:showSoundCheck,onChangeSettings:()=>{applySettings();persist();}});
 $('brand-mark').innerHTML=icon('wand',42);$('sound-toggle').onclick=()=>{Game.save.settings.muted=!Game.save.settings.muted;Game.audio.unlock();applySettings();persist();};$('settings-open').innerHTML=icon('settings');$('menu-open').innerHTML=icon('menu');
 $('settings-open').onclick=()=>{Game.returnTo=Game.screen==='shift'?'shift':Game.screen;abortRun('설정을 열어 연주를 멈췄어요.');Game.screenBeforeSettings=Game.screen;navigate('settings');};
 // Returning from settings restores the current judgment rather than recreating it.
 
 $('menu-open').onclick=()=>$('navigation').classList.toggle('open');$('brand').onclick=()=>navigate('title');
 document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{Game.returnTo='title';navigate(b.dataset.nav);});
 $('confirm').onclick=confirmAnswer;$('play-start').onclick=()=>startPlay(false);$('machine-play').onclick=()=>startPlay(true);$('deliver').onclick=toDeliver;$('listen-again').onclick=()=>listenScore(Game.sol.sc);$('next-order').onclick=nextOrder;
 $('target-listen').onclick=()=>{if(Game.sol.ms.ask==='sign')previewTone(midiOf(Game.sol.sc.notes[Game.sol.t].L,Game.sol.sc.notes[Game.sol.t].o,Game.sol.ms.want));else listenScore(Game.sol.sc);};$('own-listen').onclick=()=>listenScore(chosenScore());
 $('sheet-close').onclick=closeSheet;$('sheet').onclick=e=>{if(e.target===$('sheet'))closeSheet();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('sheet').hidden)closeSheet();else closeMenu();}if(e.key==='0'&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});}if(e.key==='Tab'&&!$('sheet').hidden){const f=[...$('sheet').querySelectorAll('button:not([disabled]),[tabindex="0"]')].filter(x=>!x.hidden);if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0]?.focus();}}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)abortRun('화면을 떠나서 멈췄어요. 다시 시작해 주세요.');});window.addEventListener('blur',()=>abortRun('화면을 떠나서 멈췄어요. 다시 시작해 주세요.'));
 window.addEventListener('error',e=>{if(e.message&&!e.message.includes('ResizeObserver')){$('fatal').hidden=false;console.error(e.error||e.message);}});
 const tests=runSelfTests();window.__tests=tests;
 window.__charm={version:'0.9.0',missions:66,tests,Game,Session,solve,check,startDay,navigate};
 if(location.hash==='#test'){$('page').innerHTML=`<div class="screen-heading"><div><div class="eyebrow">WORKSHOP SELF TESTS</div><h1>자가검사 ${tests.passed} / ${tests.total}</h1></div><button id="test-home" class="button primary">공방으로</button></div><div class="panel">${tests.results.map(t=>`<p style="padding:7px">${t.passed?'●':'×'} ${escapeHtml(t.name)} ${t.error?escapeHtml(t.error):''}</p>`).join('')}</div>`;$('test-home').onclick=()=>{history.replaceState(null,'',location.pathname);navigate('title');};}else navigate('title');
}

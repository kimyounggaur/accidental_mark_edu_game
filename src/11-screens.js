// ══ 11 SCREENS · 도감, 기록, 설정, 자유 공방 ══
class Screens {
  constructor(options) {
    Object.assign(this, options);
    this.returnTo = 'title';
    this.free = null;
    this.playHandle = null;
    this.freeVoice = new Map();
    this.runToken = 0;
  }
  static causes = {
    TIE_BAR:'붙임줄도 마디선에서 풀린다고 읽음', TIE_CARRY:'붙임줄이 표를 다음 마디로 옮긴다고 읽음',
    SLUR_CARRY:'이음줄이 표를 다음 마디로 옮긴다고 읽음', NAT_KEY:'내추럴을 조표로 돌아가는 표로 읽음',
    NAT_ONE:'내추럴이 한 칸만 지운다고 읽음', NAT_DOWN:'내추럴을 내리는 표로 읽음', NAT_ONCE:'내추럴을 그 음에만 적용함',
    ADD:'앞의 표에 새 표를 더함', HALF:'더블 표를 한 칸으로 읽음', ALL_OCT:'표를 다른 옥타브까지 적용함',
    NO_BAR:'표를 마디선 너머까지 적용함', WHOLE_BAR:'표를 앞쪽 음까지 적용함', SIGN_ONLY:'표를 붙은 음에만 적용함',
    KEY_OCT:'조표를 그려진 옥타브에만 적용함', NO_KEY:'조표를 빠뜨림', BLACK:'샵과 플랫을 검은 건반으로만 읽음',
    WHITE:'반음 한 칸을 옆 흰 건반으로 읽음', DIR:'위아래 방향을 바꿔 읽음', PLAIN:'표를 빼고 읽음',
    REDUNDANT:'필요 없는 표를 덧붙임', NAME:'표의 이름을 혼동함', FAR:'자연음에서 두 칸 넘게 이동함',
    MISS:'효력이 닿는 음을 빠뜨림', EXTRA:'효력이 닿지 않는 음을 포함함', WHY:'높이를 정한 까닭을 혼동함',
    LINK_SLOT:'다른 줄·칸의 두 음을 붙임줄로 읽음', LINK_SIGN:'새 표가 붙은 음을 붙임줄로 읽음', LINK_IS_TIE:'붙임줄을 이음줄로 읽음',
    FIX_FINE:'맞는 음표를 고침', FIX_ROOT:'앞 음표의 영향을 빠뜨림', FIX_CARD:'고칠 표를 다시 확인해요', OTHER:'다른 건반이나 표를 선택함'
  };
  stop() {
    this.runToken++;
    if (this.playHandle) this.playHandle.cancel();
    this.playHandle = null;
    this.audio.stop();
    this.freeVoice.clear();
  }
  render(name, options={}) {
    this.stop();
    this.returnTo = options.returnTo || this.returnTo || 'title';
    this.name = name;
    this.root.innerHTML = `<style>${Screens.css}</style><section class="secondary-screen" aria-label="${({book:'마법 도감',report:'나의 작업 기록',settings:'설정',free:'자유 공방'})[name]||''}"><header class="secondary-header"><button type="button" class="button secondary screen-back" aria-label="이전 화면">닫기</button><span class="eyebrow">ACCIDENTAL MAGIC WORKSHOP</span></header><div class="secondary-content"></div></section>`;
    this.root.querySelector('.screen-back').onclick = () => { this.stop(); this.onNavigate(this.returnTo); };
    this.content = this.root.querySelector('.secondary-content');
    if (name==='book') this.book();
    if (name==='report') this.report();
    if (name==='settings') this.settings();
    if (name==='free') this.workshop();
    this.root.querySelector('.screen-back').focus({preventScroll:true});
  }
  heading(kicker,title,text) {
    return `<div class="screen-heading"><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${text}</p></div>`;
  }
  badge(earned) {return `<span class="collection-state ${earned?'earned':''}">${earned?'수집 완료':'아직 모으는 중'}</span>`;}
  book() {
    const signs=[1,-1,0,2,-2], english={1:'sharp','-1':'flat',0:'natural',2:'double sharp','-2':'double flat'};
    const rules=RULE_CARDS;
    this.content.innerHTML = this.heading('MY MAGIC COLLECTION','마법 도감','표 다섯 가지와 여덟 가지 규칙을 한 장씩 살펴봐요.')+
      `<section class="book-section"><div class="section-title"><h2>다섯 가지 표</h2><span>${this.save.cards.signs.length} / 5 수집</span></div><div class="sign-book-grid">${signs.map((a,i)=>`<article class="sign-book-card"><button class="sign-book-main" data-sign="${a}" aria-expanded="false"><span class="card-seal">${Visuals.sign(a,42)}</span><strong>${signKo(a,this.save.settings.names)}</strong><span>${signKo(a,'ko')} · ${english[a]}</span><b class="notch-label">${a>0?'+':''}${a}칸</b>${this.badge(this.save.cards.signs.includes(a))}<span class="card-flip-hint">눌러서 살펴보기</span></button><div class="sign-detail" hidden><span>G4에 붙이면 자연음에서 ${notchKo(a)}${a?' 보내요':'에 놓아요'}.</span><span class="mini-keyboard" data-mini="${i}"></span><button class="button secondary mini-listen" data-listen-sign="${a}">소리 듣기</button></div></article>`).join('')}</div></section>`+
      `<section class="book-section"><div class="section-title"><h2>공방의 여덟 규칙</h2><span>${this.save.cards.rules.length} / 8 수집</span></div><div class="rule-book-grid">${rules.map((r,i)=>`<button class="rule-book-card" data-rule="${r.id}" aria-expanded="false"><span class="rule-icon">${Screens.ruleIcon(i)}</span><span class="rule-text"><strong>${r.title}</strong><span>${this.save.cards.rules.includes(r.id)?'수집한 규칙':'의뢰를 한 번에 맞혀 규칙 카드를 모아요.'}</span></span><span class="rule-detail" hidden></span></button>`).join('')}</div></section>`+
      `<section class="book-section"><div class="section-title"><h2>다시 보는 발견</h2><span>7개의 작은 실험</span></div><div class="scene-grid">${Object.entries(SCENES).map(([id,s],i)=>`<button class="scene-card" data-scene="${id}"><span class="scene-symbol">${Visuals.sign([2,1,0,1,-1,1,0][i],25)}</span><span><strong>${['두 칸의 마법','반음은 바로 옆 건반','표는 더하지 않아요','빛띠가 닿는 곳','마디선과 옥타브','조표라는 문패','유지 통로와 선율길'][i]}</strong><span>${s.text.split('.')[0]}.</span></span></button>`).join('')}</div></section>`;
    this.content.querySelectorAll('[data-sign]').forEach(button=>button.onclick=()=>{
      const a=Number(button.dataset.sign), detail=button.closest('.sign-book-card').querySelector('.sign-detail'), opening=detail.hidden;
      detail.hidden=!opening; button.setAttribute('aria-expanded',String(opening)); button.classList.toggle('is-open',opening);
      if(opening){
        Visuals.keyboard(detail.querySelector('.mini-keyboard'),{panes:[{lo:65,hi:71}],whites:4},{selected:midiOf(4,4,a),compact:true,onPress:()=>{},onRelease:()=>{}});
        detail.querySelectorAll('button[data-midi]').forEach(key=>{key.tabIndex=-1;key.setAttribute('aria-hidden','true');});
      }
    });
    this.content.querySelectorAll('[data-listen-sign]').forEach(button=>button.onclick=async()=>{const token=this.runToken;await this.audio.unlock();if(token===this.runToken)this.audio.playNote(midiOf(4,4,Number(button.dataset.listenSign)),.7);});
    const ruleScenes=['S2','S3','S4','S5','S5','S6','S7','S7'];
    const actual={R1:'건반의 색과 상관없이 바로 옆 건반이 반음 한 칸이에요.',R2:'옛 악보에서는 더블샵을 샵으로 바꿀 때 내추럴과 샵을 나란히 적기도 해요. 요즘은 샵만 적어요.',R3:'임시표 앞에 있던 음에는 그 표가 닿지 않아요.',R4:'다른 옥타브에 괄호 친 주의표를 덧붙이기도 해요. 소리를 바꾸지는 않아요.',R5:'마디선 뒤에 괄호 친 내추럴로 표가 풀렸음을 알려 주기도 해요.',R6:'조표는 같은 음이름의 모든 옥타브에 적용돼요.',R7:'줄이 바뀌는 붙임줄에서 이어받는 음에 표를 다시 적는 악보도 있어요.',R8:'이음줄 안의 새 음도 조표와 그 마디의 표를 읽어요.'};
    this.content.querySelectorAll('[data-rule]').forEach((button,i)=>button.onclick=()=>{
      const detail=button.querySelector('.rule-detail'), opening=detail.hidden;
      detail.hidden=!opening; button.setAttribute('aria-expanded',String(opening));
      if(opening){detail.innerHTML=`<span class="mini-score"></span><span>${SCENES[ruleScenes[i]].text}</span><span class="actual-note"><b>실제 악보에서는</b> ${actual[button.dataset.rule]}</span>`;Visuals.score(detail.querySelector('.mini-score'),parseScore(SCENES[ruleScenes[i]].rows[0]),{showBand:true});}
    });
    this.content.querySelectorAll('[data-scene]').forEach(button=>button.onclick=()=>{this.stop();this.onScene(button.dataset.scene);});
  }
  report() {
    const cats={sym:'기호 인식',semi:'반음 계산',reach:'적용 범위',notate:'악보 표기'}, catdesc={sym:'다섯 표의 모양과 눈금',semi:'자연음에서 센 반음 수',reach:'마디 · 옥타브 · 조표 · 곡선',notate:'필요한 표 쓰기와 악보 수리'};
    const causes=Object.entries(this.save.stats.causes).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const total=Object.values(this.save.stats.cat).reduce((s,v)=>s+v[1],0), full=Object.values(this.save.stats.cat).reduce((s,v)=>s+v[0],0);
    this.content.innerHTML=this.heading('MY WORKSHOP JOURNAL','나의 작업 기록','판단 기록과 손 기록을 따로 살펴봐요. 모든 기록은 이 기기에만 남아요.')+
      `<div class="report-overview"><div><b>${total}</b><span>판단한 의뢰</span></div><div><b>${total?Math.round(full/total*100)+'%':'–'}</b><span>첫 판단 정답률</span></div><div><b>${Object.values(this.save.days).filter(d=>d.passed).length}</b><span>완료한 작업일</span></div></div>`+
      `<section class="panel report-panel"><h2>네 갈래의 배움</h2>${Object.entries(cats).map(([id,title])=>{const [right,count]=this.save.stats.cat[id],pct=count?Math.round(right/count*100):0;return `<div class="stat-row"><div><strong>${title}</strong><span>${count?right+' / '+count+' 한 번에 맞힘':'아직 기록이 없어요'}</span></div><div class="stat-track" role="meter" aria-label="${title}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><p>${catdesc[id]}</p></div>`;}).join('')}</section>`+
      `<section class="panel report-panel"><h2>자주 걸린 함정</h2><p class="section-description">틀린 답도 다음 배움의 실마리가 돼요.</p>${causes.length?causes.map(([code,count])=>`<button class="cause-row" data-cause="${code}"><span>${Screens.causes[code]||'다른 답을 골랐어요'}</span><b>${count}번</b></button>`).join(''):'<div class="empty-record">아직 기록된 함정이 없어요. 의뢰를 시작해 보세요.</div>'}</section>`+
      `<section class="panel report-panel"><h2>작업일 도장</h2><div class="stamp-grid">${DAYS.map((day,i)=>{const record=this.save.days[day.id]||{stamp:0,best:0};return `<div class="day-stamp ${record.stamp?'stamped':''}"><span class="stamp-art">${Screens.stamp(record.stamp)}</span><strong>${i}단</strong><span>${record.stamp===2?'매끈 도장':record.stamp?'공방 도장':'아직 도장 없음'}</span><small>최고 ${record.best||0} / ${day.list.length}</small></div>`;}).join('')}</div></section>`+
      `<p class="report-foot">판단에 걸린 평균 시간 ${this.save.stats.orders?Math.round(this.save.stats.ms/this.save.stats.orders/1000)+'초':'–'} · 속도는 참고만 해요.</p>`;
    this.content.querySelectorAll('[data-cause]').forEach(button=>button.onclick=()=>{this.render('book',{returnTo:'report'});const rule=RULE_CARDS.find(r=>r.aims.includes(button.dataset.cause));if(rule){const target=this.content.querySelector(`[data-rule="${rule.id}"]`);target.click();target.scrollIntoView({behavior:'smooth',block:'center'});}});
  }
  settings() {
    const s=this.save.settings;
    const toggle=(key,label,description)=>`<label class="setting-row"><span><strong>${label}</strong><small>${description}</small></span><input type="checkbox" data-setting="${key}" ${s[key]?'checked':''}><span class="switch-art" aria-hidden="true"></span></label>`;
    this.content.innerHTML=this.heading('MAKE YOURSELF AT HOME','공방 설정','편한 소리와 움직임으로 배워요.')+
      `<section class="panel settings-panel"><h2>소리</h2><label class="setting-row volume-row"><span><strong>소리 크기</strong><small>건반 소리의 크기</small></span><input type="range" min="0" max="100" value="${Math.round(s.volume*100)}" data-setting="volume" aria-label="소리 크기"><output>${Math.round(s.volume*100)}%</output></label>${toggle('muted','음소거','소리 없이도 모든 판단 의뢰를 풀 수 있어요.')}${toggle('slow','느리게 듣기','예약 재생을 분당 54박으로 들려줘요.')}</section>`+
      `<section class="panel settings-panel"><h2>화면과 이름</h2><label class="setting-row"><span><strong>표의 이름</strong><small>수업에서 익숙한 이름을 골라요.</small></span><select data-setting="names"><option value="loan" ${s.names==='loan'?'selected':''}>샵 · 플랫</option><option value="ko" ${s.names==='ko'?'selected':''}>올림표 · 내림표</option></select></label>${toggle('solfege','도레미 함께 적기','영문 음이름 아래에 계이름을 함께 보여 줘요.')}<label class="setting-row"><span><strong>움직임</strong><small>시소와 구슬의 움직임</small></span><select data-setting="motion"><option value="system" ${s.motion==='system'?'selected':''}>기기 설정 따르기</option><option value="reduced" ${s.motion==='reduced'?'selected':''}>움직임 줄이기</option><option value="full" ${s.motion==='full'?'selected':''}>모두 보기</option></select></label></section>`+
      `<section class="panel settings-panel"><h2>학습 도우미</h2><div class="setting-row"><span><strong>튜토리얼 다시 보기</strong><small>첫 안내와 소리 확인을 다시 시작해요.</small></span><button class="button secondary" data-action="tutorial">다시 보기</button></div><div class="setting-row"><span><strong>공방 자가검사</strong><small>이론 엔진과 의뢰 출제 규칙을 확인해요.</small></span><span class="test-summary">${Screens.testSummary()}</span></div><p class="setting-note" role="status" id="settings-notice">${typeof Store!=='undefined'&&Store.available===false?'이 기기에서는 기록이 저장되지 않아요. 화면을 닫으면 기록이 사라져요.':'진행과 설정은 이 기기에 자동으로 저장돼요.'}</p></section>`+
      `<section class="panel settings-panel danger-panel"><div class="setting-row"><span><strong>학습 기록 지우기</strong><small>도장, 도감 수집, 정답률과 진행 기록이 초기화돼요.</small></span><button class="button secondary danger-button" data-action="clear">기록 지우기</button></div><div id="clear-confirm" hidden><p>이 기기에 저장한 학습 기록을 모두 지울까요?</p><div class="inline-actions"><button class="button secondary" data-action="cancel-clear">돌아가기</button><button class="button primary danger-button" data-action="confirm-clear">모두 지우기</button></div></div></section>`;
    this.content.querySelectorAll('[data-setting]').forEach(input=>{
      const update=()=>{const key=input.dataset.setting,value=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value)/100:input.value;this.save.settings[key]=value;if(key==='volume')input.nextElementSibling.textContent=Math.round(value*100)+'%';this.onSave(this.save);if(this.onChangeSettings)this.onChangeSettings(this.save.settings);};
      input.addEventListener(input.type==='range'?'input':'change',update);
    });
    this.content.querySelector('[data-action="tutorial"]').onclick=()=>{this.save.settings.tutorialSeen=false;this.onSave(this.save);this.stop();if(this.onTutorial)this.onTutorial();else if(this.onStartDay)this.onStartDay(0);else this.onNavigate('map');};
    this.content.querySelector('[data-action="clear"]').onclick=()=>{this.content.querySelector('#clear-confirm').hidden=false;this.content.querySelector('[data-action="confirm-clear"]').focus();};
    this.content.querySelector('[data-action="cancel-clear"]').onclick=()=>{this.content.querySelector('#clear-confirm').hidden=true;};
    this.content.querySelector('[data-action="confirm-clear"]').onclick=()=>{const settings={...this.save.settings},fresh=Store.defaults();Object.keys(this.save).forEach(k=>delete this.save[k]);Object.assign(this.save,fresh);this.save.settings=settings;this.onSave(this.save);this.settings();this.content.querySelector('#settings-notice').textContent='학습 기록을 지웠어요. 새 작업일을 시작할 수 있어요.';};
  }
  static testSummary() {
    const t=window.__tests;
    if(!t)return '검사 준비 중';
    if(Array.isArray(t)){const pass=t.filter(x=>x.pass||x.ok).length;return `${pass} / ${t.length} 통과`;}
    if(typeof t==='object'){if(t.passed!==undefined&&t.total!==undefined)return `${t.passed} / ${t.total} 통과`;if(t.pass!==undefined&&t.total!==undefined)return `${t.pass} / ${t.total} 통과`;}
    return '검사 결과 보기';
  }
  workshop() {
    if(!this.free){const count=this.root.clientWidth<360?4:6,mn=count/2;this.free={sc:parseScore(`k0 ${mn}/4 | ${Array(mn).fill('G4/4').join(' ')} | ${Array(mn).fill('G4/4').join(' ')} |`),i:0,model:'ADD'};}
    const f=this.free;
    this.content.innerHTML=this.heading('YOUR LITTLE MUSIC LAB','자유 공방','음표와 표를 바꿔 보세요. 채점 없이 소리의 규칙을 실험해요.')+
      `<div class="free-toolbar"><label><span>문패 · 조표</span><select id="free-key">${Array.from({length:7},(_,j)=>j-3).map(k=>`<option value="${k}" ${f.sc.key===k?'selected':''}>${k<0?'플랫 '+Math.abs(k)+'개':k>0?'샵 '+k+'개':'조표 없음'}</option>`).join('')}</select></label><button class="button secondary" id="free-reset">처음 악보</button></div>`+
      `<section class="panel free-score-panel"><div class="free-score"></div><div class="free-slot-picker" aria-label="편집할 자리">${f.sc.notes.map((n,i)=>`<button class="free-slot" data-free-slot="${i}" aria-label="${i+1}번째 ${n.rest?'쉼표':'음표'}" aria-pressed="${i===f.i}">${i+1}</button>`).join('')}</div><p class="free-score-caption">악보의 음표나 자리 번호를 눌러 고른 뒤 아래에서 바꿔요.</p><div class="free-device"></div></section>`+
      `<section class="panel free-editor"><div class="free-note-row"><strong id="free-note-label"></strong><div><button class="button secondary" data-free="down" aria-label="음표 한 줄·칸 내리기">아래로</button><button class="button secondary" data-free="up" aria-label="음표 한 줄·칸 올리기">위로</button></div></div><div class="free-cards">${[null,1,-1,0,2,-2].map(a=>`<button class="button secondary free-acc" data-acc="${a===null?'none':a}" aria-pressed="false" aria-label="${a===null?'표 없음':signKo(a,this.save.settings.names)}">${a===null?'<span>없음</span>':Visuals.sign(a,25)}</button>`).join('')}</div><div class="inline-actions"><button class="button secondary" data-free="rest">쉼표</button><button class="button secondary" data-free="tie">붙임줄</button></div><p class="free-status" role="status">음이름은 그대로, 소리 구슬의 자리가 바뀌어요.</p></section>`+
      `<section class="panel free-listen-panel"><div class="free-keyboard"></div><div class="inline-actions"><button class="button primary" id="free-listen">들어 보기</button><button class="button secondary" id="free-stop">멈추기</button></div></section>`+
      `<section class="panel free-compare-panel"><h2>오개념 비추기</h2><p>같은 악보를 다르게 읽으면 어떤 소리가 날까요?</p><label class="compare-label"><span>다르게 읽는 규칙</span><select id="free-model">${Object.keys(MODELS).map(code=>`<option value="${code}" ${code===f.model?'selected':''}>${Screens.causes[code]}</option>`).join('')}</select></label><button class="button secondary" id="free-compare">표준 소리와 비교 듣기</button><p class="compare-status" role="status"></p></section>`;
    this.freeScore=this.content.querySelector('.free-score');
    Visuals.score(this.freeScore,f.sc,{selected:[f.i],showBand:true,onNote:i=>{this.stop();f.i=i;this.drawFree();}});
    this.drawFree();
    this.content.querySelectorAll('[data-free-slot]').forEach(button=>button.onclick=()=>{this.stop();f.i=Number(button.dataset.freeSlot);this.drawFree();});
    this.content.querySelector('#free-key').onchange=e=>{this.stop();f.sc.key=Number(e.target.value);this.drawFree(true);};
    this.content.querySelector('#free-model').onchange=e=>{this.stop();f.model=e.target.value;this.updateCompare();};
    this.content.querySelector('#free-reset').onclick=()=>{this.stop();this.free=null;this.workshop();};
    this.content.querySelectorAll('[data-free]').forEach(button=>button.onclick=()=>this.editFree(button.dataset.free));
    this.content.querySelectorAll('[data-acc]').forEach(button=>button.onclick=()=>this.editFree('acc',button.dataset.acc==='none'?null:Number(button.dataset.acc)));
    this.content.querySelector('#free-listen').onclick=()=>this.playFree(false);
    this.content.querySelector('#free-compare').onclick=()=>this.playFree(true);
    this.content.querySelector('#free-stop').onclick=()=>{this.stop();this.drawFree();this.freeStatus('재생을 멈췄어요.');};
    this.updateCompare();
  }
  freeStatus(text) {const node=this.content.querySelector('.free-status');if(node)node.textContent=text;}
  drawFree(rebuild=false) {
    const f=this.free,n=f.sc.notes[f.i],ev=evaluate(f.sc);
    if(rebuild)Visuals.score(this.freeScore,f.sc,{selected:[f.i],showBand:true,onNote:i=>{this.stop();f.i=i;this.drawFree();}});
    else Visuals.updateScore(this.freeScore,{selected:[f.i],active:null,showBand:true});
    this.content.querySelectorAll('[data-free-slot]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.freeSlot)===f.i)));
    this.content.querySelector('#free-note-label').textContent=`${f.i+1}번째 ${n.rest?'쉼표':LETTERS[n.L]+n.o}`;
    this.content.querySelectorAll('[data-acc]').forEach(b=>b.setAttribute('aria-pressed',String(!n.rest&&(b.dataset.acc==='none'?n.acc===null:Number(b.dataset.acc)===n.acc))));
    this.content.querySelector('[data-free="rest"]').setAttribute('aria-pressed',String(n.rest));
    this.content.querySelector('[data-free="tie"]').setAttribute('aria-pressed',String(n.tie));
    let need=f.sc.notes.map((x,i)=>!x.rest?ev[i].midi:null).filter(x=>x!==null);if(!need.length)need=[65,67,69];
    let lo=Math.min(...need)-1,hi=Math.max(...need)+1;while(!isWhite(lo))lo--;while(!isWhite(hi))hi++;
    while(Array.from({length:hi-lo+1},(_,j)=>lo+j).filter(isWhite).length<3)hi++;
    Visuals.keyboard(this.content.querySelector('.free-keyboard'),{panes:[{lo,hi}],whites:Array.from({length:hi-lo+1},(_,j)=>lo+j).filter(isWhite).length},{selected:ev[f.i].midi,solfege:this.save.settings.solfege,onPress:m=>{this.audio.unlock();this.freeVoice.set(m,this.audio.press(m));},onRelease:m=>{this.audio.release(this.freeVoice.get(m));this.freeVoice.delete(m);}});
    const visibleNote=n.rest?f.sc.notes.find(x=>!x.rest):n;
    if(visibleNote)Visuals.device(this.content.querySelector('.free-device'),visibleNote,n.rest?null:ev[f.i],{show:true,showChips:true,score:f.sc,index:f.i});
    this.updateCompare();
  }
  editFree(action,acc) {
    this.stop();const f=this.free,copy=structuredClone(f.sc),n=copy.notes[f.i],previous=copy.notes[f.i-1];
    if(action==='up'||action==='down'){
      if(n.rest){n.rest=false;n.L=4;n.o=4;n.acc=null;}
      const next=stepOf(n.L,n.o)+(action==='up'?1:-1);if(next<RANGE[0]||next>RANGE[1])return this.freeStatus('공방의 음역은 B3부터 B5까지예요.');n.L=((next%7)+7)%7;n.o=Math.floor(next/7);
    }
    if(action==='acc'){if(n.rest)return this.freeStatus('쉼표에는 표를 붙일 수 없어요. 먼저 위로 또는 아래로를 눌러 음표로 바꿔요.');n.acc=acc;}
    if(action==='rest'){n.rest=!n.rest;if(n.rest){n.L=-1;n.o=0;n.acc=null;n.tie=false;n.target=false;n.curve=false;}else{n.L=4;n.o=4;n.acc=null;}}
    if(action==='tie'){
      if(n.tie)n.tie=false;else{const next=copy.notes[f.i+1];if(n.rest||!next||next.rest||!sameSlot(n,next))return this.freeStatus('같은 줄·칸의 이웃한 두 음만 붙임줄로 이을 수 있어요.');if(next.acc!==null)return this.freeStatus('이어받는 음에는 새 표가 없어야 해요. 다음 음의 표를 없음으로 바꿔요.');n.tie=true;}
    }
    if(previous&&previous.tie&&(!sameSlot(previous,n)||n.acc!==null))return this.freeStatus('붙임줄로 이어받는 음이에요. 먼저 앞 음의 붙임줄을 풀어 주세요.');
    if(n.tie&&(!copy.notes[f.i+1]||!sameSlot(n,copy.notes[f.i+1])))return this.freeStatus('붙임줄을 먼저 풀고 음높이를 바꿔요.');
    const bad=check(copy);if(bad.length)return this.freeStatus('이 자리에는 붙임줄을 놓을 수 없어요. 이웃한 음과 새 표를 확인해요.');
    f.sc=copy;this.drawFree(true);this.freeStatus(action==='tie'?(n.tie?'소리를 끊지 않고 이어요. 마디 기억과는 달라요.':'붙임줄을 풀었어요.'):'악보를 바꿨어요. 들어 보기로 확인해요.');
  }
  updateCompare() {
    const node=this.content.querySelector('.compare-status');if(!node||!this.free)return;
    const correct=evaluate(this.free.sc),wrong=evaluate(this.free.sc,MODELS[this.free.model]);
    const changed=correct.filter((r,i)=>!r.rest&&(r.midi!==wrong[i].midi||r.onset!==wrong[i].onset)).map(r=>r.i+1);
    if(this.freeScore)this.freeScore.querySelectorAll('[data-v-hit]').forEach(el=>el.classList.toggle('free-different',changed.includes(Number(el.dataset.vHit)+1)));
    node.textContent=changed.length?`${changed.join(', ')}번째 음의 소리 또는 새 발음이 달라져요.`:'지금 악보에서는 두 읽기가 같아요. 표와 음표를 바꿔 실험해 보세요.';
  }
  async playFree(compare) {
    this.stop();const token=this.runToken,f=this.free,sc=f.sc;
    if(!sc.notes.some(n=>!n.rest))return this.freeStatus('소리를 들어 보려면 음표를 하나 이상 놓아요.');
    await this.audio.unlock();
    if(token!==this.runToken)return;
    const regular=evaluate(sc),wrong=evaluate(sc,MODELS[f.model]);
    const planFor=(ev)=>{let at=F(0),out=[];sc.notes.forEach((n,i)=>{if(!n.rest){if(ev[i].onset||!out.length)out.push({midi:ev[i].midi,at,len:n.dur,notes:[i],legato:false});else{const last=out[out.length-1];last.len=add(last.len,n.dur);last.notes.push(i);}}at=add(at,n.dur);});return out;};
    const first=planFor(regular),total=sc.notes.reduce((t,n)=>add(t,n.dur),F(0));
    let plan=first;
    if(compare){const gap=F(1,sc.md),offset=add(total,gap);plan=first.concat(planFor(wrong).map(x=>({...x,at:add(x.at,offset)})));}
    this.freeStatus(compare?'먼저 표준 소리, 이어서 다르게 읽은 소리가 나와요.':'표준 규칙으로 악보를 연주해요.');
    let lastStep=-1;
    this.playHandle=this.audio.schedule(plan,{md:sc.md,slow:this.save.settings.slow,onStep:(index,event)=>{
      if(index===lastStep||!event)return;lastStep=index;
      const noteIndex=event&&event.notes?event.notes[0]:null;if(noteIndex===null)return;
      const isWrong=compare&&index>=first.length;
      Visuals.updateScore(this.freeScore,{active:noteIndex,selected:[f.i],showBand:true});
      Visuals.updateKeys(this.content.querySelector('.free-keyboard'),{active:event.midi});
      Visuals.device(this.content.querySelector('.free-device'),sc.notes[noteIndex],(isWrong?wrong:regular)[noteIndex],{show:true,showChips:true,score:sc,index:noteIndex});
    },onDone:()=>{this.playHandle=null;this.drawFree();this.freeStatus(compare?'두 가지 소리를 비교했어요. 달라진 음표를 다시 살펴보세요.':'연주를 마쳤어요. 다른 표도 붙여 보세요.');}});
  }
  static ruleIcon(i) {return `<svg viewBox="0 0 36 36" aria-hidden="true"><rect x="3" y="3" width="30" height="30" rx="9" fill="${i<3?'#ebe5fa':i<6?'#e3edf7':'#fff0ca'}"/><path d="M10 ${23-(i%3)*3}h16M10 17h16M18 9v18" fill="none" stroke="#5b3fb0" stroke-width="1.5"/><circle cx="${12+i%3*6}" cy="${23-(i%3)*3}" r="3.5" fill="#f0b429" stroke="#5b3fb0"/></svg>`;}
  static stamp(type) {return `<svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="29" fill="${type?'#ebe5fa':'#f1f2f6'}" stroke="${type?'#5b3fb0':'#c9cfdd'}" stroke-width="2" stroke-dasharray="${type?'2 2':'3 4'}"/><circle cx="36" cy="36" r="23" fill="none" stroke="${type?'#5b3fb0':'#c9cfdd'}"/><path d="M24 36l8 8 16-17" stroke="${type?'#5b3fb0':'#c9cfdd'}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${type===2?'<path d="M36 9l2 5 5 1-4 4 1 5-4-3-5 3 1-5-4-4 6-1z" fill="#f0b429" stroke="#5b3fb0"/>':''}</svg>`;}
}
Screens.css=`
.secondary-screen{height:100%;overflow:auto;color:var(--ink,#1d2433);background:var(--bg,#eef0f6);overscroll-behavior:contain}.secondary-header{max-width:1040px;margin:auto;display:flex;align-items:center;gap:22px;padding:22px 32px;border-bottom:1px solid var(--line,#c9cfdd)}.secondary-header .eyebrow{margin-left:auto;font-size:11px;letter-spacing:1.9px}.secondary-content{width:min(100% - 64px,960px);margin:0 auto;padding:34px 0 64px}.secondary-content h1{font-size:clamp(28px,4vw,40px);letter-spacing:-1.6px;margin:8px 0 12px}.secondary-content h2{font-size:18px;letter-spacing:-.5px;margin:0}.secondary-content p{line-height:1.6}.secondary-content .screen-heading{margin-bottom:30px;display:block}.screen-heading>p:last-child{color:var(--ink-2,#4a5468);font-size:15px;margin:0}.eyebrow{font-size:11px;letter-spacing:2px;font-weight:700;color:var(--magic,#5b3fb0)}.secondary-content .panel{background:#fff;border:1px solid #dce0e9;border-radius:17px;padding:25px}.section-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.section-title>span{font-size:12px;color:#5e6676}.book-section{margin:30px 0}.sign-book-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.sign-book-card{min-width:0;position:relative;display:flex;align-items:center;flex-direction:column;gap:9px;background:#fff;border:1px solid #dce0e9;border-radius:16px;padding:22px 12px 16px;color:#1d2433;cursor:pointer;box-shadow:0 4px 0 #e3e4ed;text-align:center}.sign-book-card:hover,.rule-book-card:hover{border-color:#8f78ce}.sign-book-card>strong{font-size:17px}.sign-book-card>span:not(.card-seal):not(.sign-detail):not(.collection-state){font-size:11px;color:#5b6374}.card-seal{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:#f3effb;color:#5b3fb0;margin:3px 0 9px}.notch-label{font-size:16px;color:#5b3fb0}.collection-state{font-size:11px;border:1px solid #dce0e9;border-radius:20px;padding:4px 7px;color:#606a7b}.collection-state.earned{background:#ebe5fa;border-color:#d6c9f1;color:#5b3fb0}.sign-detail{margin-top:8px;border-top:1px solid #e2dced;padding-top:12px;width:100%;font-size:12px;line-height:1.6}.sign-detail>span{display:block}.sign-detail[hidden],.rule-detail[hidden]{display:none!important}.sign-detail .mini-keyboard{width:100%;margin:10px 0;pointer-events:none}.mini-listen{color:#5b3fb0;font-weight:bold}.rule-book-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rule-book-card{display:flex;align-items:center;flex-wrap:wrap;gap:13px;background:#fff;border:1px solid #dce0e9;border-radius:13px;padding:17px;text-align:left;cursor:pointer;color:#1d2433}.rule-icon{width:39px;flex:none}.rule-text{display:flex;flex-direction:column;gap:7px;flex:1}.rule-text>strong{font-size:14px;line-height:1.5}.rule-text>span{font-size:12px;color:#677083}.rule-detail{display:flex;flex-direction:column;gap:12px;width:100%;border-top:1px solid #e4e0ee;padding-top:12px;font-size:13px;line-height:1.7}.mini-score{display:block;background:#fffaf0;border-radius:7px;max-height:148px;overflow:hidden}.actual-note{background:#f4f2f8;border-radius:7px;padding:10px;color:#4a5468}.actual-note b{display:block;color:#5b3fb0;font-size:12px;margin-bottom:4px}.scene-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.scene-card{display:flex;align-items:center;gap:15px;border:1px solid #dce0e9;border-radius:12px;background:#fff;padding:17px;text-align:left;color:#1d2433;cursor:pointer}.scene-symbol{width:41px;height:45px;display:grid;place-items:center;background:#fff4d4;border-radius:10px;flex:none;color:#8e5f08}.scene-card>span:last-child{display:flex;flex-direction:column;gap:5px}.scene-card strong{font-size:14px}.scene-card>span:last-child>span{font-size:12px;line-height:1.5;color:#5c6677}.report-overview{display:grid;grid-template-columns:repeat(3,1fr);background:#5b3fb0;border-radius:17px;color:#fff;margin:26px 0 18px;padding:28px 16px}.report-overview>div{display:flex;align-items:center;flex-direction:column;gap:10px;border-right:1px solid #ffffff35}.report-overview>div:last-child{border:0}.report-overview b{font-size:32px;font-weight:650}.report-overview span{font-size:12px;color:#f0eaff}.report-panel{margin:18px 0}.report-panel h2{margin-bottom:20px}.stat-row{padding:15px 0}.stat-row>div:first-child{display:flex;justify-content:space-between;font-size:14px}.stat-row>div:first-child>span{font-size:12px;color:#60697a}.stat-track{height:9px;background:#eeebf5;border-radius:5px;margin:12px 0 6px;overflow:hidden}.stat-track i{display:block;height:100%;background:#8166c2;border-radius:5px}.stat-row p{font-size:12px;color:#687184;margin:0}.section-description{font-size:13px;color:#5e6676;margin-top:-10px}.cause-row{display:flex;justify-content:space-between;gap:12px;width:100%;background:#f7f5fb;border:0;border-radius:9px;padding:14px;font-size:14px;text-align:left;margin-top:9px;color:#4c397e;cursor:pointer}.cause-row b{white-space:nowrap}.empty-record{padding:20px;background:#f7f5fb;border-radius:9px;color:#5e6676;font-size:14px}.stamp-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:7px}.day-stamp{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}.stamp-art{display:block;width:64px}.day-stamp strong{font-size:14px}.day-stamp>span:not(.stamp-art){font-size:11px;color:#697183}.day-stamp small{font-size:11px;color:#697183}.report-foot{text-align:center;font-size:12px;color:#687184}.settings-panel{margin:18px 0}.settings-panel>h2{padding-bottom:10px}.setting-row{display:flex;align-items:center;gap:14px;min-height:80px;border-bottom:1px solid #ececf1;position:relative}.setting-row:last-child{border-bottom:0}.setting-row>span:first-child{display:flex;flex-direction:column;gap:7px;flex:1}.setting-row strong{font-size:14px}.setting-row small{font-size:12px;font-weight:400;color:#687184;line-height:1.6}.setting-row input[type=checkbox]{position:absolute;right:0;width:47px;height:30px;opacity:0;z-index:2;cursor:pointer}.switch-art{display:block;width:45px;height:26px;background:#b7becc;border-radius:20px;flex:none;position:relative}.switch-art:before{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;background:#fff;border-radius:50%;box-shadow:0 1px 3px #0002;transition:transform .15s}.setting-row input:checked+.switch-art{background:#5b3fb0}.setting-row input:checked+.switch-art:before{transform:translateX(19px)}.setting-row input:focus-visible+.switch-art{outline:3px solid #ac95df;outline-offset:4px}.setting-row select,.free-toolbar select,.compare-label select{font:inherit;font-size:13px;color:#35294f;background:#f6f3fb;border:1px solid #d8d0e6;min-height:44px;padding:9px 26px 9px 12px;border-radius:8px;max-width:230px;appearance:none;background-image:linear-gradient(45deg,transparent 50%,#6e5b91 50%),linear-gradient(135deg,#6e5b91 50%,transparent 50%);background-position:calc(100% - 15px) 19px,calc(100% - 11px) 19px;background-size:4px 4px;background-repeat:no-repeat}.volume-row input{width:180px;accent-color:#5b3fb0}.volume-row output{font-size:12px;min-width:35px}.setting-note{font-size:12px;color:#637084;background:#f6f5fa;padding:14px;border-radius:8px}.test-summary{font-size:13px;color:#256f43;background:#edf6ee;padding:8px 10px;border-radius:8px}.danger-panel strong,.danger-button{color:#ab3626!important}.danger-panel #clear-confirm{padding:5px 0 12px}.danger-panel #clear-confirm p{color:#ab3626;font-size:14px}.inline-actions{display:flex;gap:8px;flex-wrap:wrap}.free-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:20px 0 16px}.free-toolbar label{display:flex;align-items:center;gap:12px;font-size:13px}.free-score-panel{background:#fffaf0!important;padding:10px 18px 16px!important}.free-score{height:175px}.free-score-caption{text-align:center;font-size:12px;color:#687184;margin:0 0 12px}.free-device{min-height:87px;max-width:500px;margin:auto}.free-editor{margin:16px 0}.free-note-row{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:16px}.free-note-row>strong{font-size:15px}.free-note-row>div{display:flex;gap:7px}.free-cards{display:flex;justify-content:center;gap:9px;margin:16px 0}.free-acc{width:56px!important;min-width:44px!important;min-height:52px!important;padding:6px!important}.free-acc[aria-pressed=true],.free-editor [data-free][aria-pressed=true]{background:#ebe5fa!important;border-color:#5b3fb0!important;color:#5b3fb0!important}.free-status{font-size:13px;color:#5b3fb0;margin:16px 0 0;min-height:22px}.free-listen-panel{margin:16px 0}.free-listen-panel>.inline-actions{justify-content:center;margin-top:20px}.free-keyboard{max-width:520px;margin:auto}.free-compare-panel{margin-top:16px}.free-compare-panel>p{font-size:13px;color:#627084}.compare-label{display:flex;flex-direction:column;gap:8px;font-size:12px;color:#5c6677;margin:18px 0 14px}.compare-label select{max-width:100%;width:100%}.compare-status{font-size:12px;color:#5b3fb0;line-height:1.6;min-height:20px}.secondary-content button:focus-visible{outline:3px solid #ac95df;outline-offset:3px}.secondary-content [hidden]{display:none!important}
@media(max-width:650px){.secondary-header{padding:15px 17px}.secondary-header .eyebrow{font-size:9px;letter-spacing:.9px}.secondary-content{width:calc(100% - 32px);padding-top:24px}.secondary-content .panel{padding:19px}.sign-book-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.sign-book-card{padding:17px 7px 13px}.sign-book-card>strong{font-size:15px}.sign-book-card>span:not(.card-seal):not(.sign-detail):not(.collection-state){font-size:10px}.card-seal{width:58px;height:58px;margin-bottom:4px}.rule-book-grid,.scene-grid{grid-template-columns:1fr}.stamp-grid{grid-template-columns:repeat(4,1fr);row-gap:22px}.setting-row{gap:9px;min-height:87px}.setting-row select{max-width:132px;font-size:12px}.volume-row input{width:95px}.volume-row output{min-width:29px}.setting-row small{max-width:210px}.free-toolbar label{gap:8px;flex-direction:column;align-items:start}.free-cards{gap:5px}.free-acc{width:44px!important}.free-score{height:150px}.free-note-row>div .button{font-size:12px;padding:8px}.free-score-panel{padding:5px 8px 14px!important}.free-status{font-size:12px}.section-title h2{font-size:17px}.secondary-content .button{font-size:13px;min-height:44px}.secondary-content .button.primary{min-height:52px}}
@media(prefers-reduced-motion:reduce){.switch-art:before{transition:none}}
`;

Screens.css+=`
.free-score [data-v-hit].free-different{stroke:#b4530a;stroke-width:1.8px;stroke-dasharray:4 3;fill:#f0b42912}.sign-book-main{display:flex;align-items:center;flex-direction:column;gap:9px;width:100%;border:0;padding:0;background:none;color:inherit;cursor:pointer}.sign-book-main>strong{font-size:17px}.sign-book-main>span:not(.card-seal):not(.collection-state){font-size:12px;color:#5b6374}.sign-book-main:focus-visible{border-radius:8px}.secondary-content .eyebrow,.secondary-header .eyebrow,.collection-state,.sign-book-card>span,.day-stamp>span:not(.stamp-art),.day-stamp small{font-size:12px!important}.secondary-content .card-flip-hint{font-size:12px!important}.mini-listen{margin-top:5px}.free-slot-picker{display:flex;justify-content:center;gap:7px;margin:0 0 12px}.free-slot{min-width:38px;min-height:44px;border:1px solid #d4c8e8;background:#fffaf0;color:#5b3fb0;font:inherit;font-size:13px;border-radius:8px;cursor:pointer}.free-slot[aria-pressed=true]{background:#ebe5fa;border-color:#5b3fb0;font-weight:700}@media(max-width:650px){.secondary-header .eyebrow{max-width:165px;text-align:right;font-size:12px!important;letter-spacing:.6px;line-height:1.5}.sign-book-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sign-book-main>strong{font-size:16px}.free-slot-picker{gap:5px}.free-slot{min-width:36px}.sign-book-main>span{font-size:12px!important}}
`;

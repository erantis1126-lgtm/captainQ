// 술자리 게임: 캪틴큐 OX 퀴즈, 폭탄 돌리기, 업다운, 벌칙 룰렛.
// 벌칙은 가볍게. 마시는 양을 겨루는 게임은 넣지 않는다.
(() => {
  'use strict';
  const CQ = window.CQ;
  if (!CQ) return;
  const { $, esc, toast, track } = CQ;
  const root = $('#gamesApp');

  const PENALTIES = [
    '물 한 잔 원샷', '노래 한 소절', '옆 사람 칭찬 세 개', '성대모사 하나', '다음 판 잔 채우기 담당',
    '한 모금 (패스 가능)', '벌칙 면제권!', '단체 사진 찍기 담당', '사투리로 건배사', '오른쪽 사람이 정하는 벌칙',
  ];
  const penalty = () => PENALTIES[Math.floor(Math.random() * PENALTIES.length)];

  // 기사로 확인한 사실만 넣는다 (아이뉴스24 2026.10.8, SBS Biz 2026.10.18, 블로그로 확인한 검색어 팁).
  const QUIZ = [
    { q: '캪틴큐는 1980년에 처음 나왔다.', a: true, why: '1980년 롯데칠성음료가 처음 출시했어요.' },
    { q: '캪틴큐는 2015년에 단종됐었다.', a: true, why: '2015년 단종됐다가 2026년 10월 돌아왔어요.' },
    { q: '이번 재출시는 단종 5년 만이다.', a: false, why: '11년 만의 복귀예요.' },
    { q: '재출시 캪틴큐의 도수는 25도다.', a: false, why: '35도예요.' },
    { q: '재출시 캪틴큐 한 병 용량은 360mL다.', a: true, why: '360mL예요.' },
    { q: '재출시 캪틴큐는 카리브해 럼 원액을 썼다.', a: true, why: '카리브해 지역 럼 원액을 썼어요.' },
    { q: '1985년에는 들고 다니기 좋은 180mL 제품도 나왔다.', a: true, why: '1985년 휴대성을 높인 180mL 제품이 나왔어요.' },
    { q: '출시 첫해부터 이듬해까지 100만 병이 팔렸다.', a: false, why: '1000만 병이 팔렸어요.' },
    { q: '한정판 ‘보물상자’에는 캪틴큐가 3병 들어 있다.', a: false, why: '2병과 전용잔, 기념주화가 들어 있어요.' },
    { q: '보물상자 일부에는 순은 기념주화가 들어 있다.', a: true, why: '1980세트에 1.5돈 상당의 순은 주화가 들어 있어요.' },
    { q: '보물상자 한정판은 총 1만2000세트다.', a: true, why: '총 1만2000세트 한정이에요.' },
    { q: '편의점 가격은 한 병 9,900원이다. (세븐일레븐 발표 기준)', a: true, why: '세븐일레븐 발표 기준 9,900원이에요.' },
    { q: '버번 위스키를 숙성하던 오크통에서 숙성했다.', a: true, why: '버번 캐스크에서 1차, 페드로 히메네스 셰리 캐스크에서 추가 숙성했어요.' },
    { q: '편의점 앱에서는 ‘캡틴큐’로 검색해야 잘 나온다.', a: false, why: '‘캪틴큐’(ㅍ받침)로 검색해야 해요.' },
  ];
  const CATEGORIES = ['편의점 상품 이름', '바다에 사는 것', '과일 이름', '초록색인 것', '보물상자에 들어 있을 것',
    '해적이 할 법한 말', '술안주', '노래 제목', '라면 이름', '서울 지하철역', '아이돌 그룹', '나라 이름'];

  let timers = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const stopAll = () => { timers.forEach(clearTimeout); timers = []; };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const buzz = p => { try{ navigator.vibrate && navigator.vibrate(p); }catch{} };
  const top = title => `<div class="g-top"><button type="button" data-g="menu">← 게임 목록</button><h3>${title}</h3></div>`;
  const penBox = who => `<div class="g-pen"><small>${who} 벌칙</small><b>${esc(penalty())}</b></div>`;
  const foot = '<p class="g-foot">벌칙은 다 같이 정하고, 술은 각자 페이스대로. 물도 같이 마셔요.</p>';

  // ---------- 메뉴 ----------
  function menu(){
    stopAll();
    root.innerHTML = `
      <h2 class="fx-h">캪틴큐 술게임</h2>
      <p class="fx-sub">폰 하나로 다 같이. 벌칙은 가볍게!</p>
      <div class="g-grid">
        <button class="g-card" type="button" data-g="quiz"><span class="ic">⭕</span><b>캪틴큐 OX 퀴즈</b><small>다 같이 O·X를 외치고 정답 공개. 틀리면 벌칙</small></button>
        <button class="g-card" type="button" data-g="bomb"><span class="ic">💣</span><b>폭탄 돌리기</b><small>주제에 맞는 단어 말하고 폰 넘기기. 터지면 벌칙</small></button>
        <button class="g-card" type="button" data-g="updown"><span class="ic">🔢</span><b>업다운</b><small>1~100 숫자 맞히기. 맞힌 사람이 벌칙 지목</small></button>
        <button class="g-card" type="button" data-g="wheel"><span class="ic">🎡</span><b>벌칙 룰렛</b><small>이름 넣고 돌리면 당첨자와 벌칙이 한 번에</small></button>
      </div>
      ${foot}`;
  }

  // ---------- OX 퀴즈 ----------
  let deck = [], qi = 0;
  function quizStart(){ deck = shuffle(QUIZ); qi = 0; quizShow(); }
  function quizShow(){
    const it = deck[qi];
    root.innerHTML = `${top('캪틴큐 OX 퀴즈')}
      <div class="fx-card">
        <p class="fx-note" style="margin:0">${qi + 1} / ${deck.length} · 다 같이 손으로 O 또는 X!</p>
        <p class="g-q">${esc(it.q)}</p>
        <button class="btn primary fx-btn" type="button" data-g="reveal">정답 공개</button>
      </div>${foot}`;
  }
  function quizReveal(){
    const it = deck[qi];
    track('game_quiz_reveal');
    root.querySelector('[data-g=reveal]').outerHTML = `
      <div class="g-ox"><button type="button" class="o" ${it.a ? '' : 'style="opacity:.25"'} tabindex="-1">O</button><button type="button" class="x" ${it.a ? 'style="opacity:.25"' : ''} tabindex="-1">X</button></div>
      <div class="g-ans ${it.a ? 'ok' : 'bad'}">정답은 <b>${it.a ? 'O' : 'X'}</b> · ${esc(it.why)}</div>
      ${penBox('틀린 사람')}
      <button class="btn primary fx-btn" type="button" data-g="next">${qi + 1 < deck.length ? '다음 문제' : '처음부터 다시'}</button>`;
  }

  // ---------- 폭탄 돌리기 ----------
  function bombIntro(){
    root.innerHTML = `${top('폭탄 돌리기')}
      <div class="fx-card fx-center">
        <div class="g-bomb">💣</div>
        <p>주제에 맞는 단어를 말하고 옆 사람에게 폰을 넘겨요.<br>언제 터질지는 아무도 몰라요!</p>
        <button class="btn primary fx-btn" type="button" data-g="bombgo">시작</button>
      </div>${foot}`;
  }
  function bombGo(){
    stopAll();
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const ms = 15000 + Math.floor(Math.random() * 30000);
    track('game_bomb_start');
    root.innerHTML = `${top('폭탄 돌리기')}
      <div class="fx-card fx-center">
        <p class="fx-note" style="margin:0">주제</p>
        <p class="g-cat">${esc(cat)}</p>
        <div class="g-bomb tick" id="gBomb">💣</div>
        <p>말하고 넘기세요!</p>
      </div>${foot}`;
    const tickBuzz = () => { buzz(30); later(tickBuzz, 1500); };
    later(tickBuzz, 1500);
    later(() => {
      stopAll();
      buzz([400, 120, 400]);
      track('game_bomb_boom');
      const card = root.querySelector('.fx-card');
      card.innerHTML = `
        <div class="g-bomb boom">💥</div>
        <p class="g-cat">펑! 지금 폰 든 사람!</p>
        ${penBox('폭탄 맞은 사람')}
        <button class="btn primary fx-btn" type="button" data-g="bombgo">한 판 더</button>`;
    }, ms);
  }

  // ---------- 업다운 ----------
  let ud = null;
  function udStart(){
    ud = { n: 1 + Math.floor(Math.random() * 100), lo: 1, hi: 100, tries: 0 };
    track('game_updown_start');
    root.innerHTML = `${top('업다운')}
      <div class="fx-card">
        <p class="g-range" id="gRange">1 ~ 100 사이 숫자를 돌아가며 말해요</p>
        <div class="g-updown" id="gUD">?</div>
        <form class="g-row" id="gUDForm" autocomplete="off">
          <input id="gUDIn" type="number" inputmode="numeric" min="1" max="100" placeholder="숫자 입력" aria-label="숫자">
          <button class="btn primary" type="submit" style="width:auto">확인</button>
        </form>
        <div id="gUDDone"></div>
      </div>${foot}`;
  }
  function udGuess(){
    const inp = $('#gUDIn'); const v = parseInt(inp.value, 10);
    inp.value = '';
    if (!(v >= ud.lo && v <= ud.hi)){ toast(`${ud.lo} ~ ${ud.hi} 사이로 말해 주세요`); return; }
    ud.tries++;
    const el = $('#gUD');
    if (v === ud.n){
      el.textContent = `${v} 정답!`;
      $('#gRange').textContent = `${ud.tries}번 만에 맞혔어요`;
      $('#gUDForm').hidden = true;
      $('#gUDDone').innerHTML = `${penBox('맞힌 사람이 지목한 사람')}<button class="btn primary fx-btn" type="button" data-g="updown">한 판 더</button>`;
      buzz(200);
      return;
    }
    if (v < ud.n){ ud.lo = v + 1; el.textContent = 'UP ▲'; el.style.color = '#1d6fb8'; }
    else { ud.hi = v - 1; el.textContent = 'DOWN ▼'; el.style.color = '#c2410c'; }
    $('#gRange').textContent = `${ud.lo} ~ ${ud.hi} · ${ud.tries}번째`;
    inp.focus();
  }

  // ---------- 벌칙 룰렛 ----------
  const COLORS = ['#0f4433', '#c99a3b', '#1d6fb8', '#c2410c', '#6b2c91', '#0b7a4b', '#d7261e', '#5a3f0b'];
  let wheel = { names: [], rot: 0, spinning: false };
  function wheelIntro(){
    let saved = '';
    try{ saved = localStorage.getItem('cq.wheelNames') || ''; }catch{}
    root.innerHTML = `${top('벌칙 룰렛')}
      <div class="fx-card">
        <label class="fx-field" style="margin-top:0">참가자 이름 (쉼표나 띄어쓰기로 구분)
          <input type="text" id="gNames" value="${esc(saved)}" placeholder="예: 민수, 지영, 철수, 하나">
        </label>
        <div class="g-wheel-wrap"><div class="g-pin"></div><div class="g-wheel" id="gWheel"></div></div>
        <button class="btn primary fx-btn" type="button" data-g="spin">돌리기</button>
        <div id="gWheelRes"></div>
      </div>${foot}`;
    drawWheel();
  }
  function namesNow(){
    const raw = ($('#gNames') && $('#gNames').value) || '';
    const list = raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean).slice(0, 8);
    return list.length >= 2 ? list : ['1번', '2번', '3번', '4번', '5번', '6번'];
  }
  function drawWheel(){
    const w = $('#gWheel'); if (!w) return;
    wheel.names = namesNow();
    const n = wheel.names.length, seg = 360 / n;
    w.style.background = `conic-gradient(${wheel.names.map((_, i) => `${COLORS[i % COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})`;
    w.innerHTML = wheel.names.map((nm, i) => {
      const ang = i * seg + seg / 2;
      return `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(${ang}deg) translateY(-82px);color:#fff;font-weight:800;font-size:14px;text-shadow:0 1px 2px rgba(0,0,0,.5);white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis">${esc(nm)}</span>`;
    }).join('');
    w.style.position = 'relative';
  }
  function spin(){
    if (wheel.spinning) return;
    drawWheel();
    try{ localStorage.setItem('cq.wheelNames', $('#gNames').value); }catch{}
    const n = wheel.names.length, seg = 360 / n;
    const k = Math.floor(Math.random() * n);
    const target = k * seg + seg / 2 + (Math.random() - .5) * seg * .6;
    const cur = ((wheel.rot % 360) + 360) % 360;
    const delta = ((360 - target) - cur + 720) % 360;
    wheel.rot += 360 * 5 + delta;
    wheel.spinning = true;
    $('#gWheelRes').innerHTML = '';
    $('#gWheel').style.transform = `rotate(${wheel.rot}deg)`;
    track('game_wheel_spin', { players: n });
    later(() => {
      wheel.spinning = false;
      buzz(150);
      $('#gWheelRes').innerHTML = `<div class="g-pen"><small>당첨</small><b>${esc(wheel.names[k])}</b><small style="margin-top:6px">벌칙: ${esc(penalty())}</small></div>`;
    }, 3300);
  }

  // ---------- 이벤트 ----------
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    const g = b.dataset.g;
    if (g === 'menu') return menu();
    if (g === 'quiz'){ track('game_start', { game: 'quiz' }); return quizStart(); }
    if (g === 'reveal') return quizReveal();
    if (g === 'next'){ qi = (qi + 1) % deck.length; if (qi === 0) deck = shuffle(QUIZ); return quizShow(); }
    if (g === 'bomb'){ track('game_start', { game: 'bomb' }); return bombIntro(); }
    if (g === 'bombgo') return bombGo();
    if (g === 'updown'){ track('game_start', { game: 'updown' }); return udStart(); }
    if (g === 'wheel'){ track('game_start', { game: 'wheel' }); return wheelIntro(); }
    if (g === 'spin') return spin();
  });
  root.addEventListener('submit', e => { if (e.target.id === 'gUDForm'){ e.preventDefault(); udGuess(); } });
  root.addEventListener('input', e => { if (e.target.id === 'gNames' && !wheel.spinning) drawWheel(); });

  let shown = false;
  CQ.onTab('games', () => { if (!shown){ shown = true; menu(); } });
  // 다른 탭으로 가면 진행 중이던 타이머를 멈추고, 돌아오면 목록부터
  const leave = () => { if (timers.length || wheel.spinning){ stopAll(); wheel.spinning = false; shown = false; } };
  CQ.onTab('find', leave);
  CQ.onTab('memory', leave);
})();

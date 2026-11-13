// 캪틴큐 기억삭제 측정기
// 마신 날 밤: 인증샷 + 닉네임 → 비밀 암호 3개를 외운다.
// 5시간 뒤(다음날 아침): 암호 퀴즈 + 숫자 기억 게임 → 기억삭제율.
// 랭킹은 기억을 많이 지킨 사람(보존 점수 높은 사람)이 1등. 오래 뻗을수록 이기는 구조가 아니다.
(() => {
  'use strict';
  const CQ = window.CQ;
  if (!CQ) return;
  const { $, esc, toast, track, store } = CQ;
  const root = $('#memoryApp');

  // 전체 랭킹 서버(Firebase Firestore). 두 값을 채우면 전체 랭킹이 켜져요.
  // 비워 두면 이 기기의 기록만 보여요. 보안 규칙은 저장소의 firestore.rules 참고.
  const LEADERBOARD = { projectId: '', apiKey: '' };
  const LB_ON = !!(LEADERBOARD.projectId && LEADERBOARD.apiKey);
  const COLL = 'memoryScores';
  const FS = `https://firestore.googleapis.com/v1/projects/${LEADERBOARD.projectId}/databases/(default)/documents`;
  const SHARE_URL = 'https://erantis1126-lgtm.github.io/captainQ/#memory';

  const WORDS = [
    ['선장', '해적', '갈매기', '등대'],
    ['보물상자', '나침반', '닻', '망원경'],
    ['초록병', '황금잔', '은화', '보물지도'],
  ];
  const HOUR = 3600e3;
  const MIN_WAIT = 5 * HOUR;     // 인증 후 테스트가 열리기까지
  const EXPIRE = 40 * HOUR;      // 이 시간이 지나면 인증 만료
  const SPAN_START = 3, SPAN_MAX = 12;

  let session = store.get('mem.session', null);
  let records = store.get('mem.records', []) || [];
  let draft = { nick: store.get('mem.nick', ''), photo: '' };
  let testing = false, lastResult = null;
  let lbTab = LB_ON ? 'all' : 'mine';
  let lbCache = null, lbErr = false, waitTimer = 0;

  const save = () => { store.set('mem.session', session); store.set('mem.records', records.slice(0, 30)); };
  const rand = n => Math.floor(Math.random() * n);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pad2 = n => String(n).padStart(2, '0');
  const fmtTime = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const fmtLeft = ms => { const m = Math.max(1, Math.ceil(ms / 60000)); const h = Math.floor(m / 60); return h ? `${h}시간 ${m % 60}분` : `${m}분`; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function badge(del){
    if (del <= 10) return ['철벽 선장', '어젯밤이 생생해요. 캪틴큐를 다스린 자!'];
    if (del <= 30) return ['정신줄 꽉 잡은 갑판장', '살짝 흐릿하지만 대부분 기억나요.'];
    if (del <= 55) return ['안개 낀 항해', '기억의 절반이 바다에 빠졌어요. 오늘은 물 많이!'];
    if (del <= 80) return ['표류 중인 선원', '암호가 기억 저편으로… 오늘은 푹 쉬어요.'];
    return ['기억 완전 삭제', '전설의 숙취를 몸소 확인했어요. 물 많이 마시고 푹 쉬어요.'];
  }

  // ---------- 화면 ----------
  function render(){
    clearInterval(waitTimer);
    if (testing) return;
    if (lastResult) return renderResult(lastResult);
    if (session && Date.now() - session.certAt > EXPIRE){
      session = null; save();
      toast('테스트 시간이 지나 인증이 초기화됐어요');
    }
    if (!session) return renderIntro();
    if (!session.memorized) return renderCode();
    const left = session.certAt + MIN_WAIT - Date.now();
    if (left > 0) return renderWait(left);
    return renderReady();
  }

  function renderIntro(){
    root.innerHTML = `
      <h2 class="fx-h">캪틴큐 기억삭제 측정기</h2>
      <p class="fx-sub">‘다다음날 깬다’던 그 전설, 내 기억은 몇 % 지워질까?</p>
      <div class="fx-card">
        <h3>이렇게 해요</h3>
        <ol class="fx-steps">
          <li>오늘 밤 캪틴큐 인증샷을 찍어요</li>
          <li>비밀 암호 3개를 외워요</li>
          <li>5시간 뒤(내일 아침) 1분 기억력 테스트로 기억삭제율을 재요</li>
          <li>기억을 가장 잘 지킨 사람이 랭킹 1등!</li>
        </ol>
        <label class="fx-field">닉네임
          <input type="text" id="memNick" maxlength="10" placeholder="랭킹에 보일 이름" value="${esc(draft.nick)}" autocomplete="off">
        </label>
        <div class="fx-photo">
          <img id="memThumb" alt="캪틴큐 인증샷 미리보기" ${draft.photo ? `src="${draft.photo}"` : 'hidden'}>
          <label class="btn ghost" for="memPhoto">${draft.photo ? '인증샷 다시 찍기' : '캪틴큐 인증샷 찍기'}</label>
          <input type="file" id="memPhoto" accept="image/*" capture="environment">
        </div>
        <label class="fx-check"><input type="checkbox" id="memAgree"> 만 19세 이상이고, 마신 뒤에는 절대 운전하지 않아요.</label>
        <button class="btn primary fx-btn" type="button" id="memStart" disabled>인증하고 비밀 암호 받기</button>
        <p class="fx-note">인증샷은 이 기기에만 저장되고 어디에도 올라가지 않아요.</p>
      </div>
      ${rankingHTML()}`;
    syncStart();
    loadRanking();
  }

  function syncStart(){
    const ok = draft.nick.trim().length > 0 && !!draft.photo && $('#memAgree')?.checked;
    const b = $('#memStart'); if (b) b.disabled = !ok;
  }

  function renderCode(){
    const code = session.code.map((k, i) => WORDS[i][k]);
    root.innerHTML = `
      <div class="fx-card fx-center">
        <h3>오늘 밤의 비밀 암호</h3>
        <p class="fx-sub">내일 아침에 물어볼게요. 캡처하면 반칙!</p>
        <div class="fx-code">${code.map(w => `<span>${esc(w)}</span>`).join('')}</div>
        <p class="fx-note">‘외웠어요’를 누르면 암호는 다시 볼 수 없어요.</p>
        <button class="btn primary fx-btn" type="button" id="memGotIt">외웠어요</button>
      </div>`;
  }

  function renderWait(left){
    root.innerHTML = `
      <div class="fx-card fx-center">
        ${session.photo ? `<div class="fx-photo" style="justify-content:center"><img src="${session.photo}" alt="인증샷"></div>` : ''}
        <h3 style="margin-top:10px">${esc(session.nick)} 선장님, 항해 중</h3>
        <p class="fx-sub">기억력 테스트는 <b>${fmtTime(session.certAt + MIN_WAIT)}</b>부터 열려요</p>
        <div class="fx-big" id="memLeft">${fmtLeft(left)}</div>
        <p class="fx-note">남은 시간</p>
        <ul class="fx-tips" style="text-align:left">
          <li>술 한 잔에 물 한 잔</li>
          <li>혼자 마시지 말고, 마신 뒤 운전은 절대 금지</li>
          <li>몸이 이상하면 바로 119</li>
        </ul>
        <button class="fx-link" type="button" id="memCancel">인증 취소하기</button>
      </div>
      ${rankingHTML()}`;
    loadRanking();
    waitTimer = setInterval(() => {
      const l = session && session.certAt + MIN_WAIT - Date.now();
      if (!session || l <= 0){ render(); return; }
      const el = $('#memLeft'); if (el) el.textContent = fmtLeft(l);
    }, 20000);
  }

  function renderReady(){
    root.innerHTML = `
      <div class="fx-card fx-center">
        <h3>좋은 아침이에요, ${esc(session.nick)} 선장님</h3>
        <p class="fx-sub">어젯밤 기억, 얼마나 남았을까요? 1분이면 돼요.</p>
        <button class="btn primary fx-btn" type="button" id="memGo">기억삭제 측정 시작</button>
        <button class="fx-link" type="button" id="memCancel">인증 취소하기</button>
      </div>
      ${rankingHTML()}`;
    loadRanking();
  }

  function renderResult(r){
    const [name, desc] = badge(r.del);
    root.innerHTML = `
      <div class="fx-card fx-center">
        <p class="fx-note" style="margin:0">${esc(r.nick)}의 기억삭제율</p>
        <div class="fx-big">${r.del}%</div>
        <div class="fx-meter" aria-hidden="true"><i style="width:${r.del}%"></i></div>
        <span class="fx-badge">${name}</span>
        <p style="margin:10px 0 0">${desc}</p>
        <p class="fx-note">암호 ${r.secret}/3 · 숫자 기억 ${r.span}자리 · 기억 보존 ${r.score}점</p>
        <button class="btn primary fx-btn" type="button" id="memShare">결과 공유하기</button>
        ${LB_ON ? `<button class="btn ghost fx-btn" type="button" id="memSubmit" ${r.submitted ? 'disabled' : ''}>${r.submitted ? '랭킹에 올렸어요' : '전체 랭킹에 올리기'}</button>` : ''}
        <button class="fx-link" type="button" id="memHome">처음으로</button>
      </div>
      ${rankingHTML()}`;
    loadRanking();
  }

  // ---------- 랭킹 ----------
  function rankingHTML(){
    const tabs = LB_ON ? `
      <div class="fx-tabs">
        <button class="chip" type="button" data-lb="all" aria-pressed="${lbTab === 'all'}">전체 랭킹</button>
        <button class="chip" type="button" data-lb="mine" aria-pressed="${lbTab === 'mine'}">내 기록</button>
      </div>` : '';
    return `
      <div class="fx-card">
        <h3>기억 지킴이 랭킹</h3>
        ${tabs}
        <ul class="fx-rank" id="memRank"><li class="fx-empty">불러오는 중…</li></ul>
        ${LB_ON ? '' : '<p class="fx-note">전체 랭킹은 곧 열려요. 지금은 이 기기의 기록만 보여요.</p>'}
      </div>`;
  }

  function rankRows(rows, mineFlag){
    if (!rows.length) return `<li class="fx-empty">${mineFlag ? '아직 기록이 없어요. 오늘 밤 첫 기록을 남겨 보세요!' : '아직 아무도 없어요. 첫 1등의 주인공이 되어 보세요!'}</li>`;
    return rows.map((r, i) => `
      <li class="${r.me ? 'me' : ''}">
        <span class="n">${i + 1}</span>
        <span class="who">${esc(r.nick)}${mineFlag ? ` <small style="color:var(--muted);font-weight:400">${fmtTime(r.at)}</small>` : ''}</span>
        <span class="sc">${r.score}점</span>
      </li>`).join('');
  }

  async function loadRanking(){
    const ul = $('#memRank'); if (!ul) return;
    if (lbTab === 'mine' || !LB_ON){
      const mine = records.slice().sort((a, b) => b.score - a.score || b.at - a.at).slice(0, 20);
      ul.innerHTML = rankRows(mine, true);
      return;
    }
    try{
      if (!lbCache || Date.now() - lbCache.t > 60000){
        lbCache = { t: Date.now(), rows: await lbTop() };
        lbErr = false;
      }
      const myNick = draft.nick || (records[0] && records[0].nick);
      const ul2 = $('#memRank'); if (!ul2) return;
      ul2.innerHTML = rankRows(lbCache.rows.map(r => ({ ...r, me: r.nick === myNick })), false);
    }catch{
      lbErr = true;
      const ul2 = $('#memRank'); if (ul2) ul2.innerHTML = '<li class="fx-empty">랭킹을 불러오지 못했어요. 잠시 후 다시 볼게요.</li>';
    }
  }

  async function lbTop(){
    const res = await fetch(`${FS}:runQuery?key=${encodeURIComponent(LEADERBOARD.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: COLL }],
        orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }],
        limit: 50,
      } }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    return rows.filter(x => x.document).map(x => {
      const f = x.document.fields || {};
      return { nick: (f.nick && f.nick.stringValue) || '익명', score: +((f.score && f.score.integerValue) || 0), ts: (f.ts && f.ts.timestampValue) || '' };
    });
  }

  async function lbSubmit(r){
    const res = await fetch(`${FS}/${COLL}?key=${encodeURIComponent(LEADERBOARD.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        nick: { stringValue: r.nick.slice(0, 12) },
        score: { integerValue: String(r.score) },
        span: { integerValue: String(r.span) },
        secret: { integerValue: String(r.secret) },
        ts: { timestampValue: new Date().toISOString() },
        platform: { stringValue: CQ.PLATFORM || 'web' },
      } }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  }

  // ---------- 테스트 ----------
  async function runTest(){
    testing = true;
    track('memory_test_start');
    // 1부: 어젯밤 암호
    let secret = 0;
    for (let i = 0; i < 3; i++){
      const answer = WORDS[i][session.code[i]];
      const opts = shuffle(WORDS[i]);
      root.innerHTML = `
        <div class="fx-card fx-center">
          <p class="fx-note" style="margin:0">1부 · 어젯밤 비밀 암호 (${i + 1}/3)</p>
          <h3 style="margin-top:8px">암호의 ${i + 1}번째 단어는?</h3>
          <div class="fx-opts">${opts.map(w => `<button type="button" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>
        </div>`;
      const picked = await new Promise(res => {
        root.querySelector('.fx-opts').addEventListener('click', e => {
          const b = e.target.closest('button[data-w]'); if (b) res(b);
        }, { once: false });
      });
      const ok = picked.dataset.w === answer;
      if (ok) secret++;
      picked.classList.add(ok ? 'ok' : 'bad');
      if (!ok) root.querySelectorAll('.fx-opts button').forEach(b => { if (b.dataset.w === answer) b.classList.add('ok'); });
      root.querySelectorAll('.fx-opts button').forEach(b => { b.disabled = true; });
      await sleep(ok ? 650 : 1200);
    }

    // 2부: 숫자 기억
    root.innerHTML = `
      <div class="fx-card fx-center">
        <p class="fx-note" style="margin:0">2부 · 숫자 기억</p>
        <h3 style="margin-top:8px">잠깐 보이는 숫자를 그대로 입력하세요</h3>
        <p class="fx-sub">점점 길어져요. 같은 길이에서 두 번 틀리면 끝!</p>
        <button class="btn primary fx-btn" type="button" id="memSpanGo">시작</button>
      </div>`;
    await new Promise(res => $('#memSpanGo').addEventListener('click', res, { once: true }));
    let n = SPAN_START, fails = 0, best = 0;
    while (n <= SPAN_MAX && fails < 2){
      let seq = '';
      for (let i = 0; i < n; i++){
        let d; do { d = rand(10); } while (seq && +seq[seq.length - 1] === d);
        seq += d;
      }
      root.innerHTML = `
        <div class="fx-card fx-center">
          <p class="fx-note" style="margin:0">${n}자리</p>
          <div class="fx-digits" id="memDigits">${seq}</div>
          <div id="memPadWrap" hidden>
            <div class="fx-entry" id="memEntry">&nbsp;</div>
            <div class="fx-pad">${[1,2,3,4,5,6,7,8,9].map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}
              <button type="button" class="fn" data-k="del">지우기</button><button type="button" data-k="0">0</button><button type="button" class="fn" data-k="ok">확인</button></div>
          </div>
        </div>`;
      await sleep(900 + n * 450);
      $('#memDigits').textContent = '';
      $('#memDigits').hidden = true;
      $('#memPadWrap').hidden = false;
      const entry = await new Promise(res => {
        let v = '';
        const show = () => { $('#memEntry').textContent = v || ' '; };
        root.querySelector('.fx-pad').addEventListener('click', e => {
          const b = e.target.closest('button[data-k]'); if (!b) return;
          const k = b.dataset.k;
          if (k === 'del') v = v.slice(0, -1);
          else if (k === 'ok'){ res(v); return; }
          else if (v.length < n) v += k;
          show();
          if (v.length === n) setTimeout(() => res(v), 180);
        });
      });
      if (entry === seq){ best = n; n++; fails = 0; toast('정답!'); }
      else { fails++; toast(fails < 2 ? `아쉬워요, 정답은 ${seq}` : `정답은 ${seq}. 여기까지!`); }
      await sleep(650);
    }

    // 점수
    const secretPts = secret * 20;
    const spanPts = best >= SPAN_START ? Math.min(40, (best - 2) * 8) : 0;
    const score = secretPts + spanPts;
    const r = { nick: session.nick, score, del: 100 - score, secret, span: best, at: Date.now(), certAt: session.certAt };
    records.unshift(r);
    session = null;
    save();
    testing = false;
    lastResult = r;
    track('memory_test_complete', { score, del_pct: r.del, secret, span: best });
    render();
  }

  // ---------- 사진 ----------
  function readPhoto(file){
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 360, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  // ---------- 이벤트 ----------
  root.addEventListener('input', e => {
    if (e.target.id === 'memNick'){ draft.nick = e.target.value.slice(0, 10); store.set('mem.nick', draft.nick); syncStart(); }
  });
  root.addEventListener('change', async e => {
    if (e.target.id === 'memAgree') syncStart();
    if (e.target.id === 'memPhoto' && e.target.files && e.target.files[0]){
      try{
        draft.photo = await readPhoto(e.target.files[0]);
        const t = $('#memThumb'); t.src = draft.photo; t.hidden = false;
        root.querySelector('label[for=memPhoto]').textContent = '인증샷 다시 찍기';
        syncStart();
      }catch{ toast('사진을 불러오지 못했어요'); }
    }
  });
  root.addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.lb){ lbTab = t.dataset.lb; render(); return; }
    switch (t.id){
      case 'memStart':
        if (t.disabled) return;
        session = { nick: draft.nick.trim(), certAt: Date.now(), code: [rand(4), rand(4), rand(4)], photo: draft.photo, memorized: false };
        draft.photo = '';
        save(); track('memory_certify'); render(); break;
      case 'memGotIt':
        session.memorized = true; save(); track('memory_code_memorized'); render(); break;
      case 'memCancel':
        session = null; save(); toast('인증을 취소했어요'); track('memory_cancel'); render(); break;
      case 'memGo':
        runTest(); break;
      case 'memHome':
        lastResult = null; render(); break;
      case 'memShare': {
        const r = lastResult; if (!r) return;
        const text = `캪틴큐 기억삭제율 ${r.del}% · ${badge(r.del)[0]}! 너도 재 봐 →`;
        track('memory_share');
        try{
          if (navigator.share){ await navigator.share({ title: '캪틴큐 기억삭제 측정기', text, url: SHARE_URL }); return; }
        }catch(err){ if (err && err.name === 'AbortError') return; }
        try{ await navigator.clipboard.writeText(`${text} ${SHARE_URL}`); toast('결과를 복사했어요. 붙여넣어 공유하세요'); }
        catch{ toast(`${text} ${SHARE_URL}`); }
        break;
      }
      case 'memSubmit': {
        const r = lastResult; if (!r || r.submitted) return;
        t.disabled = true;
        try{
          await lbSubmit(r);
          r.submitted = true; records = records.map(x => x.at === r.at ? r : x); save();
          lbCache = null; lbTab = 'all';
          toast('전체 랭킹에 올렸어요'); track('leaderboard_submit', { score: r.score });
          render();
        }catch{ t.disabled = false; toast('랭킹 서버에 올리지 못했어요. 잠시 후 다시 해 주세요'); }
        break;
      }
    }
  });

  CQ.onTab('memory', render);
})();

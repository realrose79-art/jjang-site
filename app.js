(function () {
  'use strict';

  /* ---------- 저장 ---------- */
  var KEY = 'selfTracker.v1';
  var S;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    var def = window.DEFAULT_DATA;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        S = JSON.parse(raw);
        S.removed = S.removed || [];
        if (S.dataVersion !== def.dataVersion) syncDefaults(def);
        return;
      }
    } catch (e) { /* 저장소를 못 쓰면 예시로 시작 */ }
    S = clone(def);
    S.removed = [];
    S.trips.forEach(function (r) { resolveSub('travel', r); });
  }
  /* 기본 기록의 subName(세부 분류 이름)을 실제 세부 분류와 연결한다.
     같은 이름이 이미 있으면 그걸 쓰고, 없을 때만 새로 만든다. */
  function resolveSub(tab, r) {
    if (!r.subName) return;
    var c = findCat(tab, r.catId), s;
    if (c) {
      s = c.children.filter(function (x) { return x.name === r.subName; })[0];
      if (!s) { s = { id: 's' + uid(), name: r.subName }; c.children.push(s); }
      r.subId = s.id;
    }
    delete r.subName;
  }
  /* 기본 데이터가 새로 바뀐 경우:
     - 저장된 기록과 카테고리는 건드리지 않는다 (지운 것도 되살리지 않는다).
     - retire 목록에 있는 "예시" 기록만 지운다. 직접 고쳐서 예시 표시가 없어진 기록은 남긴다.
     - 저장된 버전보다 나중에 추가된(since) 기본 기록만 새로 넣는다. */
  function syncDefaults(def) {
    var from = S.dataVersion || 0;
    (def.retire || []).forEach(function (x) {
      S[x.list] = (S[x.list] || []).filter(function (r) { return !(r.id === x.id && r.sample); });
    });
    ['exercise', 'songs', 'trips'].forEach(function (k) {
      var have = {};
      S[k] = S[k] || [];
      S[k].forEach(function (r) { have[r.id] = 1; });
      def[k].forEach(function (r) {
        if (have[r.id] || (r.since || 1) <= from) return;
        var c = clone(r);
        if (k === 'trips') resolveSub('travel', c);
        S[k].push(c);
      });
    });
    (def.fixes || []).forEach(function (f) {
      (S[f.list] || []).forEach(function (r) { if (r.id === f.id && r[f.field] === f.from) r[f.field] = f.to; });
    });
    S.dataVersion = def.dataVersion;
    save();
  }
  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요.'); }
  }
  function save() {
    saveLocal(); scheduleSync();
  }
  /* 이 기기에서 지운 기록·카테고리 id. 서버에는 삭제 권한이 없어서, 불러올 때 되살아나지 않게 기억해 둔다. */
  function markRemoved(id) { (S.removed = S.removed || []).push(id); }

  /* ---------- 도우미 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dstr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return dstr(new Date()); }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return dstr(d); }
  function dow(s) { return new Date(s + 'T00:00:00').getDay(); }
  function fmtMin(m) {
    m = Number(m) || 0;
    var h = Math.floor(m / 60), r = m % 60;
    return h ? (r ? h + '시간 ' + r + '분' : h + '시간') : r + '분';
  }
  function fmtDate(s) { return s ? s.replace(/-/g, '.') : ''; }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return /^https?:\/\/[^\s]+$/i.test(u) ? u : '';
  }
  function ytId(u) {
    var m = String(u || '').match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : '';
  }
  function driveFileId(u) {
    u = String(u || '');
    if (/\/folders\//.test(u)) return '';
    var m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?[^#]*\bid=([\w-]+)/);
    return m ? m[1] : '';
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }

  var toastTimer, hideTimer, appReady = false;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    /* 입력·AI 창(모달)이 열려 있어도 가려지지 않도록, 화면 맨 위 레이어(popover)로 띄운다 */
    try {
      if (t.showPopover) { if (t.matches(':popover-open')) t.hidePopover(); t.showPopover(); }
    } catch (e) { /* 지원하지 않으면 기존 방식 */ }
    clearTimeout(hideTimer); clearTimeout(toastTimer);
    t.classList.add('show');
    toastTimer = setTimeout(function () {
      t.classList.remove('show');
      hideTimer = setTimeout(function () { try { if (t.matches(':popover-open')) t.hidePopover(); } catch (e) { /* 무시 */ } }, 300);
    }, 3200);
  }

  /* ---------- 상태 ---------- */
  var ui = {
    tab: 'exercise',
    exercise: { cat: 'all', sub: 'all' },
    music: { cat: 'all', sub: 'all' },
    travel: { cat: 'all', sub: 'all', view: 'done' }
  };
  var TITLES = { exercise: '운동', music: '연주곡', travel: '여행' };

  /* ---------- 카테고리 ---------- */
  function findCat(tab, id) {
    var l = S.categories[tab];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  function findSub(cat, id) {
    if (!cat) return null;
    for (var i = 0; i < cat.children.length; i++) if (cat.children[i].id === id) return cat.children[i];
    return null;
  }
  function catLabel(tab, rec) {
    var c = findCat(tab, rec.catId);
    if (!c) return '미분류';
    var s = findSub(c, rec.subId);
    return s ? c.name + ' › ' + s.name : c.name;
  }
  function records(tab) { return tab === 'exercise' ? S.exercise : tab === 'music' ? S.songs : S.trips; }
  function applyFilter(tab, list) {
    var u = ui[tab];
    return list.filter(function (r) {
      if (u.cat === 'all') return true;
      if (u.cat === 'none') return !findCat(tab, r.catId);
      if (r.catId !== u.cat) return false;
      return u.sub === 'all' || r.subId === u.sub;
    });
  }
  function chip(tab, level, val, label, on) {
    return '<button class="chip' + (on ? ' on' : '') + '" data-act="chip" data-tab="' + tab + '" data-level="' + level + '" data-val="' + esc(val) + '">' + esc(label) + '</button>';
  }
  function chipsHtml(tab) {
    var u = ui[tab], cats = S.categories[tab], all = records(tab);
    var h = '<div class="chips">' + chip(tab, 'cat', 'all', '전체', u.cat === 'all');
    cats.forEach(function (c) { h += chip(tab, 'cat', c.id, c.name, u.cat === c.id); });
    if (all.some(function (r) { return !findCat(tab, r.catId); })) h += chip(tab, 'cat', 'none', '미분류', u.cat === 'none');
    h += '</div>';
    var sel = findCat(tab, u.cat);
    if (sel && sel.children.length) {
      h += '<div class="chips sub">' + chip(tab, 'sub', 'all', '전체', u.sub === 'all');
      sel.children.forEach(function (s) { h += chip(tab, 'sub', s.id, s.name, u.sub === s.id); });
      h += '</div>';
    }
    return h + '<button class="link" data-act="manageCats" data-tab="' + tab + '">⚙ 카테고리 관리</button>';
  }

  /* ---------- 입력 창 ---------- */
  function openForm(title, fields, values, onSave) {
    var dlg = $('#dlg'), form = $('#dlgForm');
    values = values || {};
    var h = '<h2>' + esc(title) + '</h2>';
    fields.forEach(function (f) {
      if (f.type === 'catsub') {
        h += '<div class="two"><label>분류<select name="catId" id="fCat"></select></label>' +
             '<label>세부 분류<select name="subId" id="fSub"></select></label></div>';
      } else if (f.type === 'html') {
        h += f.html;
      } else {
        var v = values[f.k] == null ? '' : values[f.k];
        h += '<label>' + esc(f.label);
        if (f.type === 'textarea') {
          h += '<textarea name="' + f.k + '" placeholder="' + esc(f.ph || '') + '">' + esc(v) + '</textarea>';
        } else if (f.type === 'select') {
          h += '<select name="' + f.k + '">' + f.opts.map(function (o) {
            return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
          }).join('') + '</select>';
        } else {
          h += '<input name="' + f.k + '" type="' + f.type + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '"' +
               (f.req ? ' required' : '') + (f.im ? ' inputmode="' + f.im + '" autocomplete="off"' : '') + (f.step ? ' step="' + f.step + '"' : '') + (f.min != null ? ' min="' + f.min + '"' : '') + '>';
        }
        h += (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '</label>';
      }
    });
    h += '<div class="end"><button type="button" class="btn ghost" data-act="dlgClose">취소</button><button type="submit" class="btn primary">저장</button></div>';
    form.innerHTML = h;

    var cs = fields.filter(function (f) { return f.type === 'catsub'; })[0];
    if (cs) {
      var catSel = $('#fCat'), subSel = $('#fSub');
      var cats = S.categories[cs.tab];
      catSel.innerHTML = '<option value="">미분류</option>' + cats.map(function (c) {
        return '<option value="' + esc(c.id) + '"' + (c.id === values.catId ? ' selected' : '') + '>' + esc(c.name) + '</option>';
      }).join('');
      var fillSub = function (selected) {
        var c = findCat(cs.tab, catSel.value);
        var kids = c ? c.children : [];
        subSel.innerHTML = '<option value="">(선택 안 함)</option>' + kids.map(function (s) {
          return '<option value="' + esc(s.id) + '"' + (s.id === selected ? ' selected' : '') + '>' + esc(s.name) + '</option>';
        }).join('');
        subSel.disabled = !kids.length;
      };
      catSel.onchange = function () { fillSub(''); };
      fillSub(values.subId);
    }

    form.onsubmit = function (e) {
      e.preventDefault();
      var fd = new FormData(form), out = {};
      fd.forEach(function (v, k) { out[k] = typeof v === 'string' ? v.trim() : v; });
      onSave(out);
      dlg.close();
    };
    if (!dlg.open) dlg.showModal();
  }
  function closeDlg() { var d = $('#dlg'); if (d.open) d.close(); }

  /* ---------- AI 추천 일정 ---------- */
  function aiPlan(t) {
    var plans = window.AI_PLANS || [];
    for (var i = 0; i < plans.length; i++) if (plans[i].match.test(t.place || '')) return plans[i];
    return null;
  }
  /* 아주 작은 마크다운 변환: ## 제목, - 항목, **굵게** 만 지원 (먼저 esc로 안전하게 만든 뒤 변환) */
  function mdHtml(md) {
    var out = '', inList = false;
    String(md || '').split(/\r?\n/).forEach(function (line) {
      var s = esc(line).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'), m;
      if ((m = /^#{1,4}\s+(.*)$/.exec(s))) { if (inList) { out += '</ul>'; inList = false; } out += '<h3>' + m[1] + '</h3>'; }
      else if ((m = /^\s*[-*]\s+(.*)$/.exec(s))) { if (!inList) { out += '<ul>'; inList = true; } out += '<li>' + m[1] + '</li>'; }
      else if (s.trim()) { if (inList) { out += '</ul>'; inList = false; } out += '<p>' + s + '</p>'; }
    });
    return out + (inList ? '</ul>' : '');
  }
  var aiChat = { id: null, history: [], busy: false };
  function aiPlanText(t) { var p = aiPlan(t); return t.aiPlan || (p ? p.md : ''); }
  function showAiPlan(t) {
    var p = aiPlan(t); if (!p) return;
    aiChat = { id: t.id, history: [], busy: false };
    $('#dlgForm').innerHTML = '<h2>✨ AI추천 · ' + esc(p.title) + '</h2>' +
      '<p class="ai-note">⚠ AI가 만든 추천이에요. 식당 이름·영업 여부는 구글맵 리뷰로 꼭 확인하세요.</p>' +
      (session ? '' : '<p class="ai-note warn">🔒 AI에게 일정을 고쳐 달라고 하려면 <b>로그인</b>이 필요해요. 일정 보기만 로그인 없이 돼요. ' +
        '<button type="button" class="btn small primary" data-act="auth">로그인</button></p>') +
      '<div class="aiplan" id="aiPlanBox">' + mdHtml(aiPlanText(t)) + '</div>' +
      '<div class="aichat" id="aiLog"></div>' +
      '<div class="aiask"><textarea id="aiMsg" rows="2" placeholder="예) 3일차에 호이안 야시장을 넣고 마사지는 빼줘 / 아이 동반이라 바나힐 대신 쉬운 코스로"></textarea>' +
      '<button type="button" class="btn primary" data-act="aiSend">보내기</button></div>' +
      '<div class="end"><button type="button" class="btn small ghost" data-act="aiReset">처음 추천으로 되돌리기</button>' +
      '<button type="button" class="btn" data-act="dlgClose">닫기</button></div>';
    var d = $('#dlg'); if (!d.open) d.showModal();
  }
  function aiLogAdd(who, text) {
    var log = $('#aiLog'); if (!log) return null;
    var n = document.createElement('div'); n.className = 'bub ' + who; n.textContent = text;
    log.appendChild(n); log.scrollTop = log.scrollHeight; return n;
  }
  function aiSend() {
    var t = find('travel', aiChat.id), box = $('#aiMsg');
    if (!t || !box || aiChat.busy) return;
    var msg = box.value.trim(); if (!msg) return;
    if (!session) {
      var lock = aiLogAdd('ai', '🔒 로그인해야 AI에게 물어볼 수 있어요. 위의 “로그인” 버튼을 눌러 주세요.');
      if (lock) lock.className = 'bub err';
      toast('로그인해야 AI에게 물어볼 수 있어요');
      return;
    }
    aiChat.busy = true; box.value = ''; aiLogAdd('me', msg);
    var wait = aiLogAdd('ai', '일정을 고치는 중…');
    ensureToken().then(function (tok) {
      if (!tok) throw new Error('로그인이 만료됐어요. 다시 로그인해 주세요');
      return fetch((/(^|\.)vercel\.app$/.test(location.hostname) ? '' : 'https://jjang-site.vercel.app') + '/api/ai-plan', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: t.place, when: t.when || t.date || '', plan: aiPlanText(t), message: msg, history: aiChat.history })
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.error) throw new Error(j.error || j.message || ('HTTP ' + r.status));
        return j;
      });
    }).then(function (j) {
      aiChat.history.push({ role: 'user', text: msg }, { role: 'model', text: j.reply });
      if (wait) wait.textContent = j.reply;
      if (j.plan && j.plan !== aiPlanText(t)) {
        t.aiPlan = j.plan; save();
        var pb = $('#aiPlanBox'); if (pb) pb.innerHTML = mdHtml(j.plan);
        toast('일정을 업데이트하고 저장했어요');
      }
    }).catch(function (e) {
      if (wait) { wait.textContent = '⚠ ' + e.message; wait.className = 'bub err'; }
    }).then(function () { aiChat.busy = false; });
  }
  function aiReset() {
    var t = find('travel', aiChat.id), p = t && aiPlan(t);
    if (!p || !confirm('대화로 고친 내용이 사라지고 처음 추천으로 돌아가요. 되돌릴까요?')) return;
    t.aiPlan = ''; save();
    $('#aiPlanBox').innerHTML = mdHtml(p.md); toast('처음 추천으로 되돌렸어요');
  }

  /* ---------- 운동 ---------- */
  function weekDays() {
    var t = today(), off = (dow(t) + 6) % 7, start = addDays(t, -off), a = [];
    for (var i = 0; i < 7; i++) a.push(addDays(start, i));
    return a;
  }
  function sumMin(list) { return list.reduce(function (a, r) { return a + (Number(r.min) || 0); }, 0); }
  function fig(v, label) { return '<div class="fig"><b>' + v + '</b><span>' + label + '</span></div>'; }

  function renderExercise() {
    var list = applyFilter('exercise', S.exercise);
    var t = today(), days = weekDays(), names = ['일', '월', '화', '수', '목', '금', '토'];
    var perDay = days.map(function (d) { return sumMin(list.filter(function (r) { return r.date === d; })); });
    var max = Math.max.apply(null, perDay.concat([60]));
    var week = perDay.reduce(function (a, b) { return a + b; }, 0);
    var month = sumMin(list.filter(function (r) { return r.date.slice(0, 7) === t.slice(0, 7); }));
    var todayMin = sumMin(list.filter(function (r) { return r.date === t; }));

    var h = '<div class="head"><div class="figs">' + fig(fmtMin(todayMin), '오늘') + fig(fmtMin(week), '이번 주') + fig(fmtMin(month), '이번 달') + '</div>' +
      '<button class="btn primary" data-act="add" data-tab="exercise">운동 기록하기</button></div>' +
      chipsHtml('exercise') +
      '<div class="chart"><h3>이번 주 운동 시간 (분)</h3><div class="bars">' +
      days.map(function (d, i) {
        var v = perDay[i];
        return '<div class="bar' + (v ? ' has' : '') + '" style="--i:' + i + '"><small>' + (v || '') + '</small>' +
          '<i style="height:' + Math.round(v / max * 100 * 0.8) + '%"></i></div>';
      }).join('') + '</div><div class="days">' +
      days.map(function (d) { return '<span' + (d === t ? ' class="today"' : '') + '>' + names[dow(d)] + '</span>'; }).join('') +
      '</div></div>';

    var sorted = list.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    if (!sorted.length) h += '<div class="empty">아직 기록이 없어요.<br>오늘 몸을 움직였다면 “운동 기록하기”로 남겨 보세요.</div>';
    else h += '<div class="ruled">' + sorted.map(function (r) {
      var d = new Date(r.date + 'T00:00:00');
      return '<div class="entry"><div class="dt"><b>' + d.getDate() + '</b><span>' + (d.getMonth() + 1) + '월 ' + names[d.getDay()] + '</span></div>' +
        '<div><div class="t">' + fmtMin(r.min) + (r.sample ? ' <span class="tag sample">예시</span>' : '') + '</div>' +
        '<div class="m">' + esc(catLabel('exercise', r)) + (r.memo ? ' · ' + esc(r.memo) : '') + '</div></div>' +
        actsHtml('exercise', r.id) + '</div>';
    }).join('') + '</div>';
    $('#view-exercise').innerHTML = h;
  }

  function actsHtml(tab, id) {
    return '<div class="acts"><button data-act="edit" data-tab="' + tab + '" data-id="' + id + '">수정</button>' +
           '<button data-act="del" data-tab="' + tab + '" data-id="' + id + '">삭제</button></div>';
  }

  function exerciseForm(rec) {
    var first = S.categories.exercise[0];
    var v = rec || { date: today(), catId: first ? first.id : '', subId: '', min: 30, memo: '' };
    openForm(rec ? '운동 기록 수정' : '운동 기록 추가', [
      { k: 'date', label: '날짜', type: 'date', req: true },
      { type: 'catsub', tab: 'exercise' },
      { k: 'min', label: '운동 시간 (분)', type: 'number', req: true, min: 1, step: 1 },
      { k: 'memo', label: '메모', type: 'text', ph: '예: 한강 자전거길' }
    ], v, function (o) {
      var r = rec || { id: uid() };
      r.date = o.date; r.catId = o.catId; r.subId = o.subId; r.min = Number(o.min) || 0; r.memo = o.memo;
      delete r.sample;
      if (!rec) S.exercise.push(r);
      save(); render('exercise'); toast('운동 기록을 저장했어요');
    });
  }

  /* ---------- 음악 ---------- */
  function renderMusic() {
    var list = applyFilter('music', S.songs).slice().sort(function (a, b) {
      var x = a.date || '', y = b.date || '';
      return x < y ? 1 : x > y ? -1 : 0;
    });
    var thisYear = S.songs.filter(function (s) { return s.date && s.date.slice(0, 4) === today().slice(0, 4); }).length;
    var h = '<div class="head"><div class="figs">' + fig(S.songs.length + '곡', '마스터한 곡') + fig(thisYear + '곡', '올해 새로') + '</div>' +
      '<button class="btn primary" data-act="add" data-tab="music">곡 추가하기</button></div>' +
      chipsHtml('music');
    if (!list.length) h += '<div class="empty">' + (S.songs.length ? '이 분류에는 아직 곡이 없어요.' : '아직 등록한 곡이 없어요.<br>마스터한 곡을 “곡 추가하기”로 남겨 보세요.') + '</div>';
    else h += '<div class="grid songs">' + list.map(songCard).join('') + '</div>';
    $('#view-music').innerHTML = h;
  }
  function songCard(s) {
    var id = ytId(s.youtube), yurl = safeUrl(s.youtube), surl = safeUrl(s.sheet);
    var thumb = id
      ? '<button class="thumb" data-act="play" data-id="' + s.id + '" title="재생"><img loading="lazy" alt="" src="https://img.youtube.com/vi/' + id + '/hqdefault.jpg"><span class="play">▶</span></button>'
      : '<div class="thumb"><span class="none">영상 링크를 넣으면<br>여기에 보여요</span></div>';
    return '<article class="card song" id="song-' + s.id + '">' + thumb + '<div class="body">' +
      '<div class="t">' + esc(s.title) + '</div>' +
      '<div class="m">' + esc(s.artist || '가수 미입력') + '</div>' +
      (s.date ? '<div class="m">' + fmtDate(s.date) + ' 마스터</div>' : '') +
      '<div class="tags"><span class="tag">' + esc(catLabel('music', s)) + '</span>' + (s.sample ? '<span class="tag sample">예시</span>' : '') + '</div>' +
      (s.memo ? '<div class="m">' + esc(s.memo) + '</div>' : '') +
      '<div class="bottom"><div>' +
        (surl ? '<a class="pill" target="_blank" rel="noopener" href="' + esc(surl) + '">🎼 악보 보기</a> ' : '') +
        (yurl ? '<a class="pill" target="_blank" rel="noopener" href="' + esc(yurl) + '">▶ YouTube</a>' : '') +
      '</div>' + actsHtml('music', s.id) + '</div></div></article>';
  }
  function musicForm(rec) {
    var first = S.categories.music[0];
    var v = rec || { title: '', artist: '', date: today(), catId: first ? first.id : '', subId: '', youtube: '', sheet: '', memo: '' };
    openForm(rec ? '곡 수정' : '곡 추가', [
      { k: 'title', label: '곡명', type: 'text', req: true },
      { k: 'artist', label: '가수명', type: 'text' },
      { k: 'date', label: '마스터한 날짜', type: 'date' },
      { type: 'catsub', tab: 'music' },
      { k: 'youtube', label: '연주 영상 링크 (유튜브 일부공개)', type: 'text', ph: 'https://youtu.be/...' },
      { k: 'sheet', label: '악보 링크 (구글드라이브)', type: 'text', ph: 'https://drive.google.com/...' },
      { k: 'memo', label: '메모', type: 'textarea' }
    ], v, function (o) {
      var r = rec || { id: uid() };
      ['title', 'artist', 'date', 'catId', 'subId', 'youtube', 'sheet', 'memo'].forEach(function (k) { r[k] = o[k]; });
      delete r.sample;
      if (!rec) S.songs.push(r);
      save(); render('music'); toast('곡을 저장했어요');
    });
  }

  /* ---------- 여행 ---------- */
  function tripKey(t) { return t.date || t.when || ''; }
  function stars(n) { n = Number(n) || 0; return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }

  function renderTravel() {
    var year = today().slice(0, 4);
    var done = S.trips.filter(function (t) { return t.status === 'done'; });
    var want = S.trips.filter(function (t) { return t.status === 'want'; });
    var thisYear = done.filter(function (t) { return tripKey(t).slice(0, 4) === year; }).length;
    var v = ui.travel.view;

    /* AI 추천 일정이 준비된 "가고 싶어요" 장소 — 여행 탭 어디서든 알아볼 수 있게 알린다 */
    var aiWant = want.filter(function (t) { return aiPlan(t); }), aiCount = aiWant.length;
    var navBtn = document.querySelector('.nav button[data-tab="travel"]');
    if (navBtn) navBtn.classList.toggle('has-ai', aiCount > 0);
    var promo = !aiCount ? '' :
      '<div class="ai-promo"><span class="ai-spark" aria-hidden="true">✨</span>' +
      '<div class="ai-promo-txt"><b>가고 싶은 곳은 AI가 일정을 짜 드려요</b>' +
      '<span>' + (v === 'want'
        ? '아래 보라색 <em>AI 추천 일정</em> 버튼을 눌러 보세요. 대화로 일정을 바꿀 수도 있어요.'
        : 'AI 추천이 준비된 곳: ' + aiWant.map(function (t) { return esc(t.place); }).join(', ') + ' — “가고 싶어요”에서 볼 수 있어요.') + '</span></div>' +
      (v === 'want' ? '' : '<button class="btn ai-go" data-act="goWant">가고 싶어요에서 보기 →</button>') + '</div>';

    $('#travelTop').innerHTML =
      '<div class="head"><div class="figs">' + fig(thisYear + '곳', '올해 다녀옴') + fig(done.length + '곳', '다녀왔어요') + fig(want.length + '곳', '가고 싶어요') + '</div>' +
      '<button class="btn primary" data-act="add" data-tab="travel">장소 추가하기</button></div>' +
      promo +
      '<div class="seg"><button data-act="view" data-val="done" class="' + (v === 'done' ? 'on' : '') + '">다녀왔어요</button>' +
      '<button data-act="view" data-val="want" class="' + (v === 'want' ? 'on' : '') + '">가고 싶어요' + (aiCount ? '<span class="seg-ai">✨AI추천</span>' : '') + '</button></div>' +
      chipsHtml('travel');

    var filtered = applyFilter('travel', S.trips);
    var list = filtered.filter(function (t) { return t.status === v; })
      .sort(function (a, b) {
        var ai = (aiPlan(b) ? 1 : 0) - (aiPlan(a) ? 1 : 0);   /* AI 추천이 있는 카드를 맨 위로 */
        if (v === 'want' && ai) return ai;
        var x = tripKey(a), y = tripKey(b);
        return x < y ? 1 : x > y ? -1 : 0;
      });
    var h = '<div class="legend"><b style="background:var(--done)"></b>다녀왔어요<b style="background:var(--want)"></b>가고 싶어요 (지도에는 현재 분류의 두 목록이 모두 표시돼요)</div>';
    if (!list.length) h += '<div class="empty">' + (v === 'done' ? '다녀온 곳이 아직 없어요.<br>여행지를 “장소 추가하기”로 남겨 보세요.' : '가고 싶은 곳이 아직 없어요.<br>블로그 링크와 함께 “장소 추가하기”로 모아 보세요.') + '</div>';
    else h += '<div class="grid trips">' + list.map(tripCard).join('') + '</div>';
    $('#travelList').innerHTML = h;
    renderMap(filtered);
  }

  function tripCard(t) {
    var photos = (t.photos || []).map(function (p) {
      var url = safeUrl(p), id = driveFileId(p);
      if (!url) return '';
      return id
        ? '<a target="_blank" rel="noopener" href="' + esc(url) + '"><img loading="lazy" alt="여행 사진" src="https://drive.google.com/thumbnail?id=' + id + '&sz=w400" onerror="this.style.visibility=\'hidden\'"></a>'
        : '<a class="pill" target="_blank" rel="noopener" href="' + esc(url) + '">📁 사진 보기</a>';
    }).join('');
    var links = (t.links || []).map(function (l) {
      var url = safeUrl(l.url);
      return url ? '<a target="_blank" rel="noopener" href="' + esc(url) + '">🔗 ' + esc(l.title || hostOf(url)) + '</a>' : '';
    }).join('');
    var done = t.status === 'done';
    var yr = (t.date || '').slice(0, 4), md = (t.date || '').slice(5).replace('-', '.');
    var stub = t.date ? '<small>' + yr + '</small><b>' + md + '</b>'
      : t.when ? '<b>' + esc(t.when) + '</b>'
      : (done ? '<b>날짜 없음</b>' : '<b>언젠가</b>');
    var hasAi = !done && !!aiPlan(t);
    return '<article class="card trip ' + esc(t.status) + (hasAi ? ' ai' : '') + '"><div class="stub">' + stub + '</div><div class="body">' +
      (hasAi ? '<div class="ai-ribbon">✨ AI 추천 일정이 있어요</div>' : '') +
      '<div class="tags"><span class="tag">' + esc(catLabel('travel', t)) + '</span>' + (t.sample ? '<span class="tag sample">예시</span>' : '') + '</div>' +
      '<div class="t">' + esc(t.place) + '</div>' +
      (done && t.rating ? '<div class="stars">' + stars(t.rating) + '</div>' : '') +
      (t.review ? '<div class="m">' + esc(t.review) + '</div>' : '') +
      (photos ? '<div class="photos">' + photos + '</div>' : '') +
      (links ? '<div class="linklist">' + links + '</div>' : '') +
      (hasAi ? '<button class="ai-cta" data-act="aiPlan" data-id="' + t.id + '"><span class="ai-cta-main">✨ AI 추천 일정 보기</span>' +
        '<span class="ai-cta-sub">' + esc(aiPlan(t).title) + ' · 대화로 일정도 바꿀 수 있어요</span></button>' : '') +
      '<div class="bottom"><div>' + (done ? '' : '<button class="pill" data-act="markDone" data-id="' + t.id + '">다녀왔어요로 옮기기</button>') + '</div>' +
      actsHtml('travel', t.id) + '</div></div></article>';
  }

  var map, layer, mapPts = [];
  /* 지도가 화면에 보일 때 핀들이 한눈에 들어오게 맞춘다.
     숨겨진 탭에서 맞추면 크기가 0이라 엉뚱하게 확대되므로, 보일 때만 맞춘다. */
  function fitMap() {
    var el = $('#map');
    if (!map || !el.clientWidth) return;
    map.invalidateSize();
    map.setMinZoom(map.getBoundsZoom(L.latLngBounds([[-85, -180], [85, 180]]), true));
    if (mapPts.length > 1) map.fitBounds(mapPts, { padding: [30, 30], maxZoom: 9 });
    else if (mapPts.length === 1) map.setView(mapPts[0], 8);
  }
  function renderMap(list) {
    var el = $('#map');
    if (typeof L === 'undefined') {
      el.innerHTML = '<div class="fallback">지도를 불러오지 못했어요.<br>인터넷에 연결되어 있는지 확인해 주세요.</div>';
      return;
    }
    if (!map) {
      el.innerHTML = '';
      map = L.map(el, {
        scrollWheelZoom: false, worldCopyJump: false, zoomSnap: 0.25, zoomDelta: 0.5,
        maxBounds: [[-85, -180], [85, 180]], maxBoundsViscosity: 1
      }).setView([36.5, 127.8], 6);
      /* 지도 그림은 Esri 서버에서 받는다.
         OpenStreetMap 서버는 파일(file://)로 연 페이지의 요청을 "Access blocked"로 막아서 쓰지 않는다. */
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18, maxNativeZoom: 18, noWrap: true, bounds: [[-85, -180], [85, 180]],
        attribution: 'Tiles &copy; Esri'
      }).addTo(map);
      layer = L.layerGroup().addTo(map);
    }
    layer.clearLayers();
    var pts = [];
    list.forEach(function (t) {
      var la = parseFloat(t.lat), ln = parseFloat(t.lng);
      if (isNaN(la) || isNaN(ln)) return;
      var icon = L.divIcon({ className: '', html: '<div class="pin ' + t.status + '"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
      L.marker([la, ln], { icon: icon }).addTo(layer)
        .bindPopup('<b>' + esc(t.place) + '</b><br>' + (t.status === 'done' ? '다녀왔어요' : '가고 싶어요'));
      pts.push([la, ln]);
    });
    mapPts = pts;
    setTimeout(fitMap, 50);
  }

  function tripForm(rec) {
    var first = S.categories.travel[0];
    var v = rec ? clone(rec) : { status: ui.travel.view, place: '', date: '', rating: 0, catId: first ? first.id : '', subId: '', lat: '', lng: '', review: '', photos: [], links: [] };
    v.photos = (v.photos || []).join('\n');
    v.links = (v.links || []).map(function (l) { return l.title ? l.title + ' | ' + l.url : l.url; }).join('\n');
    openForm(rec ? '여행 수정' : '여행 장소 추가', [
      { k: 'status', label: '구분', type: 'select', opts: [['done', '다녀왔어요'], ['want', '가고 싶어요']] },
      { k: 'place', label: '장소 이름', type: 'text', req: true, ph: '예: 제주 한라산' },
      { type: 'html', html: '<button type="button" class="btn small" data-act="geo">📍 이 이름으로 지도에서 위치 찾기</button><p class="hint" id="geoMsg">찾은 위치가 아래 위도·경도에 채워져요. 직접 고쳐도 돼요.</p>' },
      { type: 'html', html: '<div class="two"><label>위도<input name="lat" id="fLat" type="text" inputmode="decimal" value="' + esc(v.lat) + '"></label><label>경도<input name="lng" id="fLng" type="text" inputmode="decimal" value="' + esc(v.lng) + '"></label></div>' },
      { type: 'catsub', tab: 'travel' },
      { k: 'date', label: '날짜 (다녀온 날 / 가고 싶은 때)', type: 'date' },
      { k: 'when', label: '시기 (정확한 날짜를 모르면 연도 등)', type: 'text', ph: '예: 1998' },
      { k: 'rating', label: '별점', type: 'select', opts: [[0, '선택 안 함'], [1, '★'], [2, '★★'], [3, '★★★'], [4, '★★★★'], [5, '★★★★★']] },
      { k: 'review', label: '후기·메모', type: 'textarea' },
      { k: 'photos', label: '사진 링크 (구글드라이브, 한 줄에 하나)', type: 'textarea', ph: 'https://drive.google.com/file/d/...', hint: '파일 링크는 썸네일로 보여요. 공유 설정을 “링크가 있는 모든 사용자”로 해 두세요. 폴더 링크는 버튼으로 열려요.' },
      { k: 'links', label: '정보·블로그 링크 (한 줄에 하나)', type: 'textarea', ph: '제목 | https://블로그주소', hint: '“제목 | 주소” 형태로 쓰거나 주소만 써도 돼요.' }
    ], v, function (o) {
      var r = rec || { id: uid() };
      r.status = o.status; r.place = o.place; r.date = o.date; r.when = o.when; r.rating = Number(o.rating) || 0;
      r.catId = o.catId; r.subId = o.subId; r.review = o.review;
      r.lat = o.lat === '' ? '' : parseFloat(o.lat); r.lng = o.lng === '' ? '' : parseFloat(o.lng);
      if (isNaN(r.lat)) r.lat = ''; if (isNaN(r.lng)) r.lng = '';
      r.photos = o.photos.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      r.links = o.links.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).map(function (line) {
        var i = line.lastIndexOf('|');
        return i > 0 ? { title: line.slice(0, i).trim(), url: line.slice(i + 1).trim() } : { title: '', url: line };
      });
      delete r.sample;
      if (!rec) S.trips.push(r);
      ui.travel.view = r.status;
      save(); render('travel'); toast('여행 기록을 저장했어요');
    });
  }

  function geoSearch() {
    var place = $('#dlgForm [name=place]').value.trim(), msg = $('#geoMsg');
    if (!place) { msg.textContent = '먼저 장소 이름을 입력해 주세요.'; return; }
    msg.textContent = '찾는 중…';
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ko&q=' + encodeURIComponent(place))
      .then(function (r) { return r.json(); })
      .then(function (a) {
        if (!a.length) { msg.textContent = '찾지 못했어요. 더 일반적인 이름(예: 도시 이름)으로 다시 시도해 보세요.'; return; }
        $('#fLat').value = (+a[0].lat).toFixed(5); $('#fLng').value = (+a[0].lon).toFixed(5);
        msg.textContent = '찾았어요: ' + a[0].display_name;
      })
      .catch(function () { msg.textContent = '위치를 찾지 못했어요. 인터넷 연결을 확인하거나 위도·경도를 직접 입력해 주세요.'; });
  }

  /* ---------- 카테고리 관리 ---------- */
  function manageCats(tab) {
    var form = $('#dlgForm'), dlg = $('#dlg');
    var cats = S.categories[tab];
    var h = '<h2>' + TITLES[tab] + ' 카테고리 관리</h2><p class="hint">이름을 바꾸거나 추가·삭제할 수 있어요. 삭제해도 기록은 “미분류”로 남아요.</p>';
    cats.forEach(function (c) {
      h += '<div class="catline"><span class="nm">' + esc(c.name) + '</span>' +
        '<button type="button" class="btn small" data-act="catRename" data-tab="' + tab + '" data-id="' + c.id + '">이름 변경</button>' +
        '<button type="button" class="btn small" data-act="subAdd" data-tab="' + tab + '" data-id="' + c.id + '">+ 세부</button>' +
        '<button type="button" class="btn small danger" data-act="catDel" data-tab="' + tab + '" data-id="' + c.id + '">삭제</button></div>';
      c.children.forEach(function (s) {
        h += '<div class="catline child"><span class="nm">' + esc(s.name) + '</span>' +
          '<button type="button" class="btn small" data-act="subRename" data-tab="' + tab + '" data-id="' + c.id + '" data-sub="' + s.id + '">이름 변경</button>' +
          '<button type="button" class="btn small danger" data-act="subDel" data-tab="' + tab + '" data-id="' + c.id + '" data-sub="' + s.id + '">삭제</button></div>';
      });
    });
    h += '<div class="end"><button type="button" class="btn" data-act="catAdd" data-tab="' + tab + '">+ 카테고리 추가</button>' +
         '<button type="button" class="btn primary" data-act="dlgClose">닫기</button></div>';
    form.innerHTML = h;
    form.onsubmit = function (e) { e.preventDefault(); };
    if (!dlg.open) dlg.showModal();
  }
  function usedBy(tab, catId, subId) {
    return records(tab).filter(function (r) { return r.catId === catId && (!subId || r.subId === subId); }).length;
  }
  function afterCatChange(tab) { save(); manageCats(tab); render(tab); }

  function catAction(act, d) {
    var tab = d.tab, c = d.id ? findCat(tab, d.id) : null, name;
    if (act === 'catAdd') {
      name = prompt('새 카테고리 이름', ''); if (!name || !name.trim()) return;
      S.categories[tab].push({ id: 'c' + uid(), name: name.trim(), children: [] });
    } else if (act === 'catRename') {
      name = prompt('카테고리 이름', c.name); if (!name || !name.trim()) return;
      c.name = name.trim();
    } else if (act === 'catDel') {
      var n = usedBy(tab, c.id);
      if (!confirm('“' + c.name + '” 카테고리를 삭제할까요?' + (n ? '\n이 카테고리의 기록 ' + n + '개는 “미분류”로 옮겨져요.' : ''))) return;
      records(tab).forEach(function (r) { if (r.catId === c.id) { r.catId = ''; r.subId = ''; } });
      markRemoved(c.id); c.children.forEach(function (x) { markRemoved(x.id); });
      S.categories[tab] = S.categories[tab].filter(function (x) { return x.id !== c.id; });
      ui[tab].cat = 'all'; ui[tab].sub = 'all';
    } else if (act === 'subAdd') {
      name = prompt('“' + c.name + '”의 새 세부 카테고리 이름 (예: 지역명, 나라명, 계절)', ''); if (!name || !name.trim()) return;
      c.children.push({ id: 's' + uid(), name: name.trim() });
    } else if (act === 'subRename') {
      var s = findSub(c, d.sub);
      name = prompt('세부 카테고리 이름', s.name); if (!name || !name.trim()) return;
      s.name = name.trim();
    } else if (act === 'subDel') {
      var s2 = findSub(c, d.sub), n2 = usedBy(tab, c.id, s2.id);
      if (!confirm('“' + s2.name + '”을(를) 삭제할까요?' + (n2 ? '\n이 세부 분류의 기록 ' + n2 + '개는 세부 분류 없이 남아요.' : ''))) return;
      records(tab).forEach(function (r) { if (r.catId === c.id && r.subId === s2.id) r.subId = ''; });
      markRemoved(s2.id);
      c.children = c.children.filter(function (x) { return x.id !== s2.id; });
      ui[tab].sub = 'all';
    }
    afterCatChange(tab);
  }

  /* ---------- 공통 ---------- */
  function heroLine() {
    var el = $('#heroLine'), s = '';
    if (ui.tab === 'exercise') {
      var days = weekDays();
      var w = sumMin(S.exercise.filter(function (r) { return days.indexOf(r.date) > -1; }));
      s = w ? '이번 주 ' + fmtMin(w) + ' 움직였어요.' : '이번 주 첫 운동을 기록해 보세요.';
    } else if (ui.tab === 'music') {
      var real = S.songs.filter(function (x) { return !x.sample; });
      var pool = real.length ? real : S.songs, n = pool.length;
      if (!n) s = '마스터한 첫 곡을 등록해 보세요.';
      else {
        var dated = pool.filter(function (x) { return x.date; })
          .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        s = n + '곡을 마스터했어요.' + (dated.length ? ' 가장 최근 곡은 「' + dated[0].title + '」예요.' : '');
      }
    } else {
      var y = today().slice(0, 4);
      var d = S.trips.filter(function (t) { return t.status === 'done' && tripKey(t).slice(0, 4) === y; }).length;
      var wn = S.trips.filter(function (t) { return t.status === 'want'; }).length;
      s = '올해 ' + d + '곳을 다녀왔고, 가고 싶은 곳이 ' + wn + '곳 기다리고 있어요.';
    }
    el.textContent = s;
  }
  function render(tab) {
    if (tab === 'exercise') renderExercise();
    else if (tab === 'music') renderMusic();
    else renderTravel();
    heroLine();
  }
  function renderAll() { renderExercise(); renderMusic(); renderTravel(); heroLine(); }

  function showTab(tab) {
    ui.tab = tab;
    document.body.setAttribute('data-tab', tab);
    heroLine();
    document.querySelectorAll('.nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'view-' + tab); });
    if (tab === 'travel' && map) setTimeout(fitMap, 60);
    try { localStorage.setItem(KEY + '.tab', tab); } catch (e) { /* 무시 */ }
    window.scrollTo(0, 0);
  }

  function find(tab, id) {
    var l = records(tab);
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '나의기록장_백업_' + today().replace(/-/g, '') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    try { localStorage.setItem(BACKUP_KEY, today()); } catch (e) { /* 무시 */ }
    renderBackup();
    toast('백업 파일을 저장했어요');
  }
  /* 마지막 백업 날짜를 알려 주고, 한 번도 안 했거나 오래되면 위쪽에 안내를 띄운다.
     날짜는 기록(S)과 분리해 저장한다. 백업을 불러와도 지워지지 않게 하기 위해서다. */
  var BACKUP_KEY = KEY + '.lastBackup', BACKUP_STALE_DAYS = 14;
  function renderBackup() {
    var last = '';
    try { last = localStorage.getItem(BACKUP_KEY) || ''; } catch (e) { /* 무시 */ }
    var days = last ? Math.round((new Date(today() + 'T00:00:00') - new Date(last + 'T00:00:00')) / 86400000) : null;
    var stale = days === null || isNaN(days) || days >= BACKUP_STALE_DAYS;
    var bar = $('#backupBar'), note = $('#backupNote');
    note.textContent = days === null || isNaN(days) ? '아직 백업한 적이 없어요.'
      : '마지막 백업: ' + fmtDate(last) + (days > 0 ? ' (' + days + '일 전)' : ' (오늘)');
    if (!stale) { bar.hidden = true; return; }
    bar.innerHTML = '<span>' + (days === null || isNaN(days) ? '아직 백업한 적이 없어요. 브라우저 데이터를 지우면 기록이 사라져요.'
      : '마지막 백업이 ' + days + '일 전이에요.') + '</span><button class="btn small" data-act="export">지금 백업</button>';
    bar.hidden = false;
  }
  function importData(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = JSON.parse(fr.result);
        if (!d.categories || !d.exercise || !d.songs || !d.trips) throw new Error('형식');
        if (!confirm('현재 기록을 백업 파일 내용으로 바꿀까요?')) return;
        S = d; save(); renderAll(); toast('백업을 불러왔어요');
      } catch (e) { toast('올바른 백업 파일이 아니에요'); }
    };
    fr.readAsText(file);
  }

  /* ---------- Supabase 로그인·동기화 ----------
     읽기는 누구나 되고, 서버에 쓰는 것(등록·수정·삭제)은 본인 계정으로 로그인했을 때만 된다.
     - 마지막 동기화 때 내용(base)과 비교해서 "이 기기에서 바뀐 것"만 올린다.
     - 서버에서 바뀌고 이 기기는 그대로인 기록은 서버 값을 따른다. 둘 다 바뀌었으면 이 기기 값이 이긴다.
     - 삭제는 서버에 deleted_at 표시로 남겨서 다른 기기에도 전달한다.
     화면 코드에는 공개(publishable) 키만 쓴다. */
  var SB = window.SUPABASE_CONFIG || {};
  var SES_KEY = KEY + '.session', BASE_KEY = KEY + '.base';
  var session = null, base = {}, catIds = {}, curTok = null, preferServer = false;
  var syncTimer = null, syncing = false, syncAgain = false;
  try { session = JSON.parse(localStorage.getItem(SES_KEY) || 'null'); } catch (e) { session = null; }
  try { base = JSON.parse(localStorage.getItem(BASE_KEY) || '{}') || {}; } catch (e) { base = {}; }

  function saveBase() { try { localStorage.setItem(BASE_KEY, JSON.stringify(base)); } catch (e) { /* 무시 */ } }
  function setSync(msg) { var n = $('#syncNote'); if (n) n.textContent = msg; }
  function renderAuth() {
    var b = $('#authBtn');
    if (b) b.textContent = session ? '로그아웃' : '로그인';
    var lb = $('#loginBar');
    if (lb) lb.hidden = !readOnly();
    document.body.classList.toggle('readonly', readOnly());
    if (!syncing) {
      setSync(session
        ? (session.email ? session.email + ' 로 로그인됨' : '로그인됨')
        : '로그인하지 않아 조회만 할 수 있어요. 입력·수정·삭제는 로그인한 뒤에 가능해요.');
    }
  }

  /* --- 회원가입·로그인 (Supabase Auth, 이메일+비밀번호) --- */
  function authPost(path, body) {
    return fetch(SB.url + '/auth/v1/' + path, {
      method: 'POST', headers: { apikey: SB.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.msg || j.error_description || j.message || ('HTTP ' + r.status)); e.code = j.error_code || j.code || ''; throw e; }
        return j;
      });
    });
  }
  function authMsg(e) {
    var c = e && e.code, m = (e && e.message) || '';
    if (c === 'invalid_credentials') return '이메일 또는 비밀번호가 맞지 않아요';
    if (c === 'email_not_confirmed') return '메일로 보낸 확인 링크를 먼저 눌러 주세요';
    if (c === 'user_already_exists' || /already registered/i.test(m)) return '이미 가입된 이메일이에요. 로그인해 보세요';
    if (c === 'weak_password' || /password/i.test(m)) return '비밀번호는 6자 이상으로 해 주세요';
    if (c === 'over_email_send_rate_limit' || c === 'over_request_rate_limit') return '잠시 후 다시 시도해 주세요';
    return '처리하지 못했어요. 잠시 후 다시 시도해 주세요';
  }
  function setSession(j, email) {
    if (j) {
      session = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in - 60) * 1000,
                  email: email || (j.user && j.user.email) || (session && session.email) || '' };
    } else {
      session = null; base = {};
      try { localStorage.removeItem(BASE_KEY); } catch (e) { /* 무시 */ }
    }
    try { if (session) localStorage.setItem(SES_KEY, JSON.stringify(session)); else localStorage.removeItem(SES_KEY); } catch (e) { /* 무시 */ }
    renderAuth();
  }
  function login(email, pw) {
    return authPost('token?grant_type=password', { email: email, password: pw }).then(function (j) { setSession(j, email); });
  }
  function signup(email, pw) {
    return authPost('signup', { email: email, password: pw }).then(function (j) {
      if (j.access_token) { setSession(j, email); return true; }   /* 메일 확인을 끈 경우: 바로 로그인됨 */
      return false;                                                /* 메일 확인이 필요한 경우 */
    });
  }
  function ensureToken() {
    if (!session) return Promise.resolve(null);
    if (Date.now() < session.exp) return Promise.resolve(session.access);
    return authPost('token?grant_type=refresh_token', { refresh_token: session.refresh })
      .then(function (j) { setSession(j); return session.access; })
      .catch(function () { setSession(null); return null; });
  }
  /* 로그인하지 않으면 조회만 가능하다. (Supabase 설정이 없는 경우에는 제한하지 않는다.) */
  function readOnly() { return !session && !!SB.url; }
  var WRITE_ACTS = {
    add: '기록을 입력하려면', edit: '기록을 수정하려면', del: '기록을 삭제하려면', markDone: '기록을 수정하려면',
    manageCats: '카테고리를 바꾸려면', catAdd: '카테고리를 바꾸려면', catRename: '카테고리를 바꾸려면', catDel: '카테고리를 바꾸려면',
    subAdd: '카테고리를 바꾸려면', subRename: '카테고리를 바꾸려면', subDel: '카테고리를 바꾸려면',
    import: '백업을 불러오려면', clearSamples: '기록을 삭제하려면', aiReset: 'AI 일정을 되돌리려면'
  };
  function authDialog(why) {
    if (session) {
      if (confirm('로그아웃할까요?\n로그아웃하면 기록을 조회만 할 수 있어요.')) { setSession(null); toast('로그아웃했어요. 이제 조회만 가능해요'); }
      return;
    }
    var form = $('#dlgForm'), dlg = $('#dlg');
    form.innerHTML = '<h2>로그인 · 회원가입</h2>' +
      (why ? '<p class="ai-note warn">🔒 ' + esc(why) + ' 로그인해 주세요. 조회는 로그인 없이 돼요.</p>' : '') +
      '<label>이메일<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>' +
      '<label>비밀번호<input name="pw" type="password" required minlength="6" autocomplete="current-password">' +
      '<span class="hint">6자 이상. 처음이면 “회원가입”을 누르세요.</span></label>' +
      '<div class="end"><button type="button" class="btn ghost" data-act="dlgClose">취소</button>' +
      '<button type="button" class="btn" data-act="signup">회원가입</button>' +
      '<button type="submit" class="btn primary">로그인</button></div>';
    form.onsubmit = function (e) { e.preventDefault(); doAuth('login'); };
    if (!dlg.open) dlg.showModal();
  }
  function doAuth(mode) {
    var form = $('#dlgForm');
    if (!form.reportValidity()) return;
    var email = form.elements.email.value.trim(), pw = form.elements.pw.value;
    if (mode === 'signup') {
      signup(email, pw).then(function (loggedIn) {
        closeDlg();
        if (loggedIn) { toast('가입하고 로그인했어요'); syncNow(true, true); }
        else toast('확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요');
      }).catch(function (e) { console.warn(e); toast(authMsg(e)); });
    } else {
      login(email, pw).then(function () { closeDlg(); toast('로그인했어요'); syncNow(true, true); })
        .catch(function (e) { console.warn(e); toast(authMsg(e)); });
    }
  }

  /* --- 서버 통신 --- */
  function sbFetch(path, opts) {
    opts = opts || {};
    var h = { apikey: SB.key, 'Content-Type': 'application/json' };
    if (curTok) h.Authorization = 'Bearer ' + curTok;
    opts.headers = Object.assign(h, opts.headers || {});
    return fetch(SB.url + '/rest/v1/' + path, opts).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(r.status + ' ' + t); });
      return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }
  function okDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null; }
  function numOrNull(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function nul(v) { return v || null; }

  /* --- 카테고리 --- */
  var TABS = ['exercise', 'music', 'travel'];
  function refreshCatIds() {
    catIds = {};
    TABS.forEach(function (t) {
      S.categories[t].forEach(function (c) { catIds[c.id] = 1; c.children.forEach(function (s) { catIds[s.id] = 1; }); });
    });
  }
  function cid(id) { return id && catIds[id] ? id : ''; }
  function catRows() {
    var rows = [];
    TABS.forEach(function (tab) {
      S.categories[tab].forEach(function (c, i) {
        rows.push({ id: c.id, tab: tab, parent_id: null, name: c.name, sort_order: i });
        c.children.forEach(function (s, j) { rows.push({ id: s.id, tab: tab, parent_id: c.id, name: s.name, sort_order: j }); });
      });
    });
    return rows;
  }
  function catHash(r) { return JSON.stringify([r.tab, r.parent_id || null, r.name]); }
  function eachRecord(fn) { ['exercise', 'songs', 'trips'].forEach(function (k) { (S[k] || []).forEach(fn); }); }
  function unref(id) {
    eachRecord(function (r) {
      if (r.catId === id) { r.catId = ''; r.subId = ''; }
      if (r.subId === id) r.subId = '';
    });
  }
  /* 다른 기기에서 같은 이름으로 만든 분류는 서버의 id로 통일한다. */
  function adoptId(oldId, newId) {
    if (oldId === newId) return;
    TABS.forEach(function (t) {
      S.categories[t].forEach(function (c) {
        if (c.id === oldId) c.id = newId;
        c.children.forEach(function (s) { if (s.id === oldId) s.id = newId; });
      });
    });
    eachRecord(function (r) { if (r.catId === oldId) r.catId = newId; if (r.subId === oldId) r.subId = newId; });
  }
  function removeCatById(id) {
    var hit = false;
    TABS.forEach(function (t) {
      S.categories[t] = S.categories[t].filter(function (c) {
        if (c.id === id) { hit = true; unref(id); c.children.forEach(function (s) { unref(s.id); }); return false; }
        var n = c.children.length;
        c.children = c.children.filter(function (s) { return s.id !== id; });
        if (c.children.length !== n) { hit = true; unref(id); }
        return true;
      });
    });
    return hit;
  }
  function reconcileCats(rows, gone) {
    var changed = 0, byOrder = function (a, b) { return a.sort_order - b.sort_order; };
    rows.filter(function (r) { return r.deleted_at; }).forEach(function (r) {
      if (removeCatById(r.id)) changed++;
      delete base['categories:' + r.id];
    });
    var live = rows.filter(function (r) { return !r.deleted_at && !gone[r.id] && S.categories[r.tab]; });
    function take(obj, r) {
      var key = 'categories:' + r.id, sh = catHash(r);
      var lh = catHash({ tab: r.tab, parent_id: r.parent_id, name: obj.name });
      if (lh === sh) { base[key] = sh; return; }
      if (base[key] === lh || (base[key] === undefined && preferServer)) { obj.name = r.name; base[key] = sh; changed++; }
    }
    live.filter(function (r) { return !r.parent_id; }).sort(byOrder).forEach(function (r) {
      var list = S.categories[r.tab], c = findCat(r.tab, r.id);
      if (!c) { c = list.filter(function (x) { return x.name === r.name; })[0]; if (c) { adoptId(c.id, r.id); changed++; } }
      if (!c) { list.push({ id: r.id, name: r.name, children: [] }); base['categories:' + r.id] = catHash(r); changed++; }
      else take(c, r);
    });
    live.filter(function (r) { return r.parent_id; }).sort(byOrder).forEach(function (r) {
      var p = findCat(r.tab, r.parent_id); if (!p) return;
      var s = findSub(p, r.id);
      if (!s) { s = p.children.filter(function (x) { return x.name === r.name; })[0]; if (s) { adoptId(s.id, r.id); changed++; } }
      if (!s) { p.children.push({ id: r.id, name: r.name }); base['categories:' + r.id] = catHash(r); changed++; }
      else take(s, r);
    });
    return changed;
  }

  /* --- 기록 (서버 행 <-> 이 앱의 기록) --- */
  var KINDS = {
    exercise_logs: {
      list: function () { return S.exercise; },
      toRow: function (r) {
        if (r.sample || !(Number(r.min) > 0) || !okDate(r.date)) return null;
        return { id: r.id, log_date: r.date, cat_id: nul(cid(r.catId)), sub_id: nul(cid(r.subId)), minutes: Math.round(Number(r.min)), memo: r.memo || '' };
      },
      fromRow: function (r) { return { id: r.id, date: r.log_date, catId: cid(r.cat_id), subId: cid(r.sub_id), min: r.minutes, memo: r.memo || '' }; }
    },
    songs: {
      list: function () { return S.songs; },
      toRow: function (r) {
        if (r.sample || !r.title) return null;
        return { id: r.id, title: r.title, artist: r.artist || '', mastered_on: okDate(r.date), cat_id: nul(cid(r.catId)), sub_id: nul(cid(r.subId)),
                 youtube_url: r.youtube || '', sheet_url: r.sheet || '', memo: r.memo || '' };
      },
      fromRow: function (r) {
        return { id: r.id, title: r.title, artist: r.artist || '', date: r.mastered_on || '', catId: cid(r.cat_id), subId: cid(r.sub_id),
                 youtube: r.youtube_url || '', sheet: r.sheet_url || '', memo: r.memo || '' };
      }
    },
    trips: {
      list: function () { return S.trips; },
      toRow: function (r) {
        if (r.sample || !r.place || (r.status !== 'done' && r.status !== 'want')) return null;
        var la = numOrNull(r.lat), ln = numOrNull(r.lng);
        if (la !== null && Math.abs(la) > 90) la = null;
        if (ln !== null && Math.abs(ln) > 180) ln = null;
        return { id: r.id, status: r.status, place: r.place, visited_on: okDate(r.date), when_text: r.when || '',
                 rating: Math.min(5, Math.max(0, Number(r.rating) || 0)), cat_id: nul(cid(r.catId)), sub_id: nul(cid(r.subId)),
                 lat: la, lng: ln, review: r.review || '', photos: r.photos || [], links: r.links || [], ai_plan: r.aiPlan || '' };
      },
      fromRow: function (r) {
        return { id: r.id, status: r.status, place: r.place, date: r.visited_on || '', when: r.when_text || '', rating: r.rating || 0,
                 catId: cid(r.cat_id), subId: cid(r.sub_id), lat: r.lat == null ? '' : r.lat, lng: r.lng == null ? '' : r.lng,
                 review: r.review || '', photos: r.photos || [], links: r.links || [], aiPlan: r.ai_plan || '' };
      }
    }
  };
  function hashOf(table, row) { return table === 'categories' ? catHash(row) : JSON.stringify(row); }

  function reconcile(table, kind, rows, gone) {
    var list = kind.list(), idx = {}, changed = 0;
    list.forEach(function (r) { idx[r.id] = r; });
    rows.forEach(function (sr) {
      var bk = table + ':' + sr.id, L = idx[sr.id];
      if (sr.is_sample) return;
      if (sr.deleted_at) {
        if (L) { list.splice(list.indexOf(L), 1); changed++; }
        delete base[bk]; return;
      }
      if (gone[sr.id]) return;
      var incoming = kind.fromRow(sr), sh = JSON.stringify(kind.toRow(incoming));
      if (!L) { list.push(incoming); base[bk] = sh; changed++; return; }
      var lh = JSON.stringify(kind.toRow(L));
      if (lh === sh) { base[bk] = sh; return; }
      if (base[bk] === lh || (base[bk] === undefined && preferServer)) {
        list[list.indexOf(L)] = incoming; base[bk] = sh; changed++;
      }
    });
    return changed;
  }

  /* --- 서버 -> 이 기기 --- */
  function pull() {
    var tables = ['categories', 'exercise_logs', 'songs', 'trips'];
    return Promise.all(tables.map(function (t) { return sbFetch(t + '?select=*&limit=5000'); })).then(function (res) {
      var gone = {}, n = 0;
      (S.removed || []).forEach(function (id) { gone[id] = 1; });
      var cats = reconcileCats(res[0] || [], gone);
      refreshCatIds();
      ['exercise_logs', 'songs', 'trips'].forEach(function (t, i) { n += reconcile(t, KINDS[t], res[i + 1] || [], gone); });
      if (cats + n) {
        TABS.forEach(function (t) { ui[t].cat = 'all'; ui[t].sub = 'all'; });
        saveLocal(); renderAll();
      }
      saveBase();
      return cats + n;
    });
  }

  /* --- 이 기기 -> 서버 (로그인했을 때만) --- */
  function upsert(table, rows) {
    if (!rows.length) return Promise.resolve();
    return sbFetch(table + '?on_conflict=user_id,id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows)
    }).then(function () { rows.forEach(function (r) { base[table + ':' + r.id] = hashOf(table, r); }); });
  }
  function pushRemoved() {
    var ids = (S.removed || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (!ids.length) return Promise.resolve();
    var q = 'id=in.(' + ids.map(encodeURIComponent).join(',') + ')';
    var body = JSON.stringify({ deleted_at: new Date().toISOString() });
    return ['exercise_logs', 'songs', 'trips', 'categories'].reduce(function (p, t) {
      return p.then(function () { return sbFetch(t + '?' + q, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: body }); });
    }, Promise.resolve()).then(function () {
      S.removed = (S.removed || []).filter(function (id) { return ids.indexOf(id) < 0; });
      saveLocal();
    });
  }
  function push() {
    refreshCatIds();
    var failed = 0;
    var cats = catRows().filter(function (r) { return base['categories:' + r.id] !== catHash(r); });
    return upsert('categories', cats).then(function () {
      return Object.keys(KINDS).reduce(function (p, t) {
        return p.then(function () {
          var rows = [];
          KINDS[t].list().forEach(function (r) {
            var row = KINDS[t].toRow(r);
            if (row && base[t + ':' + row.id] !== JSON.stringify(row)) rows.push(row);
          });
          return upsert(t, rows);
        }).catch(function (e) { failed++; console.warn(t, e); });
      }, Promise.resolve());
    }).then(pushRemoved).then(function () {
      saveBase();
      if (failed) throw new Error(failed + '개 표를 올리지 못했어요');
    });
  }

  function scheduleSync() {
    if (!SB.url || !SB.key || !session) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { syncNow(false, false); }, 1500);
  }
  function syncNow(withPull, manual) {
    if (!SB.url || !SB.key) return;
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    if (session) setSync('Supabase와 동기화 중…');
    ensureToken().then(function (tok) {
      curTok = tok;
      if (!tok) return { n: 0, wrote: false };
      /* 이 계정으로 동기화한 적이 없는 기기: 서버와 다른 기록은 서버 값을 따른다 */
      preferServer = Object.keys(base).length === 0;
      return (withPull ? pull() : Promise.resolve(0)).then(function (n) {
        return push().then(function () { return { n: n, wrote: true }; });
      });
    }).then(function (r) {
      var d = new Date();
      if (r.wrote) setSync((session && session.email ? session.email + ' · ' : '') + '서버에 동기화됨 · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()));
      else { syncing = false; renderAuth(); }
      if (manual) toast(r.n ? '서버 기록 ' + r.n + '건을 반영했어요' : (r.wrote ? '동기화했어요' : '로그인하면 서버에 저장돼요'));
    }).catch(function (e) {
      console.warn(e);
      setSync('Supabase 동기화 실패 — 기록은 이 기기에 저장돼 있어요');
      if (manual) toast('동기화하지 못했어요');
    }).then(function () {
      syncing = false;
      if (syncAgain) { syncAgain = false; scheduleSync(); }
    });
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click', function (e) {
    var nav = e.target.closest('.nav button');
    if (nav) { showTab(nav.dataset.tab); return; }

    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.dataset.act, tab = el.dataset.tab, id = el.dataset.id;

    /* 입력·수정·삭제는 로그인해야 한다. 로그인하지 않았으면 로그인 창과 이유를 보여 준다. */
    if (WRITE_ACTS[act] && readOnly()) { authDialog(WRITE_ACTS[act]); return; }

    switch (act) {
      case 'chip':
        if (el.dataset.level === 'cat') { ui[tab].cat = el.dataset.val; ui[tab].sub = 'all'; }
        else ui[tab].sub = el.dataset.val;
        render(tab); break;
      case 'view': ui.travel.view = el.dataset.val; renderTravel(); break;
      case 'add':
        if (tab === 'exercise') exerciseForm(); else if (tab === 'music') musicForm(); else tripForm();
        break;
      case 'edit': {
        var r = find(tab, id); if (!r) break;
        if (tab === 'exercise') exerciseForm(r); else if (tab === 'music') musicForm(r); else tripForm(r);
        break;
      }
      case 'del': {
        var rec = find(tab, id); if (!rec) break;
        if (!confirm('이 기록을 삭제할까요? 되돌릴 수 없어요.')) break;
        var list = records(tab); list.splice(list.indexOf(rec), 1);
        markRemoved(rec.id);
        save(); render(tab); toast('삭제했어요'); break;
      }
      case 'markDone': {
        var t = find('travel', id); if (!t) break;
        t.status = 'done'; if (!t.date) t.date = today();
        save(); renderTravel(); toast('“다녀왔어요”로 옮겼어요. 날짜·후기는 수정에서 채워 주세요.'); break;
      }
      case 'play': {
        var s = find('music', id), vid = s && ytId(s.youtube); if (!vid) break;
        el.outerHTML = '<div class="thumb"><iframe src="https://www.youtube.com/embed/' + vid + '?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
        break;
      }
      case 'aiPlan': showAiPlan(find('travel', id)); break;
      case 'goWant':
        ui.travel.view = 'want'; renderTravel();
        setTimeout(function () {
          var c = document.querySelector('.card.trip.ai');
          if (!c) return;
          c.scrollIntoView({ behavior: 'smooth', block: 'center' });
          c.classList.add('flash'); setTimeout(function () { c.classList.remove('flash'); }, 2400);
        }, 80);
        break;
      case 'aiSend': aiSend(); break;
      case 'aiReset': aiReset(); break;
      case 'geo': geoSearch(); break;
      case 'dlgClose': closeDlg(); break;
      case 'manageCats': manageCats(tab); break;
      case 'catAdd': case 'catRename': case 'catDel': case 'subAdd': case 'subRename': case 'subDel':
        catAction(act, { tab: tab, id: id, sub: el.dataset.sub }); break;
      case 'export': exportData(); break;
      case 'sync': syncNow(true, true); break;
      case 'auth': authDialog(); break;
      case 'signup': doAuth('signup'); break;
      case 'import': $('#importFile').click(); break;
      case 'clearSamples':
        if (!confirm('“예시” 표시가 붙은 기록을 모두 지울까요? (직접 입력한 기록은 그대로예요)')) break;
        S.exercise = S.exercise.filter(function (r) { return !r.sample; });
        S.songs = S.songs.filter(function (r) { return !r.sample; });
        S.trips = S.trips.filter(function (r) { return !r.sample; });
        save(); renderAll(); toast('예시 데이터를 지웠어요'); break;
    }
  });
  window.addEventListener('resize', function () { if (map && ui.tab === 'travel') fitMap(); });
  $('#importFile').addEventListener('change', function (e) {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });

  /* 다른 기기·주소에서 바뀐 내용을 거의 실시간으로 가져온다.
     화면이 보이는 동안 15초마다, 그리고 화면을 다시 볼 때 바로 확인한다.
     입력·수정 창이 열려 있을 때는 기록을 바꾸지 않도록 건너뛴다. */
  function autoPull() {
    if (!session || syncing || document.visibilityState !== 'visible') return;
    if ($('#dlg').open) return;
    syncNow(true, false);
  }
  setInterval(autoPull, 15000);
  document.addEventListener('visibilitychange', autoPull);
  window.addEventListener('focus', autoPull);

  /* ---------- 시작 ---------- */
  load();
  renderAll();
  renderBackup();
  renderAuth();
  syncNow(true, false);
  var startTab = 'exercise';
  try { startTab = localStorage.getItem(KEY + '.tab') || 'exercise'; } catch (e) { /* 무시 */ }
  showTab(TITLES[startTab] ? startTab : 'exercise');
  appReady = true;
})();

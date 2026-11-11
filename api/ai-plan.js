/* 여행 일정 AI 보완 (Vercel 서버 함수). Gemini 키는 Vercel 환경 변수 GEMINI_API_KEY에만 둔다.
   - 로그인한 사용자(Supabase 토큰)만 호출할 수 있다. 토큰은 Supabase에 물어봐서 확인한다.
   - 환경 변수: GEMINI_API_KEY (필수), GEMINI_MODEL (선택, 기본 gemini-3.5-flash-lite) */
var SB_URL = process.env.SUPABASE_URL || 'https://xsgiisckrcthrcxknixd.supabase.co';
var SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_7T76tUdhAC0BUAayyyyirA_7vWJenW6';

var SYSTEM = [
  '너는 한국인 여행자를 돕는 여행 일정 도우미다.',
  '사용자가 준 현재 일정(마크다운)을 요청에 맞게 고쳐서, 반드시 아래 JSON만 출력한다.',
  '{"reply": "무엇을 어떻게 바꿨는지 1~3문장 한국어 설명", "plan": "수정된 일정 전체(마크다운)"}',
  '규칙:',
  '- plan에는 일정 전체를 다시 쓴다. 제목은 ## , 항목은 - 로 쓴다. 요청과 상관없는 부분은 그대로 둔다.',
  '- 질문만 하는 경우(일정 변경 요청이 아님)에는 reply로 답하고 plan은 현재 일정을 그대로 돌려준다.',
  '- 확실하지 않은 식당·가게 이름은 지어내지 말고 "~ 맛집(구글맵 확인 필요)"처럼 쓴다.',
  '- 가격·영업시간은 단정하지 않는다.'
].join('\n');

module.exports = async function handler(req, res) {
  /* GitHub Pages 등 다른 주소의 화면에서도 부를 수 있게 한다. 로그인 토큰이 없으면 어차피 거절된다. */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST만 가능해요' }); }
  var key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY 환경 변수가 Vercel에 설정되지 않았어요' });

  /* 로그인 확인 */
  var auth = String(req.headers.authorization || '');
  var token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: '로그인이 필요해요' });
  try {
    var u = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } });
    if (!u.ok) return res.status(401).json({ error: '로그인이 만료됐어요. 다시 로그인해 주세요' });
  } catch (e) { return res.status(502).json({ error: '로그인 확인에 실패했어요' }); }

  var b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ error: '요청 형식이 올바르지 않아요' });
  var place = String(b.place || '').slice(0, 100);
  var when = String(b.when || '').slice(0, 50);
  var plan = String(b.plan || '').slice(0, 20000);
  var message = String(b.message || '').trim().slice(0, 1000);
  if (!message) return res.status(400).json({ error: '요청 내용을 입력해 주세요' });
  var history = (Array.isArray(b.history) ? b.history : []).slice(-10).map(function (m) {
    return { role: m && m.role === 'model' ? 'model' : 'user', parts: [{ text: String((m && m.text) || '').slice(0, 1500) }] };
  });

  var model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  var ctx = '여행지: ' + place + (when ? ' (시기: ' + when + ')' : '') + '\n\n[현재 일정]\n' + (plan || '(아직 없음)') + '\n\n[요청]\n' + message;
  var body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: history.concat([{ role: 'user', parts: [{ text: ctx }] }]),
    generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
  });
  function call(m) {
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m) + ':generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: body
    }).then(function (resp) { return resp.json().catch(function () { return {}; }).then(function (d) { return { r: resp, data: d }; }); });
  }
  /* 일시적 과부하(429·5xx)면 잠깐 쉬고 다시, 그래도 안 되면 다른 모델로 시도한다. (Vercel 제한 시간 안에서) */
  var tries = [model, model, process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash'];
  var r, data;
  for (var i = 0; i < tries.length; i++) {
    try { var out = await call(tries[i]); r = out.r; data = out.data; }
    catch (e) { r = null; data = {}; }
    if (r && r.ok) break;
    if (r && r.status !== 429 && r.status < 500) break;
    if (i < tries.length - 1) await new Promise(function (ok) { setTimeout(ok, i === 0 ? 800 : 300); });
  }
  if (!r) return res.status(502).json({ error: 'Gemini에 연결하지 못했어요. 잠시 후 다시 시도해 주세요' });
  if (!r.ok) {
    var busy = r.status === 429 || r.status >= 500;
    return res.status(502).json({ error: busy ? 'AI가 지금 많이 붐벼요. 잠시 후 다시 보내 주세요 (' + r.status + ')'
      : 'Gemini 호출 실패 (' + r.status + ') ' + ((data.error && data.error.message) || '') });
  }

  var raw = ((data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [])
    .map(function (p) { return p.text || ''; }).join('');
  try {
    var o = JSON.parse(raw);
    return res.status(200).json({
      reply: String(o.reply || '수정했어요'),
      plan: typeof o.plan === 'string' && o.plan.trim() ? o.plan : plan
    });
  } catch (e) {
    return res.status(200).json({ reply: raw.slice(0, 1000) || '응답을 해석하지 못했어요', plan: plan });
  }
};

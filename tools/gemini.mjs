/* Gemini API 호출 도우미 (서버·내 PC용, Node 18 이상)
   - .env 파일에서 GEMINI_API_KEY, GEMINI_MODEL을 읽는다. 별도 패키지가 필요 없다.
   - 사이트(브라우저) 코드에서는 쓰지 않는다. 사이트는 공개 저장소라 키를 넣으면 누구나 볼 수 있다.
   - 사용: node tools/gemini.mjs --check        설정 확인 (키는 가려서 표시)
          node tools/gemini.mjs "질문 내용"     실제 호출 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

/* .env를 읽어 process.env에 넣는다. 이미 설정된 환경 변수는 덮어쓰지 않는다. */
export function loadEnv(file = resolve(ROOT, '.env')) {
  if (!existsSync(file)) return false;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (/^(['"]).*\1$/.test(val)) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
  return true;
}

export function geminiConfig() {
  loadEnv();
  return {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL
  };
}

export async function generate(prompt, { system, temperature } = {}) {
  const { apiKey, model } = geminiConfig();
  if (!apiKey) throw new Error('GEMINI_API_KEY가 비어 있어요. .env 파일에 키를 넣어 주세요.');
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (temperature != null) body.generationConfig = { temperature };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini 호출 실패 (${res.status}) ${data.error?.message || ''}`.trim());
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
}

/* 명령줄로 실행했을 때만 동작 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv.slice(2).join(' ').trim();
  if (!arg || arg === '--check') {
    const { apiKey, model } = geminiConfig();
    console.log('모델      :', model);
    console.log('API 키    :', apiKey ? `설정됨 (${apiKey.length}자, 앞 4자 ${apiKey.slice(0, 4)}…)` : '비어 있음 — .env의 GEMINI_API_KEY를 채워 주세요');
    console.log('.env 파일 :', existsSync(resolve(ROOT, '.env')) ? '있음' : '없음');
  } else {
    generate(arg).then((t) => console.log(t)).catch((e) => { console.error(e.message); process.exit(1); });
  }
}

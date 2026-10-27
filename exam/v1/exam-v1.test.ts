// @vitest-environment jsdom
// Coach exam v1, the "before": old Aven's real Coach (agentSystem, its data blocks, look-ups, validateAgent and the
// app's own after-steps: readableDates, fillFromReply, savePlanFromGoals and the one self-check re-ask) on the 22
// conversations of Aven 2's docs/COACH.md §8, with fake people (personas-v1.ts). Gemini is called over REST in the
// app's own request shape (lib/gemini.ts aiAgent: responseSchema AGENT_SCHEMA, temperature 0.3, 6144 tokens, thinking
// budget 1024), keyless: the environment's proxy adds the key. Never print or log a key or a header.
// Pacing: one call at a time, at least 4 s apart; 429/5xx wait 10, 20, 40, 60, 60, 60 s (6 retries).
//   npx vitest run --config scripts/exam/vitest.config.ts scripts/exam/exam-v1.test.ts
// Options: EXAM_MODEL (default gemini-3.8-flash), EXAM_FALLBACK (default gemini-flash-latest), EXAM_ONLY=01-...,03-...,
//          EXAM_OUT (default /home/user/Overall-fitness-/reference/exam-v1/before)
import { it, vi } from 'vitest';
import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync } from 'node:fs';
import { EnvHttpProxyAgent, fetch as proxyFetch } from 'undici';
import { PERSONAS_V1 } from './personas-v1';
import { QUESTIONS_V1, type Question } from './questions-v1';
import { threadTurns, type ThreadMsg } from '../../src/lib/thread';
import { SEED_EXERCISES } from '../../src/data/exercises';
import { agentSystem, route, ORB_BRIEF } from '../../src/lib/agentTurn';
import { AGENT_SCHEMA, INSIGHT_SCHEMA, INSIGHT_SYSTEM, SEARCH_SYSTEM, readInsights, schemaHintForTest, type Turn } from '../../src/lib/gemini';
import { validateAgent, fillFromReply, savePlanFromGoals } from '../../src/lib/agent';
import { answerProblems, checkNote, readableDates } from '../../src/lib/answerCheck';
import { runLookups, validateLookups } from '../../src/lib/agentLookup';
import { buildCoachContext, memoryBlock } from '../../src/lib/coachContext';
import { personLines } from '../../src/lib/person';
import { dataTrustLines } from '../../src/lib/dataQuality';
import { HANDBOOK_CORE, TASK_STYLE } from '../../src/lib/handbook';
import { rankNotes } from '../../src/lib/nudges';
import { loadDanish, makeT } from '../../src/lib/i18n';
import { dayKey } from '../../src/lib/dates';
import { useStore } from '../../src/state/store';
import type { AppData } from '../../src/lib/types';

const dispatcher = process.env.HTTPS_PROXY || process.env.https_proxy ? new EnvHttpProxyAgent() : undefined;
const API = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = process.env.EXAM_MODEL ?? 'gemini-3.8-flash';
const FALLBACK = process.env.EXAM_FALLBACK ?? 'gemini-flash-latest';
const ONLY = process.env.EXAM_ONLY?.split(',').map((s) => s.trim()).filter(Boolean);
const OUT = process.env.EXAM_OUT ?? '/home/user/Overall-fitness-/reference/exam-v1/before';
const GAP_MS = Number(process.env.EXAM_GAP_MS ?? 7000);
const WAITS = [10, 20, 40, 60, 60, 60];
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── one Gemini call, paced and retried (performance.now: Date is faked to each conversation's "now") ──
let lastCall = -Infinity;
class CallError extends Error { constructor(public status: number, msg: string) { super(msg); } }
const log: string[] = [];
async function gemini(model: string, body: unknown): Promise<any> {
  if (process.env.EXAM_DRY) return { candidates: [{ content: { parts: [{ text: JSON.stringify((body as any).tools ? 'dry search' : (body as any).generationConfig?.responseSchema === INSIGHT_SCHEMA ? { insights: [] } : { reply: 'dry', actions: [] }) }] } }] };
  for (let attempt = 0; ; attempt++) {
    const wait = lastCall + GAP_MS - performance.now();
    if (wait > 0) await sleep(wait);
    lastCall = performance.now();
    let status = 0, data: any = null;
    try {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 120_000);
      const res: any = await proxyFetch(`${API}/models/${encodeURIComponent(model)}:generateContent`, { dispatcher, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      clearTimeout(timer);
      status = res.status; data = await res.json().catch(() => null);
    } catch (e: any) { status = -1; data = { error: { message: String(e?.message ?? e).slice(0, 120) } }; }
    lastCall = performance.now();
    if (status === 200) return data;
    const retry = status === 429 || status === -1 || status >= 500;
    log.push(`${model} ${status}${retry && attempt < WAITS.length ? ` → wait ${WAITS[attempt]} s` : ''}: ${String(data?.error?.message ?? '').slice(0, 100)}`);
    if (!retry || attempt >= WAITS.length) throw new CallError(status, `${status} ${String(data?.error?.message ?? '').slice(0, 200)}`);
    await sleep(WAITS[attempt] * 1000);
  }
}
const textOf = (res: any): string => (res?.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('');

/** The main model first on every call; the fallback only when the main one still fails after all its retries. */
async function withModel<T>(fn: (m: string) => Promise<T>): Promise<{ value: T; model: string }> {
  try { return { value: await fn(MODEL), model: MODEL }; }
  catch (e) {
    if (!FALLBACK || FALLBACK === MODEL || !(e instanceof CallError) || e.status === 400) throw e;
    log.push(`${MODEL} kept failing: this call goes to ${FALLBACK}`);
    return { value: await fn(FALLBACK), model: FALLBACK };
  }
}
let current = MODEL;

// aiAgent's request; a 400 is asked again without thinking, then in plain JSON mode with the schema written out (as the app)
const noThinking = new Set<string>(); const noSchema = new Set<string>();
async function aiAgent(system: string, contents: Turn[]): Promise<{ raw: any; model: string }> {
  const r = await withModel(async (m) => {
    const run = async (think: boolean) => {
      const plain = noSchema.has(m);
      const data = await gemini(m, { systemInstruction: { parts: [{ text: plain ? system + schemaHintForTest() : system }] }, contents,
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json', ...(plain ? {} : { responseSchema: AGENT_SCHEMA }), maxOutputTokens: 6144, ...(think ? { thinkingConfig: { thinkingBudget: 1024 } } : {}) } });
      const text = textOf(data);
      try { return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()); } catch { throw new CallError(0, `invalid JSON: ${text.slice(0, 200)}`); }
    };
    const think = !noThinking.has(m);
    try { return await run(think); }
    catch (e) {
      if (!(e instanceof CallError) || e.status !== 400) throw e;
      if (think) { noThinking.add(m); try { return await run(false); } catch (e2) { if (!(e2 instanceof CallError) || e2.status !== 400 || noSchema.has(m)) throw e2; } }
      noSchema.add(m); log.push(`${m}: schema refused, plain JSON mode`);
      return run(false);
    }
  });
  return { raw: r.value, model: r.model };
}
// geminiJson / generateJson (the insights): temperature 0.2, 1500 tokens, the schema, no thinking config
async function aiJson(system: string, prompt: string, schema: unknown): Promise<{ raw: any; model: string }> {
  const r = await withModel(async (m) => {
    const data = await gemini(m, { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: 1500 } });
    return JSON.parse(textOf(data));
  });
  return { raw: r.value, model: r.model };
}
// geminiSearch: Google Search grounding
async function webSearch(query: string, lang: string): Promise<{ text: string; sources: { title: string; url: string }[] }> {
  const { value } = await withModel(async (m) => {
    const data = await gemini(m, { systemInstruction: { parts: [{ text: SEARCH_SYSTEM(lang) }] }, contents: [{ role: 'user', parts: [{ text: query }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.2, maxOutputTokens: 1400 } });
    const text = textOf(data).trim(); if (!text) throw new CallError(0, 'empty search');
    const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks.map((c: any) => c?.web).filter((w: any) => w && typeof w.uri === 'string').map((w: any) => ({ title: String(w.title || 'source').slice(0, 80), url: w.uri }));
    return { text, sources };
  });
  return value;
}

// ── the old exam's general code checks, on every reply ──
const tellsLighter = /\b(train lighter|go lighter|take it easy|lighter (day|session)|skip (today|the session)|rest day instead|træn(e)? lettere|tag det roligt|(do|try|stick to|aim for|go for) fewer sets|(tag|lav|kør) færre sæt|drop(ping)? to \d sets|(cut|reduce|lower)\w* (it )?to \d sets|sænk\w* til \d sæt|(adjust|lower|reduce|trim)\w* the planned( leg)? (number of )?sets|deload)\b/i;
const bodyTalk = /\b(look(s|ing)? (lean|fat|soft|bigger|smaller)|your (belly|gut|stomach|physique|abs)|ser (fed|tyk|slank) ud)\b/i;
const judgy = /\b(binge|blowout|cheat|bad day|raid|grazing|off-plan|starv\w*|junk|guilty|skyld)\b/i;
const UNPROMPTED = /\b(doctor|dietitian|physician|læge|diætist|how old are you|your age|hvor gammel|din alder)/i;
const SHOW = new Set(['show_chart', 'show_exercise', 'navigate', 'remember']);
function flags(q: Question, reply: string, actions: any[], d: AppData): string[] {
  const out: string[] = [];
  const noLighter = d.memory.some((m) => /train lighter/i.test(m.text));
  if (noLighter && tellsLighter.test(reply)) out.push(`train lighter: "${reply.match(tellsLighter)![0]}"`);
  if (bodyTalk.test(reply)) out.push(`body talk: "${reply.match(bodyTalk)![0]}"`);
  if (judgy.test(reply)) out.push(`judgy food word: "${reply.match(judgy)![0]}"`);
  const words = reply.split(/\s+/).filter(Boolean).length;
  if (words > 150) out.push(`too long (${words} words)`);
  if (q.asking) { const did = actions.filter((x) => !SHOW.has(x.type)); if (did.length) out.push(`did something unasked: ${did.map((x) => x.type).join(', ')}`); }
  if (!q.health && UNPROMPTED.test(reply)) out.push(`unprompted doctor/age: "${reply.match(UNPROMPTED)![0]}"`);
  return out;
}

// ── the setup form (screens/Onboarding.tsx), as text ──
const SETUP_FORM = {
  en: ['1/6 "Let’s set up Aven." — What should I call you? (optional) · What’s your main goal? Get stronger (Heavier lifts, lower reps) / Build muscle (Volume and progression) / Lose fat (Training plus food awareness) / Endurance (Higher reps, shorter rests) / General fitness (A bit of everything)',
    '2/6 "Your experience": New / Some / Experienced · "What can you train with?": Full gym / Home with barbell / Home with dumbbells / Bodyweight only',
    '3/6 "Which days can you train?": Mon–Sun toggles (default Mon, Wed, Fri) · "N days a week"',
    '4/6 "Units & language": Weight kg / lb · Language English / Dansk',
    '5/6 "Nutrition targets": Calories per day (kcal) · Protein per day (g), both empty by default',
    '6/6 "Ready.": Create a starter plan (toggle, N days a week · editable) · "Explore with demo data instead" · Start',
    '(every step has Skip; "Skip all" at the top. After Start: Today; the Coach opens empty with up to 3 suggestion chips, no greeting and no questions from the Coach.)'],
  da: ['1/6 "Lad os sætte Aven op." — Hvad skal jeg kalde dig? (valgfrit) · Hvad er dit hovedmål? Blive stærkere / Bygge muskler / Tabe fedt / Udholdenhed / Generel form',
    '2/6 "Din erfaring": Ny / Noget / Erfaren · "Hvad kan du træne med?": Fuldt fitnesscenter / Hjemme med stang / Hjemme med håndvægte / Kun kropsvægt',
    '3/6 "Hvilke dage kan du træne?": man–søn (standard man, ons, fre)',
    '4/6 "Enheder og sprog": kg / lb · English / Dansk',
    '5/6 "Ernæringsmål": Kalorier pr. dag · Protein pr. dag (tomme som standard)',
    '6/6 "Klar.": Lav en startplan (til/fra) · "Udforsk med demodata i stedet" · Start',
    '(Alle trin kan springes over. Efter Start: I dag; Coachen åbner tom med op til 3 forslag, ingen hilsen og ingen spørgsmål fra Coachen.)'],
};

const nowOf = (q: Question) => new Date(q.now[0], q.now[1] - 1, q.now[2], q.now[3], q.now[4]);
const keyFields = (a: any) => Object.fromEntries(Object.entries(a).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length)));

async function runOne(q: Question) {
  const now = nowOf(q);
  vi.setSystemTime(now);
  const d = PERSONAS_V1[q.persona](now);
  q.tweak?.(d, now);
  // (a clean phone each time; omar2 has the Drive backup on, so Today has no "no backup yet" note)
  localStorage.clear();
  if (q.persona === 'omar2') localStorage.setItem('aven.drive', JSON.stringify({ connected: true }));
  useStore.setState(d as any); // (fillFromReply and friends read the store, as on the phone)
  const lang = q.lang ?? (d.settings.language === 'da' ? 'da' : 'en');
  const today = dayKey(now.getTime(), d.settings.dayStartHour);
  const names = new Map(SEED_EXERCISES.map((e) => [e.id, e.name]));
  const name = (x: string) => names.get(x) ?? x;
  const t0 = performance.now();
  const base = { id: q.id, persona: q.persona, now: now.toString().slice(0, 21), lang, mode: q.mode ?? 'chat', good: q.good };
  const messages = [...(q.history ?? []).map((h) => ({ role: h.role, text: h.text })), ...(q.mode === 'morning' ? [] : [{ role: 'user', text: q.q }])];

  if (q.mode === 'morning') {
    // Today's notes (no AI) + once-a-day AI insights (ui/CoachPin.tsx useInsights), ranked by rankNotes: what Today's pin shows
    const ctx = `${buildCoachContext(d, today, name, (x) => SEED_EXERCISES.find((e) => e.id === x)?.muscles)}\n${[...personLines(d, today), ...dataTrustLines(d, today)].join('\n')}\n\n${memoryBlock(d, name)}`;
    const app = `\nApp setup: Today shows ${Object.entries(d.settings.widgets).filter(([, v]) => v).map(([k]) => k).join(', ')}; hidden: ${Object.entries(d.settings.widgets).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'none'}.`;
    let insights: any[] = [], model = current, error: string | undefined;
    try { const r = await aiJson(`${INSIGHT_SYSTEM(lang)}\n\n${TASK_STYLE}\n\n${HANDBOOK_CORE}`, ctx + app, INSIGHT_SCHEMA); insights = readInsights(r.raw); model = r.model; }
    catch (e: any) { error = String(e?.message ?? e).slice(0, 300); }
    const notes = rankNotes(d, today, now.getHours(), makeT(lang), lang, name, insights, now.getTime()).slice(0, 4);
    const reply = notes.length
      ? `Today's pin (collapsed): "${notes[0].title}"${notes.length > 1 ? ` (+${notes.length - 1})` : ''}\nTapped open, "The Coach noticed":\n${notes.map((x, i) => `${i + 1}. ${x.title}${x.body ? ` — ${x.body}` : ''}${x.action ? ` [button: ${x.action.label}${x.action.run.type === 'coach' ? ` → asks the Coach "${x.action.run.prompt}"` : ''}]` : ''}`).join('\n')}`
      : '(nothing: Today shows no Coach pin)';
    return { ...base, messages, reply, actions: [], lookups: [], model, ms: Math.round(performance.now() - t0), rounds: 1, check: null, flags: flags(q, notes.map((x) => `${x.title}. ${x.body ?? ''}`).join(' '), [], d),
      notes: notes.map((x) => ({ id: x.id, kind: x.kind, title: x.title, body: x.body, action: x.action })), insights, ...(error ? { error } : {}),
      factSheet: `${ctx}${app}` };
  }

  const where = q.orb ? (d.active ? 'The user is in their running workout: sets go into it.' : 'The user tapped the orb on the main screen and spoke to it.') + ORB_BRIEF : 'The user opened this from the main screen.';
  const { system, mealLabel } = agentSystem(d, { lang, pool: SEED_EXERCISES, where, now });
  const cut = system.search(/\nMEMORY|\nDATA \(computed/);
  const factSheet = system.slice(cut >= 0 ? cut : 0);
  const list: ThreadMsg[] = (q.history ?? []).map((h, i) => ({ id: `h${i}`, role: h.role, text: h.text, at: now.getTime() - ((q.history!.length - i) * 60_000) }));
  const conv: Turn[] = [...threadTurns(list, d.settings.dayStartHour, 14), { role: 'user', parts: [{ text: q.dictated ? `[dictated] ${q.q}` : q.q }] }];
  const lookups: string[] = []; const sources: any[] = []; let found = '', raw: any = null, rounds = 0, model = current;
  const routed = route(q.q, 'high');
  try {
    for (let round = 0; round < 3; round++) {
      rounds++;
      const last = round === 2;
      const sys = system + (found ? `\n\nLOOKUP RESULTS (you asked for these in this turn; answer from them, do not ask for them again):\n${found}` : '') + (last && round > 0 ? '\n\nNo more look-ups this turn: answer now with what you have, and say if something is still unknown.' : '');
      const r = await aiAgent(sys, conv); raw = r.raw; model = r.model;
      const look = last ? [] : validateLookups(raw?.lookups);
      if (!look.length) break;
      lookups.push(...look.map((l) => `${l.kind}${l.query ? `:${l.query}` : ''}${l.from ? ` ${l.from}` : ''}${l.to ? `–${l.to}` : ''}`));
      const local = look.filter((l) => l.kind !== 'web');
      if (local.length) found += (found ? '\n\n' : '') + runLookups(d, local, { today, lang, pool: SEED_EXERCISES, mealLabel, said: [] });
      for (const l of look.filter((x) => x.kind === 'web' && x.query).slice(0, 2)) {
        const w = await webSearch(l.query!, lang).catch((e) => { log.push(`web failed: ${String(e?.message ?? e).slice(0, 100)}`); return null; });
        if (!w) { found += `${found ? '\n\n' : ''}### web\nThe web search failed: answer from what you know and say you could not check it.`; continue; }
        sources.push(...w.sources);
        found += `${found ? '\n\n' : ''}### web (searched)\n${w.text}\nSources: ${w.sources.map((s, i) => `[${i + 1}] ${s.title}`).join('; ') || 'none listed'}`;
      }
    }
    const sysFinal = system + (found ? `\n\nLOOKUP RESULTS (you asked for these in this turn; answer from them, do not ask for them again):\n${found}` : '');
    let v = validateAgent(raw);
    if (!v) return { ...base, messages, reply: '', actions: [], lookups, model, ms: Math.round(performance.now() - t0), rounds, check: 'invalid answer', flags: [], error: JSON.stringify(raw).slice(0, 500), factSheet };
    v = { ...v, reply: readableDates(v.reply, lang, today), actions: savePlanFromGoals(sysFinal, v.reply, fillFromReply(v.reply, v.actions, lang)) };
    // the app's self-check: asked once more with the problems named; the better answer stands
    const probs = answerProblems(v.reply, v.actions, sysFinal);
    let selfCheck: any = undefined;
    if (probs.length) {
      rounds++;
      const again = await aiAgent(sysFinal + '\n\nNo look-ups now: answer.' + checkNote(probs, raw), conv).catch(() => null);
      const v1 = again ? validateAgent(again.raw) : null;
      const v2 = v1 ? { ...v1, reply: readableDates(v1.reply, lang, today), actions: savePlanFromGoals(sysFinal, v1.reply, fillFromReply(v1.reply, v1.actions, lang)) } : null;
      const kept = !!(v2 && v2.reply.trim() && answerProblems(v2.reply, v2.actions, sysFinal).length < probs.length);
      selfCheck = { problems: probs, firstReply: v.reply, keptSecond: kept };
      if (kept) v = v2!;
    }
    const answer = { reply: v.reply, actions: v.actions };
    const check = v.dropped ? `dropped ${v.dropped} unreadable action(s)` : q.check?.(answer) ?? null;
    return { ...base, messages, reply: v.reply, actions: v.actions.map(keyFields), lookups, ...(sources.length ? { sources } : {}), model, ms: Math.round(performance.now() - t0), rounds,
      check, checked: !!q.check, flags: flags(q, v.reply, v.actions, d), route: routed, ...(selfCheck ? { selfCheck } : {}),
      ...(q.mode === 'setup' ? { setupForm: SETUP_FORM[lang], setupChoices: q.setup } : {}), factSheet };
  } catch (e: any) {
    return { ...base, messages, reply: '', actions: [], lookups, model, ms: Math.round(performance.now() - t0), rounds, check: 'error', flags: [], error: String(e?.message ?? e).slice(0, 300), factSheet };
  }
}

it('runs Coach exam v1 (before: old Aven)', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  await loadDanish();
  mkdirSync(OUT, { recursive: true });
  const qs = QUESTIONS_V1.filter((q) => !ONLY || ONLY.includes(q.id));
  for (const q of qs) {
    const r: any = await runOne(q);
    writeFileSync(`${OUT}/${q.id}.json`, JSON.stringify(r, null, 1));
    console.log(`${q.id}: ${r.error ? `ERROR ${r.error.slice(0, 120)}` : `ok (${r.model}, ${r.ms} ms, check ${r.check ?? (r.checked ? 'pass' : '-')})`}`);
  }
  appendFileSync(`${OUT}/calls.log`, `--- run: ${qs.map((q) => q.id).join(', ')}\n${log.join('\n')}\n`);
  // summary over every file in OUT (so a re-run of a few ids keeps the rest)
  const rows: string[] = [];
  let ran = 0;
  const models = new Set<string>();
  for (const q of QUESTIONS_V1) {
    const f = `${OUT}/${q.id}.json`;
    if (!existsSync(f)) { rows.push(`| ${q.id} | ${q.persona} | not run | | | |`); continue; }
    const r = JSON.parse(readFileSync(f, 'utf8'));
    if (!r.error) { ran++; models.add(r.model); }
    const check = r.error ? 'error' : r.check ? `FAIL: ${r.check}` : r.checked ? 'pass' : '–';
    rows.push(`| ${q.id} | ${q.persona} | ${r.model} | ${check.replace(/\|/g, '/')} | ${(r.flags ?? []).join('; ').replace(/\|/g, '/') || '–'} | ${r.error ? r.error.replace(/\|/g, '/').slice(0, 160) : ''} |`);
  }
  const md = `# Coach exam v1: before (old Aven)\n\nOld Aven's Coach (agentSystem and its data blocks, look-ups, validateAgent, readableDates, fillFromReply, savePlanFromGoals and its one self-check re-ask) on the 22 conversations of docs/COACH.md §8, fake personas (src/personas-v1.ts). Gemini REST in the app's request shape, keyless through the proxy.\n\n- Ran: ${ran} of ${QUESTIONS_V1.length}\n- Model(s): ${[...models].join(', ') || 'none'}\n- 01 and 02: old Aven has no speak-first chat; the "reply" is what Today's Coach pin shows (findNudges + the once-a-day AI insights, ranked by rankNotes).\n- 17 and 18: the 6-step setup form (as text in the JSON), then the first message to an empty Coach.\n- check = the conversation's own code check (– = none); flags = the old exam's general checks (train lighter when MEMORY says no, body talk, judgy food words, over 150 words, an action on a pure question, an unprompted doctor/age line).\n\n| id | persona | model | check | flags | error |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n\n## Call log\n\nEvery retry, wait and fallback of every run is in calls.log next to this file.\n`;
  writeFileSync(`${OUT}/summary.md`, md);
}, 7_200_000);

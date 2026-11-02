/**
 * The engine's debug page (/engine/): log sets, watch the rest timer, Undo from the history, export and restore a
 * backup, import from old Aven and read the report. Bare on purpose: no design, only a way to check the engine on a phone.
 * Uses only a2 storage.
 */
import { Engine, deleteEverything, type Result } from '../engine/engine';
import type { Session } from '../engine/model';
import { CATALOG } from '../engine/data/exercises';
import { dayKeyAt, deviceTz, fmtClock, fmtDurationLong } from '../engine/time';
import { abandonSession, addSet, adjustRest, discardSession, elapsedMs, finishSession, openDrafts, pauseSession, restLeftMs, resumeSession, setsOf, skipRest, startSession, tickSet, untickSet, updateAllowed } from '../engine/workout';
import { backupName, exportBackup, parseBackup, previewRestore, restore, type BackupFile } from '../engine/backup';
import { dryRun, mapOld, readOldBackup, readOldLocal, runImport, type Report } from '../engine/importOld';
import { keepWhenUseful, usage } from '../engine/storage';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const exName = (id: string) => CATALOG.find((e) => e.id === id)?.name ?? id;
const COMMON = ['bench-press', 'back-squat', 'deadlift', 'overhead-press', 'barbell-row', 'pull-up', 'incline-db-press', 'romanian-deadlift'].filter((id) => CATALOG.some((e) => e.id === id));

let e: Engine;
let message = '';
/** `m` is trusted page text: anything from data goes through esc() first. */
const say = (m: string) => { message = m; render(); };
const day = () => dayKeyAt(Date.now(), deviceTz(), (e.get<'settings'>('settings')?.dayStartHour) ?? 0);

function explain(r: Result, done: string): string {
  if (r.status === 'saved') return done;
  if (r.status === 'noop') return 'Nothing to change.';
  if (r.status === 'duplicate') return 'Already done (this tap was saved before).';
  if (r.status === 'conflict') return `Undo stopped: newer changes to ${esc(r.conflicts!.map((c) => `${c.field} (now ${JSON.stringify(c.actual)})`).join(', '))}. Use "Undo the rest" to leave those as they are.`;
  return `Not saved: ${esc(r.error?.message ?? 'unknown problem')}`;
}

/** The tap path: shown at once as pending, then saved or failed. */
function act(type: string, label: string, ops: Parameters<Engine['run']>[0]['ops']) {
  if (!ops.length) return;
  const { result } = e.run({ type, label, ops });
  render();
  void result.then((r) => { say(explain(r, `Saved: ${esc(label)}`)); void keepWhenUseful(e); });
}

// ── workout ───────────────────────────────────────────────

function current(): Session | undefined { return openDrafts(e.allRecords())[0]; }

function renderWorkout(): string {
  const s = current();
  if (!s) {
    const last = e.all('session').filter((x) => x.state !== 'discarded').sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0];
    return `<div class="row"><select id="ex">${COMMON.map((id) => `<option value="${id}">${esc(exName(id))}</option>`).join('')}</select>
      <button data-a="start">Start a workout</button></div>
      ${last ? `<p class="muted">Last: ${esc(last.name)} on ${esc(last.day)} (${last.state}), ${fmtDurationLong(elapsedMs(last, Date.now()) / 1000)}</p>` : ''}`;
  }
  const blocks = setsOf(e.allRecords(), s.id).map(({ slot, sets }) => `<p><b>${esc(exName(slot.exerciseId))}</b></p><ul>${sets.map((t, i) => {
    const plan = t.planned ? `plan ${t.planned.reps ?? '?'} × ${t.planned.kg ?? '?'} kg` : 'no plan';
    if (t.done) return `<li>Set ${i + 1}: <b>${t.done.reps ?? '–'} × ${t.done.kg ?? '–'} kg</b> <span class="muted">(${plan})</span> <button data-a="untick" data-id="${t.id}">Untick</button></li>`;
    return `<li>Set ${i + 1}: <span class="muted">${plan}</span>
      <span class="row"><input type="number" inputmode="decimal" step="0.5" id="kg-${t.id}" placeholder="kg" value="${t.planned?.kg ?? ''}">
      <input type="number" inputmode="numeric" id="reps-${t.id}" placeholder="reps" value="${t.planned?.reps ?? ''}">
      <button data-a="tick" data-id="${t.id}">✓ Tick</button></span></li>`;
  }).join('')}</ul><button data-a="addset" data-id="${slot.id}">Add a set</button>`).join('');
  const paused = s.state === 'paused';
  return `<p><b>${esc(s.name)}</b> · ${paused ? 'paused' : 'running'} · <span id="clock" class="muted"></span></p>
    <div id="rest"></div>
    <div class="row">${s.rest ? `<button data-a="r-15">−15 s</button><button data-a="r+15">+15 s</button><button data-a="rskip">Skip rest</button>` : ''}</div>
    ${blocks}
    <div class="row"><button data-a="${paused ? 'resume' : 'pause'}">${paused ? 'Resume' : 'Pause'}</button><button data-a="finish">Finish</button>
    <button data-a="abandon">Stop (keep what's done)</button><button data-a="discard">Discard</button></div>
    <p class="muted">App update allowed now: ${updateAllowed({ records: e.allRecords(), savesPending: e.busy() }) ? 'yes' : 'no (a workout is open or a save is pending)'}</p>`;
}

/** Timers are drawn from the stored end time on every frame, so the first frame is already right. */
function frame() {
  const s = current();
  const rest = $('rest'), clock = document.getElementById('clock');
  if (s && clock) clock.textContent = fmtClock(elapsedMs(s, Date.now()) / 1000);
  if (rest) {
    const left = restLeftMs(s?.rest, Date.now());
    rest.innerHTML = left === null ? '' : `<div class="big">${left >= 0 ? fmtClock(Math.ceil(left / 1000)) : `+${fmtClock(Math.floor(-left / 1000))}`}</div><div class="muted">${left >= 0 ? 'rest' : 'rest is over'}${s?.rest?.pausedLeftMs !== undefined ? ' (paused)' : ''}</div>`;
  }
  requestAnimationFrame(frame);
}

function onWorkout(a: string, id?: string) {
  const s = current();
  const now = Date.now();
  if (a === 'start') {
    const ex = ($('ex') as HTMLSelectElement).value;
    const { ops } = startSession({ now, day: day(), name: exName(ex), slots: [{ exerciseId: ex, restSec: 90, sets: [{ planned: { reps: 8, kg: 60 } }, { planned: { reps: 8, kg: 60 } }, { planned: { reps: 8, kg: 60 } }] }] });
    return act('session.start', `Started ${exName(ex)}`, ops);
  }
  if (!s) return;
  const set = id ? e.get<'set'>(id) : undefined;
  if (a === 'tick' && set) {
    const kg = Number(($(`kg-${id}`) as HTMLInputElement).value), reps = Number(($(`reps-${id}`) as HTMLInputElement).value);
    const slot = e.get<'slot'>(set.slotId);
    return act('set.tick', `Ticked ${exName(slot?.exerciseId ?? '')}: ${reps || '–'} × ${kg || '–'} kg`, tickSet({ session: s, set, now, restSec: slot?.restSec ?? 90,
      done: { ...(kg > 0 ? { kg } : {}), ...(reps > 0 ? { reps } : {}) } }));
  }
  if (a === 'untick' && set) return act('set.untick', 'Unticked a set', untickSet(s, set));
  if (a === 'addset' && id) { const slot = e.get<'slot'>(id)!; return act('set.add', 'Added a set', addSet({ slot, sets: setsOf(e.allRecords(), s.id).find((x) => x.slot.id === id)!.sets })); }
  if (a === 'pause') return act('session.pause', 'Paused', pauseSession(s, now));
  if (a === 'resume') return act('session.resume', 'Resumed', resumeSession(s, now));
  if (a === 'finish') return act('session.finish', `Finished ${s.name}`, finishSession(s, now));
  if (a === 'abandon') return act('session.abandon', `Stopped ${s.name}`, abandonSession(s, now));
  if (a === 'discard' && confirm('Discard this workout? You can still Undo it from the history.')) return act('session.discard', `Discarded ${s.name}`, discardSession(s, now));
  if (a === 'r+15') return act('rest.adjust', 'Rest +15 s', adjustRest(s, 15, now));
  if (a === 'r-15') return act('rest.adjust', 'Rest −15 s', adjustRest(s, -15, now));
  if (a === 'rskip') return act('rest.skip', 'Skipped rest', skipRest(s));
}

// ── history and Undo ──────────────────────────────────────

function renderHistory(): string {
  const list = e.actions().slice(0, 25);
  if (!list.length) return '<p class="muted">Nothing yet.</p>';
  return `<ul>${list.map((x) => {
    const state = e.saveState(x.id);
    const tag = x.undoneBy ? ' <span class="muted">(undone)</span>' : '';
    const btn = x.undoneBy ? '' : `<button data-u="${x.id}">Undo</button>`;
    return `<li>${new Date(x.at).toLocaleTimeString()} · ${esc(x.label)}${tag} <span class="muted">${x.source}${state === 'pending' ? ' · saving…' : ''}</span> ${btn}</li>`;
  }).join('')}</ul>`;
}
async function onUndo(id: string, skip = false) {
  const r = await e.undo(id, { skipConflicts: skip });
  message = explain(r, skip && r.conflicts?.length ? `Undone, except ${r.conflicts.length} newer change(s), left as they are.` : 'Undone.');
  if (r.status === 'conflict') message += ` <button data-u2="${id}">Undo the rest</button>`;
  render();
}

// ── backup and restore ────────────────────────────────────

let pendingRestore: BackupFile | null = null;
async function onExport() {
  const b = await exportBackup(e);
  const url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: backupName() });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  say(`Exported ${b.records.length} records with checksum ${b.checksum.slice(0, 12)}…`);
}
async function onRestoreFile(f: File) {
  const p = await parseBackup(await f.text());
  if (!p.ok) { $('restore').innerHTML = `<p class="bad">${esc(p.detail)} Nothing was changed.</p>`; return; }
  pendingRestore = p.backup;
  const v = previewRestore(e, p.backup);
  $('restore').innerHTML = `<p>Found ${esc(v.summary)} (saved ${esc(v.exportedAt.slice(0, 16).replace('T', ' '))}).</p>
    <p class="muted">Compared with this phone: ${v.newHere} new, ${v.same} the same, ${v.newerInFile} newer in the file, ${v.newerOnPhone} newer on the phone, ${v.deletedOnPhone} deleted on the phone, ${v.onlyOnPhone} only on the phone.</p>
    <div class="row"><button data-r="merge">Merge (keep newer, keep deletes)</button><button data-r="replace">Replace (phone = file)</button><button data-r="cancel">Cancel</button></div>`;
}
async function onRestore(mode: 'merge' | 'replace' | 'cancel') {
  const b = pendingRestore;
  pendingRestore = null;
  $('restore').innerHTML = '';
  if (!b || mode === 'cancel') return;
  say(explain(await restore(e, b, mode), `Restored (${mode}). One Undo in the history takes it back.`));
}

// ── import from old Aven ──────────────────────────────────

let pendingImport: Report | null = null;
function showReport(data: unknown, photos = 0, chat = 0) {
  const m = mapOld(data, { now: Date.now(), tz: deviceTz(), photos, chat });
  const r = dryRun(e, m);
  pendingImport = r;
  $('import').innerHTML = `<p><b>Dry run (nothing written yet).</b> Old Aven holds ${esc(r.summary)}.</p>
    <p>Will add <b>${r.toAdd}</b>; already here ${r.already}; deleted here before (stays deleted) ${r.deletedHere}.</p>
    ${r.skipped.length ? `<p>Not brought over:</p><ul>${r.skipped.map((s) => `<li>${s.count} × ${esc(s.what)}: <span class="muted">${esc(s.why)}</span></li>`).join('')}</ul>` : ''}
    <div class="row">${r.toAdd ? '<button data-i="go">Import now (one Undo takes it back)</button>' : ''}<button data-i="cancel">Close</button></div>`;
}
async function onImportLocal() {
  const data = readOldLocal();
  if (!data) { $('import').innerHTML = '<p class="bad">No old Aven data found on this phone in this browser.</p>'; return; }
  showReport(data);
}
async function onImportFile(f: File) {
  const r = readOldBackup(await f.text());
  if (!r.ok) { $('import').innerHTML = `<p class="bad">${esc(r.detail)} Nothing was changed.</p>`; return; }
  showReport(r.data, r.photos, r.chat);
}
async function onImport(go: boolean) {
  const r = pendingImport;
  pendingImport = null;
  $('import').innerHTML = '';
  if (!r || !go) return;
  say(explain(await runImport(e, r), 'Imported. One Undo in the history takes it all back.'));
}

// ── page ──────────────────────────────────────────────────

async function status() {
  const counts = { workouts: e.all('session').length, sets: e.all('set').filter((s) => s.done).length, foods: e.all('food').length, records: e.allRecords().length };
  const u = await usage();
  const kept = await e.meta<boolean | null>('persisted');
  $('status').innerHTML = `${counts.workouts} workouts · ${counts.sets} sets done · ${counts.foods} foods · ${counts.records} records in a2.data · storage kept: ${kept === true ? 'yes' : kept === false ? 'no' : 'not asked yet'}${u ? ` · ${(u.used / 1e6).toFixed(1)} MB used` : ''}${e.readOnly ? ' · <b class="bad">READ-ONLY (saved by a newer version)</b>' : ''}`;
}

function render() {
  $('workout').innerHTML = renderWorkout();
  $('history').innerHTML = renderHistory();
  const f = e.failures();
  $('fail').innerHTML = (message ? `<p>${message}</p>` : '') + f.map((x) => `<p class="bad">Not saved: ${esc(x.label)} (${esc(x.error.message)}) <button data-retry="${x.id}">Retry</button></p>`).join('');
  void status();
}

document.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.a) onWorkout(d.a, d.id);
  else if (d.u) void onUndo(d.u);
  else if (d.u2) void onUndo(d.u2, true);
  else if (d.retry) { e.retry(d.retry)?.result.then((r) => say(explain(r, 'Saved on retry.'))); }
  else if (d.r) void onRestore(d.r as 'merge');
  else if (d.i) void onImport(d.i === 'go');
});

async function main() {
  e = await Engine.open();
  e.subscribe(render);
  $('export').onclick = () => void onExport();
  $('restorePick').onclick = () => $('restoreFile').click();
  ($('restoreFile') as HTMLInputElement).onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) void onRestoreFile(f); (ev.target as HTMLInputElement).value = ''; };
  $('importLocal').onclick = () => void onImportLocal();
  $('importPick').onclick = () => $('importFile').click();
  ($('importFile') as HTMLInputElement).onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) void onImportFile(f); (ev.target as HTMLInputElement).value = ''; };
  $('wipe').onclick = async () => {
    if (!confirm('Delete everything in Aven 2 on this phone? Old Aven is not touched. Export a backup first if you want one.')) return;
    e.close();
    await deleteEverything();
    location.reload();
  };
  const drafts = openDrafts(e.allRecords());
  if (drafts.length) message = `Workout in progress: ${esc(drafts[0].name)}. Resume, finish or discard it below.`;
  render();
  requestAnimationFrame(frame);
}

main().catch((err) => { document.body.insertAdjacentHTML('afterbegin', `<p class="bad">The engine could not start: ${esc(err?.message ?? err)}</p>`); });

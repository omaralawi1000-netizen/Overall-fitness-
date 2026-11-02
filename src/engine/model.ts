/**
 * Aven 2's data model. Plain-words version: docs/engine/DATA-MODEL.md (keep the two in step).
 *
 * Fixed units: kg, g, ml, kcal, seconds, metres, cm. An absent field means "not known", never zero.
 */

/** The schema version this code writes. Raise it only together with a migration (migrations.ts). */
export const SCHEMA = 1;

export type Source = 'tap' | 'voice' | 'coach' | 'import' | 'watch' | 'system';
export const SOURCES: readonly Source[] = ['tap', 'voice', 'coach', 'import', 'watch', 'system'];

/** What every record carries. */
export interface Envelope {
  id: string;
  kind: Kind;
  /** schema version it was written with */
  v: number;
  /** when it happened (ms, UTC) */
  at: number;
  /** the phone's time zone then */
  tz: string;
  /** the day it belongs to (YYYY-MM-DD), decided when it was made */
  day?: string;
  source: Source;
  createdAt: number;
  updatedAt: number;
  rev: number;
  /** soft delete: hidden, kept */
  deleted?: { at: number; by: string };
  /** derived things: the revision of each fact they were built from (`derived.ts` works out whether they are stale) */
  builtFrom?: Record<string, number>;
}

/** What someone typed, when it wasn't the stored unit ("180 lb", "2 dl"). */
export interface Entered { value: number; unit: string }

// ── Training ──────────────────────────────────────────────

export type SessionState = 'planned' | 'active' | 'paused' | 'finished' | 'abandoned' | 'discarded';
export type SessionEvent = 'plan' | 'start' | 'pause' | 'resume' | 'finish' | 'abandon' | 'discard';
export interface Rest { startedAt: number; endsAt: number; totalSec: number; afterSetId?: string; pausedLeftMs?: number }

export interface Session extends Envelope {
  kind: 'session';
  name: string;
  state: SessionState;
  events: { type: SessionEvent; at: number }[];
  routineId?: string;
  plannedDay?: string;
  startedAt?: number;
  endedAt?: number;
  pausedMs: number;
  pausedAt?: number;
  rest?: Rest;
  note?: string;
}

export interface Slot extends Envelope {
  kind: 'slot';
  sessionId: string;
  exerciseId: string;
  order: number;
  note?: string;
  restSec?: number;
  supersetGroup?: string;
}

export interface SetPlan { reps?: number; repMin?: number; repMax?: number; kg?: number; durationSec?: number; distanceM?: number }
export interface SetDone { reps?: number; kg?: number; durationSec?: number; distanceM?: number; rpe?: number; rir?: number; at: number; entered?: Entered }
export interface WorkSet extends Envelope {
  kind: 'set';
  sessionId: string;
  slotId: string;
  order: number;
  type: 'warmup' | 'working';
  planned?: SetPlan;
  done?: SetDone;
  skipped?: boolean;
}

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'smith' | 'cable' | 'bodyweight' | 'kettlebell' | 'band' | 'bench' | 'other';
export type LogType = 'weightReps' | 'bodyweightReps' | 'assisted' | 'duration' | 'distance';
export interface ExerciseDef {
  id: string;
  name: string;
  nameDa?: string;
  /** the movement it belongs to ("bench-press"): for grouping and "swap for", never for comparing records */
  family: string;
  /** what makes it its own exercise: equipment, grip, angle, range of motion */
  variant?: { equipment?: Equipment; grip?: string; angle?: string; rom?: string };
  muscles: string[];
  equipment: Equipment[];
  logType: LogType;
  aka?: string[];
}
export interface CustomExercise extends Envelope, Omit<ExerciseDef, 'id'> { kind: 'exercise' }

export type ActivityType = 'wrestling' | 'run' | 'walk' | 'cycle' | 'swim' | 'row' | 'hike' | 'mobility' | 'other';
export interface Activity extends Envelope {
  kind: 'activity';
  type: ActivityType;
  durationSec: number;
  startAt?: number;
  distanceM?: number;
  rounds?: number;
  intensity?: 1 | 2 | 3;
  kcal?: number;
  avgHr?: number;
  maxHr?: number;
  note?: string;
  name?: string;
}

export interface RoutineItem { id: string; exerciseId: string; warmupSets: number; workingSets: number; repMin: number; repMax: number; restSec: number; supersetGroup?: string; note?: string; targetDurationSec?: number; targetDistanceM?: number }
export interface Routine extends Envelope { kind: 'routine'; name: string; items: RoutineItem[]; note?: string; oneOff?: string }
export interface Plan extends Envelope {
  kind: 'plan';
  mode: 'weekly' | 'rotation';
  /** 0 = Sunday … 6 = Saturday → routine id */
  weekly: Record<number, string | null>;
  rotation: { order: string[]; pointer: number; perWeek: number };
  overrides: { date: string; routineId: string; originDate?: string }[];
  cleared: string[];
  /** sport days: weekday → activity types */
  activities: Record<number, ActivityType[]>;
}

// ── Food and body ─────────────────────────────────────────

export type NutrientKey = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fibre' | 'sugar' | 'satFat' | 'sodium';
export type Nutrients = Partial<Record<NutrientKey, number>>;
export type FoodDataSource = 'reference' | 'off' | 'custom' | 'recipe' | 'quick' | 'estimate';
export interface Portion { amount: number; unit: 'g' | 'ml' | 'piece' | 'portion'; label?: string; countWord?: string }
export interface FoodLog extends Envelope {
  kind: 'food';
  name: string;
  meal: string;
  foodRef?: string;
  dataSource: FoodDataSource;
  portion: Portion;
  grams?: number;
  ml?: number;
  state?: 'raw' | 'cooked' | 'dry';
  estimated: boolean;
  nutrients: Nutrients;
  brand?: string;
  note?: string;
}
export interface DayNote extends Envelope { kind: 'dayNote'; foodComplete?: boolean; note?: string }
export interface Water extends Envelope { kind: 'water'; ml: number }
export interface Bodyweight extends Envelope { kind: 'bodyweight'; kg: number; entered?: Entered }
export interface Measurement extends Envelope { kind: 'measurement'; part: 'waist' | 'chest' | 'hips' | 'arm' | 'thigh' | 'neck'; cm: number }

// ── Health ────────────────────────────────────────────────

export interface Sleep extends Envelope { kind: 'sleep'; start: number; end: number; minutes?: number; deepMin?: number; remMin?: number; lightMin?: number; awakeMin?: number }
export interface HealthDay extends Envelope {
  kind: 'healthDay';
  steps?: number; activeKcal?: number; totalKcal?: number; distanceM?: number; floors?: number;
  restHr?: number; hrv?: number; spo2?: number; respRate?: number; vo2max?: number;
  weightKg?: number; bodyFat?: number; leanKg?: number; bmr?: number;
  sleepMin?: number; deepMin?: number; remMin?: number; lightMin?: number; awakeMin?: number; sleepStart?: number; sleepEnd?: number;
}

// ── The Coach ─────────────────────────────────────────────

export type MemoryTopic = 'about' | 'goal' | 'promise' | 'preference' | 'health' | 'life';
export interface GoalPlan { metric: 'weight' | 'lift' | 'other'; target?: number; reps?: number; by?: string; startDate: string; start?: number; status?: 'done' | 'dropped'; endedOn?: string; plan?: string }
export interface MemoryCard extends Envelope {
  kind: 'memory';
  text: string;
  topic: MemoryTopic;
  scope: 'standing' | 'oneOff';
  validFrom: string;
  validUntil?: string;
  lastSeen: number;
  reviewAt?: string;
  origin: 'said' | 'agreed' | 'learned';
  exerciseIds?: string[];
  goal?: GoalPlan;
  was?: { text: string; at: number }[];
}
export type LadderStage = 'observation' | 'recommendation' | 'proposal' | 'accepted' | 'undone' | 'dismissed' | 'expired';
export interface CoachItem extends Envelope { kind: 'coachItem'; stage: LadderStage; text: string; expiresAt?: number; actionId?: string }

// ── Settings ──────────────────────────────────────────────

export interface Settings extends Envelope {
  kind: 'settings';
  language: 'en' | 'da';
  dayStartHour: number;
  weekStart: 0 | 1;
  units: { weight: 'kg' | 'lb'; distance: 'km' | 'mi'; length: 'cm' | 'in' };
  restDefaultSec: number;
  targets: { kcal?: number; protein?: number; carbs?: number; fat?: number; fibre?: number; waterMl?: number };
  name?: string;
}

export type AnyRecord = Session | Slot | WorkSet | CustomExercise | Activity | Routine | Plan | FoodLog | DayNote | Water | Bodyweight
  | Measurement | Sleep | HealthDay | MemoryCard | CoachItem | Settings;
export type Kind = AnyRecord['kind'];
export const KINDS: readonly Kind[] = ['session', 'slot', 'set', 'exercise', 'activity', 'routine', 'plan', 'food', 'dayNote', 'water',
  'bodyweight', 'measurement', 'sleep', 'healthDay', 'memory', 'coachItem', 'settings'];
export type RecordOf<K extends Kind> = Extract<AnyRecord, { kind: K }>;

// ── The action log ────────────────────────────────────────

/** One record touched by an action: only the fields that changed. No `before` = it was created by this action. */
export interface Change { id: string; kind: Kind; before?: Record<string, unknown>; after: Record<string, unknown> }
export interface Action {
  id: string;
  at: number;
  tz: string;
  source: Source;
  /** e.g. "set.tick", "food.log", "import.oldAven", "undo" */
  type: string;
  /** plain words for the history ("Ticked set 2 of Bench press: 8 × 80 kg") */
  label: string;
  changes: Change[];
  /** this action is the Undo of that one */
  undoes?: string;
  /** that action undid this one */
  undoneBy?: string;
}

/** Fields of the envelope the engine owns: callers never set them in a patch. */
export const ENGINE_FIELDS = ['id', 'kind', 'v', 'createdAt', 'updatedAt', 'rev'] as const;

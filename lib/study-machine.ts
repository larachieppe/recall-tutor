import type {
  AnswerRecord,
  GenerateConfig,
  Overview,
  Question,
  SourceMeta,
} from "./types";

/**
 * The study session as an explicit state machine. All phase transitions go
 * through the pure `reducer`, so the flow is one testable unit instead of
 * scattered setState calls. Async side-effects (fetch, storage) live in the
 * component and drive the machine by dispatching actions.
 */

export type Phase =
  | "setup"
  | "library"
  | "progress"
  | "overview"
  | "study"
  | "results";

export interface State {
  phase: Phase;
  source: string;
  meta: SourceMeta | null;
  config: GenerateConfig | null;
  questions: Question[];
  index: number;
  records: AnswerRecord[];
  overview: Overview | null;
  currentItemId: string | null;
  busy: boolean;
  busyLabel: string;
  error: string | null;
}

export type Action =
  | { type: "NAV"; phase: "setup" | "library" | "progress" }
  | {
      type: "GENERATE_START";
      source: string;
      meta: SourceMeta;
      config: GenerateConfig;
      itemId: string | null;
      label: string;
    }
  | { type: "GENERATE_DONE"; questions: Question[]; overview: Overview | null }
  | { type: "GENERATE_FAIL"; error: string }
  | { type: "ANSWERED"; record: AnswerRecord }
  | { type: "NEXT" }
  | { type: "TO_STUDY" }
  | { type: "FINISH" }
  | { type: "RESTART" }
  | {
      type: "RESUME";
      phase: "overview" | "study";
      source: string;
      meta: SourceMeta;
      config: GenerateConfig;
      questions: Question[];
      index: number;
      records: AnswerRecord[];
      overview: Overview | null;
      itemId: string | null;
    };

export const initialState: State = {
  phase: "setup",
  source: "",
  meta: null,
  config: null,
  questions: [],
  index: 0,
  records: [],
  overview: null,
  currentItemId: null,
  busy: false,
  busyLabel: "Working…",
  error: null,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "NAV":
      return { ...state, phase: action.phase, error: null };
    case "GENERATE_START":
      return {
        ...state,
        source: action.source,
        meta: action.meta,
        config: action.config,
        currentItemId: action.itemId,
        busy: true,
        busyLabel: action.label,
        error: null,
      };
    case "GENERATE_DONE":
      return {
        ...state,
        busy: false,
        questions: action.questions,
        records: [],
        index: 0,
        overview: action.overview,
        phase: action.overview ? "overview" : "study",
      };
    case "GENERATE_FAIL":
      return { ...state, busy: false, error: action.error };
    case "ANSWERED":
      return { ...state, records: [...state.records, action.record] };
    case "NEXT":
      return { ...state, index: state.index + 1 };
    case "TO_STUDY":
      return { ...state, phase: "study" };
    case "FINISH":
      return { ...state, phase: "results" };
    case "RESTART":
      return { ...initialState };
    case "RESUME":
      return {
        ...state,
        phase: action.phase,
        source: action.source,
        meta: action.meta,
        config: action.config,
        questions: action.questions,
        index: action.index,
        records: action.records,
        overview: action.overview,
        currentItemId: action.itemId,
        busy: false,
        error: null,
      };
    default:
      return state;
  }
}

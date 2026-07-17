export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "short_answer" | "application" | "compare_contrast";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_answer: "Short answer",
  application: "Application",
  compare_contrast: "Compare & contrast",
};

export interface RubricCriterion {
  description: string;
  points: number;
}

export interface Question {
  id: string;
  question: string;
  type: QuestionType;
  topic: string;
  difficulty: Difficulty;
  reference_answer: string;
  rubric: RubricCriterion[];
  /** The passage from the source that supports this question. */
  source_excerpt: string;
  /** A subtle nudge the learner can reveal when stuck (doesn't give the answer). */
  hint?: string;
}

export type CriterionStatus = "met" | "partial" | "missing";

export interface CriterionResult {
  description: string;
  points_possible: number;
  points_awarded: number;
  status: CriterionStatus;
  /** Quote or paraphrase of the user's answer that earned (or missed) the points. */
  evidence: string;
}

export interface Feedback {
  /** 0-10 overall score. */
  score: number;
  criteria: CriterionResult[];
  correct: string;
  missing: string;
  incorrect: string;
  improved_answer: string;
  follow_up: string;
}

export interface AnswerRecord {
  question: Question;
  answer: string;
  feedback: Feedback;
}

export interface GenerateConfig {
  difficulty: Difficulty;
  count: number;
  types: QuestionType[];
  focus: string;
}

export interface SourceMeta {
  title: string;
  /** Character count of the extracted text, for display. */
  length: number;
}

export interface OverviewConcept {
  term: string;
  explanation: string;
  /** A concrete example or analogy that illustrates the concept. */
  example: string;
}

/** Didactic study notes generated from the source, shown before practice. */
export interface Overview {
  headline: string;
  summary: string;
  key_concepts: OverviewConcept[];
  takeaways: string[];
}

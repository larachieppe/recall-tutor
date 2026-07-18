import type { GenerateConfig, Overview, Question, SourceMeta } from "./types";

/**
 * A fully pre-baked demo session so anyone can experience the whole flow —
 * study notes → questions → feedback → results/export → progress — with NO
 * API key and NO network. All questions are multiple-choice so they grade
 * locally and instantly (see lib/grade-local). The source below is original
 * explanatory text written for this demo.
 */

export const DEMO_TITLE = "The forgetting curve & spaced repetition";

export const DEMO_SOURCE = `Why we forget, and how to fight it.

In the 1880s the psychologist Hermann Ebbinghaus ran experiments on his own
memory and discovered what is now called the "forgetting curve." After learning
new material, our ability to recall it drops sharply at first and then levels
off. Much of what we learn can be lost within days if we never revisit it. The
curve is steep early on: the biggest losses happen soon after learning.

Crucially, Ebbinghaus also found that each time you successfully review
something, the curve becomes flatter — you forget more slowly than before. This
is the basis of spaced repetition: instead of cramming all your review into one
session, you spread reviews out over increasing intervals of time. A typical
schedule might review an item after one day, then three days, then a week, then
a month.

Spaced repetition works because of two effects. The first is the spacing effect:
memories formed over separated sessions are more durable than the same amount of
study crammed together. The second is the testing effect (also called active
recall): the act of trying to retrieve an answer from memory, rather than simply
re-reading it, strengthens the memory far more. Struggling a little to recall is
part of what makes it stick — this is sometimes called "desirable difficulty."

The practical recipe follows directly. Review material just as you are about to
forget it, so each review does the most work. Test yourself by recalling answers
instead of rereading notes. And space your reviews at growing intervals rather
than repeating them all at once. Modern flashcard systems automate this by
tracking how well you recall each card and scheduling its next review
accordingly.`;

export const DEMO_META: SourceMeta = {
  title: DEMO_TITLE,
  length: DEMO_SOURCE.length,
};

export const DEMO_CONFIG: GenerateConfig = {
  difficulty: "medium",
  count: 4,
  types: ["multiple_choice"],
  focus: "",
  mode: "graded",
};

export const DEMO_OVERVIEW: Overview = {
  headline:
    "How memory fades over time — and the two simple habits that make learning stick.",
  summary:
    "When we learn something new, we start forgetting it almost immediately, most steeply in the first days. But memory isn't fixed: each successful review slows the forgetting. This lesson explains the forgetting curve and the two effects — spacing and active recall — that let you remember far more with less total study, by reviewing at the right moments instead of cramming.",
  key_concepts: [
    {
      term: "The forgetting curve",
      explanation:
        "A description of how recall drops after learning: quickly at first, then more slowly. It means the biggest memory losses happen soon after you learn something, so what you don't revisit is easily lost within days.",
      example:
        "Study a list of terms today and, with no review, you might recall only a fraction of them by the end of the week.",
    },
    {
      term: "Spaced repetition",
      explanation:
        "Reviewing material over separated sessions at increasing intervals rather than all at once. Each successful review flattens the forgetting curve, so the memory decays more slowly than before.",
      example:
        "Review a fact after 1 day, then 3 days, then a week, then a month — each gap a little longer than the last.",
    },
    {
      term: "The spacing effect",
      explanation:
        "The finding that the same amount of study is more durable when spread over time than when crammed into one block. Separated practice gives memories time to consolidate between sessions.",
      example:
        "Four 15-minute sessions across four days beat one 60-minute cram for long-term retention.",
    },
    {
      term: "The testing effect (active recall)",
      explanation:
        "Retrieving an answer from memory strengthens it much more than re-reading. The mild struggle of recall — a 'desirable difficulty' — is part of what builds a lasting memory.",
      example:
        "Closing your notes and trying to explain a concept from memory helps more than reading the same page a second time.",
    },
  ],
  takeaways: [
    "Forgetting is fastest right after learning, so timely review matters most.",
    "Each successful review makes you forget more slowly.",
    "Spacing reviews out beats cramming for durable memory.",
    "Recalling answers beats rereading — testing yourself is studying.",
    "Review just before you'd forget, so each review does the most work.",
  ],
};

export const DEMO_QUESTIONS: Question[] = [
  {
    id: "demo-1",
    question:
      "According to the forgetting curve, when do the biggest losses of newly learned material happen?",
    type: "multiple_choice",
    topic: "The forgetting curve",
    difficulty: "medium",
    reference_answer:
      "Soon after learning — recall drops most steeply in the first days, then levels off.",
    source_excerpt:
      "our ability to recall it drops sharply at first and then levels off. Much of what we learn can be lost within days if we never revisit it. The curve is steep early on: the biggest losses happen soon after learning.",
    choices: [
      "Gradually and evenly across many months",
      "Soon after learning, then the rate of loss slows",
      "Only once you begin reviewing the material",
      "Mostly during sleep, long after studying",
    ],
    answer_index: 1,
    rubric: [{ description: "Selects the correct option", points: 10 }],
  },
  {
    id: "demo-2",
    question:
      "What is the key idea behind spacing reviews at increasing intervals rather than cramming?",
    type: "multiple_choice",
    topic: "Spaced repetition",
    difficulty: "medium",
    reference_answer:
      "Each successful review flattens the forgetting curve, so spreading reviews out makes memory more durable than the same study crammed together.",
    source_excerpt:
      "each time you successfully review something, the curve becomes flatter — you forget more slowly than before. This is the basis of spaced repetition: instead of cramming all your review into one session, you spread reviews out over increasing intervals of time.",
    choices: [
      "Spacing lets you skip most of the reviews entirely",
      "Cramming is better but harder to schedule",
      "Each successful review flattens the curve, making memory more durable",
      "Longer study sessions always beat shorter ones",
    ],
    answer_index: 2,
    rubric: [{ description: "Selects the correct option", points: 10 }],
  },
  {
    id: "demo-3",
    question:
      "The 'testing effect' says memory is strengthened most by which activity?",
    type: "multiple_choice",
    topic: "Active recall",
    difficulty: "medium",
    reference_answer:
      "Trying to retrieve the answer from memory (active recall), rather than simply re-reading it.",
    source_excerpt:
      "the testing effect (also called active recall): the act of trying to retrieve an answer from memory, rather than simply re-reading it, strengthens the memory far more.",
    choices: [
      "Re-reading the notes several times",
      "Highlighting the most important sentences",
      "Trying to retrieve the answer from memory",
      "Copying the material out by hand",
    ],
    answer_index: 2,
    rubric: [{ description: "Selects the correct option", points: 10 }],
  },
  {
    id: "demo-4",
    question:
      "Why is a little difficulty while recalling described as 'desirable'?",
    type: "multiple_choice",
    topic: "Desirable difficulty",
    difficulty: "medium",
    reference_answer:
      "Because the effort of struggling to recall is part of what strengthens the memory and makes it stick.",
    source_excerpt:
      "Struggling a little to recall is part of what makes it stick — this is sometimes called \"desirable difficulty.\"",
    choices: [
      "It slows you down so you study for longer",
      "The effort of recall is part of what makes the memory stick",
      "It makes material feel easier the next time immediately",
      "Difficulty signals the material is too advanced",
    ],
    answer_index: 1,
    rubric: [{ description: "Selects the correct option", points: 10 }],
  },
];

export type QuizQuestionType = "multiple_choice" | "short_answer";

export interface QuizQuestionOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface QuizQuestionConfig {
  id: string;
  prompt: string;
  type: QuizQuestionType;
  options: QuizQuestionOption[];
  correctAnswerText?: string;
}

export interface QuizTaskConfig {
  title: string;
  description: string;
  questions: QuizQuestionConfig[];
}

const defaultQuizTaskConfig: QuizTaskConfig = {
  title: "",
  description: "",
  questions: []
};

export function createDefaultQuizTaskConfig(): QuizTaskConfig {
  return JSON.parse(JSON.stringify(defaultQuizTaskConfig));
}

export function createDefaultQuestion(): QuizQuestionConfig {
  return {
    id: crypto.randomUUID(),
    prompt: "",
    type: "multiple_choice",
    options: [
      { id: crypto.randomUUID(), label: "", isCorrect: false },
      { id: crypto.randomUUID(), label: "", isCorrect: false }
    ],
    correctAnswerText: ""
  };
}

export function validateQuizTaskConfig(config: QuizTaskConfig): string[] {
  const errors: string[] = [];

  if (!config.title.trim()) errors.push("Add a quiz title");
  if (!config.description.trim()) errors.push("Add quiz instructions");
  if (config.questions.length === 0) errors.push("Add at least one question");

  config.questions.forEach((question, qIndex) => {
    if (!question.prompt.trim()) {
      errors.push(`Question ${qIndex + 1} needs a prompt`);
    }

    if (question.type === "multiple_choice") {
      if (question.options.length < 2) {
        errors.push(`Question ${qIndex + 1} needs at least two options`);
      }
      const hasCorrect = question.options.some((option) => option.isCorrect);
      if (!hasCorrect) {
        errors.push(`Select a correct option for question ${qIndex + 1}`);
      }
      question.options.forEach((option, oIndex) => {
        if (!option.label.trim()) {
          errors.push(`Option ${oIndex + 1} in question ${qIndex + 1} needs text`);
        }
      });
    } else if (question.type === "short_answer") {
      if (!question.correctAnswerText?.trim()) {
        errors.push(`Provide a correct answer for question ${qIndex + 1}`);
      }
    }
  });

  return errors;
}

<script lang="ts">
  import type { TaskComponentProps } from "../TaskTypes";
  import {
    createDefaultQuizTaskConfig,
    createDefaultQuestion,
    type QuizQuestionConfig,
    type QuizQuestionOption,
    type QuizTaskConfig,
    validateQuizTaskConfig
  } from "./schema";

  export let initialConfig: QuizTaskConfig | null = null;
  export let onSave: TaskComponentProps<QuizTaskConfig>["onSave"];
  export let onCancel: TaskComponentProps["onCancel"];

  let config: QuizTaskConfig = initialConfig
    ? structuredClone(initialConfig)
    : createDefaultQuizTaskConfig();

  let errors: string[] = [];

  function addQuestion() {
    config = {
      ...config,
      questions: [...config.questions, createDefaultQuestion()]
    };
  }

  function updateQuestion(updated: QuizQuestionConfig, index: number) {
    const questions = [...config.questions];
    questions[index] = updated;
    config = { ...config, questions };
  }

  function removeQuestion(index: number) {
    config = {
      ...config,
      questions: config.questions.filter((_, i) => i !== index)
    };
  }

  function addOption(question: QuizQuestionConfig) {
    const options = [
      ...question.options,
      { id: crypto.randomUUID(), label: "", isCorrect: false }
    ];
    return { ...question, options };
  }

  function updateOption(
    question: QuizQuestionConfig,
    optionIndex: number,
    updatedOption: Partial<QuizQuestionOption>
  ) {
    const options = question.options.map((opt, idx) =>
      idx === optionIndex ? { ...opt, ...updatedOption } : opt
    );

    if (updatedOption.isCorrect) {
      options.forEach((opt, idx) => {
        options[idx] = { ...opt, isCorrect: idx === optionIndex };
      });
    }

    return { ...question, options };
  }

  function removeOption(question: QuizQuestionConfig, optionIndex: number) {
    const options = question.options.filter((_, idx) => idx !== optionIndex);
    return { ...question, options };
  }

  function handleSave() {
    errors = validateQuizTaskConfig(config);
    if (errors.length === 0) {
      onSave(structuredClone(config));
    }
  }
</script>

<div class="task-panel">
  <h3>Quiz / Trivia Tasks</h3>
  <p class="description">
    Build quiz questions participants must answer correctly. Support multiple choice and short
    answer formats.
  </p>

  <div class="form-group">
    <label>Quiz title</label>
    <input type="text" bind:value={config.title} placeholder="Community lore challenge" />
  </div>

  <div class="form-group">
    <label>Instructions</label>
    <textarea
      rows="3"
      bind:value={config.description}
      placeholder="Explain how the quiz works, passing score, etc."
    ></textarea>
  </div>

  <div class="question-list">
    {#each config.questions as question, qIndex}
      <div class="question-card">
        <div class="question-header">
          <h4>Question {qIndex + 1}</h4>
          <button type="button" class="ghost-btn" on:click={() => removeQuestion(qIndex)}>
            Remove
          </button>
        </div>

        <div class="form-group">
          <label>Prompt</label>
          <textarea
            rows="2"
            bind:value={question.prompt}
            on:input={(e) =>
              updateQuestion({ ...question, prompt: (e.currentTarget as HTMLTextAreaElement).value }, qIndex)}
            placeholder="What year did our community launch?"
          ></textarea>
        </div>

        <div class="form-group">
          <label>Question type</label>
          <select
            bind:value={question.type}
            on:change={(e) =>
              updateQuestion({ ...question, type: (e.currentTarget as HTMLSelectElement).value as QuizQuestionConfig["type"] }, qIndex)}
          >
            <option value="multiple_choice">Multiple choice</option>
            <option value="short_answer">Short answer</option>
          </select>
        </div>

        {#if question.type === "multiple_choice"}
          <div class="option-list">
            {#each question.options as option, oIndex}
              <div class="option-row">
                <input
                  type="text"
                  bind:value={question.options[oIndex].label}
                  on:input={(e) =>
                    updateQuestion(
                      updateOption(
                        question,
                        oIndex,
                        { label: (e.currentTarget as HTMLInputElement).value }
                      ),
                      qIndex
                    )}
                  placeholder={`Option ${oIndex + 1}`}
                />
                <label class="correct-toggle">
                  <input
                    type="radio"
                    name={`question-${question.id}-correct`}
                    checked={option.isCorrect}
                    on:change={() =>
                      updateQuestion(updateOption(question, oIndex, { isCorrect: true }), qIndex)}
                  />
                  Correct
                </label>
                {#if question.options.length > 2}
                  <button
                    type="button"
                    class="ghost-btn"
                    on:click={() => updateQuestion(removeOption(question, oIndex), qIndex)}
                  >
                    Remove
                  </button>
                {/if}
              </div>
            {/each}
            <button
              type="button"
              class="ghost-btn"
              on:click={() => updateQuestion(addOption(question), qIndex)}
            >
              + Add option
            </button>
          </div>
        {:else}
          <div class="form-group">
            <label>Correct answer</label>
            <input
              type="text"
              bind:value={question.correctAnswerText}
              on:input={(e) =>
                updateQuestion(
                  { ...question, correctAnswerText: (e.currentTarget as HTMLInputElement).value },
                  qIndex
                )}
              placeholder="Enter the expected response"
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <button type="button" class="ghost-btn" on:click={addQuestion}>+ Add question</button>

  {#if errors.length}
    <div class="error-box">
      <ul>
        {#each errors as err}
          <li>{err}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="actions">
    {#if onCancel}
      <button type="button" class="ghost-btn" on:click={onCancel}>Cancel</button>
    {/if}
    <button type="button" class="primary-btn" on:click={handleSave}>Save Task</button>
  </div>
</div>

<style>
  .task-panel {
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
    background: rgba(18, 20, 35, 0.9);
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.5rem 1.25rem;
  }

  h3 {
    margin: 0;
    font-size: 1.15rem;
  }

  .description {
    margin: 0;
    color: rgba(243, 243, 251, 0.75);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  input,
  textarea,
  select {
    background: rgba(26, 28, 45, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    color: #f3f3fb;
  }

  textarea {
    resize: vertical;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: #5b8dff;
  }

  .question-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .question-card {
    background: rgba(12, 14, 28, 0.85);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .question-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  h4 {
    margin: 0;
    font-size: 1rem;
  }

  .option-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .option-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.75rem;
    align-items: center;
  }

  .correct-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    color: rgba(243, 243, 251, 0.75);
  }

  .ghost-btn {
    padding: 0.5rem 0.9rem;
    background: rgba(91, 141, 255, 0.12);
    color: #8aa8ff;
    border: 1px solid rgba(91, 141, 255, 0.2);
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
  }

  .ghost-btn:hover {
    opacity: 0.85;
  }

  .primary-btn {
    padding: 0.65rem 1.4rem;
    background: linear-gradient(135deg, #5b8dff, #9f75ff);
    color: #fff;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
  }

  .primary-btn:hover {
    opacity: 0.93;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.8rem;
  }

  .error-box {
    background: rgba(218, 30, 40, 0.12);
    border: 1px solid rgba(218, 30, 40, 0.3);
    border-radius: 10px;
    padding: 0.9rem 1.05rem;
    color: #ffb4b4;
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  @media (max-width: 640px) {
    .option-row {
      grid-template-columns: 1fr;
    }
  }
</style>

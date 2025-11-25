import type { ComponentType } from "svelte";

export type TaskTypeKey =
  | "social"
  | "content"
  | "quiz"
  | "puzzle"
  | "participation"
  | "game"
  | "referral"
  | "irl";

export interface TaskComponentProps<TConfig = Record<string, unknown>> {
  initialConfig?: TConfig | null;
  onSave: (config: TConfig) => void;
  onCancel?: () => void;
}

export interface TaskRegistryEntry<TConfig = Record<string, unknown>> {
  label: string;
  component: ComponentType<TaskComponentProps<TConfig>>;
}

export type TaskRegistry = Record<TaskTypeKey, TaskRegistryEntry>;

export interface TaskInstance<TConfig = Record<string, unknown>> {
  id: string;
  type: TaskTypeKey;
  config: TConfig;
}

export type TaskOption = {
  value: TaskTypeKey;
  label: string;
};

/**
 * @rcene/ai — AI tasks that run on any provider (demo rules, OpenAI, Claude, Gemini,
 * a local model) with a validated answer, an offline fallback, and the components that
 * show the answer and the settings. See rcene/ai/README.md.
 *
 * The relay that holds the keys is Node-side: rcene/ai/server (used by rcene/config/vite.ts).
 */
export {
  AI_PROVIDERS,
  LIVE_PROVIDERS,
  DEFAULT_MODELS,
  PROVIDER_NAMES,
  PROVIDER_KEY_ENV,
  AI_ROUTES,
  isLiveProvider,
  isProvider,
  type AiProviderId,
  type LiveProviderId,
  type AiStatus,
  type ProviderStatus,
  type CompleteRequest,
  type CompleteResponse,
} from "./protocol.ts";
export {
  defineAiTask,
  buildTaskRequest,
  answerSchema,
  sharedRules,
  confidenceSchema,
  textListSchema,
  LANGUAGE_NAMES,
  type AiTask,
  type TaskRequest,
} from "./task.ts";
export { parseJsonObject } from "./json.ts";
export { runAiTask, AiTaskError, type AiResult, type AiResultMeta, type AiMode, type AiErrorCode, type RunOptions } from "./client.ts";
export { useAiSettings, resolveProvider, resolveModel, AI_SETTINGS_STORE, type AiSettingsState, type ProviderChoice } from "./settings.ts";
export { useAiStatus, fetchAiStatus, useAiStatusStore, type AiStatusState } from "./status.ts";
export { useAiLog, AI_LOG_LIMIT, type AiLogEntry } from "./log.ts";
export { useAiTask, useActiveProvider, type ActiveProvider, type AiTaskState } from "./hooks.ts";
export { aiStrings, useAiStrings, type AiStrings } from "./strings.ts";

// Generic tasks
export { classifyTask, DEFAULT_PRIORITIES, type ClassifyInput, type ClassifyOutput, type ClassifyOption } from "./tasks/classify.ts";
export { briefTask, type BriefInput, type BriefItem, type BriefOutput } from "./tasks/brief.ts";
export { extractTask, findDate, type ExtractField, type ExtractFieldType, type ExtractInput, type ExtractOutput, type ExtractValue } from "./tasks/extract.ts";
export { draftTask, fitSms, SMS_LIMIT, type DraftInput, type DraftKind, type DraftOutput, type DraftTone } from "./tasks/draft.ts";
export { answerTask, rankDocuments, NOT_FOUND, type AnswerDocument, type AnswerInput, type AnswerOutput } from "./tasks/answer.ts";
export { pingTask, type PingOutput } from "./tasks/ping.ts";
export { URGENT_KEYWORDS, matchKeywords, hasKeyword, normalizeText, firstSentence } from "./tasks/text.ts";

// Components
export { AiInsightCard, type AiInsightCardProps } from "./components/ai-insight-card.tsx";
export { AiSourceBadge, useProviderName, type AiSourceBadgeProps } from "./components/ai-source-badge.tsx";
export { ConfidenceMeter, confidenceBand, type ConfidenceBand, type ConfidenceMeterProps } from "./components/confidence-meter.tsx";
export { AiRunButton, AiThinking, AiProviderChip, type AiRunButtonProps } from "./components/ai-run.tsx";
export { AiSettingsPanel } from "./components/ai-settings-panel.tsx";
export { AiActivityLog } from "./components/ai-activity-log.tsx";

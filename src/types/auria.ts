import type { DesignCardData, PublicDesign } from "./catalogue";

export type Language = "auto" | "en" | "ur" | "roman-ur";
export type MessageState = "COMPLETE" | "STREAMING" | "STOPPED" | "FAILED";
export type ChatMessage = { id: string; role: "user" | "assistant"; text: string; createdAt: string; state: MessageState; cards: DesignCardData[]; errorCode?: string };
export type EnquiryStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "QUOTED" | "AWAITING_CUSTOMER_APPROVAL" | "CONFIRMED" | "IN_PRODUCTION" | "READY_FOR_COLLECTION" | "COMPLETED" | "CANCELLED";
export type QuotePreferences = { size: { kind: "RING_SIZE" | "NECKLACE_LENGTH"; value: string } | null; stonePreferences: string; instructions: string };
export type EnquiryEvent = { status: EnquiryStatus; at: string; source: "CUSTOMER" | "SERVER_DEMO"; note: string };
export type QuoteDraft = { id: string; conversationId: string; designId: string; variantId: string | null; quantity: number; requestedChanges: string; budgetPKR: number | null; version: number; status: EnquiryStatus; reference: string | null; updatedAt: string; source: PublicDesign; customer: { name: string; email: string }; consentAt: string | null; notificationStatus: "NOT_CONFIGURED"; preferences: QuotePreferences; timeline: EnquiryEvent[]; submissionKey: string | null; jewellerQuote: { amountPKR: number; terms: string; recordedAt: string } | null; customerApprovedAt: string | null };
export type Conversation = { id: string; title: string; language: Language; version: number; createdAt: string; updatedAt: string; selectedDesignId: string | null; recentDesignIds: string[]; messages: ChatMessage[]; draft: QuoteDraft | null; activeTurn: { id: string; assistantId: string; expiresAt: number } | null; requests: Record<string, { hash: string; assistantId: string }> };
export type ConversationSummary = Pick<Conversation, "id" | "title" | "updatedAt" | "language">;
export type Capability = { available: boolean; mode: "READY" | "UNAVAILABLE"; reason: string; provider: "gemini"; model: string; lastVerifiedAt: string | null };
export type Usage = { id: string; model: string; startedAt: string; state: "RESERVED" | "COMPLETE" | "FAILED" | "STOPPED"; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
export type ChatEvent = { type: "delta"; text: string } | { type: "cards"; cards: DesignCardData[] } | { type: "draft"; draft: QuoteDraft } | { type: "done"; conversation: Conversation } | { type: "error"; code: string; message: string; retryable: boolean };
export type ToolCall = { name: string; args: unknown; id?: string };
export type ToolResult = { data: unknown; cards?: DesignCardData[]; draft?: QuoteDraft };
export type ToolDefinition = { name: string; description: string; parameters: Record<string, unknown> };
export type ProviderTurn = { role: "user" | "assistant"; text: string };
export type ProviderChunk = { text?: string; calls?: ToolCall[]; continuation?: unknown; usage?: { input: number | null; output: number | null; total: number | null }; finished?: boolean };
export interface ChatProvider {
  stream(input: { system: string; history: ProviderTurn[]; tools: ToolDefinition[]; exchanges: { continuation: unknown; results: { call: ToolCall; data: unknown }[] }[]; signal: AbortSignal; requireTool: boolean }): AsyncIterable<ProviderChunk>;
}
// Future capabilities share application conversation IDs and ownership, never provider IDs.
export interface VoiceConversation { start(conversationId: string): Promise<{ sessionId: string }>; stop(sessionId: string): Promise<void> }
export interface VoiceTranscription { transcribe(conversationId: string, audio: Blob): Promise<string> }
export interface SpokenResponse { speak(conversationId: string, messageId: string): Promise<Blob> }
export interface ImageAnalysis { analyze(conversationId: string, ownedUploadId: string): Promise<{ attributes: string[] }> }
export interface DesignImages { generate(conversationId: string, prompt: string): Promise<{ versionId: string }>; edit(conversationId: string, parentVersionId: string, instructions: string): Promise<{ versionId: string }> }
export interface SavedDesignVersions { list(conversationId: string): Promise<{ id: string; parentId: string | null }[]> }

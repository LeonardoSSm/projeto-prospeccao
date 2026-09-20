import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { PROMPT_VERSION, SYSTEM_PROMPT } from "../prompts/commercial-diagnosis-v3";
import type {
  DiagnosisOutput,
  DiagnosisProviderResult,
  DiagnosisRequest,
  LlmProvider,
} from "./llm-provider.interface";

// Tool forçada (tool_choice) em vez de pedir JSON em texto livre: garante saída
// estruturada de verdade, sem depender do modelo "se comportar" (docs/DOCUMENTATION.md
// seção 5.5 — "Saída é validada por JSON Schema").
const DIAGNOSIS_TOOL: Anthropic.Tool = {
  name: "submit_diagnosis",
  description: "Envia o diagnóstico comercial estruturado sobre o lead.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      strengths: {
        type: "array",
        items: {
          type: "object",
          properties: { text: { type: "string" }, evidencePath: { type: "string" } },
          required: ["text", "evidencePath"],
        },
      },
      problems: {
        type: "array",
        items: {
          type: "object",
          properties: { text: { type: "string" }, evidencePath: { type: "string" } },
          required: ["text", "evidencePath"],
        },
      },
      opportunities: { type: "array", items: { type: "string" } },
      recommendedOffer: {
        type: "string",
        enum: ["NEW_WEBSITE", "REDESIGN_CONVERSION", "SEO_BOOST", "GENERAL_REVIEW"],
      },
    },
    required: ["summary", "strengths", "problems", "opportunities", "recommendedOffer"],
  },
};

@Injectable()
export class AnthropicLlmProvider implements LlmProvider {
  readonly name = "ANTHROPIC";
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.LLM_API_KEY });
    this.model = process.env.LLM_MODEL ?? "claude-haiku-4-5-20251001";
  }

  async generateDiagnosis(request: DiagnosisRequest): Promise<DiagnosisProviderResult> {
    const start = Date.now();
    // <evidence> é delimitado explicitamente e tratado como dado no system prompt
    // (nunca instrução) — o conteúdo em si já vem curado por evidence-snapshot.ts,
    // sem HTML/URL bruta ou dado de contato.
    const userMessage = `Idioma: ${request.language}\nTom: ${request.tone}\n\n<evidence>\n${JSON.stringify(
      request.evidence,
      null,
      2,
    )}\n</evidence>`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      tools: [DIAGNOSIS_TOOL],
      tool_choice: { type: "tool", name: "submit_diagnosis" },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      throw new Error("Provedor de IA não retornou saída estruturada");
    }

    return {
      modelName: this.model,
      promptVersion: PROMPT_VERSION,
      output: toolUse.input as DiagnosisOutput,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      latencyMs: Date.now() - start,
      // Custo em USD depende da tabela de preços vigente por modelo; não calculado
      // aqui para não hardcodar um valor que fica desatualizado sozinho.
      estimatedCostUsd: null,
    };
  }
}

export interface SendMessageRequest {
  channel: string;
  recipientValue: string;
  content: string;
}

export interface SendMessageResult {
  externalMessageId: string;
  sentAt: Date;
}

// Porta do adaptador de canal (ADR-009, mesmo espírito do PlacesProvider/LlmProvider).
// Só existe o mock por enquanto — conscientemente: integrar um canal real
// (WhatsApp Business API, SMTP) significa credenciais de produção capazes de
// contatar destinatários reais, o que está fora do escopo deste build (seção
// 1.5: "envio totalmente autônomo e irrestrito de mensagens" é exclusão
// explícita do MVP). O gate de aprovação já funciona de verdade; o transporte
// final é uma decisão de infraestrutura deliberada, não algo para automatizar
// sozinho.
export interface ChannelSender {
  readonly name: string;
  send(request: SendMessageRequest): Promise<SendMessageResult>;
}

export const CHANNEL_SENDER = Symbol("CHANNEL_SENDER");

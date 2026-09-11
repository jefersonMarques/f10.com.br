import type { TicketStage, TicketWorkflow } from "./types";

export const priorityLabels: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const eventLabels: Record<string, string> = {
  "ticket.created": "criou o ticket",
  "ticket.replied": "registrou uma resposta",
  "ticket.note.added": "adicionou uma nota interna",
  "ticket.workflow.global.moved": "moveu o ticket no fluxo global",
  "ticket.workflow.area.moved": "moveu o ticket dentro da área",
  "ticket.workflow.handoff": "encaminhou o ticket para outra área",
  "ticket.label.added": "adicionou uma etiqueta",
  "ticket.label.removed": "removeu uma etiqueta",
  "ticket.attachment.added": "adicionou um anexo",
  "ticket.attachment.removed": "removeu um anexo",
};

export const labelClasses: Record<string, string> = {
  green: "bg-[#D9F2E3] text-[#23643C]",
  yellow: "bg-[#FFF0B8] text-[#775D00]",
  orange: "bg-[#FFE0C2] text-[#8D4A0B]",
  red: "bg-[#FFDADA] text-[#8D2B2B]",
  purple: "bg-[#E8DDF8] text-[#654391]",
  blue: "bg-[#DDE3FF] text-[#243B8A]",
  sky: "bg-[#D9F0FA] text-[#27637B]",
  lime: "bg-[#E5F2C9] text-[#526C20]",
  pink: "bg-[#F7DDEA] text-[#8B3F64]",
  gray: "bg-[#E8E9ED] text-[#5E6470]",
};

const stageColumnClasses: Record<string, string> = {
  gray: "border-[#E0E3EB] bg-[#F5F6F8]",
  blue: "border-[#C9D4F6] bg-[#EEF3FF]",
  green: "border-[#C8E3D0] bg-[#F0F8F2]",
  yellow: "border-[#E8DDA9] bg-[#FFF9DF]",
  orange: "border-[#F0C89F] bg-[#FFF4E8]",
  red: "border-[#EBC4C4] bg-[#FFF0F0]",
  purple: "border-[#D9C9EC] bg-[#F7F0FF]",
  sky: "border-[#C8E1EB] bg-[#EDF8FC]",
  lime: "border-[#D8E6B7] bg-[#F6FBE7]",
  pink: "border-[#E8C9D8] bg-[#FFF1F8]",
};

export function stageColumnClass(workflow: TicketWorkflow | null, stage: TicketStage): string {
  if (workflow?.kind === "area") {
    return stageColumnClasses[stage.color ?? "gray"] ?? stageColumnClasses.gray;
  }
  if (stage.stageType === "area_gateway") return "border-[#E8C49F] bg-[#FFF8F1]";
  if (stage.stageType === "terminal") return "border-[#CDE5D4] bg-[#F7FBF8]";
  return "border-[#E0E3EB] bg-[#F5F6F8]";
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

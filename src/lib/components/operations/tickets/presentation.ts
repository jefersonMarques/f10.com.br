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
  green: "ticket-label ticket-label--green",
  yellow: "ticket-label ticket-label--yellow",
  orange: "ticket-label ticket-label--orange",
  red: "ticket-label ticket-label--red",
  purple: "ticket-label ticket-label--purple",
  blue: "ticket-label ticket-label--blue",
  sky: "ticket-label ticket-label--sky",
  lime: "ticket-label ticket-label--lime",
  pink: "ticket-label ticket-label--pink",
  gray: "ticket-label ticket-label--gray",
};

const stageColumnClasses: Record<string, string> = {
  gray: "ticket-stage ticket-stage--gray",
  blue: "ticket-stage ticket-stage--blue",
  green: "ticket-stage ticket-stage--green",
  yellow: "ticket-stage ticket-stage--yellow",
  orange: "ticket-stage ticket-stage--orange",
  red: "ticket-stage ticket-stage--red",
  purple: "ticket-stage ticket-stage--purple",
  sky: "ticket-stage ticket-stage--sky",
  lime: "ticket-stage ticket-stage--lime",
  pink: "ticket-stage ticket-stage--pink",
};

export function stageColumnClass(workflow: TicketWorkflow | null, stage: TicketStage): string {
  if (workflow?.kind === "area") {
    return stageColumnClasses[stage.color ?? "gray"] ?? stageColumnClasses.gray;
  }
  if (stage.stageType === "area_gateway") return "ticket-stage ticket-stage--gateway";
  if (stage.stageType === "terminal") return "ticket-stage ticket-stage--terminal";
  return "ticket-stage ticket-stage--gray";
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

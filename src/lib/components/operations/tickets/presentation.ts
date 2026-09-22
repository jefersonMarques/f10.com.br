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
  "ticket.status.changed": "alterou o status",
  "ticket.priority.changed": "alterou a prioridade",
  "ticket.due_date.changed": "alterou a conclusão planejada",
  "ticket.assignee.changed": "alterou o responsável",
  "ticket.customer.linked": "vinculou o cliente F10",
  "ticket.task.linked": "vinculou uma tarefa",
  "service_request.created": "criou a solicitação estruturada",
  "service_request.updated": "alterou os dados da solicitação",
  "service_request.secret.revealed": "revelou uma credencial protegida",
  "chat.claimed": "assumiu o atendimento",
  "chat.assigned": "atribuiu o atendimento",
  "chat.auto_assigned": "recebeu o atendimento pela distribuição automática",
  "remote.enrollment.requested": "enviou o instalador de suporte remoto",
  "remote.device.enrolled": "vinculou um computador ao suporte remoto",
  "remote.requested": "solicitou acesso remoto",
  "remote.authorized": "teve o acesso remoto autorizado",
  "remote.denied": "teve o acesso remoto recusado",
  "remote.started": "iniciou o acesso remoto",
  "remote.ended": "encerrou o acesso remoto",
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

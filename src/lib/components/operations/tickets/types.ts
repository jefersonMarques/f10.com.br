export type TicketScope = "mine" | "unassigned" | "all";
export type TicketView = "board" | "list" | "split";

export type TicketLabel = {
  id: string;
  name: string;
  color: string;
};

export type TicketWorkflowState = {
  globalStageId: string | null;
  areaWorkflowId: string | null;
  areaStageId: string | null;
} | null;

export type TicketItem = {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  priority: string;
  channel: string;
  dueOn: string;
  firstResponseDueAt: string | Date | null;
  nextResponseDueAt: string | Date | null;
  resolutionDueAt: string | Date | null;
  firstResponseAt: string | Date | null;
  resolvedAt: string | Date | null;
  updatedAt: string | Date;
  customerName: string | null;
  organizationName: string | null;
  queueName: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  labels: TicketLabel[];
  workflowState: TicketWorkflowState;
};

export type TicketStage = {
  id: string;
  name: string;
  stageType: string;
  color?: string | null;
  linkedAreaId?: string | null;
  linkedAreaName?: string | null;
};

export type TicketWorkflow = {
  id: string;
  kind: "global" | "area";
  areaId?: string | null;
  areaName?: string | null;
  stages: TicketStage[];
};

export type TicketWorkflowBoard = {
  globalWorkflow: TicketWorkflow | null;
  areaWorkflows: TicketWorkflow[];
};

export type TicketQueue = {
  id: string;
  name: string;
};

export type TicketEntryPoint = {
  stageId: string;
  name: string;
  areaId: string;
  areaName: string;
};

export type TicketAttachment = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string | null;
  createdAt: string | Date;
  href: string;
  previewable: boolean;
};

export type TicketCardData = {
  details: {
    ticket: {
      id: string;
      ticketNumber: number;
      subject: string;
      status: string;
      priority: string;
      channel: string;
      queueName: string;
      assignedUserName: string | null;
      dueOn: string;
      firstResponseDueAt: string | Date | null;
      nextResponseDueAt: string | Date | null;
      resolutionDueAt: string | Date | null;
      firstResponseAt: string | Date | null;
      resolvedAt: string | Date | null;
      customerContactId: string | null;
      customerName: string | null;
      customerEmail: string | null;
      organizationName: string | null;
      createdAt: string | Date;
    };
    messages: Array<{
      id: string;
      authorType: string;
      authorUserName: string | null;
      customerName: string | null;
      visibility: string;
      body: string;
      createdAt: string | Date;
    }>;
    events: Array<{
      id: string;
      eventType: string;
      actorName: string | null;
      createdAt: string | Date;
    }>;
  };
  workflowContext: {
    globalWorkflowId: string;
    globalStageId: string;
    areaId: string | null;
    areaWorkflowId: string | null;
    areaStageId: string | null;
    globalStageName: string;
    areaName: string | null;
    areaStageName: string | null;
  } | null;
  labels: TicketLabel[];
  selectedLabels: TicketLabel[];
  attachments: TicketAttachment[];
  attachmentsEnabled: boolean;
  serviceRequest: {
    requestType: "nfse" | "cell_coin";
    label: string;
  } | null;
  satisfaction: {
    score: number | null;
    comment: string | null;
    requestedAt: string | Date;
    answeredAt: string | Date | null;
    expiresAt: string | Date;
  } | null;
  linkedTasks: Array<{
    id: string;
    title: string;
    projectName: string;
    statusName: string;
    statusClosed: boolean;
    dueOn: string | null;
  }>;
  taskProjects: Array<{ id: string; name: string }>;
  canCreateTask: boolean;
  canCommentInternal: boolean;
  canManageFollowers: boolean;
  followers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  followerCandidates: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

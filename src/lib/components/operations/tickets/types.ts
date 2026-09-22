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

export type TicketServiceRequestField = {
  key: string;
  label: string;
  value: string | number | boolean | null;
  displayValue: string;
  editable: boolean;
  inputKind: "text" | "number" | "boolean" | "textarea" | "readonly";
};

export type TicketServiceRequest = {
  id: string;
  ticketId: string;
  requestType: "nfse" | "cell_coin";
  label: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  fields: TicketServiceRequestField[];
  secrets: Array<{ key: string; label: string; present: boolean }>;
  attachments: Array<{
    id: string;
    fieldKey: string;
    label: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    href: string;
  }>;
  history: Array<{
    version: number;
    source: "customer" | "user" | "system";
    actorName: string;
    createdAt: string;
    changes: Array<{
      fieldKey: string;
      label: string;
      previousValue: string;
      nextValue: string;
      secretChanged: boolean;
    }>;
  }>;
};

export type TicketCustomerContextData = {
  ticketId: string;
  legacyUserId: string | null;
  scope: "unit" | "global";
  groupId: number | null;
  groupName: string | null;
  subgroup: boolean | null;
  unitId: number | null;
  unitName: string | null;
  unitSchema: string | null;
};

export type TicketDetailsData = {
  details: {
    ticket: {
      id: string;
      ticketNumber: number;
      subject: string;
      status: string;
      priority: string;
      channel: string;
      dueOn: string;
      queueId: string;
      queueName: string;
      assignedUserId: string | null;
      assignedUserName: string | null;
      customerContactId: string | null;
      customerName: string | null;
      customerEmail: string | null;
      customerPhone: string | null;
      customerWhatsapp: string | null;
      organizationName: string | null;
      firstResponseDueAt: string | Date | null;
      nextResponseDueAt: string | Date | null;
      resolutionDueAt: string | Date | null;
      firstResponseAt: string | Date | null;
      resolvedAt: string | Date | null;
      closedAt: string | Date | null;
      createdAt: string | Date;
      updatedAt: string | Date;
    };
    messages: Array<{
      id: string;
      authorType: string;
      authorUserName: string | null;
      customerName: string | null;
      visibility: string;
      channel?: string;
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
    globalWorkflowName?: string;
    globalStageName: string;
    globalStageType?: string;
    areaName: string | null;
    areaWorkflowName?: string | null;
    areaStageName: string | null;
    areaStageType?: string | null;
    canViewAreaDetails?: boolean;
  } | null;
  workflowBoard: TicketWorkflowBoard;
  labels: TicketLabel[];
  selectedLabels: TicketLabel[];
  attachments: TicketAttachment[];
  attachmentsEnabled: boolean;
  serviceRequest: TicketServiceRequest | null;
  customerContext: TicketCustomerContextData | null;
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
    priority?: string;
    dueOn: string | null;
  }>;
  taskProjects: Array<{ id: string; name: string }>;
  agents: Array<{ id: string; name: string; email: string }>;
  mentionUsers: Array<{ id: string; name: string; email: string }>;
  followers: Array<{ id: string; name: string; email: string }>;
  followerCandidates: Array<{ id: string; name: string; email: string }>;
  canReply: boolean;
  canCommentInternal: boolean;
  canManageFollowers: boolean;
  canAssign: boolean;
  canLinkCustomer: boolean;
  canViewTasks: boolean;
  canCreateTask: boolean;
};

export type TicketCardData = TicketDetailsData;

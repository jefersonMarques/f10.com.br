import type { ChatClosureReason, ChatPerformanceState } from "./chatPerformanceMetrics";

export type ChatPerformanceFilters = {
  periodDays: 7 | 30 | 90;
  department: "all" | "support" | "finance";
  queueId: string;
  userId: string;
  view: "all" | "waiting" | "late" | "unanswered" | "abandoned";
};

export type ChatPerformanceItem = {
  id: string;
  number: number;
  queueId: string;
  queueName: string;
  department: "support" | "finance";
  agentId: string | null;
  agentName: string | null;
  firstResponderId: string | null;
  createdAt: string;
  closedAt: string | null;
  waitingSince: string | null;
  waitingMinutes: number | null;
  agentWaitingMinutes: number | null;
  firstResponseMinutes: number | null;
  agentFirstResponseMinutes: number | null;
  thresholdMinutes: number;
  overdue: boolean;
  state: ChatPerformanceState;
  closeReason: ChatClosureReason | null;
};

export type ChatAgentPerformance = {
  id: string;
  name: string;
  assigned: number;
  responded: number;
  waiting: number;
  late: number;
  medianFirstMinutes: number | null;
  p90FirstMinutes: number | null;
};

export type SupportChatReport = {
  generatedAt: string;
  periodDays: number;
  truncated: boolean;
  filters: ChatPerformanceFilters;
  queues: Array<{ id: string; name: string; department: "support" | "finance"; thresholdMinutes: number; slaEnabled: boolean }>;
  users: Array<{ id: string; name: string }>;
  summary: {
    received: number;
    answered: number;
    waiting: number;
    late: number;
    longestWaitingMinutes: number | null;
    medianFirstMinutes: number | null;
    p90FirstMinutes: number | null;
    unansweredClosed: number;
    abandonedAfterWait: number;
    expiredUnanswered: number;
    closedByAgentWithoutReply: number;
    firstResponseSamples: number;
    lateFirstResponses: number;
  };
  agents: ChatAgentPerformance[];
  listTotal: number;
  items: ChatPerformanceItem[];
};

export type MergeTicketReference = {
  id: string;
  ticketNumber: number;
};

export function ensureDistinctMergeGroups(
  primaryRootId: string,
  sourceRootId: string,
): void {
  if (primaryRootId === sourceRootId) {
    throw new Error("TICKET_MERGE_ALREADY_GROUPED");
  }
}

export function uniqueMergeMemberIds(groups: string[][]): string[] {
  return [...new Set(groups.flat())];
}

export function isTicketMergeRoot(rootId: string, currentId: string): boolean {
  return rootId === currentId;
}

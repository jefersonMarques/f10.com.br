export type TaskAssignmentScope = "own" | "team" | "all" | undefined;

export function canAssignTaskUser(
  scope: TaskAssignmentScope,
  actorUserId: string,
  assigneeUserId: string,
  colleagueIds: ReadonlySet<string>,
): boolean {
  if (actorUserId === assigneeUserId) return true;
  if (scope === "all") return true;
  return scope === "team" && colleagueIds.has(assigneeUserId);
}

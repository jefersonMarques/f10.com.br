/** Keep ticket subjects compact in cards and lists; the full title stays in the tooltip. */
export function shortTicketSubject(subject: string): string {
  const title = subject.trim();
  return title.length <= 20 ? title : `${title.slice(0, 20).trimEnd()}...`;
}

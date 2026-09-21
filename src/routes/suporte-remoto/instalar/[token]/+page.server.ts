import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getRemoteEnrollmentByToken } from "$lib/server/remote/remoteDeviceEnrollmentRepository";

export const prerender = false;

function validToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{40,120}$/.test(value);
}

export const load: PageServerLoad = async ({ params }) => {
  if (!validToken(params.token)) throw error(404, "Solicitação não encontrada.");
  const enrollment = await getRemoteEnrollmentByToken(params.token);
  if (!enrollment) throw error(404, "Solicitação não encontrada.");
  return { enrollment, token: params.token };
};

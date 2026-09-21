import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  getTicketSatisfactionByToken,
  submitTicketSatisfaction,
} from "$lib/server/support/ticketSatisfactionService";

export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
  const survey = await getTicketSatisfactionByToken(params.token);
  return {
    survey,
    expired: Boolean(
      survey &&
      !survey.answeredAt &&
      new Date(survey.expiresAt).getTime() <= Date.now(),
    ),
  };
};

export const actions: Actions = {
  default: async ({ params, request }) => {
    const formData = await request.formData();
    const score = Number(formData.get("score"));
    const commentValue = formData.get("comment");
    const comment = typeof commentValue === "string" ? commentValue : "";

    try {
      const submitted = await submitTicketSatisfaction({
        token: params.token,
        score,
        comment,
      });
      if (!submitted) {
        return fail(409, {
          success: false,
          message: "Esta avaliação já foi respondida ou expirou.",
        });
      }
      return {
        success: true,
        message: "Obrigado pela sua avaliação.",
      };
    } catch {
      return fail(400, {
        success: false,
        message: "Revise sua avaliação antes de enviar.",
      });
    }
  },
};

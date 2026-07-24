import { redirect, type RequestHandler } from "@sveltejs/kit";

export const prerender = true;

export const GET: RequestHandler = () => {
  throw redirect(308, "/favicon.png");
};

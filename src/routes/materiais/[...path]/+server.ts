import type { RequestHandler } from './$types';
import { serveMaterialFile } from '$lib/server/materiaisAvaRedirect';

export const GET: RequestHandler = (event) => serveMaterialFile(event, event.params.path);

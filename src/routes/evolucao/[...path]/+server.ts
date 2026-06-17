import type { RequestHandler } from './$types';
import { serveEvolucaoFile } from '$lib/server/evolucaoStatic';

export const GET: RequestHandler = (event) => serveEvolucaoFile(event, event.params.path);

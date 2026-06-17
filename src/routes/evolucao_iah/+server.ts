import type { RequestHandler } from './$types';
import { redirectLegacyEvolucao } from '$lib/server/evolucaoLegacyRedirect';

export const GET: RequestHandler = (event) => redirectLegacyEvolucao(event, 'evolucao_iah');

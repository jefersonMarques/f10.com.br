import { redirect, type RequestEvent } from '@sveltejs/kit';

const legacyTargets: Record<string, string> = {
  evolucao_f10: 'evolucao_f10',
  evolucao_microcamp: 'evolucao_microcamp',
  evolucao_iah: 'evolucao_iah'
};

export function redirectLegacyEvolucao(event: RequestEvent, legacyFolder: keyof typeof legacyTargets): never {
  const remainingPath = 'path' in event.params ? event.params.path.replace(/\.html$/i, '') : '';
  const targetFolder = legacyTargets[legacyFolder];
  const cleanRemainingPath = remainingPath ? `/${remainingPath.replace(/^\/+/, '')}` : '';

  throw redirect(301, `/evolucao/${targetFolder}${cleanRemainingPath}${event.url.search}`);
}

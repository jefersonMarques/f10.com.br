import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const EVOLUCAO_DIR = path.resolve(process.cwd(), 'src/routes/evolucao');

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function resolveSafePath(relativePath: string) {
  const decodedPath = decodeURIComponent(relativePath);
  const normalizedPath = decodedPath.replaceAll('\\', '/').replace(/^\/+/, '');
  const requestedPath = path.resolve(EVOLUCAO_DIR, normalizedPath);

  if (requestedPath !== EVOLUCAO_DIR && !requestedPath.startsWith(`${EVOLUCAO_DIR}${path.sep}`)) {
    throw error(404, 'Arquivo nao encontrado');
  }

  return requestedPath;
}

function getBaseHref(relativePath: string, filePath: string) {
  const normalizedPath = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');
  const isIndexFile = path.basename(filePath).toLowerCase() === 'index.html';
  const basePath = isIndexFile ? normalizedPath.replace(/(?:^|\/)?index\.html$/i, '') : path.dirname(normalizedPath);
  const cleanBasePath = basePath === '.' ? '' : basePath.replace(/\/+$/, '');

  return `/evolucao/${cleanBasePath ? `${cleanBasePath}/` : ''}`;
}

function addBaseHref(html: string, baseHref: string) {
  if (html.includes('<base ')) {
    return html;
  }

  return html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
}

async function resolveFilePath(relativePath: string) {
  let filePath = resolveSafePath(relativePath);

  try {
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    if (!path.extname(filePath)) {
      filePath = `${filePath}.html`;
    } else {
      throw error(404, 'Arquivo nao encontrado');
    }
  }

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      throw error(404, 'Arquivo nao encontrado');
    }
  } catch {
    throw error(404, 'Arquivo nao encontrado');
  }

  return filePath;
}

export async function serveEvolucaoFile(event: RequestEvent, relativePath = '') {
  if (!relativePath) {
    throw redirect(302, '/evolucao/evolucao_f10');
  }

  if (relativePath.toLowerCase().endsWith('.html')) {
    throw redirect(301, `${event.url.pathname.replace(/\.html$/i, '')}${event.url.search}`);
  }

  const filePath = await resolveFilePath(relativePath);
  const extension = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[extension] ?? 'application/octet-stream';
  const file = await readFile(filePath);
  const body =
    extension === '.html'
      ? addBaseHref(file.toString('utf-8'), getBaseHref(relativePath, filePath))
      : file;

  return new Response(body, {
    headers: {
      'content-type': contentType,
      'cache-control': event.url.hostname === 'localhost' ? 'no-store' : 'public, max-age=300'
    }
  });
}

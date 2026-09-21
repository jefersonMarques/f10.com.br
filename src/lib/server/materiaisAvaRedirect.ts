import { error, type RequestEvent } from '@sveltejs/kit';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const MATERIAIS_DIR = path.resolve(process.cwd(), 'static/materiais');

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function resolveSafePath(relativePath: string) {
  const decodedPath = decodeURIComponent(relativePath);
  const normalizedPath = decodedPath.replaceAll('\\', '/').replace(/^\/+/, '');
  const requestedPath = path.resolve(MATERIAIS_DIR, normalizedPath);

  if (requestedPath !== MATERIAIS_DIR && !requestedPath.startsWith(`${MATERIAIS_DIR}${path.sep}`)) {
    throw error(404, 'Arquivo nao encontrado');
  }

  return requestedPath;
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

export async function serveMaterialFile(event: RequestEvent, relativePath: string) {
  const filePath = await resolveFilePath(relativePath);
  const extension = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[extension] ?? 'application/octet-stream';
  const file = await readFile(filePath);

  return new Response(file, {
    headers: {
      'content-type': contentType,
      'cache-control': event.url.hostname === 'localhost' ? 'no-store' : 'public, max-age=300'
    }
  });
}

import { error } from "@sveltejs/kit";
import {
    getRegistrationFileByToken,
    incrementRegistrationFileDownload,
} from "$lib/server/registrationFileStore";
import { stat, readFile } from "node:fs/promises";

export async function GET({ params }: { params: { token: string } }) {
    const record = await getRegistrationFileByToken(params.token);

    if (!record) {
        throw error(404, "Arquivo não encontrado ou expirado.");
    }

    try {
        await stat(record.absolutePath);
    } catch {
        throw error(404, "Arquivo indisponível.");
    }

    await incrementRegistrationFileDownload(record.token);

    const buffer = await readFile(record.absolutePath);

    return new Response(buffer, {
        headers: {
            "Content-Type": record.mimeType || "application/octet-stream",
            "Content-Length": String(record.size),
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
                record.originalName,
            )}`,
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
        },
    });
}
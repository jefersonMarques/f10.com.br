// src/routes/api/whatsapp-lead/+server.ts
import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";
import {
    EXACT_TOKEN,
    // EXACT_ORGANIZATION_ID,
    // EXACT_SDR_EMAIL,
    // EXACT_MKT_LINK,
    // EXACT_FUNNEL_ID
} from "$env/static/private";

// Tipo do lead que você salva localmente
type WhatsappLead = {
    name: string;
    phone: string;
    source: string;
    product?: string;
    subSource?: string;
    description?: string;
    schoolName?: string; // 🆕 Nome da escola (opcional)
    createdAt: string;
};

// Caminho do arquivo onde os leads serão armazenados
const DATA_FILE_PATH = path.resolve("data", "whatsapp-leads.json");

// ===== Funções utilitárias para arquivo JSON =====

// Garante que o arquivo exista e retorna o array atual de leads
async function loadLeadsFromFile(): Promise<WhatsappLead[]> {
    try {
        const content = await fs.readFile(DATA_FILE_PATH, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    } catch (err: any) {
        // Se o arquivo não existir, cria um vazio
        if (err.code === "ENOENT") {
            await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
            await fs.writeFile(DATA_FILE_PATH, "[]", "utf-8");
            return [];
        }

        console.error("[whatsapp-lead] Erro ao ler arquivo JSON:", err);
        return [];
    }
}

// Salva o array completo de leads no arquivo
async function saveLeadsToFile(leads: WhatsappLead[]): Promise<void> {
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
    const jsonContent = JSON.stringify(leads, null, 2);
    await fs.writeFile(DATA_FILE_PATH, jsonContent, "utf-8");
}

// Normaliza qualquer telefone para apenas números
function normalizePhone(rawPhone: string): string {
    return String(rawPhone).replace(/\D/g, "");
}

// ===== Integração com ExactSales =====

async function sendLeadToExactSales(lead: WhatsappLead) {
    if (!EXACT_TOKEN) {
        console.warn(
            "[whatsapp-lead] EXACT_TOKEN não definido. Pulando envio para ExactSales."
        );
        return { ok: false, skipped: true };
    }

    const normalizedPhone = normalizePhone(lead.phone);

    const rawSource = (lead.source || "").trim();
    const defaultSource = "Botão WhatsApp Site F10";

    const sourceForExact =
        rawSource.startsWith("/")
            ? `https://f10.com.br${rawSource}`
            : rawSource || defaultSource;

    const leadProduct = lead.product?.trim() || "Software F10";
    const subSourceForExact =
        lead.subSource?.trim() || "Botão flutuante site";

    const descriptionLines: string[] = [
        "Lead capturado pelo botão de WhatsApp flutuante do site."
    ];

    if (lead.schoolName && lead.schoolName.trim().length > 0) {
        descriptionLines.push(`Escola: ${lead.schoolName.trim()}`);
    }

    if (lead.description && lead.description.trim().length > 0) {
        descriptionLines.push(`Contexto: ${lead.description.trim()}`);
    }

    descriptionLines.push(`Criado em: ${lead.createdAt}`);

    const exactBody = {
        duplicityValidation: false,
        lead: {
            name: lead.name,
            industry: "Educação",
            source: sourceForExact,
            subSource: subSourceForExact,
            ddiPhone: "55",
            phone: normalizedPhone,
            website: "https://f10.com.br",
            leadProduct,
            description: descriptionLines.join("\n"),
            address: "",
            addressNumber: "",
            addressComplement: "",
            neighborhood: "",
            zipcode: "",
            city: "",
            state: "",
            country: "Brasil",
            cpfcnpj: "",
            customFields: []
        }
    };

    console.log(
        "[whatsapp-lead] Enviando para ExactSales:",
        JSON.stringify(exactBody, null, 2)
    );

    const response = await fetch("https://api.exactspotter.com/v3/LeadsAdd", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "token_exact": EXACT_TOKEN
        },
        body: JSON.stringify(exactBody)
    });

    const text = await response.text().catch(() => "");
    let parsed: any = null;
    try {
        parsed = JSON.parse(text);
    } catch {
        // segue sem parsear
    }

    if (!response.ok) {
        const msg = parsed?.error?.message || text;
        console.error(
            "[whatsapp-lead] Falha ao enviar para ExactSales:",
            response.status,
            msg
        );
        return { ok: false, status: response.status, body: msg };
    }

    console.log(
        "[whatsapp-lead] Lead enviado para ExactSales com sucesso:",
        text
    );
    return { ok: true, status: response.status, body: text };
}

// ===== Handler principal =====

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json().catch(() => null);

    const rawName = body?.name ?? "";
    const rawPhone = body?.phone ?? "";
    const rawSource = body?.source ?? "floating_whatsapp_button";
    const rawProduct = body?.product ?? undefined;
    const rawSubSource = body?.subSource ?? undefined;
    const rawDescription = body?.description ?? undefined;
    const rawSchoolName = body?.schoolName ?? undefined;

    const name = String(rawName).trim();
    const phone = normalizePhone(String(rawPhone));
    const source = String(rawSource);

    const product =
        typeof rawProduct === "string" && rawProduct.trim().length > 0
            ? rawProduct.trim()
            : undefined;

    const subSource =
        typeof rawSubSource === "string" && rawSubSource.trim().length > 0
            ? rawSubSource.trim()
            : undefined;

    const description =
        typeof rawDescription === "string" && rawDescription.trim().length > 0
            ? rawDescription.trim()
            : undefined;

    const schoolName =
        typeof rawSchoolName === "string" && rawSchoolName.trim().length > 0
            ? rawSchoolName.trim()
            : undefined;

    if (!name || phone.length < 10) {
        return json(
            {
                ok: false,
                error:
                    "Nome e telefone são obrigatórios. Envie um número de WhatsApp válido com DDD."
            },
            { status: 400 }
        );
    }

    const newLead: WhatsappLead = {
        name,
        phone,
        source,
        product,
        subSource,
        description,
        schoolName,
        createdAt: new Date().toISOString()
    };

    try {
        const currentLeads = await loadLeadsFromFile();
        currentLeads.push(newLead);
        await saveLeadsToFile(currentLeads);
    } catch (err) {
        console.error("[whatsapp-lead] Erro ao salvar JSON:", err);
        return json(
            {
                ok: false,
                error: "Erro ao salvar seus dados internamente."
            },
            { status: 500 }
        );
    }

    let exactResult: any = null;
    try {
        exactResult = await sendLeadToExactSales(newLead);
    } catch (err) {
        console.error(
            "[whatsapp-lead] Erro inesperado ao enviar para ExactSales:",
            err
        );
        exactResult = { ok: false, error: "unexpected_error" };
    }

    return json({
        ok: true,
        exactSales: exactResult?.ok ?? false
    });
};

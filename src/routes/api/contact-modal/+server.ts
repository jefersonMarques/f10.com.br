// src/routes/api/contact-modal/+server.ts
import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import fs from "fs/promises";
import path from "path";
import { EXACT_TOKEN } from "$env/static/private";

// Tipo do lead específico do modal de contato
type ContactWhatsappLead = {
    name: string;
    phone: string;
    email: string;
    source: string;
    product?: string;
    subSource?: string;
    description?: string;
    schoolName?: string;
    page?: string;
    createdAt: string;
};

// Caminho separado para leads desse modal
const DATA_FILE_PATH = path.resolve("data", "contact-modal-leads.json");

// ===== Utilitários de arquivo =====

// Garante que o arquivo exista e retorna o array atual de leads
async function loadLeadsFromFile(): Promise<ContactWhatsappLead[]> {
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

        console.error("[contact-modal] Erro ao ler arquivo JSON:", err);
        return [];
    }
}

// Salva o array completo de leads no arquivo
async function saveLeadsToFile(leads: ContactWhatsappLead[]): Promise<void> {
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
    const jsonContent = JSON.stringify(leads, null, 2);
    await fs.writeFile(DATA_FILE_PATH, jsonContent, "utf-8");
}

// Normaliza qualquer telefone para apenas números
function normalizePhone(rawPhone: string): string {
    return String(rawPhone).replace(/\D/g, "");
}

// ===== Integração com ExactSales =====

async function sendLeadToExactSales(lead: ContactWhatsappLead) {
    if (!EXACT_TOKEN) {
        console.warn(
            "[contact-modal] EXACT_TOKEN não definido. Pulando envio para ExactSales."
        );
        return { ok: false, skipped: true };
    }

    const normalizedPhone = normalizePhone(lead.phone);

    const rawSource = (lead.source || "").trim();
    const defaultSource = "Formulário de contato (modal)";

    const sourceForExact =
        rawSource.startsWith("/")
            ? `https://f10.com.br${rawSource}`
            : rawSource || defaultSource;

    const leadProduct = lead.product?.trim() || "Software F10";
    const subSourceForExact =
        lead.subSource?.trim() || "Modal de contato";

    const descriptionLines: string[] = [
        "Lead capturado pelo formulário de contato (modal) com WhatsApp no site."
    ];

    if (lead.schoolName && lead.schoolName.trim().length > 0) {
        descriptionLines.push(`Escola: ${lead.schoolName.trim()}`);
    }

    if (lead.email && lead.email.trim().length > 0) {
        descriptionLines.push(`E-mail: ${lead.email.trim()}`);
    }

    if (lead.page && lead.page.trim().length > 0) {
        descriptionLines.push(`Página de origem: ${lead.page.trim()}`);
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
            //email: lead.email,
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
        "[contact-modal] Enviando para ExactSales:",
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
            "[contact-modal] Falha ao enviar para ExactSales:",
            response.status,
            msg
        );
        return { ok: false, status: response.status, body: msg };
    }

    console.log(
        "[contact-modal] Lead enviado para ExactSales com sucesso:",
        text
    );
    return { ok: true, status: response.status, body: text };
}

// ===== Handler principal =====

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json().catch(() => null);

    const rawName = body?.name ?? "";
    const rawPhone = body?.phone ?? "";
    const rawEmail = body?.email ?? "";
    const rawSchoolName = body?.schoolName ?? "";

    const rawSource = body?.source ?? "/";
    const rawPage = body?.page ?? undefined;
    const rawProduct = body?.product ?? undefined;
    const rawSubSource = body?.subSource ?? undefined;
    const rawDescription = body?.description ?? undefined;

    const name = String(rawName).trim();
    const phone = normalizePhone(String(rawPhone));
    const email = String(rawEmail).trim();
    const schoolName =
        typeof rawSchoolName === "string" && rawSchoolName.trim().length > 0
            ? rawSchoolName.trim()
            : undefined;

    const source = String(rawSource);
    const page =
        typeof rawPage === "string" && rawPage.trim().length > 0
            ? rawPage.trim()
            : undefined;

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

    // Validações básicas
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || phone.length < 10 || !emailRegex.test(email)) {
        return json(
            {
                ok: false,
                error:
                    "Nome, e-mail válido e WhatsApp com DDD são obrigatórios."
            },
            { status: 400 }
        );
    }

    const newLead: ContactWhatsappLead = {
        name,
        phone,
        email,
        source,
        product,
        subSource,
        description,
        schoolName,
        page,
        createdAt: new Date().toISOString()
    };

    try {
        const currentLeads = await loadLeadsFromFile();
        currentLeads.push(newLead);
        await saveLeadsToFile(currentLeads);
    } catch (err) {
        console.error("[contact-modal] Erro ao salvar JSON:", err);
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
            "[contact-modal] Erro inesperado ao enviar para ExactSales:",
            err
        );
        exactResult = { ok: false, error: "unexpected_error" };
    }

    return json({
        ok: true,
        exactSales: exactResult?.ok ?? false
    });
};

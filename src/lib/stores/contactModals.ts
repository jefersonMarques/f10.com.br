// src/lib/stores/contactModals.ts
import { writable } from "svelte/store";

export type ContactModalConfig = {
  defaultMessage: string;
  product: string;
  subSource: string;
  leadDescription: string;
};

export const contactModalConfig = writable<ContactModalConfig>({
  defaultMessage:
    "Olá, quero falar com a equipe da F10 sobre planos e implantação.",
  product: "Software F10",
  subSource: "Modal de contato – Genérico",
  leadDescription: "Contato iniciado pelo modal de contato.",
});

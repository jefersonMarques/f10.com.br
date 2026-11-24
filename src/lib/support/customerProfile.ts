export function normalizeCustomerProfileName(value: unknown): string | null {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  const name = value.trim().replace(/\s+/gu, " ");
  if (name.length < 2 || name.length > 120 || name.includes("@") || !/\p{L}/u.test(name)) return null;
  return name;
}

export function needsCustomerNameConfirmation(name: string, email: string, confirmed = false): boolean {
  if (confirmed) return false;
  const normalized = name.trim().toLocaleLowerCase("pt-BR");
  const login = email.trim().toLocaleLowerCase("pt-BR");
  return !normalized || normalized === "cliente f10" || normalized === login || normalized === login.split("@")[0];
}

export const MAX_CUSTOMER_AVATAR_BYTES = 2 * 1024 * 1024;

export function normalizeCustomerContactEmail(value: unknown): string | null {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error("INVALID_CONTACT_EMAIL");
  const email = value.trim().toLowerCase();
  if (!email) return null;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_CONTACT_EMAIL");
  return email;
}

export function normalizeCustomerContactPhone(value: unknown): string | null {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error("INVALID_CONTACT_PHONE");
  const phone = value.trim();
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (phone.length > 32 || !/^\+?[0-9() .-]+$/.test(phone) || digits.length < 8 || digits.length > 15) {
    throw new Error("INVALID_CONTACT_PHONE");
  }
  return phone;
}

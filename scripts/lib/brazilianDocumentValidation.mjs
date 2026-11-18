function checkDigit(digits, weights) {
  const sum = weights.reduce((total, weight, index) => {
    return total + Number(digits[index]) * weight;
  }, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function validCpf(digits) {
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const firstWeights = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  return checkDigit(digits, firstWeights) === Number(digits[9]) &&
    checkDigit(digits, secondWeights) === Number(digits[10]);
}

function validCnpj(digits) {
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return checkDigit(digits, firstWeights) === Number(digits[12]) &&
    checkDigit(digits, secondWeights) === Number(digits[13]);
}

export function classifyBrazilianDocument(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw === "") return { kind: "missing", digits: null };
  if (/[^0-9.\-/\s]/.test(raw)) return { kind: "invalid", digits: null };

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && validCpf(digits)) {
    return { kind: "cpf", digits };
  }
  if (digits.length === 14 && validCnpj(digits)) {
    return { kind: "cnpj", digits };
  }
  return { kind: "invalid", digits: null };
}

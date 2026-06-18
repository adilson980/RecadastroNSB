/**
 * Clean CPF from formatting characters (dots and dash)
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/**
 * Format string as CPF: 000.000.000-00
 */
export function formatCPF(cpf: string): string {
  const digits = cleanCPF(cpf).slice(0, 11);
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Validate Brazilian CPF using standard algorithm (11 digits checking)
 */
export function validateCPF(cpfRaw: string): boolean {
  const cpf = cleanCPF(cpfRaw);
  
  if (cpf.length !== 11) return false;
  
  // Reject simple repetitive sequences (e.g. 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // First digit validator
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  
  // Second digit validator
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

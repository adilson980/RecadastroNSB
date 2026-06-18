export interface CSVDatabase {
  headers: string[];
  rows: Record<string, string>[];
  cpfColumnName: string; // The detected or selected header that holds the CPFs
}

export interface RegistrationListItem {
  cpf: string;
  name: string;
  details: Record<string, string>;
}

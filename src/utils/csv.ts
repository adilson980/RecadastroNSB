/**
 * Parses double-quoted CSV text into headers and row dictionaries.
 * Detects whether the delimiter is a comma (,) or a semicolon (;).
 */
export function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[]; delimiter: string } {
  const firstLine = csvText.split(/\r?\n/)[0] || "";
  const delimiter = firstLine.includes(";") ? ";" : ",";
  
  const lines: string[] = [];
  let currentLine = "";
  let insideQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip next character
      }
      lines.push(currentLine);
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  
  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter };
  }
  
  // Custom field parser respecting quotes
  const parseLineFields = (line: string): string[] => {
    const fields: string[] = [];
    let currentField = "";
    let insideFieldQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideFieldQuotes && line[i + 1] === '"') {
          currentField += '"';
          i++; // Skip the second quote
        } else {
          insideFieldQuotes = !insideFieldQuotes;
        }
      } else if (char === delimiter && !insideFieldQuotes) {
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    return fields;
  };
  
  const headers = parseLineFields(lines[0])
    .map(h => h.trim().replace(/^"(.*)"$/, "$1"))
    .filter(h => h !== "");
    
  const rows: Record<string, string>[] = [];
  
  for (let l = 1; l < lines.length; l++) {
    const line = lines[l];
    if (!line.trim()) continue;
    const fields = parseLineFields(line).map(f => f.trim().replace(/^"(.*)"$/, "$1"));
    const row: Record<string, string> = {};
    for (let f = 0; f < headers.length; f++) {
      row[headers[f]] = fields[f] !== undefined ? fields[f] : "";
    }
    rows.push(row);
  }
  
  return { headers, rows, delimiter };
}

/**
 * Serializes database headers and records into CSV.
 */
export function exportToCSV(headers: string[], rows: Record<string, string>[], useSemicolon: boolean = true): string {
  const delimiter = useSemicolon ? ";" : ",";
  const headerLine = headers.map(h => {
    const safeH = h.replace(/"/g, '""');
    return `"${safeH}"`;
  }).join(delimiter);
  
  const rowLines = rows.map(row => {
    return headers.map(h => {
      const val = row[h] || "";
      const safeVal = val.replace(/"/g, '""');
      return `"${safeVal}"`;
    }).join(delimiter);
  });
  
  return [headerLine, ...rowLines].join("\n");
}

/**
 * Tries to identify which column name stands for the CPF (case-insensitive)
 */
export function detectCPFColumn(headers: string[]): string {
  const targetTerms = ["cpf", "c.p.f", "cadastro de pessoa fisica", "doc", "documento"];
  for (const h of headers) {
    const cleanHeader = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
    for (const term of targetTerms) {
      if (cleanHeader.includes(term)) {
        return h;
      }
    }
  }
  // Fallback to first column, or "CPF" if it exists in any shape
  const strictCpf = headers.find(h => h.toUpperCase() === "CPF");
  if (strictCpf) return strictCpf;
  
  // Return the first column of the CSV as a fallback
  return headers[0] || "CPF";
}

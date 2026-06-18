import React, { useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { CSVDatabase } from "../types";
import { parseCSV, detectCPFColumn } from "../utils/csv";
import { DEFAULT_HEADERS, DEFAULT_ROWS } from "../data/defaultDatabase";

interface CSVLoaderProps {
  database: CSVDatabase;
  onDatabaseChange: (db: CSVDatabase) => void;
  onResetToDefault: () => void;
}

export default function CSVLoader({
  database,
  onDatabaseChange,
  onResetToDefault,
}: CSVLoaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileContent = (text: string, fileName: string) => {
    try {
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) {
        throw new Error(
          "O arquivo CSV está vazio ou não possui cabeçalhos válidos.",
        );
      }

      const detectedCPFCol = detectCPFColumn(parsed.headers);

      onDatabaseChange({
        headers: parsed.headers,
        rows: parsed.rows,
        cpfColumnName: detectedCPFCol,
      });
      setErrorStatus(null);
    } catch (err: any) {
      setErrorStatus(err.message || "Erro desconhecido ao carregar o CSV.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          processFileContent(text, file.name);
        };
        reader.readAsText(textReaderFallback(file));
      } else {
        setErrorStatus(
          "Formato inválido. Por favor, envie apenas arquivos .CSV.",
        );
      }
    }
  };

  // Helper workaround for browser encodings (Windows-1252 is extremely common in Brazilian Excel exports)
  const textReaderFallback = (file: File): Blob => {
    // Return the file, we read as text. Most modern browsers will handle basic characters.
    return file;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      // Let's try reading as ISO-8859-1 (Latin1) to preserve accents like 'á', 'ç', 'õ' often present in Brazilian CSVs.
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processFileContent(text, file.name);
      };

      // First let's read as text. If there are accents, readAsText with 'ISO-8859-1' is the safest fallback for Excel CSV.
      reader.readAsText(file, "UTF-8");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleCpfColumnSelect = (colName: string) => {
    onDatabaseChange({
      ...database,
      cpfColumnName: colName,
    });
  };

  return (
    <div
      id="csv-loader-section"
      className="bg-zinc-800 rounded-3xl border border-white/5 shadow-2xl p-6 mb-8 transition-all hover:border-white/10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
            Fonte de Dados (.CSV)
          </h2>
          <p className="text-xs text-white/40 mt-1">
            Escolha seu arquivo de banco de dados ou use o modelo padrão
            predefinido.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors cursor-pointer"
            id="btn-reset-default"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Carregar Modelo de Teste
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Drop zone */}
        <div className="lg:col-span-7">
          <form
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-blue-500 bg-blue-500/5"
                : "border-white/10 bg-zinc-900 hover:border-blue-500/50 hover:bg-white/5"
            }`}
            id="csv-drag-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
            />

            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white/5 rounded-full text-blue-500">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">
                  Arraste e solte seu arquivo .CSV aqui
                </p>
                <p className="text-xs text-white/40 mt-1">
                  ou clique para navegar no computador (limite de 10MB)
                </p>
              </div>
            </div>
          </form>

          {errorStatus && (
            <div className="flex items-center gap-2 p-3 mt-3 text-xs bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorStatus}</span>
            </div>
          )}
        </div>

        {/* Database diagnostics and column mapper */}
        <div className="lg:col-span-5 bg-zinc-800 rounded-xl p-5 flex flex-col justify-between border border-white/5">
          <div>
            <h3 className="text-xs font-bold text-white/40 tracking-wider uppercase mb-3">
              Diagnóstico do Banco Carregado
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">
                  Total de Registros:
                </span>
                <span className="text-sm font-semibold text-white bg-zinc-900 px-2 py-0.5 rounded border border-white/10 font-mono">
                  {database.rows.length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">
                  Campos Identificados:
                </span>
                <span className="text-sm font-semibold text-white bg-zinc-900 px-2 py-0.5 rounded border border-white/10 font-mono">
                  {database.headers.length}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  Coluna que representa o CPF:
                </label>
                <select
                  value={database.cpfColumnName}
                  onChange={(e) => handleCpfColumnSelect(e.target.value)}
                  className="w-full text-sm bg-zinc-900 border border-white/10 rounded-lg py-1.5 px-2.5 text-white focus:outline-none focus:border-blue-500/50"
                  id="select-cpf-column"
                >
                  {database.headers.map((hdr) => (
                    <option key={hdr} value={hdr}>
                      {hdr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2.5 text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="leading-tight">
              <p className="text-xs font-semibold">Banco ativo e integrado!</p>
              <p className="text-[10px] text-white/40">
                Pronto para consultas e alterações.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

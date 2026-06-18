import React, { useState } from "react";
import { Search, Hash, AlertTriangle, Check, UserMinus } from "lucide-react";
import { formatCPF, cleanCPF, validateCPF } from "../utils/cpf";

interface CPFSearchProps {
  onSearch: (cpf: string) => void;
  searchedCpf: string;
  isCPFRegistered: boolean | null;
  cpfColumnName: string;
}

export default function CPFSearch({
  onSearch,
  searchedCpf,
  isCPFRegistered,
  cpfColumnName,
}: CPFSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const cleanNum = cleanCPF(inputValue);
  const isCpfComplete = cleanNum.length === 11;
  const isChecksumValid = isCpfComplete ? validateCPF(cleanNum) : false;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = formatCPF(rawVal);
    setInputValue(formatted);
    setErrorLocal(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanRawAndValidate();
    if (cleaned) {
      onSearch(cleaned);
    }
  };

  const cleanRawAndValidate = (): string | null => {
    const cleaned = cleanCPF(inputValue);
    if (!cleaned) {
      setErrorLocal("Digite um CPF para realizar a busca.");
      return null;
    }
    if (cleaned.length < 11) {
      setErrorLocal(
        "O CPF informado está incompleto. Deve conter 11 algarismos.",
      );
      return null;
    }
    // Validation warning but still allow searching if they click?
    // In administrative databases, maybe someone registered an invalid CPF. Let's warn but proceed with look-up,
    // although we highlight heavily.
    if (!validateCPF(cleaned)) {
      // Just notify they are looking up an invalid format, but let them query
      setErrorLocal(null);
    }
    return cleaned;
  };

  const setManualSampleValue = (sample: string) => {
    setInputValue(formatCPF(sample));
    onSearch(cleanCPF(sample));
    setErrorLocal(null);
  };

  return (
    <div
      id="cpf-search-section"
      className="bg-zinc-800 border border-white/5 rounded-3xl p-8 mb-8 shadow-2xl relative"
    >
      <div className="max-w-2xl mx-auto text-center mb-10">
        <h3 className="text-3xl font-light text-white mb-2 italic serif">
          Consulta de Cadastro
        </h3>
        <p className="text-white/40 text-sm uppercase tracking-[0.2em]">
          Verificação de CPF em Tempo Real
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="max-w-xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-white/30">
            <Hash className="w-6 h-6" />
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="000.000.000-00"
            className={`block w-full bg-zinc-800 text-2xl font-mono text-white rounded-2xl py-6 pl-16 pr-36 focus:border-blue-500/50 focus:ring-0 transition-all outline-none placeholder:text-white/10 tracking-wider ${
              errorLocal
                ? "border-rose-500 bg-rose-500/5"
                : isCpfComplete && !isChecksumValid
                  ? "border-amber-500 focus:border-amber-500/80"
                  : isCpfComplete && isChecksumValid
                    ? "border-emerald-500 focus:border-emerald-500/80"
                    : "border-white/10"
            }`}
            id="input-cpf-search"
          />

          <div className="absolute inset-y-3 right-3 flex items-center gap-2">
            {isCpfComplete && (
              <span
                className={`hidden md:flex items-center gap-1 text-[10px] uppercase font-bold py-1 px-2.5 rounded-lg border ${
                  isChecksumValid
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
                id="validation-badge"
              >
                {isChecksumValid ? (
                  <>
                    <Check className="w-3 h-3" />
                    Válido
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    Inválido
                  </>
                )}
              </span>
            )}

            <button
              type="submit"
              className="px-6 h-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all uppercase text-xs tracking-widest active:scale-95 cursor-pointer"
              id="submit-cpf-search"
            >
              <Search className="w-4 h-4 inline mr-1" />
              <span>Pesquisar</span>
            </button>
          </div>
        </div>

        {/* Real-time Validation Indicators and Warnings */}
        {errorLocal && (
          <p className="text-xs text-rose-400 mt-2 ml-1 text-left flex items-center gap-1 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
            <AlertTriangle className="w-3.5 h-3.5" />
            {errorLocal}
          </p>
        )}

        {isCpfComplete && !isChecksumValid && !errorLocal && (
          <p className="text-xs text-amber-400 mt-2 ml-1 text-left flex items-center gap-1 bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/10">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Este CPF não atende aos critérios do dígito verificador, mas a
              busca ainda será realizada.
            </span>
          </p>
        )}
      </form>

      {/* Examples for quick testing */}
      <div className="max-w-xl mx-auto mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2 justify-center">
        <span className="text-xs text-white/30 uppercase tracking-widest text-[10px]">
          Exemplos rápidos:
        </span>
        <button
          onClick={() => setManualSampleValue("52998224725")}
          className="text-xs px-2.5 py-1 bg-zinc-800 border border-white/5 rounded-md text-white/70 hover:bg-zinc-800 hover:border-white/10 hover:text-white transition-all cursor-pointer"
        >
          Carlos (Cadastrado)
        </button>
        <button
          onClick={() => setManualSampleValue("11144477735")}
          className="text-xs px-2.5 py-1 bg-zinc-800 border border-white/5 rounded-md text-white/70 hover:bg-zinc-800 hover:border-white/10 hover:text-white transition-all cursor-pointer"
        >
          Ana (Cadastrado)
        </button>
        <button
          onClick={() => setManualSampleValue("12345678909")}
          className="text-xs px-2.5 py-1 bg-zinc-800 border border-white/5 rounded-md text-white/70 hover:bg-zinc-800 hover:border-white/10 hover:text-white transition-all cursor-pointer"
        >
          Felipe (Cadastrado)
        </button>
        <button
          onClick={() => setManualSampleValue("00000000000")}
          className="text-xs px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
        >
          Novo CPF (Para Cadastrar)
        </button>
      </div>
    </div>
  );
}

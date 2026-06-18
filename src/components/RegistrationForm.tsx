import React, { useState, useEffect } from "react";
import {
  UserCheck,
  UserPlus,
  Save,
  ArrowLeft,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { CSVDatabase } from "../types";
import { formatCPF } from "../utils/cpf";

interface RegistrationFormProps {
  searchedCpf: string;
  isExisting: boolean;
  initialData: Record<string, string> | null;
  database: CSVDatabase;
  onSave: (data: Record<string, string>) => void;
  onCancel: () => void;
}

export default function RegistrationForm({
  searchedCpf,
  isExisting,
  initialData,
  database,
  onSave,
  onCancel,
}: RegistrationFormProps) {
  const { headers, cpfColumnName } = database;

  // Local state to hold form inputs
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // When searched CPF or initial data changes, sync it to the form
  useEffect(() => {
    const defaultData: Record<string, string> = {};

    // Pre-initialize empty fields for all headers
    headers.forEach((header) => {
      defaultData[header] = "";
    });

    // If initialData exists, merge it (Existing Registration)
    if (initialData) {
      setFormData({ ...defaultData, ...initialData });
    } else {
      // New Registration: fill CPF field automatically and leave others empty
      setFormData({
        ...defaultData,
        [cpfColumnName]: formatCPF(searchedCpf),
      });
    }
    setSuccessMsg(null);
  }, [searchedCpf, initialData, headers, cpfColumnName]);

  const handleFieldChange = (headerName: string, value: string) => {
    let cleanVal = value;

    // Auto format phone fields
    const lowerHeader = headerName.toLowerCase();
    if (
      lowerHeader.includes("fone") ||
      lowerHeader.includes("telefone") ||
      lowerHeader.includes("celular")
    ) {
      cleanVal = formatPhoneNumber(value);
    }

    // Auto format date field if it looks like standard Brazilian dates: 00/00/0000
    if (lowerHeader.includes("nascimento") || lowerHeader.includes("data")) {
      cleanVal = formatBrazilianDate(value);
    }

    setFormData((prev) => ({
      ...prev,
      [headerName]: cleanVal,
    }));
  };

  // Helper helper to format (XX) XXXXX-XXXX
  const formatPhoneNumber = (value: string): string => {
    const num = value.replace(/\D/g, "");
    if (num.length <= 2) return num;
    if (num.length <= 6) return `(${num.slice(0, 2)}) ${num.slice(2)}`;
    if (num.length <= 10)
      return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6)}`;
    return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7, 11)}`;
  };

  // Helper helper to format DD/MM/YYYY
  const formatBrazilianDate = (value: string): string => {
    const num = value.replace(/\D/g, "");
    if (num.length <= 2) return num;
    if (num.length <= 4) return `${num.slice(0, 2)}/${num.slice(2)}`;
    return `${num.slice(0, 2)}/${num.slice(2, 4)}/${num.slice(4, 8)}`;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSuccessMsg(
      isExisting
        ? "✅ Informações do cadastro atualizadas com sucesso!"
        : "✅ Novo registro inserido e salvo com sucesso no banco de dados!",
    );

    // Clear success message after 4.5 seconds
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  return (
    <div
      id="registration-form-section"
      className="bg-zinc-800 rounded-3xl border border-white/5 shadow-2xl p-6 mb-8 transition-all"
    >
      {/* Alert Header Banner */}
      <div className="mb-6">
        {isExisting ? (
          <div className="flex items-start gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-white">
                Cadastro de CPF Localizado!
              </h4>
              <p className="text-xs text-white/60 mt-1">
                Este CPF já está registrado na coluna{" "}
                <strong className="text-emerald-300">"{cpfColumnName}"</strong>.
                Você pode ler e alterar os dados associados a ele abaixo.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <UserPlus className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-white">
                CPF Não Encontrado!
              </h4>
              <p className="text-xs text-white/60 mt-1">
                O CPF{" "}
                <strong className="font-mono text-amber-300">
                  {formatCPF(searchedCpf)}
                </strong>{" "}
                não possui registro neste banco de dados. Insira novos dados
                para criar o cadastro.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Form Content */}
      <form onSubmit={handleFormSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
          {headers.map((header) => {
            const isCPFField = header === cpfColumnName;
            const lowerHeader = header.toLowerCase();

            // Map common field patterns to native inputs
            let inputType = "text";
            let placeholderMsg = `Digite o ${header.toLowerCase()}`;

            if (
              lowerHeader.includes("email") ||
              lowerHeader.includes("e-mail")
            ) {
              inputType = "email";
              placeholderMsg = "exemplo@email.com";
            } else if (
              lowerHeader.includes("fone") ||
              lowerHeader.includes("telefone") ||
              lowerHeader.includes("celular")
            ) {
              placeholderMsg = "(00) 90000-0000";
            } else if (
              lowerHeader.includes("nascimento") ||
              lowerHeader.includes("data")
            ) {
              placeholderMsg = "DD/MM/2026";
            }

            let isSelect = false;
            let selectOptions: string[] = [];

            if (lowerHeader.includes("possui mandato")) {
              isSelect = true;
              selectOptions = ["SIM", "NÃO"];
            } else if (lowerHeader.includes("qual cargo eletivo")) {
              isSelect = true;
              selectOptions = [
                "PRESIDENTE(A)",
                "SENADOR(A)",
                "DEPUTADO(A) FEDERAL",
                "DEPUTADO(A) ESTADUAL",
                "GOVERNADOR(A)",
                "PREFEITO(A)",
                "VEREADOR(A)",
              ];
            } else if (
              lowerHeader.includes("eleição") &&
              (lowerHeader.includes("2026") || lowerHeader.includes("2024")) &&
              lowerHeader.includes("cargo")
            ) {
              isSelect = true;
              selectOptions = [
                "PRESIDENTE(A)",
                "SENADOR(A)",
                "DEPUTADO(A) FEDERAL",
                "DEPUTADO(A) ESTADUAL",
                "GOVERNADOR(A)",
              ];
            }

            return (
              <div
                key={header}
                className={`flex flex-col ${isCPFField ? "md:col-span-2 bg-zinc-900 p-3 rounded-lg border border-white/5" : ""}`}
              >
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1 mb-1.5 flex items-center justify-between">
                  <span>{header.replace(/2024/g, "2026")}</span>
                  {isCPFField && (
                    <span className="text-[9px] text-[#2563eb] uppercase font-mono tracking-wider font-semibold">
                      Chave de Identificação do Registro
                    </span>
                  )}
                </label>

                {isSelect ? (
                  <select
                    value={formData[header] || ""}
                    onChange={(e) => handleFieldChange(header, e.target.value)}
                    disabled={isCPFField}
                    required={
                      isCPFField ||
                      lowerHeader.includes("nome") ||
                      lowerHeader.includes("completo")
                    }
                    className={`w-full text-sm rounded-lg border py-2.5 px-3 focus:outline-none transition-all bg-zinc-900 border-white/5 focus:border-blue-500/50 text-white placeholder:text-white/20`}
                    id={`field-${header.replace(/\s+/g, "-")}`}
                  >
                    <option value="">Selecione...</option>
                    {selectOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={inputType}
                    value={formData[header] || ""}
                    onChange={(e) => handleFieldChange(header, e.target.value)}
                    disabled={isCPFField} // Locks CPF to avoid accidents during creation/edit
                    placeholder={placeholderMsg}
                    required={
                      isCPFField ||
                      lowerHeader.includes("nome") ||
                      lowerHeader.includes("completo")
                    }
                    className={`w-full text-sm rounded-lg border py-2.5 px-3 focus:outline-none transition-all ${
                      isCPFField
                        ? "bg-zinc-800 border-white/10 text-white/40 font-mono select-none"
                        : "bg-zinc-900 border-white/5 focus:border-blue-500/50 text-white placeholder:text-white/20"
                    }`}
                    id={`field-${header.replace(/\s+/g, "-")}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Feedback Success banner */}
        {successMsg && (
          <div
            className="flex items-center gap-2.5 p-3 mb-6 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 text-xs font-semibold animate-fade-in"
            id="success-form-alert"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-transparent hover:bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-lg text-sm transition-all cursor-pointer"
            id="form-cancel-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Consulta
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-lg font-semibold text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
            id="form-submit-btn"
          >
            <Save className="w-4 h-4" />
            {isExisting ? "Atualizar Cadastro" : "Criar Novo Cadastro"}
          </button>
        </div>
      </form>
    </div>
  );
}

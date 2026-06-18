import React, { useState, useEffect } from "react";
import {
  Users,
  FileText,
  Database,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  HardDrive,
  LogIn,
  Cloud,
  Loader2,
} from "lucide-react";
import { CSVDatabase } from "./types";
import { cleanCPF } from "./utils/cpf";
import { DEFAULT_HEADERS, DEFAULT_ROWS } from "./data/defaultDatabase";
import CSVLoader from "./components/CSVLoader";
import CPFSearch from "./components/CPFSearch";
import RegistrationForm from "./components/RegistrationForm";
import RegistrationTable from "./components/RegistrationTable";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { supabase } from "./supabase";
// Realtime and database logic migrated to Supabase

const LOCAL_STORAGE_KEY = "valida_cpf_database_v1";
const ADMIN_EMAILS = ["j.adilson_bezerra@hotmail.com"];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);
  const [database, setDatabase] = useState<CSVDatabase>(() => {
    // Try to load initial database from localStorage
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.headers &&
          Array.isArray(parsed.rows) &&
          parsed.cpfColumnName
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Local storage lookup failed:", e);
    }

    // Fallback to default mock spreadsheet data
    return {
      headers: DEFAULT_HEADERS,
      rows: [] as Record<string, string>[],
      cpfColumnName: "CPF",
    };
  });

  const [searchedCpf, setSearchedCpf] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(false);
  const [isExisting, setIsExisting] = useState<boolean>(false);
  const [foundRecord, setFoundRecord] = useState<Record<string, string> | null>(
    null,
  );

  // Sync state to LocalStorage so changes persist and provide a real-ready database workflow
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(database));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  }, [database]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Supabase real-time updates
  useEffect(() => {
    const fetchRegistrations = async () => {
      const { data, error } = await supabase.from("registrations").select("data");
      if (data) {
        const rows = data.map((row) => row.data);
        setDatabase((prev) => ({ ...prev, rows }));
      } else if (error && error.code !== "42P01") {
         console.error("Supabase registrations fetch error:", error);
      }
    };

    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", "config")
        .single();
      
      if (data) {
        setDatabase((prev) => ({
          ...prev,
          headers: data.headers,
          cpfColumnName: data.cpf_column_name,
        }));
      } else if (error && error.code !== "42P01" && error.code !== "PGRST116") {
         console.error("Supabase config fetch error:", error);
      }
    };

    fetchRegistrations();
    fetchConfig();

    const channel = supabase
      .channel("public-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registrations" },
        () => fetchRegistrations()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => fetchConfig()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Auth Error", error);
    }
  };

  // Performs looking up CPF in current database rows (ignoring formatting like dots and dashes)
  const handleCPFLookup = (cpf: string) => {
    const cleanedCpfSearch = cleanCPF(cpf);
    setSearchedCpf(cleanedCpfSearch);

    const record = database.rows.find((row) => {
      const rowCpfValue = cleanCPF(row[database.cpfColumnName] || "");
      return rowCpfValue === cleanedCpfSearch;
    });

    if (record) {
      setIsExisting(true);
      setFoundRecord(record);
    } else {
      setIsExisting(false);
      setFoundRecord(null);
    }

    setShowForm(true); // Always reveal form: prefilled if found (existing), empty template fields if not (new)
  };

  // Quick edit / Inspect triggers from the table below
  const handleEditFromTable = (cpf: string) => {
    handleCPFLookup(cpf);
    // Smooth scrolling to the form
    document
      .getElementById("registration-form-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  // Remove records from the dataset
  const handleDeleteRecord = async (absoluteIndex: number) => {
    const record = database.rows[absoluteIndex];
    if (!record) return;

    const cpfValue = cleanCPF(record[database.cpfColumnName] || "");

    // Local delete
    const updatedRows = [...database.rows];
    updatedRows.splice(absoluteIndex, 1);
    setDatabase((prev) => ({ ...prev, rows: updatedRows }));

    // Cloud delete
    if (cpfValue) {
      try {
        await supabase.from("registrations").delete().eq("cpf", cpfValue);
      } catch (e: any) {
        console.error("Erro ao deletar na nuvem:", e.message);
      }
    }

    // If the currently edited record was deleted, close form view
    setShowForm(false);
    setSearchedCpf("");
  };

  // Add or update database row on submit
  const handleSaveRecord = async (recordData: Record<string, string>) => {
    const cleanSearchVal = cleanCPF(searchedCpf);

    // Local Update
    const updatedRows = [...database.rows];
    const recordIndex = updatedRows.findIndex((row) => {
      const rowCpfValue = cleanCPF(row[database.cpfColumnName] || "");
      return rowCpfValue === cleanSearchVal;
    });

    if (recordIndex !== -1) {
      updatedRows[recordIndex] = recordData;
    } else {
      updatedRows.push(recordData);
    }

    setDatabase((prev) => ({
      ...prev,
      rows: updatedRows,
    }));

    // Updates UI local values so details match new edits
    setIsExisting(true);
    setFoundRecord(recordData);

    // Cloud Sync
    try {
      await supabase.from("registrations").upsert({
        cpf: cleanSearchVal,
        data: recordData,
        updated_at: Date.now(),
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleResetToDefault = () => {
    if (confirm("Deseja redefinir os cabeçalhos para o padrão?")) {
      setDatabase((prev) => ({
        ...prev,
        headers: DEFAULT_HEADERS,
        cpfColumnName: "CPF",
      }));
      setShowForm(false);
      setSearchedCpf("");
      setFoundRecord(null);

      if (user) {
        supabase
          .from("app_settings")
          .upsert({
            id: "config",
            headers: DEFAULT_HEADERS,
            cpf_column_name: "CPF",
            updated_at: Date.now(),
          })
          .then(({ error }) => {
            if (error) console.error(error);
          });
      }
    }
  };

  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const syncBulkData = async (newDatabase: CSVDatabase) => {
    // Immediately show the new file's data locally
    setDatabase((prev) => ({
      ...prev,
      headers: newDatabase.headers,
      cpfColumnName: newDatabase.cpfColumnName,
      rows: newDatabase.rows,
    }));

    if (!user) {
      alert("Arquivo carregado com sucesso localmente!");
      return;
    }

    if (newDatabase.rows.length === 0) return;
    if (
      !confirm(
        `Carregado com sucesso na tela!\n\nDeseja SINCRONIZAR os ${newDatabase.rows.length} registros com a nuvem agora?`,
      )
    )
      return;

    try {
      // Format rows for Supabase
      const formattedRows = newDatabase.rows
        .map((row) => {
          const cpfValue = cleanCPF(row[newDatabase.cpfColumnName] || "");
          return { cpf: cpfValue, data: row, updated_at: Date.now() };
        })
        .filter((r) => r.cpf && r.cpf.length === 11);

      // Chunk batches by 500
      const chunks = [];
      for (let i = 0; i < formattedRows.length; i += 500) {
        chunks.push(formattedRows.slice(i, i + 500));
      }

      setUploadProgress({ current: 0, total: formattedRows.length });

      let processed = 0;
      for (const chunk of chunks) {
        const { error } = await supabase.from("registrations").upsert(chunk);
        if (error) throw error;
        processed += chunk.length;
        setUploadProgress({
          current: processed,
          total: formattedRows.length,
        });
      }

      setUploadProgress(null);

      // Save the schema
      await supabase.from("app_settings").upsert({
        id: "config",
        headers: newDatabase.headers,
        cpf_column_name: newDatabase.cpfColumnName,
        updated_at: Date.now(),
      });

      alert("Sincronização concluída com sucesso!");
    } catch (e: any) {
      setUploadProgress(null);
      alert("Erro massivo: " + e.message);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-zinc-900 text-zinc-100 pb-16 antialiased font-sans"
      id="main-app-container"
    >
      {/* Dynamic Ambient Header banner */}
      <header
        className="bg-zinc-800 text-white border-b border-white/10 relative overflow-hidden mb-8"
        id="layout-header"
      >
        {/* Subtle decorative glow circles */}
        <div className="absolute top-[-20%] right-[-10%] w-[350px] h-[350px] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[250px] h-[250px] rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 py-8 lg:py-10 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight uppercase">
                  Recadastro de Filiados e Candidatos da NSB
                </h1>
                <p className="text-xs text-white/40 mt-1 flex items-center gap-1.5 font-medium tracking-[0.1em] uppercase">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  Gerenciador de Banco de Dados CSV
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs text-emerald-400 font-mono">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sincronia Nuvem Ativa {isAdmin && "- Admin"}</span>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 transition-all px-3 py-1.5 rounded-xl border border-blue-500/20 text-xs text-blue-400 font-mono cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Acesso Administrativo</span>
                </button>
              )}
            </div>
          </div>

          {uploadProgress && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl max-w-xl">
              <div className="flex items-center justify-between text-xs text-blue-400 font-bold uppercase tracking-widest mb-2">
                <span>Sincronizando com a Nuvem...</span>
                <span>
                  {Math.round(
                    (uploadProgress.current / uploadProgress.total) * 100,
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2 border border-white/5 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="text-[10px] text-white/40 mt-2 font-mono">
                {uploadProgress.current} de {uploadProgress.total} registros
                salvos
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4">
        {/* Dynamic Workspace Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main lookup and registration interaction panel */}
          <div className="lg:col-span-8 space-y-8">
            {!showForm ? (
              <>
                {/* 1. Database file loader - shown only during lookup for maximum clarity */}
                {isAdmin && (
                  <CSVLoader
                    database={database}
                    onDatabaseChange={syncBulkData}
                    onResetToDefault={handleResetToDefault}
                  />
                )}

                {/* 2. CPF search console */}
                <CPFSearch
                  onSearch={handleCPFLookup}
                  searchedCpf={searchedCpf}
                  isCPFRegistered={foundRecord ? true : false}
                  cpfColumnName={database.cpfColumnName}
                />
              </>
            ) : (
              /* 3. The Registration and edit visualizer form */
              <RegistrationForm
                searchedCpf={searchedCpf}
                isExisting={isExisting}
                initialData={foundRecord}
                database={database}
                onSave={handleSaveRecord}
                onCancel={() => {
                  setShowForm(false);
                  setSearchedCpf("");
                  setFoundRecord(null);
                }}
              />
            )}

            {/* 4. Complete Database Record Listing Table & Actions */}
            {isAdmin && (
              <RegistrationTable
                database={database}
                onEditRecord={handleEditFromTable}
                onDeleteRecord={handleDeleteRecord}
              />
            )}
          </div>

          {/* Guidelines and help panel */}
          <div className="lg:col-span-4 space-y-6">
            <div
              className="bg-[#111111] rounded-3xl border border-white/5 shadow-2xl p-6"
              id="guidelines-card"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 tracking-wider uppercase">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                Como Sincronizar?
              </h3>

              <ul className="space-y-4 text-xs text-white/60 leading-relaxed">
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    <strong className="text-white block">
                      Escolha seu .CSV
                    </strong>
                    Importe seu arquivo existente ou use o modelo padrão para
                    realizar testes imediatos de sincronia.
                  </div>
                </li>

                <li className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    <strong className="text-white block">
                      Pesquise por CPF
                    </strong>
                    Utilize o consolidador para fazer a consulta. O sistema
                    valida os dígitos automaticamente em tempo de digitação.
                  </div>
                </li>

                <li className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <div>
                    <strong className="text-white block">
                      Edite ou registre dados
                    </strong>
                    Se o CPF existir no arquivo, você poderá atualizar os dados
                    de todas as colunas. Caso não exista, abra os campos para
                    registrar.
                  </div>
                </li>

                <li className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    4
                  </span>
                  <div>
                    <strong className="text-white block">
                      Exportar base atualizada
                    </strong>
                    Baixe os novos registros sincronizados a qualquer momento
                    clicando em{" "}
                    <span className="font-semibold text-emerald-400">
                      Exportar CSV
                    </span>
                    .
                  </div>
                </li>
              </ul>
            </div>

            {/* Quick CSV Compatibility tips */}
            <div
              className="bg-[#111111] text-white/70 rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden"
              id="compatibility-card"
            >
              <div className="absolute top-0 right-0 p-3 text-blue-500/10">
                <FileText className="w-16 h-16 shrink-0" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Arquivos do Microsoft Excel
              </h4>
              <p className="text-xs leading-relaxed text-white/40">
                O Excel normalmente salva arquivos CSV em português configurados
                com o ponto e vírgula (
                <code className="font-mono bg-zinc-900 border border-white/5 text-white/80 px-1 py-0.2 rounded">
                  ;
                </code>
                ) de forma padrão.
              </p>
              <p className="text-xs leading-relaxed text-white/40 mt-2">
                O aplicativo detecta este formato de forma independente durante
                a importação e permite que você escolha se deseja salvar os
                resultados usando ponto e vírgula ou vírgulas padrão.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import React, { useState } from "react";
import {
  Table,
  Search,
  Download,
  Trash2,
  Eye,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CSVDatabase } from "../types";
import { exportToCSV } from "../utils/csv";
import { formatCPF } from "../utils/cpf";

interface RegistrationTableProps {
  database: CSVDatabase;
  onEditRecord: (cpf: string) => void;
  onDeleteRecord: (index: number) => void;
}

export default function RegistrationTable({
  database,
  onEditRecord,
  onDeleteRecord,
}: RegistrationTableProps) {
  const { headers, rows, cpfColumnName } = database;

  const [filterText, setFilterText] = useState("");
  const [useSemicolonExport, setUseSemicolonExport] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter records based on searching
  const filteredRows = rows.filter((row) => {
    if (!filterText) return true;
    const term = filterText.toLowerCase();

    return Object.entries(row).some(([key, val]) => {
      return val.toLowerCase().includes(term);
    });
  });

  // Calculate pages
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = filteredRows.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // Trigger browser download for the database
  const handleExportCSV = () => {
    const csvContent = exportToCSV(headers, rows, useSemicolonExport);

    // Create blob with UTF-8 byte order mark (BOM) so Excel opens special characters (accents) correctly!
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `banco_cadastros_${useSemicolonExport ? "excel" : "padrao"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div
      id="database-manager-section"
      className="bg-zinc-800 rounded-3xl border border-white/5 shadow-2xl p-6 overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-blue-500" />
            Visualizar Todos os Cadastros ({rows.length})
          </h3>
          <p className="text-xs text-white/40 mt-1">
            Pesquise, inspecione ou remova dados. Baixe a planilha atualizada
            abaixo.
          </p>
        </div>

        {/* CSV Export tool and delimiters */}
        <div className="flex flex-wrap items-center gap-3 bg-zinc-800 p-2.5 rounded-xl border border-white/5 transition-colors">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-white/40 mr-1">
              Separador:
            </span>
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                checked={useSemicolonExport}
                onChange={() => setUseSemicolonExport(true)}
                className="accent-blue-500 w-3.5 h-3.5"
              />
              Ponto e vírgula (Excel)
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer ml-1.5">
              <input
                type="radio"
                checked={!useSemicolonExport}
                onChange={() => setUseSemicolonExport(false)}
                className="accent-blue-500 w-3.5 h-3.5"
              />
              Vírgula (,)
            </label>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm ml-auto cursor-pointer"
            id="btn-export-csv"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Row Searching and Filtering */}
      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/35">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={filterText}
          onChange={(e) => {
            setFilterText(e.target.value);
            setCurrentPage(1); // resets page on filter change
          }}
          placeholder="Busque por qualquer campo (Nome, CPF, E-mail, Cidade, etc)..."
          className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/5 text-sm outline-none focus:border-blue-500/50 text-white bg-zinc-800"
          id="input-table-filter"
        />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-10 bg-zinc-800 rounded-xl border border-dashed border-white/10">
          <FileSpreadsheet className="w-8 h-8 text-white/25 mx-auto mb-2" />
          <p className="text-sm font-medium text-white/60">
            O banco de dados está vazio.
          </p>
          <p className="text-xs text-white/30 mt-1">
            Carregue um arquivo .CSV acima ou use o modelo padrão.
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-10 bg-zinc-800 rounded-xl border border-white/5">
          <p className="text-sm font-medium text-white/60">
            Nenhum termo correspondente encontrado.
          </p>
          <p className="text-xs text-white/35 mt-1">
            Tente ajustar seus termos de busca.
          </p>
        </div>
      ) : (
        <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-800">
          <div className="overflow-x-auto">
            <table
              className="w-full text-left border-collapse"
              id="registrations-data-table"
            >
              <thead>
                <tr className="bg-zinc-800 border-b border-white/10 text-[10px] uppercase tracking-wider font-bold text-white/40">
                  <th className="py-3 px-4">Chave ({cpfColumnName})</th>
                  {headers
                    .filter((h) => h !== cpfColumnName)
                    .slice(0, 3) // display first 3 columns to keep the list elegant without clogging
                    .map((header) => (
                      <th key={header} className="py-3 px-4">
                        {header}
                      </th>
                    ))}
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white/80">
                {paginatedRows.map((row, index) => {
                  const absoluteIndex = rows.indexOf(row);
                  const cpfValue = row[cpfColumnName] || "";

                  return (
                    <tr
                      key={index}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-blue-400">
                        {formatCPF(cpfValue)}
                      </td>
                      {headers
                        .filter((h) => h !== cpfColumnName)
                        .slice(0, 3)
                        .map((header) => (
                          <td
                            key={header}
                            className="py-3.5 px-4 truncate max-w-[200px] text-white/70"
                            title={row[header]}
                          >
                            {row[header] || "—"}
                          </td>
                        ))}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onEditRecord(cpfValue)}
                            className="p-1 px-2.5 text-xs text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 rounded-lg transition-colors flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px] cursor-pointer"
                            title="Editar este cadastro"
                            id={`btn-table-edit-${index}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspecionar</span>
                          </button>

                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Tem certeza que deseja excluir o cadastro do CPF ${formatCPF(cpfValue)}?`,
                                )
                              ) {
                                onDeleteRecord(absoluteIndex);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Excluir cadastro"
                            id={`btn-table-delete-${index}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Simple table pagination footer */}
          <div className="bg-[#1c1c1c] px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-white/40">
              Mostrando{" "}
              <strong className="text-white/80">{startIndex + 1}</strong> a{" "}
              <strong className="text-white/80">
                {Math.min(startIndex + itemsPerPage, filteredRows.length)}
              </strong>{" "}
              de{" "}
              <strong className="text-white/80">{filteredRows.length}</strong>{" "}
              cadastros
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors cursor-pointer"
                id="btn-page-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-white/80 min-w-16 text-center">
                Pág. {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors cursor-pointer"
                id="btn-page-next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

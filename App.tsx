
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Trash2, 
  Download, 
  BarChart3, 
  Table as TableIcon, 
  BrainCircuit,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { FinancialItem, KPI, DashboardData, ViewMode, TabMode } from './types';
import { databaseService } from './services/database';
import { getFinancialInsights } from './services/geminiService';

// Fallback KPIs if none uploaded
const DEFAULT_KPIS: KPI[] = [
  { name: "Liquidez Corrente", v25: "8.42", v24: "9.23", description: "Capacidade curto prazo" },
  { name: "Liquidez Seca", v25: "5.26", v24: "4.84", description: "Sem estoques" },
  { name: "ROI", v25: "18.6%", v24: "22.1%", description: "Retorno s/ Ativo" },
  { name: "Endividamento", v25: "11.8%", v24: "10.8%", description: "Exigível / Ativo" },
  { name: "Giro do Ativo", v25: "1.15", v24: "1.08", description: "Eficiência vendas" },
  { name: "Margem Bruta", v25: "42.5%", v24: "40.2%", description: "Resultado bruto" },
  { name: "Margem Líquida", v25: "15.2%", v24: "14.8%", description: "Lucro / Receita" },
  { name: "ROE", v25: "21.4%", v24: "24.5%", description: "Retorno s/ PL" }
];

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('COMPARATIVO');
  const [activeTab, setActiveTab] = useState<TabMode>('balanco');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load initial data
  useEffect(() => {
    const savedData = databaseService.loadData();
    if (savedData) {
      setData(savedData);
    }
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const parseMoeda = (valor: any): number => {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    const clean = valor.toString().replace(/[R$\.\s]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const nA: FinancialItem[] = [];
      const nP: FinancialItem[] = [];

      rows.forEach((row, idx) => {
        if (idx === 0) return;
        // Logic mapping from original request (Col 0, 1, 2 Ativo; Col 4, 5, 6 Passivo)
        if (row[0]) {
          const desc = String(row[0]);
          nA.push({
            desc,
            v25: parseMoeda(row[1]),
            v24: parseMoeda(row[2]),
            isTotal: desc.toLowerCase().includes('total'),
            isGroup: desc.toLowerCase().includes('circulante')
          });
        }
        if (row[4]) {
          const desc = String(row[4]);
          nP.push({
            desc,
            v25: parseMoeda(row[5]),
            v24: parseMoeda(row[6]),
            isTotal: desc.toLowerCase().includes('total'),
            isGroup: desc.toLowerCase().includes('circulante') || desc.toLowerCase().includes('líquido')
          });
        }
      });

      const newData: DashboardData = {
        ativo: nA,
        passivo: nP,
        kpis: DEFAULT_KPIS, // Could be parsed if available in sheet
        lastUpdated: new Date().toISOString()
      };

      setData(newData);
      databaseService.saveData(newData);
      setAiInsights(''); // Reset insights for new data
    };
    reader.readAsBinaryString(file);
  };

  const handleReset = () => {
    if (confirm("Deseja realmente apagar todos os dados salvos?")) {
      databaseService.clearData();
      setData(null);
      setAiInsights('');
    }
  };

  const generateInsights = async () => {
    if (!data) return;
    setIsAiLoading(true);
    const result = await getFinancialInsights(data);
    setAiInsights(result);
    setIsAiLoading(false);
    setActiveTab('insights');
  };

  const totals = useMemo(() => {
    if (!data) return { a25: 0, a24: 0, p25: 0, p24: 0 };
    const atv = data.ativo.find(i => i.isTotal);
    const pas = data.passivo.find(i => i.isTotal);
    return {
      a25: atv?.v25 || 0,
      a24: atv?.v24 || 0,
      p25: pas?.v25 || 0,
      p24: pas?.v24 || 0
    };
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-50 shadow-sm gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BarChart3 className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tighter leading-none">
                PRO ACTIVE <span className="text-emerald-600">BALANÇO</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                Marcelo Chagas | Head Controller
              </p>
            </div>
          </div>
          
          <div className="hidden md:block border-l pl-6 border-slate-200">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-lg tabular-nums">{currentTime.toLocaleTimeString('pt-BR')}</span>
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-center">
          <label className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-black uppercase cursor-pointer transition-all shadow-lg active:scale-95">
            <FileSpreadsheet className="w-4 h-4" />
            Upload Planilha
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
          </label>
          
          <button 
            onClick={generateInsights}
            disabled={!data || isAiLoading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg text-xs font-black uppercase transition-all shadow-lg active:scale-95"
          >
            <BrainCircuit className={`w-4 h-4 ${isAiLoading ? 'animate-pulse' : ''}`} />
            {isAiLoading ? 'Analisando...' : 'AI Insights'}
          </button>

          <button 
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-black text-white p-2 rounded-lg transition-all"
            title="Exportar PDF"
          >
            <Download className="w-5 h-5" />
          </button>

          <button 
            onClick={handleReset}
            className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white p-2 rounded-lg transition-all border border-rose-200"
            title="Limpar Banco de Dados"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Ativo (2025)" value={totals.a25} color="blue" />
          <SummaryCard title="Passivo + PL (2025)" value={totals.p25} color="emerald" />
          <SummaryCard title="Ativo (2024)" value={totals.a24} color="slate" isSecondary />
          <SummaryCard title="Passivo + PL (2024)" value={totals.p24} color="slate" isSecondary />
        </div>

        {/* Tab Selection & View Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div className="flex p-1 bg-slate-50 rounded-xl w-full md:w-auto">
            <TabButton 
              active={activeTab === 'balanco'} 
              onClick={() => setActiveTab('balanco')} 
              icon={<TableIcon className="w-4 h-4" />}
              label="1. Balanço" 
            />
            <TabButton 
              active={activeTab === 'indicadores'} 
              onClick={() => setActiveTab('indicadores')} 
              icon={<BarChart3 className="w-4 h-4" />}
              label={`2. Indicadores (${data?.kpis.length || 0})`} 
            />
            <TabButton 
              active={activeTab === 'insights'} 
              onClick={() => setActiveTab('insights')} 
              icon={<BrainCircuit className="w-4 h-4" />}
              label="3. IA Insights" 
            />
          </div>
          
          <div className="flex items-center gap-3 px-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Filtro de Período</span>
            <select 
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold text-slate-700 outline-none hover:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
            >
              <option value="COMPARATIVO">Visão: Comparativa (2025 vs 2024)</option>
              <option value="2025">Foco: Exercício 2025</option>
              <option value="2024">Foco: Exercício 2024</option>
            </select>
          </div>
        </div>

        {/* Dynamic Views */}
        <div className="min-h-[500px]">
          {!data ? (
            <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-slate-200 rounded-3xl bg-white text-slate-400">
              <FileSpreadsheet className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-semibold">Nenhum dado carregado no sistema.</p>
              <p className="text-sm">Faça o upload de uma planilha Excel ou CSV para começar.</p>
            </div>
          ) : (
            <>
              {activeTab === 'balanco' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                  <BalanceTable title="Ativo Total" items={data.ativo} viewMode={viewMode} theme="blue" />
                  <BalanceTable title="Passivo + PL" items={data.passivo} viewMode={viewMode} theme="emerald" />
                </div>
              )}

              {activeTab === 'indicadores' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500">
                  {data.kpis.map((kpi, idx) => (
                    <KPICard key={idx} kpi={kpi} viewMode={viewMode} />
                  ))}
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-in zoom-in duration-300">
                   <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                      <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Análise Estratégica AI</h3>
                      <p className="text-xs text-slate-500">Relatório gerado dinamicamente com base nos dados do balanço.</p>
                    </div>
                  </div>
                  
                  {aiInsights ? (
                    <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">
                      {aiInsights}
                    </div>
                  ) : (
                    <div className="text-center py-20 flex flex-col items-center gap-4">
                      <AlertCircle className="w-10 h-10 text-slate-300" />
                      <p className="text-slate-400">Clique em "AI Insights" no topo para gerar uma análise.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-8 text-center mt-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Sistema de Controladoria & BI &copy; {new Date().getFullYear()} Pro Active Management
        </p>
      </footer>
    </div>
  );
};

// Helper Components

/**
 * SummaryCard displays high-level financial totals.
 */
const SummaryCard: React.FC<{ 
  title: string; 
  value: number; 
  color: 'blue' | 'emerald' | 'slate'; 
  isSecondary?: boolean; 
}> = ({ title, value, color, isSecondary }) => {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-600 bg-blue-50/50 text-blue-900",
    emerald: "border-emerald-500 bg-emerald-50/50 text-emerald-900",
    slate: "border-slate-300 bg-white text-slate-700"
  };

  return (
    <div className={`p-5 border-l-4 rounded-2xl shadow-sm hover:shadow-md transition-all ${colorClasses[color]}`}>
      <span className={`text-[9px] font-black uppercase ${isSecondary ? 'text-slate-400' : ''}`}>{title}</span>
      <h2 className="text-xl font-black mt-1 tabular-nums">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
      </h2>
    </div>
  );
};

/**
 * TabButton for switching dashboard views.
 */
const TabButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
}> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap
      ${active ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
  >
    {icon}
    {label}
  </button>
);

/**
 * BalanceTable renders the Ativo or Passivo list.
 */
const BalanceTable: React.FC<{ 
  title: string; 
  items: FinancialItem[]; 
  viewMode: ViewMode; 
  theme: 'blue' | 'emerald'; 
}> = ({ title, items, viewMode, theme }) => {
  const themeStyles = theme === 'blue' ? 'text-blue-900' : 'text-emerald-900';

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-hidden">
      <h3 className={`text-xs font-black uppercase mb-5 border-b pb-3 ${themeStyles} border-slate-100 flex items-center gap-2`}>
        <div className={`w-2 h-2 rounded-full ${theme === 'blue' ? 'bg-blue-600' : 'bg-emerald-500'}`} />
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] text-slate-400 uppercase tracking-wider border-b border-slate-50">
              <th className="text-left py-3 font-extrabold w-1/2">Conta</th>
              <th className={`text-right py-3 font-extrabold transition-opacity ${viewMode === '2024' ? 'opacity-20' : 'opacity-100'}`}>2025 (R$)</th>
              <th className={`text-right py-3 px-3 font-extrabold transition-opacity ${viewMode === '2025' ? 'opacity-20' : 'opacity-100'}`}>2024 (R$)</th>
              <th className="text-right py-3 font-extrabold">AH %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, idx) => {
              const ah = item.v24 ? (((item.v25 / item.v24) - 1) * 100) : 0;
              const isTotal = item.isTotal;
              const isGroup = item.isGroup;

              return (
                <tr key={idx} className={`
                  transition-colors group
                  ${isTotal ? 'bg-slate-900 text-white font-black' : isGroup ? 'bg-slate-50 text-blue-900 font-extrabold' : 'hover:bg-slate-50/50 text-slate-600'}
                `}>
                  <td className={`py-4 uppercase text-[10px] pl-2 ${!isTotal && !isGroup ? 'pl-6' : ''}`}>{item.desc}</td>
                  <td className={`py-4 text-right tabular-nums pr-2 transition-opacity ${viewMode === '2024' ? 'opacity-20' : 'opacity-100'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.v25)}
                  </td>
                  <td className={`py-4 text-right tabular-nums px-3 transition-opacity ${viewMode === '2025' ? 'opacity-20' : 'opacity-100'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.v24)}
                  </td>
                  <td className={`py-4 text-right font-black pr-2 ${ah >= 0 ? 'text-emerald-500' : 'text-rose-500'} ${isTotal ? 'text-emerald-300' : ''}`}>
                    <div className="flex items-center justify-end gap-1">
                      {ah >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {ah.toFixed(1)}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * KPICard renders individual financial metrics.
 * Using React.FC fixes the 'key' prop error on line 280.
 */
const KPICard: React.FC<{ 
  kpi: KPI; 
  viewMode: ViewMode; 
}> = ({ kpi, viewMode }) => {
  return (
    <div className="bg-white p-5 rounded-2xl border-t-4 border-slate-900 shadow-sm hover:shadow-md transition-all border-x border-b border-slate-100">
      <div className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">{kpi.name}</div>
      <div className="flex justify-between items-end border-b border-slate-50 pb-3 mb-3">
        <div className={`transition-opacity ${viewMode === '2024' ? 'opacity-20' : 'opacity-100'}`}>
          <span className="text-[8px] block text-blue-600 font-bold uppercase mb-1">Exercício 25</span>
          <span className="text-xl font-black text-blue-900 tabular-nums">{kpi.v25}</span>
        </div>
        <div className={`text-right transition-opacity ${viewMode === '2025' ? 'opacity-20' : 'opacity-100'}`}>
          <span className="text-[8px] block text-slate-400 font-bold uppercase mb-1">Exercício 24</span>
          <span className="text-sm font-bold text-slate-500 tabular-nums">{kpi.v24}</span>
        </div>
      </div>
      <p className="text-[8px] font-medium italic text-slate-400 leading-tight">{kpi.description}</p>
    </div>
  );
};

export default App;

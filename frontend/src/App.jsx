import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { 
  AlertTriangle, Download, UploadCloud, Activity, Wrench, 
  ShieldAlert, CheckCircle2, Factory, DollarSign, Database, FileSpreadsheet, ActivitySquare 
} from 'lucide-react';
import './App.css';
import { generateLocalIoTData, analyzeLocalIoTData } from './SimulationEngine';
import SimulationComparison from './SimulationComparison';

const API_URL = 'http://localhost:3001/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = data.total > 0 ? ((data.anomalies / data.total) * 100).toFixed(1) : 0;
    
    return (
      <div style={{ backgroundColor: 'rgba(5,7,15,0.95)', padding: '16px', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
        <p style={{ color: '#fff', marginBottom: '12px', fontWeight: 'bold' }}>{label}</p>
        <p style={{ color: 'var(--alert-color)', marginBottom: '4px' }}>Máquinas em Risco: {data.anomalies}</p>
        <p style={{ color: 'var(--success-color)', marginBottom: '8px' }}>Operação Saudável: {data.total - data.anomalies}</p>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
           <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Defeituosas / Total Setor: {data.ratio} ({percentage}%)</p>
        </div>
      </div>
    );
  }
  return null;
};

function App() {
  const [step, setStep] = useState('UPLOAD'); // UPLOAD, PREVIEW, ALERT, DASHBOARD
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [rawExcelData, setRawExcelData] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const fileInputRef = useRef(null);

  // 1. Gerar Arquivo Excel Dinâmico (Sempre Aleatório)
  const handleGenerateData = async () => {
    setIsGenerating(true);
    try {
      let data;
      try {
        const response = await fetch(`${API_URL}/iot-data`);
        if (!response.ok) throw new Error("Backend falhou.");
        data = await response.json();
      } catch (backendError) {
        console.log("⚠️ Backend Node.js não detectado. Iniciando motor DUMP de Geração Local (Modo GitHub Pages)!");
        data = generateLocalIoTData();
      }
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sensores Vibração");
      
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'stream_vibracao_iot.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      alert("Falha ao gerar o feed do sensor. O Servidor Node está online?");
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Processar Leitura e ir para o Novo Passo Inteiro (Preview)
  const processFile = async (file) => {
    try {
      if (!file) throw new Error("Nenhum arquivo capturado.");
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        throw new Error("Planilha vazia ou com formato não suportado.");
      }

      setRawExcelData(jsonData);
      setStep('PREVIEW');
    } catch (error) {
      alert(`Erro no processamento do Excel: ${error.message}`);
    }
  };

  // 3. Executar o Algoritmo da Simulação (API / Local Fallback) a partir do Preview
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      let result;
      try {
        const response = await fetch(`${API_URL}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: rawExcelData })
        });
        if (!response.ok) throw new Error("A API rejeitou os dados.");
        result = await response.json();
      } catch (backendError) {
        console.log("⚠️ Backend Node.js inalcançável. Analisando os dados usando o Motor Estático Local no Navegador (Modo GitHub Pages)!");
        result = analyzeLocalIoTData(rawExcelData);
      }

      setAnalysisResult(result);
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setStep('ALERT'); // Pula para Modal
      }, 1500);

    } catch (error) {
      alert(`Erro no processamento da API: ${error.message}`);
      setIsAnalyzing(false);
    }
  };

  // Funções Drag and Drop
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };
  const handleFileClick = () => { fileInputRef.current?.click(); };
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Renderização da Tabela de Preview (Agrupamento Dinâmico)
  const renderPreviewTable = () => {
    const agg = {};
    rawExcelData.forEach(r => {
      if (!agg[r.MachineID]) agg[r.MachineID] = { Sector: r.Sector, Amp: [], Freq: [] };
      if (r.Amplitude_mm_s !== undefined) agg[r.MachineID].Amp.push(r.Amplitude_mm_s);
      if (r.Frequency_Hz !== undefined) agg[r.MachineID].Freq.push(r.Frequency_Hz);
    });

    return (
      <div className="glass-panel preview-container slide-up">
        <h2><FileSpreadsheet /> Estrutura do Arquivo IOT</h2>
        <p>Abaixo estão os dados capturados da nossa planilha de forma organizada as máquinas separadas por suas áreas da Indústria. Cheque os parâmetros físicos (Amplitude e Frequência) antes de enviar para processamento.</p>
        
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Identificação do Maquinário</th>
                <th>Amplitude de Vibração Méd. (mm/s)</th>
                <th>Frequência de Rotação Méd. (Hz)</th>
                <th>Amostras do Tempo</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(agg).map(mId => {
                const mac = agg[mId];
                const avgAmp = mac.Amp.length > 0 ? (mac.Amp.reduce((a,b)=>a+b,0)/mac.Amp.length).toFixed(2) : 'N/A';
                const avgFreq = mac.Freq.length > 0 ? (mac.Freq.reduce((a,b)=>a+b,0)/mac.Freq.length).toFixed(2) : 'N/A';
                return (
                  <tr key={mId}>
                    <td>
                        <strong style={{fontSize: '1.2rem'}}>{mId}</strong> <br/>
                        <span style={{color:'var(--text-muted)'}}>Área: {mac.Sector}</span>
                    </td>
                    <td><span style={{color: avgAmp > 5.5 ? 'var(--alert-color)' : 'var(--text-main)'}}>{avgAmp} mm/s</span></td>
                    <td>{avgFreq} Hz</td>
                    <td>{mac.Amp.length} captures</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button className="btn-primary" onClick={runAnalysis} disabled={isAnalyzing} style={{ marginTop: '20px', alignSelf: 'flex-start' }}>
          {isAnalyzing ? <Activity className="spin" /> : <Database />}
          {isAnalyzing ? "Injetando Dados e Processando..." : "Pesquisar Anomalias da Indústria Pelo Arquivo"}
        </button>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="hero-header fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary-color)'}}>
           <Factory size={48} />
        </div>
        <h1>Indústria 4.0 <span className="text-gradient">Simulação</span></h1>
        <p>Acompanhe o mapeamento térmico e de desgaste pelo Digital Twin em 3D. Gere a malha para visualizar o status de cada ativo afetado.</p>
      </header>

      {/* Passo 1 - Gerar Arquivo e Arrastar (Dropzone) */}
      {step === 'UPLOAD' && (
        <div className="steps-container slide-up">
          <div className="glass-panel step-card">
            <h3>1. Coletar Stream IOT Único</h3>
            <p>Sorteia casos randômicos de funcionamento (Amplitude Magnitudinal e Frequência Herteziana) em toda a malha.</p>
            <button className="btn-primary" onClick={handleGenerateData} disabled={isGenerating}>
              <Download size={20} />
              {isGenerating ? "Gerando Ambiente..." : "Exportar Planilha IOT Inicial"}
            </button>
          </div>

          <div 
            className={`glass-panel step-card dropzone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileClick}
          >
            <input type="file" accept=".xlsx, .csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <UploadCloud className="dropzone-icon" />
            <h3>2. Anexar Medições da Indústria</h3>
            <p>Arraste o arquivo `.xlsx` recebido para iniciar a formatação das áreas, e abrir o modo de Inspeção dos sensores.</p>
          </div>
        </div>
      )}

      {/* Passo 2 - Data Preview Table (NOVO) */}
      {step === 'PREVIEW' && renderPreviewTable()}

      {/* Passo 3 - Alerto Superficial Iminente */}
      {step === 'ALERT' && analysisResult && (() => {
        let alertColor = 'var(--success-color)';
        if (analysisResult.severityLevel === 'ALTO RISCO') alertColor = 'var(--alert-color)';
        if (analysisResult.severityLevel === 'MÉDIO') alertColor = 'var(--warning-color)';

        return (
          <div className="alert-overlay">
            <div className="alert-modal" style={{ borderColor: alertColor, boxShadow: `0 0 40px ${alertColor}50` }}>
              <AlertTriangle size={64} color={alertColor} style={{ margin: '0 auto', animation: 'pulseAlert 2s infinite', borderRadius: '50%' }} />
              <h2 style={{ color: alertColor }}>ALERTA DO MOTOR DE STATUS: {analysisResult.severityLevel}</h2>
              <p style={{ fontSize: '1.3rem', fontWeight: '500' }}>
                Sistemas diagnosticaram irregularidades físicas de operação em <b style={{color: alertColor}}>{analysisResult.anomaliesCount}</b> das {analysisResult.totalAnalyzed} máquinas monitoradas na planta fabril!
              </p>
              <button 
                className="btn-danger" 
                style={{ background: alertColor, boxShadow: `0 0 15px ${alertColor}80` }}
                onClick={() => setStep('DASHBOARD')}
              >
                Visualizar Investigação Setorial Completa
              </button>
            </div>
          </div>
        );
      })()}

      {/* Passo 4 - Dashboard Detalhado Dividido em Grandes Blocos como Solicitado */}
      {step === 'DASHBOARD' && analysisResult && (
        <div className="dashboard-sections fade-in">
          
          <section className="glass-panel detailed-section">
            <h2><ActivitySquare color="var(--primary-color)" /> Bloco 1: Detalhamento Físico do Ensaio</h2>
            <p style={{color:'var(--text-muted)', marginBottom: '24px'}}>Análise individual e rastreada informando as anomalias originadas das altas taxas de Amplitude (desgastes de rotação) identificadas em nossa tabela prévia.</p>
            {analysisResult.anomaliesCount === 0 ? (
               <div className="finance-row">
                 <span className="finance-label" style={{color: 'var(--success-color)'}}>Toda a malha IOT sorteada operou adequadamente livre das anomalias! Trilhamos excelente estabilidade em chão de fábrica.</span>
               </div>
            ) : (
                <div className="anomaly-list">
                  {analysisResult.anomalies.map((an, idx) => (
                    <SimulationComparison key={idx} machineData={an} />
                  ))}
                </div>
            )}
          </section>

          <section className="glass-panel detailed-section">
            <h2><ShieldAlert color="var(--warning-color)" /> Bloco 2: Dispersão de Impacto Sobre a Fábrica</h2>
            <p style={{color:'var(--text-muted)', marginBottom: '24px'}}>Conectando informações para mostrar qual setor deve ser cercado pelas equipes técnicas primárias.</p>
            <div style={{ width: '100%', height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysisResult.sectorChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={14} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis stroke="var(--text-muted)" fontSize={14} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                  <Bar dataKey="anomalies" radius={[6, 6, 0, 0]}>
                    {analysisResult.sectorChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.anomalies > 1 ? 'var(--alert-color)' : 'var(--warning-color)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="glass-panel detailed-section">
            <h2><DollarSign color="var(--success-color)" /> Bloco 3: Balanço de Gastos de Manutenção Agregados</h2>
            <p style={{color:'var(--text-muted)', marginBottom: '24px'}}>Demonstra todos os gastos conjuntos se a sua equipe fizesse a corretiva, consolidando peças e também parada de linha de produção no montante total de perdas financeiras.</p>
            <div className="finance-row">
              <span className="finance-label">Gastos Base Relativos a Ferramentas e Mão-de-Obra Reparadora Média</span>
              <span className="finance-val warning">{formatCurrency(analysisResult.financials.maintenanceCost)}</span>
            </div>
            <div className="finance-row">
              <span className="finance-label">Custo Associado Exclusivo à Perda de Produção (Extrapolamento de Horas Paradas do Turno)</span>
              <span className="finance-val danger">{formatCurrency(analysisResult.financials.downtimeCost)}</span>
            </div>
            
            <div className="finance-row" style={{ background: 'rgba(255, 42, 95, 0.1)', borderLeft: '4px solid var(--alert-color)' }}>
              <span className="finance-label" style={{ fontWeight: 'bold' }}>Soma Orçamentária Gasta nos Ativos Adjacentes:</span>
              <span className="finance-val" style={{ color: 'var(--alert-color)', fontSize: '2.2rem' }}>{formatCurrency(analysisResult.financials.totalExpenses)}</span>
            </div>
          </section>

          <section className="glass-panel detailed-section">
             <h2><Wrench color="var(--primary-color)" /> Bloco 4: Consultoria Em Tomada de Decisões Estratégicas</h2>
             <p style={{color:'var(--text-muted)', marginBottom: '24px'}}>Revisões técnicas vitais embasadas na arquitetura da indústria para salvaguardar lucros passados por essas incidências.</p>
             <ul className="strategy-list">
               {analysisResult.strategies.map((strat, idx) => (
                 <li key={idx}>
                   <CheckCircle2 size={24} className="icon" />
                   <span>{strat}</span>
                 </li>
               ))}
             </ul>
             
             <button 
               className="btn-primary" 
               style={{ marginTop: '40px', width: '100%', padding: '24px', fontSize: '1.2rem' }}
               onClick={() => { setStep('UPLOAD'); setRawExcelData([]); setAnalysisResult(null); }}
             >
               Regressar ao Status IOT e Refazer Cenário Randômico
             </button>
          </section>

        </div>
      )}
    </div>
  );
}

export default App;

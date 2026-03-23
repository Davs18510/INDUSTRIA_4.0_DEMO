const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const NUM_MACHINES = 50;
const SETORES = ['Usinagem', 'Montagem', 'Fundição', 'Soldagem', 'Pintura', 'Qualidade', 'Embalagem', 'Logística'];

app.get('/api/iot-data', (req, res) => {
    // Para manter gráficos "razoavelmente cheios" e visualmente incríveis para exibir na apresentação, 
    // vamos fixar a quebra constante entre 3 a 14 máquinas falhando simultaneamente:
    const anomalyCount = Math.floor(Math.random() * 12) + 3; 
    const anomalousIds = [];
    while(anomalousIds.length < anomalyCount) {
        const rnd = Math.floor(Math.random() * NUM_MACHINES) + 1;
        if(!anomalousIds.includes(rnd)) anomalousIds.push(rnd);
    }

    const data = [];
    for (let i = 1; i <= NUM_MACHINES; i++) {
        const sector = SETORES[(i - 1) % SETORES.length];
        const isAnomalous = anomalousIds.includes(i); 
        
        for (let t = 0; t < 6; t++) {
            // Vibração da Norma ISO 10816 (Classe II/III): 
            // Aceitável < 4.5 mm/s. Crítico > 5.5 mm/s
            let amplitude = isAnomalous ? (Math.random() * 8 + 6) : (Math.random() * 2 + 0.5); 
            // Motores industriais padrões rodam a 50Hz ou 60Hz. Falhas de rolamentos oscilam fortemente.
            let frequency = isAnomalous ? (Math.random() * 90 + 20) : (Math.random() * 10 + 50);

            data.push({
                MachineID: `MCH-${i.toString().padStart(2, '0')}`,
                Sector: sector,
                Timestamp: new Date(Date.now() - t * 60000).toISOString(),
                Amplitude_mm_s: parseFloat(amplitude.toFixed(2)),
                Frequency_Hz: parseFloat(frequency.toFixed(2))
            });
        }
    }
    
    data.sort(() => Math.random() - 0.5);
    res.json(data);
});

app.post('/api/analyze', (req, res) => {
    const { payload } = req.body; 
    if (!payload || !Array.isArray(payload)) {
        return res.status(400).json({ error: 'Payload formatação inválida.' });
    }

    const anomalias = [];
    const machinesMap = {};
    const sectorStats = {};
    SETORES.forEach(s => sectorStats[s] = { Total: 0, Defective: 0 });

    payload.forEach(record => {
        if (!machinesMap[record.MachineID]) {
            machinesMap[record.MachineID] = {
                Sector: record.Sector,
                MaxAmplitude: record.Amplitude_mm_s,
                ErraticFreq: record.Frequency_Hz > 70 || record.Frequency_Hz < 40,
                Count: 1
            };
        } else {
            machinesMap[record.MachineID].MaxAmplitude = Math.max(machinesMap[record.MachineID].MaxAmplitude, record.Amplitude_mm_s);
            machinesMap[record.MachineID].ErraticFreq = machinesMap[record.MachineID].ErraticFreq || record.Frequency_Hz > 70 || record.Frequency_Hz < 40;
        }
    });

    Object.keys(machinesMap).forEach(mId => {
        const m = machinesMap[mId];
        sectorStats[m.Sector].Total += 1;

        let issues = [];
        let severityScore = 0;

        if (m.MaxAmplitude > 5.5) {
            issues.push(`Amplitude Crítica Registrada (${m.MaxAmplitude.toFixed(1)} mm/s) - Desgaste profundo nos mancais (ISO 10816).`);
            severityScore += (m.MaxAmplitude - 5.5);
        }
        if (m.ErraticFreq) {
            issues.push(`Frequência Rotacional Errática - Possível desalinhamento grave acoplado ou folga estrutural.`);
            severityScore += 2;
        }
        
        if (issues.length > 0) {
            sectorStats[m.Sector].Defective += 1;
            anomalias.push({
                MachineID: mId,
                Sector: m.Sector,
                Severity: severityScore > 4 ? 'Avaria Grave (Falha Iminente)' : 'Alerta de Máquina (Atenção)',
                Issues: issues
            });
        }
    });

    const totalMachinesDeffective = anomalias.length;
    const totalAnalyzed = Object.keys(machinesMap).length;

    // Organizando dados matemáticos para o Recharts Tooltip Rate
    const sectorChartData = Object.keys(sectorStats).map(sec => ({
        name: sec,
        anomalies: sectorStats[sec].Defective,
        total: sectorStats[sec].Total,
        ratio: `${sectorStats[sec].Defective} / ${sectorStats[sec].Total}`
    }));

    // Na realidade de uma Indústria, ter 15% (7+ de 50) de máquinas em colapso mecânico IMINENTE é um risco Gigante de parada em cadeia.
    // As verdadeiras escalas industriais de Indústria 4.0:
    const defectRatio = totalAnalyzed > 0 ? (totalMachinesDeffective / totalAnalyzed) : 0;
    
    let severityLevel = 'RAZOÁVEL';
    if (defectRatio >= 0.15) { // 15% (8+ máquinas de 50) -> Alto Risco
        severityLevel = 'ALTO RISCO';
    } else if (defectRatio >= 0.08) { // 8% a 14% (4 a 7 máquinas de 50) -> Médio
        severityLevel = 'MÉDIO';
    }

    const costPerParts = 4500; 
    const costLabor = 1200;    
    const downtimeCostPerHour = 25000; 

    const maintenanceCost = totalMachinesDeffective === 0 ? 0 : totalMachinesDeffective * (costPerParts + costLabor);
    const downtimeCost = totalMachinesDeffective === 0 ? 0 : totalMachinesDeffective * (downtimeCostPerHour * 8); 
    const totalExpenses = maintenanceCost + downtimeCost;

    res.json({
        totalAnalyzed,
        anomaliesCount: totalMachinesDeffective,
        anomalies: anomalias,
        sectorChartData,
        severityLevel,
        financials: {
            maintenanceCost,
            downtimeCost,
            totalExpenses
        },
        strategies: [
            "Providenciar análise termográfica e ajuste fino de alinhamento em todas as máquinas de criticidade Grave.",
            "Substituição preventiva do rolamento principal nos maquinários do setor mais afetado.",
            "Adequar o plano de lubrificação em áreas onde a Amplitude apresentou picos constantes ao longo do feed."
        ]
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`📡 Simulação Indústria 4.0 API de Sensores online na porta ${PORT}`);
});

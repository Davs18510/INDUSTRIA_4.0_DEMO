import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Zap, ServerCrash } from 'lucide-react';
import Machine3D from './Machine3D';
import './App.css';

export default function SimulationComparison({ machineData }) {
  const [data, setData] = useState([]);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 1);
      setData(prev => {
        const newTime = prev.length > 0 ? prev[prev.length - 1].time + 1 : 0;
        
        // Baseline healthy Machine logic
        const baseNormal = 90 + Math.random() * 8;
        
        // Defective logic based on severity
        const severityScore = machineData.Severity === 'Avaria Grave (Falha Iminente)' ? 25 : 12;
        const volatility = machineData.Severity === 'Avaria Grave (Falha Iminente)' ? 18 : 8;
        const degradation = Math.min(newTime * 0.2, severityScore);
        const baseDefective = 85 - degradation + (Math.random() * volatility - (volatility / 2));
        
        const newData = [...prev, {
          time: newTime,
          normal: Math.max(0, Math.min(100, baseNormal)),
          defective: Math.max(0, Math.min(100, baseDefective))
        }];
        
        if (newData.length > 15) newData.shift();
        return newData;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [machineData.Severity]);

  const currentNormal = data.length > 0 ? data[data.length - 1].normal.toFixed(1) : 0;
  const currentDefective = data.length > 0 ? data[data.length - 1].defective.toFixed(1) : 0;
  
  // Base vibration stats for UI
  const estVibNorm = 1.2 + Math.random() * 0.3;
  const estVibDef = 5.5 + Math.random() * 3.5;

  return (
    <div className="simulation-comparison fade-in" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid var(--alert-color)', marginBottom: '32px' }}>
      <div className="comparison-header" style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.8rem', color: '#fff', margin: 0 }}>
            {machineData.MachineID} | <span style={{color: 'var(--text-muted)'}}>{machineData.Sector}</span>
          </h3>
          <p style={{ color: 'var(--alert-color)', margin: '4px 0 0 0', fontWeight: 'bold' }}>{machineData.Severity}</p>
        </div>
        <div style={{ maxWidth: '400px', fontSize: '0.95rem', color: 'var(--text-main)', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--alert-color)' }}>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            {machineData.Issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
          </ul>
        </div>
      </div>

      <div className="comparison-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
        {/* Normal Form */}
        <div className="machine-panel glass-panel" style={{ padding: 0 }}>
          <div className="panel-header" style={{ borderBottomColor: 'var(--success-color)' }}>
            <h3><Zap color="var(--success-color)" size={18}/> Referência (Saudável)</h3>
            <span className="status-badge success">Online</span>
          </div>
          
          <div className="canvas-container" style={{ height: '280px' }}>
            <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
              <Environment preset="city" />
              <Machine3D sector={machineData.Sector} isDefective={false} performanceMultiplier={1} />
              <ContactShadows position={[0, -0.99, 0]} opacity={0.4} scale={10} blur={2} far={4} />
              <OrbitControls autoRotate autoRotateSpeed={0.5} enableZoom={false} />
            </Canvas>
          </div>

          <div className="stats-container" style={{ padding: '12px' }}>
             <div className="stat-card"><span>Eficiência OEE</span><strong>{currentNormal}%</strong></div>
             <div className="stat-card"><span>Vibração</span><strong>{estVibNorm.toFixed(1)} mm/s</strong></div>
          </div>
        </div>

        {/* Defective Form */}
        <div className="machine-panel glass-panel" style={{ padding: 0 }}>
          <div className="panel-header" style={{ borderBottomColor: 'var(--alert-color)' }}>
            <h3><ServerCrash color="var(--alert-color)" size={18}/> Condição Atualizada</h3>
            <span className="status-badge danger">Alerta</span>
          </div>

          <div className="canvas-container defective-canvas" style={{ height: '280px' }}>
            <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
              <ambientLight intensity={0.2} />
              <directionalLight position={[10, 10, 5]} intensity={2} color="#ffaa00" />
              <spotLight position={[-5, 5, 0]} intensity={5} color="#ef4444" distance={20} angle={0.5} />
              <Environment preset="night" />
              <Machine3D sector={machineData.Sector} isDefective={true} performanceMultiplier={0.7} />
              <ContactShadows position={[0, -0.99, 0]} opacity={0.8} scale={10} blur={1} far={4} color="#000000" />
              <OrbitControls autoRotate autoRotateSpeed={0.2} enableZoom={false} />
            </Canvas>
          </div>

          <div className="stats-container" style={{ padding: '12px' }}>
            <div className="stat-card warning-state"><span>Eficiência OEE</span><strong>{currentDefective}%</strong></div>
            <div className="stat-card danger-state"><span>Vibração</span><strong>{estVibDef.toFixed(1)} mm/s</strong></div>
          </div>
        </div>
      </div>

      <div style={{ height: '180px', marginTop: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--success-color)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--success-color)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDefective" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--alert-color)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--alert-color)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 110]} stroke="var(--text-muted)" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }} />
            <Area type="monotone" dataKey="normal" name="Saudável" stroke="var(--success-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorNormal)" />
            <Area type="monotone" dataKey="defective" name="Defeituosa" stroke="var(--alert-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorDefective)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

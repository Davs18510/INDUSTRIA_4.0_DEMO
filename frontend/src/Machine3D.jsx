import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Torus } from '@react-three/drei';

function DefaultMachine({ isDefective, performanceMultiplier, bodyColor, glowColor }) {
  const mainRotor = useRef();
  const arm1 = useRef();
  const arm2 = useRef();
  const indicator = useRef();

  useFrame((state, delta) => {
    if (mainRotor.current) {
      if (isDefective) {
        mainRotor.current.rotation.y += delta * 1.5 * performanceMultiplier;
        mainRotor.current.rotation.x = Math.sin(state.clock.elapsedTime * 20) * 0.05;
      } else {
        mainRotor.current.rotation.y += delta * 4 * performanceMultiplier;
      }
    }
    if (arm1.current && arm2.current) {
      const speed = isDefective ? 2 : 5;
      const erratic = isDefective ? Math.sin(state.clock.elapsedTime * 40) * 0.1 : 0;
      arm1.current.position.y = Math.sin(state.clock.elapsedTime * speed) * 0.5 + 2 + erratic;
      arm2.current.position.y = Math.cos(state.clock.elapsedTime * speed) * 0.5 + 2 + erratic;
    }
    if (indicator.current) {
      indicator.current.material.emissiveIntensity = isDefective 
        ? Math.abs(Math.sin(state.clock.elapsedTime * 5)) * 2 
        : 0.5 + Math.abs(Math.sin(state.clock.elapsedTime)) * 0.5;
    }
  });

  return (
    <group position={[0, -1, 0]}>
      <Box args={[3, 1, 3]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color={bodyColor} roughness={0.7} metalness={0.2} />
      </Box>
      <Cylinder args={[1.2, 1.4, 2, 32]} position={[0, 2, 0]}>
        <meshStandardMaterial color={'#0f172a'} roughness={0.6} metalness={0.5} />
      </Cylinder>
      <Cylinder ref={mainRotor} args={[0.5, 1, 1.5, 32]} position={[0, 3.5, 0]}>
        <meshStandardMaterial color={'#94a3b8'} metalness={0.8} roughness={0.2} />
      </Cylinder>
      <Cylinder ref={arm1} args={[0.1, 0.1, 1.5, 16]} position={[-1, 2, 1]}>
        <meshStandardMaterial color={'#334155'} metalness={0.9} />
      </Cylinder>
      <Cylinder ref={arm2} args={[0.1, 0.1, 1.5, 16]} position={[1, 2, -1]}>
        <meshStandardMaterial color={'#334155'} metalness={0.9} />
      </Cylinder>
      <Sphere ref={indicator} args={[0.2, 16, 16]} position={[0, 4.5, 0]}>
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={1} toneMapped={false} />
      </Sphere>
    </group>
  );
}

function RoboticArmMachine({ isDefective, performanceMultiplier, bodyColor, glowColor }) {
  const baseRotation = useRef();
  const armJoint = useRef();
  const indicator = useRef();

  useFrame((state, delta) => {
    const speed = isDefective ? 1 : 3;
    const erratic = isDefective ? Math.sin(state.clock.elapsedTime * 35) * 0.05 : 0;
    
    if (baseRotation.current) {
      baseRotation.current.rotation.y = Math.sin(state.clock.elapsedTime * speed) * 1.5 + erratic;
    }
    if (armJoint.current) {
      armJoint.current.rotation.z = Math.cos(state.clock.elapsedTime * speed) * 0.5 + erratic;
    }
    if (indicator.current) {
      indicator.current.material.emissiveIntensity = isDefective ? Math.abs(Math.sin(state.clock.elapsedTime * 5)) * 2 : 1;
    }
  });

  return (
    <group position={[0, -1, 0]}>
      <Cylinder args={[1.5, 1.8, 0.5, 32]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color={bodyColor} roughness={0.7} metalness={0.3} />
      </Cylinder>
      <group ref={baseRotation} position={[0, 0.5, 0]}>
        <Box args={[0.8, 2, 0.8]} position={[0, 1, 0]}>
          <meshStandardMaterial color={'#e2e8f0'} metalness={0.6} />
        </Box>
        <group ref={armJoint} position={[0, 2, 0]}>
          <Box args={[0.5, 2.5, 0.5]} position={[0, 1.25, 0]}>
            <meshStandardMaterial color={'#f1f5f9'} metalness={0.8} />
          </Box>
          <Sphere ref={indicator} args={[0.15, 16, 16]} position={[0, 2.6, 0.25]}>
            <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={1} toneMapped={false} />
          </Sphere>
        </group>
      </group>
    </group>
  );
}

function FurnaceMachine({ isDefective, performanceMultiplier, bodyColor, glowColor }) {
  const innerGlow = useRef();
  const lid = useRef();

  useFrame((state) => {
    if (innerGlow.current) {
      innerGlow.current.material.emissiveIntensity = isDefective 
        ? 0.5 + Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 2 
        : 2 + Math.sin(state.clock.elapsedTime * 2);
    }
    if (lid.current && isDefective) {
      lid.current.position.y = 2.5 + Math.sin(state.clock.elapsedTime * 40) * 0.05;
      lid.current.rotation.x = Math.sin(state.clock.elapsedTime * 50) * 0.02;
    } else if (lid.current) {
      lid.current.position.y = 2.5;
      lid.current.rotation.x = 0;
    }
  });

  return (
    <group position={[0, -1, 0]}>
      <Sphere args={[1.8, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 0.5, 0]} rotation={[Math.PI, 0, 0]}>
        <meshStandardMaterial color={bodyColor} roughness={0.9} />
      </Sphere>
      <Cylinder args={[1.8, 1.8, 2, 32]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color={'#1e293b'} roughness={0.8} />
      </Cylinder>
      <Torus args={[1.85, 0.1, 16, 32]} position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={'#cbd5e1'} metalness={0.9} />
      </Torus>
      <Cylinder ref={lid} args={[1.8, 1.8, 0.2, 32]} position={[0, 2.5, 0]}>
        <meshStandardMaterial color={'#334155'} metalness={0.6} />
      </Cylinder>
      <Sphere ref={innerGlow} args={[0.5, 16, 16]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color={isDefective ? '#ef4444' : '#f97316'} emissive={isDefective ? '#ef4444' : '#f97316'} />
      </Sphere>
    </group>
  );
}

export default function Machine3D({ sector = 'Usinagem', isDefective = false, performanceMultiplier = 1 }) {
  const bodyColor = '#1e293b';
  const glowColor = isDefective ? '#ef4444' : '#10b981';

  let MachineModel = DefaultMachine;
  
  // Choose model based on sector
  if (['Montagem', 'Pintura', 'Qualidade'].includes(sector)) {
    MachineModel = RoboticArmMachine;
  } else if (['Fundição', 'Soldagem'].includes(sector)) {
    MachineModel = FurnaceMachine;
  } else {
    MachineModel = DefaultMachine; // Usinagem, Embalagem, Logística
  }

  return (
    <group>
      <MachineModel 
        isDefective={isDefective} 
        performanceMultiplier={performanceMultiplier} 
        bodyColor={bodyColor} 
        glowColor={glowColor} 
      />
      {isDefective && (
        <group position={[0, 1.5, 0]}>
          <Box args={[0.05, 0.3, 0.05]} position={[1, 0, 1]} rotation={[0, 0, 0.5]}>
            <meshBasicMaterial color="#ef4444" />
          </Box>
          <Box args={[0.05, 0.2, 0.05]} position={[-1, -0.5, -1]} rotation={[0.5, 0, -0.5]}>
            <meshBasicMaterial color="#f59e0b" />
          </Box>
        </group>
      )}
    </group>
  );
}

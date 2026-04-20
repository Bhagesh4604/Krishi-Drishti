import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Database, Server, Lock, Cpu, Globe } from 'lucide-react';
import { systemService } from '../src/services/api';

export default function ScrollConnection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"]
  });

  // Scale the center node
  const scale = useTransform(scrollYProgress, [0, 1], [0.5, 1.5]);
  // Opacity of surrounding nodes
  const opacity = useTransform(scrollYProgress, [0.5, 1], [0, 1]);
  // Stroke Dasharray for lines
  const pathLength = useTransform(scrollYProgress, [0.4, 1], [0, 1]);

  const [statuses, setStatuses] = useState<Record<string, 'verified'|'error'|'pending'>>({
    'db-sync': 'pending', 'auth-layer': 'pending', 'model-inference': 'verified', 'api-gateway': 'pending'
  });

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const telemetry = await systemService.getTelemetry();
        const newStatuses: any = { ...statuses };
        telemetry.forEach((t: any) => {
          newStatuses[t.id] = t.status;
        });
        setStatuses(newStatuses);
      } catch (e) {
        console.error('Failed to fetch telemetry for connectivity', e);
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  const nodes = [
    { id: 1, key: 'db-sync', icon: Database, label: "Database Sync", x: 100, y: 50 },
    { id: 2, key: 'auth-layer', icon: Lock, label: "Auth Layer", x: 300, y: 50 },
    { id: 3, key: 'model-inference', icon: Cpu, label: "ML Inference", x: 100, y: 250 },
    { id: 4, key: 'api-gateway', icon: Globe, label: "API Gateway", x: 300, y: 250 }
  ];

  return (
    <section ref={containerRef} style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf8f3', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 40, width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontSize: 34, fontWeight: 900, color: '#262626', fontFamily: "'League Spartan', sans-serif" }}>SYSTEM TOPOLOGY</h2>
        <p style={{ color: 'rgba(38,38,38,0.5)', fontFamily: "'League Spartan', sans-serif" }}>Scroll to visualize real-time connectivity</p>
      </div>

      <div style={{ position: 'relative', width: 400, height: 300 }}>
        {/* SVG lines */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
          {nodes.map(node => {
            const isVerified = statuses[node.key] === 'verified';
            const strokeColor = isVerified ? '#10b981' : (statuses[node.key] === 'error' ? '#ef4444' : '#e4a4bd');
            return (
              <motion.line
                key={`line-${node.id}`}
                x1="200"
                y1="150"
                x2={node.x}
                y2={node.y}
                stroke={strokeColor}
                strokeWidth={isVerified ? "3" : "2"}
                style={{ pathLength }}
                animate={{
                  stroke: strokeColor,
                  strokeWidth: isVerified ? 3 : 2
                }}
                transition={{ duration: 0.5 }}
              />
            );
          })}
        </svg>

        {/* Center Node */}
        <motion.div
          style={{
            position: 'absolute',
            top: 150 - 40,
            left: 200 - 40,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#262626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            scale,
            zIndex: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}
        >
          <Server color="#e4a4bd" size={30} />
        </motion.div>

        {/* Surrounding Nodes */}
        {nodes.map(node => {
          const isVerified = statuses[node.key] === 'verified';
          const borderColor = isVerified ? '#10b981' : (statuses[node.key] === 'error' ? '#ef4444' : '#e4a4bd');
          return (
            <motion.div
              key={node.id}
              style={{
                position: 'absolute',
                top: node.y - 30,
                left: node.x - 30,
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity,
                zIndex: 5,
                border: `2px solid ${borderColor}`,
                boxShadow: isVerified ? '0 0 15px rgba(16,185,129,0.3)' : 'none'
              }}
              animate={{
                borderColor,
                boxShadow: isVerified ? '0 0 15px rgba(16,185,129,0.3)' : 'none'
              }}
              transition={{ duration: 0.5 }}
            >
              <node.icon color={borderColor} size={24} />
              <div style={{ position: 'absolute', bottom: -24, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', color: '#262626' }}>
                {node.label}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

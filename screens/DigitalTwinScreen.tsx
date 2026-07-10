import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Grid3x3, Droplet, Sprout, ShieldAlert, Plus, MapPin } from 'lucide-react';
import { useLanguage } from '../src/context/LanguageContext';

interface DigitalTwinScreenProps {
  navigateTo: (screen: string) => void;
}

// Simple grid-based coordinate system (5x5 grid representing the farm)
type GridCell = {
  id: string;
  x: number;
  y: number;
  crop: string | null;
  status: 'healthy' | 'needs_water' | 'pest_alert' | 'empty';
};

const INITIAL_GRID: GridCell[] = Array.from({ length: 25 }, (_, i) => ({
  id: `cell-${i}`,
  x: i % 5,
  y: Math.floor(i / 5),
  crop: null,
  status: 'empty'
}));

// Pre-fill a few cells for demonstration
INITIAL_GRID[6] = { ...INITIAL_GRID[6], crop: 'Wheat', status: 'healthy' };
INITIAL_GRID[7] = { ...INITIAL_GRID[7], crop: 'Wheat', status: 'healthy' };
INITIAL_GRID[12] = { ...INITIAL_GRID[12], crop: 'Rice', status: 'needs_water' };
INITIAL_GRID[13] = { ...INITIAL_GRID[13], crop: 'Rice', status: 'pest_alert' };

const STATUS_COLORS = {
  empty: 'bg-gray-100 border-gray-200',
  healthy: 'bg-green-100 border-green-300 text-green-700',
  needs_water: 'bg-blue-100 border-blue-300 text-blue-700',
  pest_alert: 'bg-red-100 border-red-300 text-red-700'
};

const DigitalTwinScreen: React.FC<DigitalTwinScreenProps> = ({ navigateTo }) => {
  const { t } = useLanguage();
  const [grid, setGrid] = useState<GridCell[]>(INITIAL_GRID);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);

  const handleCellClick = (cell: GridCell) => {
    setSelectedCell(cell);
  };

  const assignCrop = (cropName: string) => {
    if (!selectedCell) return;
    setGrid(prev => prev.map(c => 
      c.id === selectedCell.id ? { ...c, crop: cropName, status: 'healthy' } : c
    ));
    setSelectedCell(null);
  };

  const clearCell = () => {
    if (!selectedCell) return;
    setGrid(prev => prev.map(c => 
      c.id === selectedCell.id ? { ...c, crop: null, status: 'empty' } : c
    ));
    setSelectedCell(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 pt-12 pb-6 px-6 text-white shadow-md relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigateTo('home')}
            className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-2xl font-bold">{t('digital_twin')}</h1>
        </div>
        <p className="text-emerald-50 opacity-90 text-sm flex items-center gap-2">
          <Grid3x3 className="w-4 h-4" /> 2D Interactive Farm Layout
        </p>
      </div>

      <div className="flex-1 p-6 flex flex-col">
        {/* Legend */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
            <div className="w-3 h-3 rounded-full bg-green-400"></div> Healthy
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div> Needs Water
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
            <div className="w-3 h-3 rounded-full bg-red-400"></div> Alert
          </div>
        </div>

        {/* 2D Grid */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-200 mb-6 mx-auto w-full max-w-sm">
          <div className="grid grid-cols-5 gap-2 aspect-square">
            {grid.map(cell => (
              <motion.button
                key={cell.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleCellClick(cell)}
                className={`
                  relative rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1
                  ${STATUS_COLORS[cell.status]}
                  ${selectedCell?.id === cell.id ? 'ring-4 ring-emerald-500 ring-opacity-50 scale-105 z-10' : ''}
                `}
              >
                {cell.crop ? (
                  <>
                    {cell.status === 'needs_water' && <Droplet className="w-4 h-4 absolute top-1 right-1 text-blue-500" />}
                    {cell.status === 'pest_alert' && <ShieldAlert className="w-4 h-4 absolute top-1 right-1 text-red-500 animate-pulse" />}
                    {cell.status === 'healthy' && <Sprout className="w-5 h-5 opacity-80" />}
                    <span className="text-[10px] font-bold leading-tight">{cell.crop.substring(0,3)}</span>
                  </>
                ) : (
                  <Plus className="w-4 h-4 text-gray-300" />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Selected Cell Action Panel */}
        {selectedCell && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mt-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                Zone ({selectedCell.x}, {selectedCell.y})
              </h3>
              {selectedCell.crop && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  selectedCell.status === 'needs_water' ? 'bg-blue-100 text-blue-700' :
                  selectedCell.status === 'pest_alert' ? 'bg-red-100 text-red-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {selectedCell.status.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>

            {selectedCell.crop ? (
              <div className="space-y-3">
                <p className="text-gray-600 font-medium text-sm mb-4">
                  Currently growing: <strong className="text-gray-900">{selectedCell.crop}</strong>
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigateTo('smart-irrigation')}
                    className="flex-1 bg-blue-50 text-blue-600 font-bold py-3 rounded-xl border border-blue-100 flex items-center justify-center gap-2"
                  >
                    <Droplet className="w-4 h-4" /> Irrigate
                  </button>
                  <button 
                    onClick={clearCell}
                    className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl border border-red-100"
                  >
                    Clear Zone
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-3">Assign a crop to this zone:</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Rice', 'Wheat', 'Cotton', 'Maize', 'Tomato'].map(crop => (
                    <button
                      key={crop}
                      onClick={() => assignCrop(crop)}
                      className="bg-gray-50 border border-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                    >
                      {crop}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DigitalTwinScreen;

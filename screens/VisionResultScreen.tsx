import React, { useState, useEffect } from 'react';
import { Screen, Language, VisionMode } from '../types';
import { ArrowLeft, Leaf, Droplets, ThermometerSun, AlertCircle, CheckCircle2, ChevronRight, Download, Share2 } from 'lucide-react';
import { aiService } from '../src/services/api';

interface VisionResultScreenProps {
  navigateTo: (screen: Screen) => void;
  image: string | null;
  mode: VisionMode;
  language: Language;
  t: any;
}

const VisionResultScreen: React.FC<VisionResultScreenProps> = ({ navigateTo, image, mode, language, t }) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  useEffect(() => {
    const analyzeImage = async () => {
      if (!image) return;
      try {
        setLoading(true);
        const blob = dataURItoBlob(image);
        const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
        const data = await aiService.diagnose(file, mode);
        
        setResult(data);
      } catch (e) {
        // Mock fallback on hard failure
        setResult({
          diagnosis: 'Connection Failed',
          confidence: 0,
          summary: 'Could not connect to the Krishi-Drishti AI backend. Please ensure the server is running.',
          health_score: 0,
          remedies: []
        });
      } finally {
        setLoading(false);
      }
    };
    analyzeImage();
  }, [image, mode]);

  const isHealthy = result?.diagnosis?.toLowerCase().includes('healthy') || (result?.health_score && result?.health_score >= 80);

  const handleDownload = () => {
    if (!result) return;
    const textContent = `Krishi-Drishti Analysis Report\nDate: ${new Date().toLocaleDateString()}\n\nDiagnosis: ${result.diagnosis}\nConfidence: ${result.confidence}%\nHealth Score: ${result.health_score}%\n\nSummary:\n${result.summary}\n\nRecommended Protocol:\n${result.remedies?.map((r: any, i: number) => `${i + 1}. ${r.title} (${r.type})\n${r.desc}`).join('\n\n') || 'None'}`;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krishi-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `Krishi-Drishti detected ${result.diagnosis} with ${result.health_score}% health.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Crop Analysis Report',
          text: text,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      alert("Sharing is not supported on this browser.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col text-gray-900 pb-24">
      
      {/* ── HEADER ── */}
      <header className="bg-white px-4 pt-12 pb-4 shadow-sm flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('vision')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Analysis Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
            <Download size={18} />
          </button>
          <button onClick={handleShare} className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
            <Share2 size={18} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mb-6" />
          <h2 className="text-xl font-semibold text-gray-900">Analyzing Sample</h2>
          <p className="text-gray-500 mt-2 text-center max-w-xs">Our agronomy model is currently processing the image data to identify potential issues.</p>
        </div>
      ) : result && (
        <div className="flex-1">
          
          {/* ── SCANNED IMAGE THUMBNAIL ── */}
          <div className="p-4">
            <div className="w-full h-48 bg-gray-200 rounded-2xl overflow-hidden shadow-sm relative">
              {image && <img src={image} className="w-full h-full object-cover" alt="Scanned crop" />}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-xs font-semibold shadow-sm">
                Captured {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* ── DIAGNOSIS CARD ── */}
          <div className="px-4 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-3">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold ${isHealthy ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {isHealthy ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {isHealthy ? 'Condition: Optimal' : 'Action Recommended'}
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-bold text-gray-900 leading-none">{result.confidence || 0}%</span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Confidence</span>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
                {result.diagnosis || 'Unknown Condition'}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {result.summary || 'No detailed summary provided.'}
              </p>
            </div>
          </div>

          {/* ── METRICS GRID ── */}
          <div className="px-4 mb-8 grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-2">
                <Leaf size={20} />
              </div>
              <span className="text-xl font-bold text-gray-900">{result.health_score || 0}%</span>
              <span className="text-xs font-medium text-gray-500 mt-0.5">Crop Health</span>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Droplets size={20} />
              </div>
              <span className="text-lg font-bold text-gray-900">Fair</span>
              <span className="text-xs font-medium text-gray-500 mt-0.5">Hydration</span>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-2">
                <ThermometerSun size={20} />
              </div>
              <span className="text-lg font-bold text-gray-900">Optimal</span>
              <span className="text-xs font-medium text-gray-500 mt-0.5">Climate</span>
            </div>
          </div>

          {/* ── RECOMMENDED ACTIONS ── */}
          {result.remedies && result.remedies.length > 0 && (
            <div className="px-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recommended Protocol</h3>
              <div className="space-y-3">
                {result.remedies.map((remedy: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center shrink-0 mt-0.5 text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 text-base">{remedy.title || remedy.name}</h4>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${remedy.type === 'organic' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                          {remedy.type || 'Standard'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {remedy.desc || remedy.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM ACTION BAR ── */}
      {!loading && result && (
        <div className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 z-30">
          <button onClick={() => navigateTo('chat', { initialMessage: `I just scanned my crop and it was diagnosed with ${result.diagnosis} (Health: ${result.health_score}%). Can you explain exactly what causes this and what my immediate next steps should be?` })} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-4 font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors">
            Consult Agronomist AI
            <ChevronRight size={18} />
          </button>
        </div>
      )}

    </div>
  );
};

export default VisionResultScreen;

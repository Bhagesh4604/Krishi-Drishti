import React, { useState, useEffect } from 'react';
import { Screen, Language, VisionMode } from '../types';
import { ArrowLeft, Leaf, AlertCircle, CheckCircle2, ChevronRight, Download, Share2, RefreshCw, RotateCcw, Camera } from 'lucide-react';
import { aiService } from '../src/services/api';
import { imageWorkerClient } from '../src/utils/imageWorkerClient';

interface VisionResultScreenProps {
  navigateTo: (screen: Screen) => void;
  image: string | null;
  mode: VisionMode;
  language: Language;
  t: any;
  cropType?: string;
  growthStage?: string;
  symptoms?: string;
}

const VisionResultScreen: React.FC<VisionResultScreenProps> = ({ navigateTo, image, mode, language, t, cropType = '', growthStage = '', symptoms = '' }) => {
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyzeImage = async () => {
    if (!image) return;
    try {
      setLoading(true);
      // Offload Base64 decoding & Blob creation to Web Worker background thread
      const blob = await imageWorkerClient.dataUriToBlob(image);
      const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
      const data = await aiService.diagnose(file, mode, { cropType, growthStage, symptoms });
      
      setResult(data);
    } catch (e: any) {
      const isAuthError = e?.response?.status === 401;
      const isTimeout = e?.code === 'ECONNABORTED' || e?.message?.includes('timeout');
      
      let summaryText = 'Could not connect to the Krishi-Drishti AI backend. Please ensure your internet connection is active and tap Retry.';
      if (isAuthError) {
        summaryText = 'Your session may have expired. You can retry immediately or re-login if required.';
      } else if (isTimeout) {
        summaryText = 'The AI server is waking up from standby (Render cold-start). Please tap Retry in a few seconds.';
      }

      setResult({
        diagnosis: 'Connection Failed',
        confidence: 0,
        summary: summaryText,
        health_score: 0,
        remedies: [],
        isError: true,
      });
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    analyzeImage();
  }, [image, mode]);

  const needsReview = result?.analysis_status === 'needs_review'
    || result?.confidence_level === 'low'
    || (typeof result?.confidence === 'number' && result.confidence < 35)
    || result?.isError
    || result?.diagnosis === 'Connection Failed';
  const isHealthy = !needsReview && result?.diagnosis?.toLowerCase().includes('healthy');
  const certaintyLabel = needsReview
    ? 'Low — rescan'
    : result?.confidence_level === 'high'
      ? 'High (AI estimate)'
      : result?.confidence_level === 'moderate'
        ? 'Moderate (AI estimate)'
        : 'Screening only';

  const handleDownload = () => {
    if (!result) return;
    const textContent = `Krishi-Drishti Crop Screening\nDate: ${new Date().toLocaleDateString()}\nCrop reported: ${cropType || 'Not provided'}\nSymptoms reported: ${symptoms || 'Not provided'}\n\nScreening result: ${result.diagnosis}\nAI certainty band: ${certaintyLabel}\n\nSummary:\n${result.summary}\n\nVisible signs:\n${result.observed_symptoms?.join(', ') || 'Not recorded'}\n\nNext steps:\n${result.next_steps?.join('\n') || 'Confirm with a local agronomist before treatment.'}`;
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
    const text = `Krishi-Drishti crop screening: ${result.diagnosis}. ${result.summary} This is an AI screening result, not a confirmed diagnosis.`;
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
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold ${needsReview ? 'bg-amber-50 text-amber-800' : isHealthy ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                  {isHealthy ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {needsReview ? 'Needs clearer photo' : isHealthy ? 'Possible healthy match' : 'Possible finding'}
                </div>
                <div className="text-right">
                  <span className="block text-xs font-bold text-gray-900 leading-tight">{certaintyLabel}</span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Not a validated probability</span>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
                {result.diagnosis || 'Unknown Condition'}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {result.summary || 'No detailed summary provided.'}
              </p>
              <p className="mt-3 text-[11px] text-gray-400">
                {result.analysis_method || 'AI vision'} screening · certainty is not a validated probability
              </p>

              {needsReview && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <strong>No reliable diagnosis was made.</strong> Try a sharp close-up in daylight, include the leaf underside, and avoid spraying based on this result.
                  {Array.isArray(result.next_steps) && result.next_steps.length > 0 && (
                    <p className="mt-2">{result.next_steps[0]}</p>
                  )}
                </div>
              )}

              {(result.isError || result.diagnosis === 'Connection Failed') && (
                <div className="mt-4 pt-3 border-t border-red-100 flex items-center gap-3">
                  <button
                    onClick={() => { setRetrying(true); analyzeImage(); }}
                    disabled={loading || retrying}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
                    {retrying ? 'Retrying...' : 'Retry Analysis'}
                  </button>
                  <button
                    onClick={() => navigateTo('vision')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={16} />
                    Rescan
                  </button>
                </div>
              )}
            </div>
          </div>

          {Array.isArray(result.differential_diagnoses) && result.differential_diagnoses.length > 0 && (
            <div className="px-4 mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Other possibilities to check</h3>
                <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
                  {result.differential_diagnoses.slice(0, 3).map((item: string, index: number) => <li key={index}>{item}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* ── METRICS GRID ── */}
          <div className="px-4 mb-8 grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-green-700 mb-2"><Leaf size={18} /><span className="text-xs font-semibold uppercase tracking-wide">Crop</span></div>
              <span className="text-sm font-semibold text-gray-900">{result.crop_identification || cropType || 'Not identified'}</span>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-blue-700 mb-2"><Camera size={18} /><span className="text-xs font-semibold uppercase tracking-wide">Photo quality</span></div>
              <span className="text-sm font-semibold text-gray-900 capitalize">{result.image_quality || 'Not assessed'}</span>
            </div>
            <div className="col-span-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Visible signs</span>
              <span className="text-sm text-gray-800">{result.observed_symptoms?.length ? result.observed_symptoms.join(', ') : 'No visual signs were recorded.'}</span>
              {symptoms && <p className="mt-2 text-xs text-gray-500">Your note: {symptoms}</p>}
              {growthStage && <p className="mt-1 text-xs text-gray-500">Growth stage: {growthStage}</p>}
            </div>
          </div>

          {/* ── RECOMMENDED ACTIONS ── */}
          {!needsReview && result.remedies && result.remedies.length > 0 && (
            <div className="px-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Suggested next steps</h3>
              <p className="text-xs text-gray-500 mb-4">Screening guidance only. Confirm the cause locally before using a treatment.</p>
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
          {needsReview ? (
            <div className="flex gap-3">
              <button
                onClick={() => navigateTo('vision')}
                className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw size={16} />
                Retake
              </button>
              <button
                onClick={() => { setRetrying(true); analyzeImage(); }}
                disabled={loading || retrying}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3.5 font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
                {retrying ? 'Connecting to AI...' : 'Retry Analysis'}
              </button>
            </div>
          ) : (
              <button onClick={() => navigateTo('chat', { initialMessage: `Help me review this crop photo screening. Crop: ${cropType || 'not provided'}. Growth stage: ${growthStage || 'not provided'}. Farmer-noted symptoms: ${symptoms || 'not provided'}. AI screening result: ${result.diagnosis}. Summary: ${result.summary}. Please explain likely alternatives and what field observations would help confirm the cause. Do not treat the AI result as confirmed.` })} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-4 font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors">
              Review with Agronomist AI
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      )}

    </div>
  );
};

export default VisionResultScreen;

import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Leaf, Loader2, MapPin } from 'lucide-react';
import { carbonService, plotService } from '../src/services/api';

const CarbonWalletCard: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'preview'>('idle');
    const [analysis, setAnalysis] = useState<any | null>(null);
    const [userPlot, setUserPlot] = useState<any | null>(null);

    useEffect(() => {
        const fetchPlot = async () => {
            try {
                const plots = await plotService.getPlots();
                if (plots.length > 0) {
                    setUserPlot(plots[0]);
                }
            } catch (error) {
                console.error('Failed to fetch plots', error);
            }
        };

        fetchPlot();
    }, []);

    const handleAudit = async () => {
        if (!userPlot) {
            alert("No farm detected. Please locate your farm boundary first.");
            return;
        }

        setStatus('analyzing');
        try {
            const response = await carbonService.monitorPlot(userPlot.id, 'Cover-Crop');
            setAnalysis(response.analysis);
            setStatus('preview');
        } catch (error) {
            console.error(error);
            alert('Analysis failed. Please try again.');
            setStatus('idle');
        }
    };

    const balance = analysis?.carbon?.gross_credits ?? 0;
    const issuable = analysis?.carbon?.issuable_credits ?? 0;
    const farmerShare = issuable * 0.8;
    const aggregatorFee = issuable * 0.2;

    return (
        <div className="bg-white rounded-3xl p-6 relative overflow-hidden border border-green-50 shadow-sm my-4">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-green-50 rounded-full z-0" />

            <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                    <Leaf size={24} className="text-green-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Carbon Earnings</h3>
                    <p className="text-xs text-gray-500 font-medium">Earth Engine preview</p>
                </div>

                <div className={`ml-auto flex items-center gap-1 px-3 py-1 rounded-full ${analysis?.carbon?.eligible ? 'bg-green-100 text-green-800' : 'bg-orange-50 text-orange-700'}`}>
                    {analysis?.carbon?.eligible ? (
                        <>
                            <CheckCircle size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Eligible</span>
                        </>
                    ) : (
                        <>
                            <Clock size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Preview</span>
                        </>
                    )}
                </div>
            </div>

            {status === 'analyzing' && (
                <div className="mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-3 text-sm font-bold text-gray-600">
                    <Loader2 className="animate-spin text-green-600" size={18} />
                    Running Earth Engine monitoring...
                </div>
            )}

            {status === 'preview' && analysis && (
                <div className="space-y-3 mb-4">
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                        <h4 className="text-sm font-bold text-gray-900 mb-2">Satellite Analysis Report</h4>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">NDVI change:</span>
                            <span className={`font-bold ${analysis.monitoring.ndvi_change >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {analysis.monitoring.ndvi_change >= 0 ? '+' : ''}{analysis.monitoring.ndvi_change?.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">Boundary area:</span>
                            <span className="font-bold text-green-700">{analysis.area_hectares} ha</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Issuable after buffer:</span>
                            <span className="font-bold text-green-700">{issuable.toFixed(2)} ACT</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Farmer share estimate:</span>
                            <span className="font-bold text-green-700">{farmerShare.toFixed(2)} ACT</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Platform fee estimate:</span>
                            <span className="font-bold text-green-700">{aggregatorFee.toFixed(2)} ACT</span>
                        </div>
                    </div>

                    {analysis.risk_flags?.[0] && (
                        <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 text-xs text-orange-800">
                            {analysis.risk_flags[0]}
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-start mb-6 relative z-10 opacity-90">
                <span className="text-4xl font-black text-green-600">{balance.toFixed(2)}</span>
                <span className="text-base font-bold text-gray-500 ml-2 mt-3">ACT</span>
            </div>

            {!userPlot && status === 'idle' && (
                <div className="mb-4 bg-orange-50 p-3 rounded-xl border border-orange-100 text-xs text-orange-800 flex items-center gap-2">
                    <MapPin size={16} />
                    <span>Please locate your farm boundary first.</span>
                </div>
            )}

            <button
                onClick={handleAudit}
                disabled={!userPlot || status === 'analyzing'}
                className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${!userPlot || status === 'analyzing'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-green-600 text-white shadow-green-200 hover:bg-green-700'
                    }`}
            >
                {status === 'analyzing' ? 'Monitoring...' : status === 'preview' ? 'Refresh Earth Engine Audit' : 'Start Earth Engine Audit'}
            </button>
        </div>
    );
};

export default CarbonWalletCard;

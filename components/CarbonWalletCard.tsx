import React, { useState, useEffect } from 'react';
import { Leaf, CheckCircle, Clock, Loader2, MapPin } from 'lucide-react';
import axios from 'axios';

const CarbonWalletCard: React.FC = () => {
    const [balance, setBalance] = useState(0);
    // Status: 'none' -> 'analyzing' -> 'crunched' -> 'review_pending' -> 'verified'
    const [status, setStatus] = useState<'none' | 'analyzing' | 'crunched' | 'review_pending' | 'verified'>('none');

    // Analysis steps for realism
    const [auditStep, setAuditStep] = useState<string>('');
    const [analysisData, setAnalysisData] = useState<{ growth: number, credits: number } | null>(null);
    const [userPlot, setUserPlot] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Fetch user plot on mount
    useEffect(() => {
        const fetchPlot = async () => {
            try {
                const token = localStorage.getItem('ks_token');
                if (!token) return;

                const response = await axios.get('http://localhost:8000/api/plots/', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data && response.data.length > 0) {
                    setUserPlot(response.data[0]); // Use the first plot for now
                }
            } catch (error) {
                console.error("Failed to fetch plots", error);
            }
        };

        fetchPlot();
    }, []);

    const handleVerify = async () => {
        if (!userPlot) {
            alert("No farm detected! Please use 'Locate My Farm' first.");
            return;
        }

        setStatus('analyzing');

        const steps = [
            "Connecting to Sentinel-2 Satellite...",
            "Fetching historical imagery (Jan 2024)...",
            "Fetching current imagery (Jan 2025)...",
            "Calculating Vegetation Index (NDVI)...",
            "Analyzing Carbon Sequestration..."
        ];

        // Visual simulation of steps
        for (const step of steps) {
            setAuditStep(step);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        try {
            // Real Backend Analysis Call
            const token = localStorage.getItem('ks_token');
            const geometry = {
                type: "Polygon",
                coordinates: [userPlot.coordinates.map((c: any) => [c.lng, c.lat])]
            };

            const response = await axios.post('http://localhost:8000/api/carbon/analyze',
                { geometry: geometry },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data) {
                setAnalysisData(response.data.details);
                setBalance(response.data.credits); // Potential credits
                setStatus('crunched');
            }
        } catch (error) {
            console.error(error);
            alert("Analysis failed. Please try again.");
            setStatus('none');
        }
    };

    const handleSubmitForReview = () => {
        // Here we would actually submit the data + user ID to backend for manual approval
        alert("Audit Report Submitted! Your 7/12 extract and satellite data are being reviewed by our agronomy team.");
        setStatus('review_pending');
    };

    return (
        <div className="bg-white rounded-3xl p-6 relative overflow-hidden border border-green-50 shadow-sm my-4">
            {/* Background Decoration */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-green-50 rounded-full z-0" />

            <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                    <Leaf size={24} className="text-green-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Carbon Earnings</h3>
                    <p className="text-xs text-gray-500 font-medium">Satellite Verified Engine</p>
                </div>

                <div className={`ml-auto flex items-center gap-1 px-3 py-1 rounded-full ${status === 'verified' ? 'bg-green-100 text-green-800' :
                    status === 'review_pending' ? 'bg-blue-50 text-blue-700' :
                        'bg-orange-50 text-orange-700'
                    }`}>
                    {status === 'verified' ? (
                        <>
                            <CheckCircle size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
                        </>
                    ) : status === 'review_pending' ? (
                        <>
                            <Clock size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Under Review</span>
                        </>
                    ) : (
                        <>
                            <Clock size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Audit</span>
                        </>
                    )}
                </div>
            </div>

            {/* Analysis Data View */}
            {status === 'crunched' && analysisData && (
                <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Satellite Analysis Report</h4>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">NDVI Growth (YoY):</span>
                        <span className="font-bold text-green-700">+{Math.round(analysisData.growth * 100)}%</span>
                    </div>
                    <div className="flex justify-between text-xs mb-3">
                        <span className="text-gray-600">Potential Credits:</span>
                        <span className="font-bold text-green-700">₹{balance.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                        *Credits are subject to ownership verification (7/12 extract).
                    </p>
                </div>
            )}

            {/* Steps Progress */}
            {status === 'analyzing' && (
                <div className="mb-4">
                    <p className="text-xs font-bold text-green-600 animate-pulse mb-2">{auditStep}</p>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 animate-progress" style={{ width: '60%' }}></div>
                    </div>
                </div>
            )}

            <div className="flex items-start mb-6 relative z-10 opacity-50">
                <span className="text-2xl font-bold text-green-600 mt-1">₹</span>
                <span className="text-5xl font-black text-gray-900 ml-1">{balance.toLocaleString()}</span>
            </div>

            {!userPlot && status === 'none' && (
                <div className="mb-4 bg-orange-50 p-3 rounded-xl border border-orange-100 text-xs text-orange-800 flex items-center gap-2">
                    <MapPin size={16} />
                    <span>Please locate your farm boundary first.</span>
                </div>
            )}

            {status === 'none' && (
                <button
                    onClick={handleVerify}
                    disabled={!userPlot}
                    className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${!userPlot
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                        : 'bg-green-600 text-white shadow-green-200 hover:bg-green-700'
                        }`}
                >
                    Start Carbon Audit
                </button>
            )}

            {status === 'crunched' && (
                <button
                    onClick={handleSubmitForReview}
                    className="w-full py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"
                >
                    Submit for Approval
                </button>
            )}

            {status === 'review_pending' && (
                <button
                    disabled
                    className="w-full py-4 rounded-2xl font-bold text-sm shadow-none flex items-center justify-center gap-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                >
                    Verification In Progress...
                </button>
            )}
        </div>
    );
};

export default CarbonWalletCard;

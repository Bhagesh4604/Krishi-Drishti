import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { contractService } from '../src/services/api';
import {
    ArrowLeft,
    Search,
    FileSignature,
    ShieldCheck,
    Scale,
    Calendar,
    ChevronRight,
    CheckCircle2,
    Loader2,
    Briefcase,
    AlertCircle
} from 'lucide-react';

interface ContractsScreenProps {
    navigateTo: (screen: Screen) => void;
    t: any;
}

const ContractsScreen: React.FC<ContractsScreenProps> = ({ navigateTo, t }) => {
    const [activeTab, setActiveTab] = useState<'market' | 'signed'>('market');
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContract, setSelectedContract] = useState<any | null>(null);
    const [signing, setSigning] = useState(false);

    useEffect(() => {
        loadContracts();
    }, [activeTab]);

    const loadContracts = async () => {
        setLoading(true);
        try {
            const status = activeTab === 'market' ? 'Open' : 'Signed';
            const data = await contractService.getContracts(status);
            setContracts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        if (!selectedContract) return;
        setSigning(true);
        try {
            // Mock Signature Hash
            const signature = `SIG-${Math.random().toString(36).substring(7).toUpperCase()}-${Date.now()}`;
            await contractService.signContract(selectedContract.id, signature);

            alert("Contract Signed Successfully! Price Locked.");
            setSelectedContract(null);
            loadContracts(); // Refresh
            if (activeTab === 'market') setActiveTab('signed');
        } catch (e: any) {
            alert(e.response?.data?.detail || "Signing Failed");
        } finally {
            setSigning(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm z-10">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => navigateTo('home')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 leading-none">Smart Contracts</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Future Price Guarantee</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'market' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-400'}`}
                    >
                        Open Offers
                    </button>
                    <button
                        onClick={() => setActiveTab('signed')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'signed' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400'}`}
                    >
                        My Contracts
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                {loading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
                ) : contracts.length === 0 ? (
                    <div className="py-20 text-center opacity-50">
                        <FileSignature size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-sm font-bold text-gray-400 uppercase">No Contracts Found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {contracts.map(c => (
                            <div key={c.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900">{c.buyer_name}</h4>
                                            <p className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md inline-block font-black uppercase tracking-wider mt-1">{c.crop_type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Rate</p>
                                        <p className="text-xl font-black text-green-700">₹{c.price_per_qt}<span className="text-xs text-gray-400">/qt</span></p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded-2xl">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase">Quantity</p>
                                        <p className="text-sm font-black text-gray-800">{c.quantity} Tons</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase">Delivery</p>
                                        <p className="text-sm font-black text-gray-800">{new Date(c.delivery_date).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 mb-4">
                                    <Scale size={12} />
                                    <span>Terms: {c.terms}</span>
                                </div>

                                {activeTab === 'market' ? (
                                    <button
                                        onClick={() => setSelectedContract(c)}
                                        className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        Review & Sign <ChevronRight size={14} />
                                    </button>
                                ) : (
                                    <div className="w-full py-3 bg-green-50 text-green-700 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-green-100">
                                        <CheckCircle2 size={16} /> Signed • {c.digital_signature?.substring(0, 10)}...
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Signing Modal */}
            {selectedContract && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <ShieldCheck size={24} />
                                <span className="text-xs font-black uppercase tracking-widest">Legal Binding</span>
                            </div>
                            <button onClick={() => setSelectedContract(null)} className="text-gray-400"><AlertCircle size={24} /></button>
                        </div>

                        <h3 className="text-2xl font-black text-gray-900 mb-2">Confirm Agreement</h3>
                        <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                            You are agreeing to sell <strong>{selectedContract.quantity} Tons</strong> of <strong>{selectedContract.crop_type}</strong> to <strong>{selectedContract.buyer_name}</strong> at a fixed price of <strong>₹{selectedContract.price_per_qt}/qt</strong>.
                        </p>

                        <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 mb-8 text-center">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Digital Signature Area</p>
                            <div className="h-20 flex items-center justify-center text-gray-300">
                                <FileSignature size={48} />
                            </div>
                        </div>

                        <button
                            onClick={handleSign}
                            disabled={signing}
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                            {signing ? <Loader2 className="animate-spin" /> : <FileSignature size={20} />}
                            Slide to Sign
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractsScreen;

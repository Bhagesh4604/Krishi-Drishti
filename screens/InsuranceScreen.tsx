
import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import {
    Search,
    ShieldCheck,
    Leaf,
    Umbrella,
    CloudRain,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Loader2
} from 'lucide-react';
import { insuranceService } from '../src/services/api';
import InsuranceEnrollmentModal from '../components/InsuranceEnrollmentModal';

interface InsuranceScreenProps {
    navigateTo: (screen: Screen) => void;
    t: any;
}

const InsuranceScreen: React.FC<InsuranceScreenProps> = ({ navigateTo, t }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [insurances, setInsurances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        fetchInsurances();
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchInsurances(searchQuery);
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    const fetchInsurances = async (query: string = '') => {
        try {
            setLoading(true);
            const data = await insuranceService.search(query);
            setInsurances(data);
        } catch (error) {
            console.error("Failed to fetch insurances", error);
        } finally {
            setLoading(false);
        }
    };



    const getIcon = (type: string) => {
        if (type.includes('Weather')) return CloudRain;
        if (type.includes('Crop')) return Leaf;
        if (type.includes('Livestock')) return Umbrella;
        return ShieldCheck;
    };

    const getColor = (type: string) => {
        if (type.includes('Weather')) return 'bg-blue-500';
        if (type.includes('Crop')) return 'bg-green-600';
        if (type.includes('Livestock')) return 'bg-purple-600';
        return 'bg-orange-500';
    };

    return (
        <div className="p-6 bg-slate-50 min-h-full pb-32 relative">

            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900">Insurance Hub</h2>
                <p className="text-gray-500 text-sm font-medium">Protect your harvest & livelihood.</p>
            </div>

            {/* Search */}
            <div className="relative mb-8">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={20} className="text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-4 border border-gray-200 rounded-2xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all shadow-sm"
                    placeholder="Search schemes, crops, or coverage..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Best Options List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-green-600" size={32} />
                    </div>
                ) : insurances.map((ins) => {
                    // const isEnrolled = ins.is_enrolled || enrolledIds.includes(ins.id); // Removed as enrollment logic is removed
                    const Icon = getIcon(ins.type);
                    const color = getColor(ins.type);

                    return (
                        <div key={ins.id} className="bg-white rounded-3xl p-5 shadow-lg shadow-gray-100 border border-gray-100 relative overflow-hidden group hover:border-green-200 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-2xl ${color} bg-opacity-10 flex items-center justify-center text-white ${color.replace('bg-', 'text-')}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-900 leading-tight mb-1">{ins.name}</h3>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{ins.type} • {ins.provider}</p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-5">
                                {ins.description}
                            </p>

                            <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center mb-5">
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase">Coverage (Est.)</p>
                                    <p className="text-sm font-black text-gray-900">{ins.coverage}</p>
                                </div>
                                <div className="w-px h-8 bg-gray-200"></div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-gray-400 uppercase">Premium (Approx.)</p>
                                    <p className="text-sm font-black text-green-600">{ins.premium}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => window.open(ins.link, '_blank')}
                                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest bg-gray-900 text-white shadow-xl shadow-gray-200 hover:bg-black transition-all active:scale-95"
                            >
                                Explore Scheme <ExternalLink size={16} />
                            </button>
                        </div>
                    );
                })}
                {!loading && insurances.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <AlertCircle size={48} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500 font-bold">No insurance plans found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InsuranceScreen;


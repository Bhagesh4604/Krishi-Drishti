import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, UploadCloud } from 'lucide-react';

interface InsuranceEnrollmentModalProps {
    scheme: any;
    onClose: () => void;
    onConfirm: (details: any) => Promise<void>;
}

const InsuranceEnrollmentModal: React.FC<InsuranceEnrollmentModalProps> = ({ scheme, onClose, onConfirm }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        farmerName: '',
        aadharNumber: '',
        surveyNumber: '',
        landArea: '',
        crop: scheme.crops && scheme.crops.length > 0 ? scheme.crops[0] : ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onConfirm(formData);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-green-600 p-6 flex justify-between items-start">
                    <div className="text-white">
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Application Form</p>
                        <h3 className="text-xl font-black leading-tight mt-1">{scheme.name}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Farmer Details */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Farmer Identity</label>
                            <div className="grid grid-cols-1 gap-3">
                                <input
                                    type="text"
                                    name="farmerName"
                                    required
                                    placeholder="Full Name as per Aadhar"
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={formData.farmerName}
                                    onChange={handleChange}
                                />
                                <input
                                    type="text"
                                    name="aadharNumber"
                                    required
                                    maxLength={12}
                                    placeholder="Aadhar Number (12 Digits)"
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={formData.aadharNumber}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Land Details */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-wide">Land & Crop Details</label>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    name="surveyNumber"
                                    required
                                    placeholder="Survey No."
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={formData.surveyNumber}
                                    onChange={handleChange}
                                />
                                <input
                                    type="number"
                                    name="landArea"
                                    required
                                    placeholder="Area (Ha)"
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={formData.landArea}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="relative">
                                <select
                                    name="crop"
                                    required
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={formData.crop}
                                    onChange={handleChange}
                                >
                                    <option value="" disabled>Select Insured Crop</option>
                                    {scheme.crops && scheme.crops.map((crop: string) => (
                                        <option key={crop} value={crop}>{crop}</option>
                                    ))}
                                    <option value="Other">Other</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Document Upload Mock */}
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-2">
                                <UploadCloud size={20} />
                            </div>
                            <p className="text-sm font-bold text-gray-600">Upload 7/12 Extract</p>
                            <p className="text-xs text-gray-400 mt-1">PDF or JPG (Max 5MB)</p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-900 text-white p-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" /> Processing...
                                </>
                            ) : (
                                <>
                                    Submit Application <CheckCircle2 size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-[10px] text-gray-400 text-center mt-4">
                        By submitting, you agree to share your data with {scheme.provider} for verification.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InsuranceEnrollmentModal;

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Upload, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import api from '../src/services/api';
import { useLanguage } from '../src/context/LanguageContext';

export default function KYCScreen() {
  const { t } = useLanguage();
  const [kycStatus, setKycStatus] = useState<string>('Loading');
  const [kycMessage, setKycMessage] = useState<string>('');
  
  const [idType, setIdType] = useState('Aadhaar');
  const [idNumberLast4, setIdNumberLast4] = useState('');
  const [landArea, setLandArea] = useState('');
  const [ownershipType, setOwnershipType] = useState('Owned');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [landFile, setLandFile] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      const response = await api.get('/api/kyc/status');
      setKycStatus(response.data.kyc_status);
      setKycMessage(response.data.message);
    } catch (error) {
      console.error('Failed to fetch KYC status', error);
      setError('Failed to load KYC status. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFile || !landFile) {
      setError('Please upload both ID and Land Ownership documents.');
      return;
    }
    if (!idNumberLast4 || idNumberLast4.length !== 4) {
      setError('Please enter the last 4 digits of your ID number.');
      return;
    }
    if (!landArea || isNaN(Number(landArea))) {
      setError('Please enter a valid land area in acres.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('id_type', idType);
    formData.append('id_number_last4', idNumberLast4);
    formData.append('land_area_acres', landArea);
    formData.append('land_ownership_type', ownershipType);
    formData.append('id_doc', idFile);
    formData.append('land_deed', landFile);

    try {
      const response = await api.post('/api/kyc/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setKycStatus('Pending');
      setKycMessage(response.data.message || 'KYC Documents submitted successfully.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit KYC. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBanner = () => {
    if (kycStatus === 'Loading') return null;

    if (kycStatus === 'Verified') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-green-900">KYC Verified</h3>
            <p className="text-green-700 text-sm mt-1">{kycMessage}</p>
          </div>
        </div>
      );
    }

    if (kycStatus === 'Pending') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Clock className="text-blue-600 mt-1 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-blue-900">KYC Under Review</h3>
            <p className="text-blue-700 text-sm mt-1">{kycMessage}</p>
          </div>
        </div>
      );
    }

    if (kycStatus === 'Rejected') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-1 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-red-900">KYC Rejected</h3>
            <p className="text-red-700 text-sm mt-1">{kycMessage}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="text-amber-600 mt-1 flex-shrink-0" size={24} />
        <div>
          <h3 className="font-semibold text-amber-900">KYC Required</h3>
          <p className="text-amber-700 text-sm mt-1">Please submit your identity and land documents to enroll in carbon credit projects.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={28} />
            <h1 className="text-2xl font-bold">Identity Verification</h1>
          </div>
          <p className="text-emerald-50 text-sm">Know Your Customer (KYC)</p>
        </div>
        <div className="absolute -bottom-12 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      <div className="px-4 -mt-4 relative z-20 max-w-lg mx-auto">
        {renderStatusBanner()}

        {(kycStatus === 'Not_Submitted' || kycStatus === 'Rejected') && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Submit Documents</h2>
            
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ID Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID Document Type</label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Voter_ID">Voter ID</option>
                  <option value="Kisan_Card">Kisan Credit Card</option>
                </select>
              </div>

              {/* ID Number Last 4 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID Number (Last 4 Digits)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={idNumberLast4}
                  onChange={(e) => setIdNumberLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* ID File */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Upload ID Document</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`w-full bg-slate-50 border ${idFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 border-dashed'} rounded-xl px-4 py-4 text-center transition-colors`}>
                    <Upload className={`mx-auto mb-2 ${idFile ? 'text-emerald-600' : 'text-slate-400'}`} size={24} />
                    <span className={`text-sm ${idFile ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      {idFile ? idFile.name : 'Tap to upload ID document'}
                    </span>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Land Ownership */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Land Ownership Type</label>
                <select
                  value={ownershipType}
                  onChange={(e) => setOwnershipType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Owned">Owned (Owner)</option>
                  <option value="Leased">Leased (Tenant)</option>
                </select>
              </div>

              {/* Land Area */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Land Area (Acres)</label>
                <input
                  type="number"
                  step="0.01"
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Land File */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Upload Land Ownership Document</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setLandFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`w-full bg-slate-50 border ${landFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 border-dashed'} rounded-xl px-4 py-4 text-center transition-colors`}>
                    <Upload className={`mx-auto mb-2 ${landFile ? 'text-emerald-600' : 'text-slate-400'}`} size={24} />
                    <span className={`text-sm ${landFile ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                      {landFile ? landFile.name : 'Tap to upload Land Document'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-md hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-70 mt-6"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Documents'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

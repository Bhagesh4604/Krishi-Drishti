import React, { useEffect, useState } from 'react';
import { Screen } from '../types';
import {
   AlertCircle,
   ArrowLeft,
   CheckCircle2,
   Loader2,
   ShieldCheck,
   Upload
} from 'lucide-react';
import { carbonService, plotService, getUserLocation } from '../src/services/api';

interface CarbonVaultScreenProps {
   navigateTo: (screen: Screen) => void;
   t: any;
}

const CarbonVaultScreen: React.FC<CarbonVaultScreenProps> = ({ navigateTo }) => {
   const [loading, setLoading] = useState(true);
   const [projects, setProjects] = useState<any[]>([]);
   const [plots, setPlots] = useState<any[]>([]);
   const [activeTab, setActiveTab] = useState('projects');

   const [showEnrollModal, setShowEnrollModal] = useState(false);
   const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
   const [selectedMethodology, setSelectedMethodology] = useState('Cover-Crop');
   const [monitoringPreview, setMonitoringPreview] = useState<any | null>(null);
   const [previewLoading, setPreviewLoading] = useState(false);

   const [showEvidenceModal, setShowEvidenceModal] = useState(false);
   const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
   const [evidenceDesc, setEvidenceDesc] = useState('');
   const [walletInfo, setWalletInfo] = useState<any | null>(null);
   const [aggregators, setAggregators] = useState<any[]>([]);
   const [claimLoading, setClaimLoading] = useState(false);
   const [enrollLoading, setEnrollLoading] = useState(false);

   useEffect(() => {
      loadData();
   }, []);

   useEffect(() => {
      if (!showEnrollModal || !selectedPlotId) {
         setMonitoringPreview(null);
         return;
      }

      let cancelled = false;

      const loadPreview = async () => {
         setPreviewLoading(true);
         try {
            const preview = await carbonService.monitorPlot(selectedPlotId, selectedMethodology);
            if (!cancelled) {
               setMonitoringPreview(preview.analysis);
            }
         } catch (error) {
            console.error(error);
            if (!cancelled) {
               setMonitoringPreview(null);
            }
         } finally {
            if (!cancelled) {
               setPreviewLoading(false);
            }
         }
      };

      loadPreview();

      return () => {
         cancelled = true;
      };
   }, [showEnrollModal, selectedPlotId, selectedMethodology]);

   const loadData = async () => {
      setLoading(true);
      try {
         const [myPlots, myProjects, wallet, aggregatorData] = await Promise.all([
            plotService.getPlots(),
            carbonService.getProjects(),
            carbonService.getWallet(),
            carbonService.getAggregators(),
         ]);
         setPlots(myPlots);
         setProjects(myProjects);
         setWalletInfo(wallet);
         setAggregators(aggregatorData);
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   };

   const handleEnroll = async () => {
      if (!selectedPlotId) return;

      setEnrollLoading(true);
      try {
         await carbonService.enrollPlot(selectedPlotId, selectedMethodology);
         setShowEnrollModal(false);
         setMonitoringPreview(null);
         await loadData();
      } catch (error: any) {
         console.error(error);
         const detail = error?.response?.data?.detail || 'Enrollment failed. Please try again.';
         alert(`Enrollment Error: ${detail}`);
         setShowEnrollModal(false);
         await loadData(); // Refresh so UI matches actual DB state
      } finally {
         setEnrollLoading(false);
      }
   };

   const handleUploadEvidence = async () => {
      if (!selectedProjectId) return;

      try {
         const position = await getUserLocation();
         await carbonService.uploadEvidence(selectedProjectId, {
            description: evidenceDesc,
            geo_lat: position.lat,
            geo_lng: position.lng
         });
         setShowEvidenceModal(false);
         setEvidenceDesc('');
         alert('Evidence submitted for verification.');
         await loadData();
      } catch (error: any) {
         console.error(error);
         const detail = error?.response?.data?.detail || 'Upload failed. Please try again.';
         alert(`Upload Error: ${detail}`);
      }
   };

   const handleVerify = async (projectId: number) => {
      try {
         const response = await carbonService.verifyProject(projectId);
         alert(response.message);
         await loadData();
      } catch (error) {
         console.error(error);
         alert('Verification failed');
      }
   };

   const handleClaimPayout = async (projectId: number, availableCredits: number) => {
      const amountInput = window.prompt(`Enter credits to claim (max ${availableCredits.toFixed(2)} ACT):`, availableCredits.toFixed(2));
      if (!amountInput) return;
      const amount = parseFloat(amountInput);
      if (Number.isNaN(amount) || amount <= 0) {
         alert('Please enter a valid credit amount to claim.');
         return;
      }
      if (amount > availableCredits) {
         alert('Claim exceeds available credits.');
         return;
      }

      setClaimLoading(true);
      try {
         const response = await carbonService.claimPayout(projectId, amount);
         alert(response.message || `Payout initiated for ₹${response.farmer_payout_inr.toFixed(2)}.`);
         await loadData();
      } catch (error) {
         console.error(error);
         alert('Claim failed. Please try again.');
      } finally {
         setClaimLoading(false);
      }
   };

   // Exclude plots that have an active project (ignore Audit_Failed — those can be re-enrolled)
   const activeProjectPlotIds = new Set(
      projects
         .filter((p: any) => p.status !== 'Audit_Failed')
         .map((p: any) => p.plot_id)
   );
   const unenrolledPlots = plots.filter((plot: any) => !activeProjectPlotIds.has(plot.id));
   const totalVerifiedCredits = projects.reduce((acc, curr) => acc + (curr.verified_credits || 0), 0);
   const totalAvailableCredits = projects.reduce((acc, curr) => acc + (curr.available_credits || 0), 0);
   const totalLockedCredits = projects.reduce((acc, curr) => acc + (curr.locked_credits || 0), 0);
   const totalPotentialCredits = projects.reduce((acc, curr) => acc + (curr.projected_credits || 0), 0);
   const selectedPlot = plots.find(plot => plot.id === selectedPlotId);

   return (
      <div className="h-full flex flex-col bg-gray-50 overflow-hidden relative">
         <div className="p-4 bg-white shadow-sm z-10 flex items-center gap-3">
            <button onClick={() => navigateTo('home')} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
               <ArrowLeft size={24} />
            </button>
            <h2 className="text-lg font-bold text-gray-800">Carbon Manager</h2>
         </div>

         <div className="flex p-2 bg-white border-b border-gray-100">
            <button
               onClick={() => setActiveTab('projects')}
               className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors ${activeTab === 'projects' ? 'bg-green-50 text-green-700' : 'text-gray-400'}`}
            >
               My Projects
            </button>
            <button
               onClick={() => setActiveTab('wallet')}
               className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors ${activeTab === 'wallet' ? 'bg-green-50 text-green-700' : 'text-gray-400'}`}
            >
               Wallet ({totalVerifiedCredits.toFixed(1)})
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-4 pb-24">
            {loading ? (
               <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-green-600" />
               </div>
            ) : activeTab === 'projects' ? (
               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <p className="text-[10px] uppercase font-black text-blue-400">Potential</p>
                        <h3 className="text-2xl font-black text-blue-700">{totalPotentialCredits.toFixed(1)} <span className="text-xs">ACT</span></h3>
                     </div>
                     <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                        <p className="text-[10px] uppercase font-black text-green-400">Verified</p>
                        <h3 className="text-2xl font-black text-green-700">{totalVerifiedCredits.toFixed(1)} <span className="text-xs">ACT</span></h3>
                     </div>
                  </div>

                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mt-4">Active Projects</h3>
                  {projects.length === 0 && <p className="text-sm text-gray-400 italic">No active projects.</p>}

                  {projects.map(project => (
                     <div key={project.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${project.status === 'Verified' ? 'bg-green-100 text-green-700' : project.status === 'Evidence_Pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                              {project.status.replace('_', ' ')}
                           </span>
                        </div>

                        <div className="mb-4">
                           <h4 className="font-bold text-gray-900 text-lg">{project.plot_name}</h4>
                           <p className="text-xs text-gray-500 font-medium">{project.methodology}</p>
                           <p className="text-[10px] text-gray-400 mt-2">{project.aggregator_name} • {project.government_scheme}</p>
                           <p className="text-[10px] text-gray-400">Fee {project.platform_fee_percentage}% · Farmer share {project.farmer_share_percentage}%</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                           <div className="bg-gray-50 rounded-2xl p-3">
                              <p className="text-[10px] uppercase font-black text-gray-400">Projected</p>
                              <p className="text-base font-black text-gray-800">{project.projected_credits.toFixed(2)}</p>
                           </div>
                           <div className="bg-gray-50 rounded-2xl p-3">
                              <p className="text-[10px] uppercase font-black text-gray-400">Available</p>
                              <p className="text-base font-black text-gray-800">{project.available_credits.toFixed(2)}</p>
                           </div>
                           <div className="bg-gray-50 rounded-2xl p-3">
                              <p className="text-[10px] uppercase font-black text-gray-400">Locked</p>
                              <p className="text-base font-black text-gray-800">{project.locked_credits.toFixed(2)}</p>
                           </div>
                        </div>

                        <div className="space-y-3">
                           {project.status === 'Enrolled' && (
                              <button
                                 onClick={() => {
                                    setSelectedProjectId(project.id);
                                    setShowEvidenceModal(true);
                                 }}
                                 className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                              >
                                 <Upload size={16} /> Upload Evidence
                              </button>
                           )}
                           {project.status === 'Evidence_Pending' && (
                              <button
                                 onClick={() => handleVerify(project.id)}
                                 className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                              >
                                 <ShieldCheck size={16} /> Trigger Audit
                              </button>
                           )}
                           {project.status === 'Verified' && project.available_credits > 0 ? (
                              <button
                                 onClick={() => handleClaimPayout(project.id, project.available_credits)}
                                 disabled={claimLoading}
                                 className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                 <CheckCircle2 size={16} /> Claim {project.available_credits.toFixed(2)} ACT
                              </button>
                           ) : project.status === 'Verified' ? (
                              <div className="w-full py-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-green-100">
                                 <CheckCircle2 size={16} /> Credits Issued
                              </div>
                           ) : null}
                        </div>
                     </div>
                  ))}

                  {unenrolledPlots.length > 0 && (
                     <>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mt-6">Available for Enrollment</h3>
                        {unenrolledPlots.map(plot => (
                           <div key={plot.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                              <div>
                                 <h4 className="font-bold text-gray-700">{plot.name}</h4>
                                 <p className="text-[10px] text-gray-400">Stored area {plot.area} | {plot.crop_type}</p>
                              </div>
                              <button
                                 onClick={() => {
                                    setSelectedPlotId(plot.id);
                                    setSelectedMethodology('Cover-Crop');
                                    setMonitoringPreview(null);
                                    setShowEnrollModal(true);
                                 }}
                                 className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors"
                              >
                                 Enroll
                              </button>
                           </div>
                        ))}
                     </>
                  )}
               </div>
            ) : (
               <div className="space-y-6">
                  <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                     <div className="relative z-10">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mb-2">Verified Balance</p>
                        <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                           {totalVerifiedCredits.toFixed(2)} ACT
                        </h3>
                        <p className="text-sm text-gray-500 mt-2 font-medium">Available {totalAvailableCredits.toFixed(2)} | Locked {totalLockedCredits.toFixed(2)}</p>
                     </div>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-white rounded-2xl p-5 border border-gray-100">
                        <p className="text-[10px] uppercase font-black text-gray-400">Available to sell</p>
                        <p className="text-2xl font-black text-gray-900">{totalAvailableCredits.toFixed(2)}</p>
                     </div>
                     <div className="bg-white rounded-2xl p-5 border border-gray-100">
                        <p className="text-[10px] uppercase font-black text-gray-400">Buffer pool</p>
                        <p className="text-2xl font-black text-gray-900">{totalLockedCredits.toFixed(2)}</p>
                     </div>
                  </div>

                  {aggregators.length > 0 && (
                     <div className="bg-white rounded-3xl p-5 border border-gray-100 mt-4 space-y-3">
                        <p className="text-xs uppercase font-black text-gray-400 tracking-widest">Aggregator partners</p>
                        {aggregators.map((partner) => (
                           <div key={partner.name} className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                              <div className="flex justify-between items-start gap-3">
                                 <div>
                                    <p className="text-sm font-bold text-gray-900">{partner.name}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">{partner.role}</p>
                                 </div>
                                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">{partner.settlement_days} days</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 mt-3">
                                 <span>Fee {partner.fee_percentage}%</span>
                                 <span>Farmer {partner.farmer_share_percentage}%</span>
                                 <span>Contact {partner.contact}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            )}
         </div>

         {showEnrollModal && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-6 backdrop-blur-sm">
               <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-black text-gray-900 mb-4">Start Carbon Project</h3>

                  <div className="space-y-4 mb-6">
                     <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Selected Plot</p>
                        <h4 className="text-base font-black text-gray-900">{selectedPlot?.name || 'Farm plot'}</h4>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                           Earth Engine compares the last 90 days with the same season one year earlier before enrollment.
                        </p>
                     </div>

                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Select Methodology</label>
                        <div className="grid grid-cols-1 gap-2">
                           {['Cover-Crop', 'No-Till', 'Agroforestry'].map(method => (
                              <button
                                 key={method}
                                 onClick={() => setSelectedMethodology(method)}
                                 className={`p-3 rounded-xl text-left text-sm font-bold border transition-all ${selectedMethodology === method ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}
                              >
                                 {method}
                              </button>
                           ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-3">Project will enroll under the CCTS framework with a 20% aggregator fee and 80% farmer share on issued credits.</p>
                     </div>

                     {previewLoading ? (
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-center gap-3 text-sm font-bold text-gray-500">
                           <Loader2 size={18} className="animate-spin text-green-600" />
                           Running Earth Engine monitoring...
                        </div>
                     ) : monitoringPreview ? (
                        <div className="space-y-3">
                           <div className="grid grid-cols-2 gap-3">
                              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                 <p className="text-[10px] uppercase font-black text-emerald-500">Estimated Credits</p>
                                 <h4 className="text-2xl font-black text-emerald-700">{monitoringPreview.carbon.gross_credits.toFixed(2)}</h4>
                                 <p className="text-[11px] text-emerald-700 mt-1">Gross before buffer pool</p>
                              </div>
                              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                 <p className="text-[10px] uppercase font-black text-blue-500">Issuable</p>
                                 <h4 className="text-2xl font-black text-blue-700">{monitoringPreview.carbon.issuable_credits.toFixed(2)}</h4>
                                 <p className="text-[11px] text-blue-700 mt-1">After {monitoringPreview.carbon.buffer_pool_percentage}% buffer</p>
                              </div>
                           </div>

                           <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                              <div className="flex justify-between items-start gap-3">
                                 <div>
                                    <p className="text-[10px] uppercase font-black text-gray-400">Boundary Area</p>
                                    <h4 className="text-lg font-black text-gray-900">{monitoringPreview.area_hectares} ha</h4>
                                 </div>
                                 <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${monitoringPreview.carbon.eligible ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {monitoringPreview.carbon.eligible ? 'Eligible' : 'Needs More Proof'}
                                 </span>
                              </div>

                              <div className="grid grid-cols-3 gap-3 text-center">
                                 <div className="bg-gray-50 rounded-xl py-3">
                                    <p className="text-[10px] uppercase font-black text-gray-400">Current NDVI</p>
                                    <p className="text-sm font-black text-gray-800">{monitoringPreview.monitoring.current_ndvi?.toFixed(2)}</p>
                                 </div>
                                 <div className="bg-gray-50 rounded-xl py-3">
                                    <p className="text-[10px] uppercase font-black text-gray-400">NDVI Change</p>
                                    <p className={`text-sm font-black ${monitoringPreview.monitoring.ndvi_change >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                       {monitoringPreview.monitoring.ndvi_change >= 0 ? '+' : ''}{monitoringPreview.monitoring.ndvi_change?.toFixed(2)}
                                    </p>
                                 </div>
                                 <div className="bg-gray-50 rounded-xl py-3">
                                    <p className="text-[10px] uppercase font-black text-gray-400">Moisture</p>
                                    <p className="text-sm font-black text-gray-800">{monitoringPreview.monitoring.soil_moisture?.toFixed(1)}%</p>
                                 </div>
                              </div>

                              <div className="text-xs text-gray-600 leading-relaxed">
                                 <p className="font-bold text-gray-800 mb-1">Verification checklist</p>
                                 <p>{monitoringPreview.carbon.verification_requirements.join(' | ')}</p>
                              </div>

                              {monitoringPreview.risk_flags?.length > 0 && (
                                 <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                                    {monitoringPreview.risk_flags[0]}
                                 </div>
                              )}
                           </div>
                        </div>
                     ) : (
                        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-4 text-xs text-gray-500">
                           Could not fetch the Earth Engine preview right now. Enrollment can still continue and will use the backend fallback analysis.
                        </div>
                     )}

                     <div className="bg-blue-50 p-3 rounded-xl flex gap-3 items-start">
                        <AlertCircle size={16} className="text-blue-500 mt-0.5" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                           Satellite monitoring is only the first step. Credit issuance still depends on evidence, additionality checks, and the audit workflow.
                        </p>
                     </div>
                  </div>

                  <div className="flex gap-3">
                     <button
                        onClick={() => {
                           setShowEnrollModal(false);
                           setMonitoringPreview(null);
                        }}
                        className="flex-1 py-3 text-gray-500 font-bold text-sm"
                     >
                        Cancel
                     </button>
                     <button onClick={handleEnroll} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-200">
                        Confirm Enrollment
                     </button>
                  </div>
               </div>
            </div>
         )}

         {showEvidenceModal && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-6 backdrop-blur-sm">
               <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                  <h3 className="text-xl font-black text-gray-900 mb-4">Upload Evidence</h3>

                  <div className="space-y-4 mb-6">
                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex gap-2 mb-2">
                           <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                           <h4 className="text-sm font-bold text-blue-800">Required Evidence</h4>
                        </div>
                        <p className="text-xs text-blue-700 leading-relaxed">
                           Upload geotagged field proof that matches your chosen methodology. Include one photo from the field and one practice-specific proof item when possible.
                        </p>
                     </div>

                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Description</label>
                        <textarea
                           className="w-full bg-gray-50 rounded-xl p-3 text-sm font-medium outline-none border border-transparent focus:bg-white focus:border-green-500 transition-all"
                           placeholder="e.g. Photo of cover crop establishment and sowing receipt"
                           rows={3}
                           value={evidenceDesc}
                           onChange={(event) => setEvidenceDesc(event.target.value)}
                        />
                     </div>
                     <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-gray-400">
                        <Upload size={24} />
                        <span className="text-xs font-bold">Use the mobile flow to attach the geotagged photo</span>
                     </div>
                  </div>

                  <div className="flex gap-3">
                     <button onClick={() => setShowEvidenceModal(false)} className="flex-1 py-3 text-gray-500 font-bold text-sm">Cancel</button>
                     <button onClick={handleUploadEvidence} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200">
                        Submit for Audit
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default CarbonVaultScreen;

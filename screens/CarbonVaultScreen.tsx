import React, { useEffect, useState } from 'react';
import { Screen } from '../types';
import {
   AlertCircle,
   ArrowLeft,
   CheckCircle2,
   Loader2,
   ShieldCheck,
   Upload,
   Link2
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
      <div className="h-full flex flex-col overflow-hidden relative" style={{ background: '#F7F9F8', fontFamily: 'Inter, sans-serif' }}>

         {/* ── HEADER ── */}
         <div className="px-5 pt-12 pb-4 flex items-center gap-3 bg-white sticky top-0 z-10" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <button
               onClick={() => navigateTo('home')}
               className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform flex-shrink-0"
               style={{ background: '#F5F5F5', border: '1px solid #EBEBEB' }}
            >
               <ArrowLeft size={16} style={{ color: '#001A11' }} />
            </button>
            <div>
               <h2 className="text-lg font-bold" style={{ color: '#001A11' }}>Carbon Manager</h2>
               <p className="text-[11px] font-semibold" style={{ color: '#00BB78' }}>ACT Credit System</p>
            </div>
         </div>

         {/* ── HERO STATS CARD ── */}
         <div className="mx-5 mt-4 rounded-3xl p-5 relative overflow-hidden" style={{ background: '#001A11' }}>
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#616B68' }}>Total Potential</p>
                  <h3 className="text-4xl font-black text-white mt-0.5">{totalPotentialCredits.toFixed(1)}<span className="text-lg ml-1" style={{ color: '#A5FFA7' }}>ACT</span></h3>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#616B68' }}>Verified</p>
                  <p className="text-xl font-black mt-0.5" style={{ color: '#00BB78' }}>{totalVerifiedCredits.toFixed(1)} ACT</p>
               </div>
            </div>
            <div className="mt-4 pt-4 flex gap-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
               <div>
                  <p className="text-[10px]" style={{ color: '#616B68' }}>Available</p>
                  <p className="text-sm font-bold text-white">{totalAvailableCredits.toFixed(2)}</p>
               </div>
               <div>
                  <p className="text-[10px]" style={{ color: '#616B68' }}>Buffer Pool</p>
                  <p className="text-sm font-bold text-white">{totalLockedCredits.toFixed(2)}</p>
               </div>
            </div>
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full" style={{ background: 'rgba(0,187,120,0.08)' }} />
         </div>

         {/* ── TABS ── */}
         <div className="mx-5 mt-4 p-1 rounded-2xl flex gap-1" style={{ background: '#EFEFEF' }}>
            <button
               onClick={() => setActiveTab('projects')}
               className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all"
               style={{ background: activeTab === 'projects' ? '#fff' : 'transparent', color: activeTab === 'projects' ? '#001A11' : '#616B68', boxShadow: activeTab === 'projects' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
            >
               My Projects
            </button>
            <button
               onClick={() => setActiveTab('wallet')}
               className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all"
               style={{ background: activeTab === 'wallet' ? '#fff' : 'transparent', color: activeTab === 'wallet' ? '#001A11' : '#616B68', boxShadow: activeTab === 'wallet' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
            >
               Wallet ({totalVerifiedCredits.toFixed(1)})
            </button>
         </div>

         <div className="flex-1 overflow-y-auto px-5 py-4 pb-24 space-y-4">
            {loading ? (
               <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #E8FBF3', borderTopColor: '#00BB78' }} />
                  <p className="text-sm font-medium" style={{ color: '#616B68' }}>Loading your projects…</p>
               </div>
            ) : activeTab === 'projects' ? (
               <>
                  {/* Active Projects */}
                  <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#616B68' }}>Active Projects</p>
                  {projects.length === 0 && (
                     <div className="py-8 flex flex-col items-center text-center rounded-2xl" style={{ background: '#F0F0F0' }}>
                        <p className="text-sm font-semibold" style={{ color: '#001A11' }}>No active projects</p>
                        <p className="text-xs mt-0.5" style={{ color: '#616B68' }}>Enroll a farm below to start earning credits</p>
                     </div>
                  )}

                  {projects.map(project => (
                     <div key={project.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #F0F0F0', boxShadow: '0 2px 8px rgba(0,187,120,0.05)' }}>
                        <div className="p-4">
                           <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-sm leading-tight" style={{ color: '#001A11' }}>{project.plot_name}</h4>
                                 <p className="text-[11px] mt-0.5" style={{ color: '#616B68' }}>{project.methodology} · {project.aggregator_name}</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex-shrink-0 ${project.status === 'Verified' ? 'text-[#00BB78]' : project.status === 'Evidence_Pending' ? 'text-amber-600' : 'text-blue-600'}`}
                                 style={{ background: project.status === 'Verified' ? '#E8FBF3' : project.status === 'Evidence_Pending' ? '#FFF8EB' : '#EFF6FF' }}>
                                 {project.status.replace('_', ' ')}
                              </span>
                           </div>

                           <div className="grid grid-cols-3 gap-2 mb-4">
                              {[
                                 { label: 'Projected', val: project.projected_credits.toFixed(2) },
                                 { label: 'Available', val: project.available_credits.toFixed(2) },
                                 { label: 'Locked', val: project.locked_credits.toFixed(2) },
                              ].map((stat, i) => (
                                 <div key={i} className="rounded-xl p-2.5 text-center" style={{ background: '#F7F9F8' }}>
                                    <p className="text-[9px] uppercase font-black" style={{ color: '#616B68' }}>{stat.label}</p>
                                    <p className="text-sm font-black mt-0.5" style={{ color: '#001A11' }}>{stat.val}</p>
                                 </div>
                              ))}
                           </div>

                           <div className="space-y-2">
                              {project.status === 'Enrolled' && (
                                 <button onClick={() => { setSelectedProjectId(project.id); setShowEvidenceModal(true); }}
                                    className="w-full py-3 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                                    style={{ background: '#001A11' }}>
                                    <Upload size={14} /> Upload Evidence
                                 </button>
                              )}
                              {project.status === 'Evidence_Pending' && (
                                 <button onClick={() => handleVerify(project.id)}
                                    className="w-full py-3 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                                    style={{ background: '#001A11' }}>
                                    <ShieldCheck size={14} /> Trigger Audit
                                 </button>
                              )}
                              {project.status === 'Verified' && project.available_credits > 0 ? (
                                 <button onClick={() => handleClaimPayout(project.id, project.available_credits)} disabled={claimLoading}
                                    className="w-full py-3 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                    style={{ background: '#00BB78' }}>
                                    <CheckCircle2 size={14} /> Claim {project.available_credits.toFixed(2)} ACT
                                 </button>
                              ) : project.status === 'Verified' ? (
                                 <div className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                                    style={{ background: '#E8FBF3', color: '#00BB78', border: '1px solid #A5FFA7' }}>
                                    <CheckCircle2 size={14} /> Credits Issued
                                 </div>
                              ) : null}
                              {(project.status === 'Verified' || project.status === 'Issued') && (
                                 <button onClick={() => navigateTo('traceability')}
                                    className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                                    style={{ background: '#F0F0F0', color: '#001A11' }}>
                                    <Link2 size={13} /> 🌾 Mint Harvest Token
                                 </button>
                              )}
                           </div>
                        </div>
                     </div>
                  ))}

                  {/* Available for Enrollment */}
                  {unenrolledPlots.length > 0 && (
                     <>
                        <p className="text-[11px] font-black uppercase tracking-widest pt-2" style={{ color: '#616B68' }}>Available for Enrollment</p>
                        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
                           {unenrolledPlots.map((plot, i) => (
                              <div key={plot.id} className="flex items-center gap-3 px-4 py-3.5 bg-white"
                                 style={{ borderBottom: i < unenrolledPlots.length - 1 ? '1px solid #F8F8F8' : 'none' }}>
                                 <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#E8FBF3' }}>
                                    <span className="text-lg">🌿</span>
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold truncate" style={{ color: '#001A11' }}>{plot.name}</h4>
                                    <p className="text-[11px]" style={{ color: '#616B68' }}>{plot.area} ha · {plot.crop_type}</p>
                                 </div>
                                 <button
                                    onClick={() => { setSelectedPlotId(plot.id); setSelectedMethodology('Cover-Crop'); setMonitoringPreview(null); setShowEnrollModal(true); }}
                                    className="px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0"
                                    style={{ background: '#00BB78', color: '#fff' }}
                                 >
                                    Enroll
                                 </button>
                              </div>
                           ))}
                        </div>
                     </>
                  )}
               </>
            ) : (
               <>
                  {/* Wallet Tab */}
                  <div className="rounded-3xl p-5" style={{ background: '#001A11' }}>
                     <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#616B68' }}>Verified Balance</p>
                     <h3 className="text-4xl font-black text-white mt-1">{totalVerifiedCredits.toFixed(2)}<span className="text-xl ml-1.5" style={{ color: '#A5FFA7' }}>ACT</span></h3>
                     <div className="flex gap-6 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div>
                           <p className="text-[10px]" style={{ color: '#616B68' }}>Available to sell</p>
                           <p className="text-sm font-bold text-white">{totalAvailableCredits.toFixed(2)}</p>
                        </div>
                        <div>
                           <p className="text-[10px]" style={{ color: '#616B68' }}>Buffer pool</p>
                           <p className="text-sm font-bold text-white">{totalLockedCredits.toFixed(2)}</p>
                        </div>
                     </div>
                  </div>

                  {aggregators.length > 0 && (
                     <>
                        <p className="text-[11px] font-black uppercase tracking-widest pt-2" style={{ color: '#616B68' }}>Aggregator Partners</p>
                        {aggregators.map((partner) => (
                           <div key={partner.name} className="bg-white rounded-2xl p-4" style={{ border: '1px solid #F0F0F0' }}>
                              <div className="flex justify-between items-start gap-3 mb-3">
                                 <div>
                                    <p className="text-sm font-bold" style={{ color: '#001A11' }}>{partner.name}</p>
                                    <p className="text-[11px] mt-0.5" style={{ color: '#616B68' }}>{partner.role}</p>
                                 </div>
                                 <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#E8FBF3', color: '#00BB78' }}>{partner.settlement_days}d settlement</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                 {[
                                    { label: 'Platform Fee', val: `${partner.fee_percentage}%` },
                                    { label: 'Farmer Share', val: `${partner.farmer_share_percentage}%` },
                                    { label: 'Contact', val: partner.contact },
                                 ].map((item, i) => (
                                    <div key={i} className="rounded-xl p-2.5 text-center" style={{ background: '#F7F9F8' }}>
                                       <p className="text-[9px] uppercase font-black" style={{ color: '#616B68' }}>{item.label}</p>
                                       <p className="text-[11px] font-bold mt-0.5" style={{ color: '#001A11' }}>{item.val}</p>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        ))}
                     </>
                  )}
               </>
            )}
         </div>

         {/* ── ENROLL MODAL ── */}
         {showEnrollModal && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-end justify-center backdrop-blur-sm">
               <div className="bg-white w-full rounded-t-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
                  <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E0E0E0' }} />
                  <h3 className="text-lg font-black mb-4" style={{ color: '#001A11' }}>Start Carbon Project</h3>

                  <div className="space-y-4 mb-6">
                     <div className="p-4 rounded-2xl" style={{ background: '#F7F9F8', border: '1px solid #EFEFEF' }}>
                        <p className="text-[10px] uppercase font-black mb-1" style={{ color: '#616B68' }}>Selected Plot</p>
                        <h4 className="text-base font-black" style={{ color: '#001A11' }}>{selectedPlot?.name || 'Farm plot'}</h4>
                        <p className="text-xs mt-1" style={{ color: '#616B68' }}>Earth Engine compares the last 90 days with the same season one year earlier.</p>
                     </div>

                     <div>
                        <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Select Methodology</label>
                        <div className="grid grid-cols-1 gap-2">
                           {['Cover-Crop', 'No-Till', 'Agroforestry'].map(method => (
                              <button key={method} onClick={() => setSelectedMethodology(method)}
                                 className="p-3 rounded-xl text-left text-sm font-bold transition-all"
                                 style={{ border: `1.5px solid ${selectedMethodology === method ? '#00BB78' : '#EBEBEB'}`, background: selectedMethodology === method ? '#E8FBF3' : '#fff', color: selectedMethodology === method ? '#001A11' : '#616B68' }}>
                                 {method}
                              </button>
                           ))}
                        </div>
                     </div>

                     {previewLoading ? (
                        <div className="rounded-2xl p-5 flex items-center justify-center gap-3" style={{ background: '#F7F9F8' }}>
                           <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid #A5FFA7', borderTopColor: '#00BB78' }} />
                           <span className="text-sm font-bold" style={{ color: '#616B68' }}>Running Earth Engine monitoring…</span>
                        </div>
                     ) : monitoringPreview ? (
                        <div className="space-y-3">
                           <div className="grid grid-cols-2 gap-3">
                              <div className="p-4 rounded-2xl" style={{ background: '#E8FBF3', border: '1px solid #A5FFA7' }}>
                                 <p className="text-[10px] uppercase font-black" style={{ color: '#616B68' }}>Estimated Credits</p>
                                 <h4 className="text-2xl font-black" style={{ color: '#00BB78' }}>{monitoringPreview.carbon.gross_credits.toFixed(2)}</h4>
                              </div>
                              <div className="p-4 rounded-2xl" style={{ background: '#F7F9F8', border: '1px solid #EBEBEB' }}>
                                 <p className="text-[10px] uppercase font-black" style={{ color: '#616B68' }}>Issuable</p>
                                 <h4 className="text-2xl font-black" style={{ color: '#001A11' }}>{monitoringPreview.carbon.issuable_credits.toFixed(2)}</h4>
                              </div>
                           </div>
                           <div className="grid grid-cols-3 gap-2">
                              {[
                                 { label: 'NDVI', val: monitoringPreview.monitoring.current_ndvi?.toFixed(2) },
                                 { label: 'Change', val: `${monitoringPreview.monitoring.ndvi_change >= 0 ? '+' : ''}${monitoringPreview.monitoring.ndvi_change?.toFixed(2)}` },
                                 { label: 'Moisture', val: `${monitoringPreview.monitoring.soil_moisture?.toFixed(1)}%` },
                              ].map((s, i) => (
                                 <div key={i} className="rounded-xl p-2.5 text-center" style={{ background: '#F7F9F8' }}>
                                    <p className="text-[9px] uppercase font-black" style={{ color: '#616B68' }}>{s.label}</p>
                                    <p className="text-sm font-black" style={{ color: '#001A11' }}>{s.val}</p>
                                 </div>
                              ))}
                           </div>
                        </div>
                     ) : (
                        <div className="rounded-2xl p-4 text-xs" style={{ border: '1.5px dashed #EBEBEB', color: '#616B68' }}>
                           Could not fetch Earth Engine preview. Enrollment can still continue with backend analysis.
                        </div>
                     )}

                     <div className="p-3 rounded-xl flex gap-3 items-start" style={{ background: '#E8FBF3' }}>
                        <AlertCircle size={15} style={{ color: '#00BB78', marginTop: 2 }} />
                        <p className="text-xs leading-relaxed" style={{ color: '#001A11' }}>Credit issuance depends on evidence, additionality checks, and the audit workflow.</p>
                     </div>
                  </div>

                  <div className="flex gap-3">
                     <button onClick={() => { setShowEnrollModal(false); setMonitoringPreview(null); }}
                        className="flex-1 py-3.5 text-sm font-bold rounded-2xl" style={{ color: '#616B68', background: '#F5F5F5' }}>
                        Cancel
                     </button>
                     <button onClick={handleEnroll}
                        className="flex-1 py-3.5 text-white text-sm font-bold rounded-2xl" style={{ background: '#00BB78' }}>
                        {enrollLoading ? 'Enrolling…' : 'Confirm Enrollment'}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* ── EVIDENCE MODAL ── */}
         {showEvidenceModal && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-end justify-center backdrop-blur-sm">
               <div className="bg-white w-full rounded-t-3xl p-6 shadow-2xl">
                  <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E0E0E0' }} />
                  <h3 className="text-lg font-black mb-4" style={{ color: '#001A11' }}>Upload Evidence</h3>

                  <div className="space-y-4 mb-6">
                     <div className="p-4 rounded-xl flex gap-3 items-start" style={{ background: '#E8FBF3' }}>
                        <AlertCircle size={15} style={{ color: '#00BB78', marginTop: 2 }} />
                        <p className="text-xs leading-relaxed" style={{ color: '#001A11' }}>Upload geotagged field proof matching your methodology. Include one photo + one practice-specific proof item.</p>
                     </div>

                     <div>
                        <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Description</label>
                        <textarea
                           className="w-full rounded-xl p-3 text-sm font-medium outline-none transition-all"
                           style={{ background: '#F7F9F8', border: '1.5px solid #EBEBEB' }}
                           placeholder="e.g. Photo of cover crop establishment and sowing receipt"
                           rows={3}
                           value={evidenceDesc}
                           onChange={(event) => setEvidenceDesc(event.target.value)}
                        />
                     </div>
                     <div className="rounded-xl p-6 flex flex-col items-center justify-center gap-2" style={{ border: '1.5px dashed #A5FFA7' }}>
                        <Upload size={22} style={{ color: '#00BB78' }} />
                        <span className="text-xs font-bold" style={{ color: '#616B68' }}>Use mobile flow to attach geotagged photo</span>
                     </div>
                  </div>

                  <div className="flex gap-3">
                     <button onClick={() => setShowEvidenceModal(false)}
                        className="flex-1 py-3.5 text-sm font-bold rounded-2xl" style={{ color: '#616B68', background: '#F5F5F5' }}>
                        Cancel
                     </button>
                     <button onClick={handleUploadEvidence}
                        className="flex-1 py-3.5 text-white text-sm font-bold rounded-2xl" style={{ background: '#001A11' }}>
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

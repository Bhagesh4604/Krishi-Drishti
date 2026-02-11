import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { ArrowLeft, Leaf, TrendingUp, ShieldCheck, Satellite, ChevronRight, CheckCircle2, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { carbonService, plotService } from '../src/services/api';

interface CarbonVaultScreenProps {
   navigateTo: (screen: Screen) => void;
   t: any;
}

const CarbonVaultScreen: React.FC<CarbonVaultScreenProps> = ({ navigateTo, t }) => {
   const [loading, setLoading] = useState(true);
   const [projects, setProjects] = useState<any[]>([]);
   const [plots, setPlots] = useState<any[]>([]);

   // Tab State: 'projects' | 'wallet'
   const [activeTab, setActiveTab] = useState('projects');

   // Modal States
   const [showEnrollModal, setShowEnrollModal] = useState(false);
   const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
   const [selectedMethodology, setSelectedMethodology] = useState('Cover-Crop');

   const [showEvidenceModal, setShowEvidenceModal] = useState(false);
   const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
   const [evidenceDesc, setEvidenceDesc] = useState('');

   useEffect(() => {
      loadData();
   }, []);

   const loadData = async () => {
      setLoading(true);
      try {
         const [myPlots, myProjects] = await Promise.all([
            plotService.getPlots(),
            carbonService.getProjects()
         ]);
         setPlots(myPlots);
         setProjects(myProjects);
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   };

   // Actions
   const handleEnroll = async () => {
      if (!selectedPlotId) return;
      try {
         await carbonService.enrollPlot(selectedPlotId, selectedMethodology);
         setShowEnrollModal(false);
         loadData();
      } catch (e) {
         alert("Enrollment failed");
      }
   };

   const handleUploadEvidence = async () => {
      if (!selectedProjectId) return;
      try {
         // Mock Geoloc
         await carbonService.uploadEvidence(selectedProjectId, {
            description: evidenceDesc,
            geo_lat: 21.1458,
            geo_lng: 79.0882
         });
         setShowEvidenceModal(false);
         alert("Evidence Uploaded! Sent for Verification.");
         loadData();
      } catch (e) {
         alert("Upload failed");
      }
   };

   const handleVerify = async (projectId: number) => {
      try {
         const res = await carbonService.verifyProject(projectId);
         alert(res.message);
         loadData();
      } catch (e) {
         alert("Verification failed");
      }
   };

   // Derived Data with Realistic Constraints
   const unenrolledPlots = plots.filter(p => !projects.find(proj => proj.plot_id === p.id));
   const totalVerifiedCredits = projects.reduce((acc, curr) => acc + (curr.verified_credits || 0), 0);
   const totalAvailableCredits = projects.reduce((acc, curr) => acc + (curr.available_credits || 0), 0);
   const totalLockedCredits = projects.reduce((acc, curr) => acc + (curr.locked_credits || 0), 0);
   const totalPotentialCredits = projects.reduce((acc, curr) => acc + (curr.projected_credits || 0), 0);

   return (
      <div className="h-full flex flex-col bg-gray-50 overflow-hidden relative">
         {/* Simple Header */}
         <div className="p-4 bg-white shadow-sm z-10 flex items-center gap-3">
            <button onClick={() => navigateTo('home')} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
               <ArrowLeft size={24} />
            </button>
            <h2 className="text-lg font-bold text-gray-800">Carbon Manager</h2>
         </div>

         {/* Tabs */}
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

         {/* Content */}
         <div className="flex-1 overflow-y-auto p-4 pb-24">
            {loading ? (
               <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-600" /></div>
            ) : activeTab === 'projects' ? (
               <div className="space-y-6">
                  {/* Status Cards */}
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

                  {/* Active Projects */}
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mt-4">Active Projects</h3>
                  {projects.length === 0 && <p className="text-sm text-gray-400 italic">No active projects.</p>}

                  {projects.map(proj => (
                     <div key={proj.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${proj.status === 'Verified' ? 'bg-green-100 text-green-700' :
                              proj.status === 'Evidence_Pending' ? 'bg-amber-100 text-amber-700' :
                                 'bg-blue-100 text-blue-700'
                              }`}>
                              {proj.status.replace('_', ' ')}
                           </span>
                        </div>

                        <div className="mb-4">
                           <h4 className="font-bold text-gray-900 text-lg">{proj.plot_name}</h4>
                           <p className="text-xs text-gray-500 font-medium">{proj.methodology}</p>
                        </div>

                        {/* Progress / Actions */}
                        <div className="space-y-3">
                           {proj.status === 'Enrolled' && (
                              <button
                                 onClick={() => { setSelectedProjectId(proj.id); setShowEvidenceModal(true); }}
                                 className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                              >
                                 <Upload size={16} /> Upload Evidence
                              </button>
                           )}
                           {proj.status === 'Evidence_Pending' && (
                              <button
                                 onClick={() => handleVerify(proj.id)}
                                 className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                              >
                                 <ShieldCheck size={16} /> Trigger Audit
                              </button>
                           )}
                           {proj.status === 'Verified' && (
                              <div className="w-full py-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-green-100">
                                 <CheckCircle2 size={16} /> Credits Issued
                              </div>
                           )}
                        </div>
                     </div>
                  ))}

                  {/* Unenrolled Plots */}
                  {unenrolledPlots.length > 0 && (
                     <>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mt-6">Available for Enrollment</h3>
                        {unenrolledPlots.map(p => (
                           <div key={p.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                              <div>
                                 <h4 className="font-bold text-gray-700">{p.name}</h4>
                                 <p className="text-[10px] text-gray-400">{p.area} Acres • {p.crop_type}</p>
                              </div>
                              <button
                                 onClick={() => { setSelectedPlotId(p.id); setShowEnrollModal(true); }}
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
                  {/* Wallet Tab */}
                  <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                     <div className="relative z-10">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mb-2">Total Balance</p>
                        <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                           {totalVerifiedCredits.toFixed(2)} ACT
                        </h3>
                        <p className="text-sm text-gray-500 mt-2 font-medium">≈ ₹ {(totalVerifiedCredits * 1200).toLocaleString()}</p>
                     </div>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                  </div>

                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Transaction History</h3>
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center text-gray-400 text-sm italic">
                     No transactions yet.
                  </div>
               </div>
            )}
         </div>

         {/* Enroll Modal */}
         {showEnrollModal && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-6 backdrop-blur-sm">
               <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-black text-gray-900 mb-4">Start Carbon Project</h3>

                  <div className="space-y-4 mb-6">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Select Methodology</label>
                        <div className="grid grid-cols-1 gap-2">
                           {['Cover-Crop', 'No-Till', 'Agroforestry'].map(m => (
                              <button
                                 key={m}
                                 onClick={() => setSelectedMethodology(m)}
                                 className={`p-3 rounded-xl text-left text-sm font-bold border transition-all ${selectedMethodology === m ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}
                              >
                                 {m}
                              </button>
                           ))}
                        </div>
                     </div>
                     <div className="bg-blue-50 p-3 rounded-xl flex gap-3 items-start">
                        <AlertCircle size={16} className="text-blue-500 mt-0.5" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                           By enrolling, you agree to maintain this practice for 3 years. We will verify using satellite data.
                        </p>
                     </div>
                  </div>

                  <div className="flex gap-3">
                     <button onClick={() => setShowEnrollModal(false)} className="flex-1 py-3 text-gray-500 font-bold text-sm">Cancel</button>
                     <button onClick={handleEnroll} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-200">
                        Confirm Enrollment
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Evidence Modal */}
         {showEvidenceModal && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-6 backdrop-blur-sm">
               <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-black text-gray-900 mb-4">Upload Evidence</h3>

                  <div className="space-y-4 mb-6">
                     {/* Dynamic Evidence Hint */}
                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                        <div className="flex gap-2 mb-2">
                           <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                           <h4 className="text-sm font-bold text-blue-800">Required Evidence</h4>
                        </div>
                        <ul className="list-disc list-inside text-xs text-blue-700 space-y-1 ml-1">
                           {projects.find(p => p.id === selectedProjectId)?.methodology === 'Cover-Crop' && (
                              <>
                                 <li>Photo of <strong>Seed Purchase Receipt</strong> (Tags visible)</li>
                                 <li>Geotagged photo of <strong>Sowing Activity</strong></li>
                                 <li>Photo of <strong>Germination</strong> (Green cover)</li>
                              </>
                           )}
                           {projects.find(p => p.id === selectedProjectId)?.methodology === 'No-Till' && (
                              <>
                                 <li>Photo of <strong>Seeding into Residue</strong> (No ploughing)</li>
                                 <li>Close-up of <strong>Soil Surface</strong> showing &gt;30% residue</li>
                                 <li>Machinery photo (Zero-Till Drill)</li>
                              </>
                           )}
                           {projects.find(p => p.id === selectedProjectId)?.methodology === 'Agroforestry' && (
                              <>
                                 <li>Photo of <strong>Sapling Planting</strong></li>
                                 <li>Nursery Receipt for Saplings</li>
                                 <li>Wide shot of field with tree rows</li>
                              </>
                           )}
                        </ul>
                     </div>

                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Description</label>
                        <textarea
                           className="w-full bg-gray-50 rounded-xl p-3 text-sm font-medium outline-none border border-transparent focus:bg-white focus:border-green-500 transition-all"
                           placeholder="e.g., Photos of cover crop sowing..."
                           rows={3}
                           value={evidenceDesc}
                           onChange={(e) => setEvidenceDesc(e.target.value)}
                        />
                     </div>
                     <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer">
                        <Upload size={24} />
                        <span className="text-xs font-bold">Tap to Geotag & Upload Photo</span>
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

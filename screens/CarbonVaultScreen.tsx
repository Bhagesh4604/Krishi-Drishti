import React, { useEffect, useState } from 'react';

import { Screen } from '../types';

import {

   AlertCircle,

   ArrowLeft,

   CheckCircle2,

   Loader2,

   ShieldCheck,

   Upload,

   Clock

} from 'lucide-react';

import { carbonService, plotService, getEvidenceUploadLocation } from '../src/services/api';

interface CarbonVaultScreenProps {

   navigateTo: (screen: Screen) => void;

   t: any;

}

const CARBON_WORKFLOW_STAGES = [

   'Intake_Submitted', 'Entity_Onboarding', 'PDD_Preparation', 'Validation', 'Registered',

   'Monitoring', 'Participant_Records_Ready', 'Aggregate_Report_Submitted_To_ACVA', 'Verification_Pending',

   'Verified', 'Issuance_Request_Submitted', 'Issuance_Review', 'Issued', 'Allocation_Pending',

   'Farmer_Allocated',

];

const CARBON_STAGE_LABELS: Record<string, string> = {

   Intake_Submitted: 'Farmer enrollment + consent', Entity_Onboarding: 'Project partner onboarding', PDD_Preparation: 'Project plan + baseline',

   Validation: 'Independent project validation', Registration_Review: 'Project registration review',

   Registered: 'Project + farmer roster registered', Monitoring: 'Season monitoring', Participant_Records_Ready: 'Farmer records packaged',

   Aggregate_Report_Submitted_To_ACVA: 'Project report submitted for review', Verification_Pending: 'Independent verification',

   Verified: 'Verified quantity recorded', Issuance_Request_Submitted: 'Registry issue requested', ICM_Administrator_Review: 'Registry review',

   Technical_Committee_Review: 'Registry technical review', NSC_Recommendation: 'Registry decision', Issuance_Review: 'Registry issue review',

   Issued: 'External registry issue recorded', Allocation_Pending: 'Farmer share awaiting consent', Farmer_Allocated: 'Farmer share accepted', Buyer_Sale_Settled: 'Buyer sale settled', Registry_Transfer_Recorded: 'Registry units delivered', Farmer_Payout_Recorded: 'Farmer payment recorded',

};

const CARBON_STAGE_GUIDANCE: Record<string, { owner: string; action: string; farmer: string; proof: string }> = {

   Intake_Submitted: { owner: 'Farmer + project partner', action: 'The farmer chooses a field and practice, reviews project terms, and signs consent.', farmer: 'Check the plot boundary, current practice, planned change, contact person, and benefit-sharing terms.', proof: 'Consent record, plot ID, and enrollment reference.' },

   Entity_Onboarding: { owner: 'Project partner', action: 'The partner groups participating farms, confirms the project contact, and records the farmer in its participant list.', farmer: 'Save the partner name, your participant ID, signed terms, fees, exit options, and support contact.', proof: 'Partner onboarding record and farmer roster ID.' },

   PDD_Preparation: { owner: 'Project partner + technical team', action: 'The team documents the project boundary, baseline practice, planned activities, monitoring plan, risks, and benefit-sharing model.', farmer: 'Correct your farm history and field details before the project plan is finalized.', proof: 'Project plan reference and your field-level baseline.' },

      Validation: { owner: 'Independent reviewer', action: 'An independent reviewer checks the project plan, baseline, participant data, and monitoring approach.', farmer: 'Answer field questions and provide missing records through the project partner.', proof: 'Independent validation report and reviewer reference.' },

   Registration_Review: { owner: 'Project / registry', action: 'The project partner submits its project documents and responds to questions from the programme.', farmer: 'Ask the partner to confirm whether your farm appears in the registered participant list.', proof: 'Submission receipt and review outcome.' },

   Registered: { owner: 'Project partner + programme', action: 'The partner records the approved project and the participating farmer / field roster.', farmer: 'Check your participant ID, plot, practice start date, and contact details.', proof: 'Project reference and farmer roster entry.' },

   Monitoring: { owner: 'Farmer + project partner', action: 'The farmer follows the agreed practice and logs dated activities, inputs, harvests, and field observations.', farmer: 'Log activities during the season; keep photos, receipts, measurements, and field notes. Satellite signals alone do not prove a credit quantity.', proof: 'Dated field records and practice-specific supporting evidence.' },

   Participant_Records_Ready: { owner: 'Farmer; app packages records', action: 'The farmer checks their season records and prepares a participant report for the project partner.', farmer: 'Review dates and quantities, correct errors, and share the package with your project contact.', proof: 'Farmer report, period, record count, and checksum.' },

   Aggregate_Report_Submitted_To_ACVA: { owner: 'Project partner', action: 'The partner combines farm reports into one project monitoring report and submits it for independent review.', farmer: 'Confirm your field and activities appear correctly in the combined report.', proof: 'Project report reference and submission receipt.' },

   Verification_Pending: { owner: 'Independent verifier', action: 'The verifier checks reported results against farm records and may request a site visit or sample.', farmer: 'Make the field and original records available; answer follow-up questions.', proof: 'Verification engagement and independent report reference.' },

   Verified: { owner: 'Independent verifier + project partner', action: 'The report states the quantity independently verified for the project period.', farmer: 'Review the result and the signed farmer share terms. A verified result is not yet an issued registry credit.', proof: 'Verification report, verified quantity, and period.' },

   Issuance_Request_Submitted: { owner: 'Project partner / verifier', action: 'The authorized project representative submits the verified project result to its registry.', farmer: 'Ask for the submission receipt and expected review steps.', proof: 'Registry request reference.' },

   ICM_Administrator_Review: { owner: 'Registry team', action: 'The registry team checks the submission and sends any questions to the project partner.', farmer: 'Provide corrections through your partner if your field is queried.', proof: 'Registry case and response references.' },

   Technical_Committee_Review: { owner: 'Registry reviewers', action: 'Reviewers assess the submitted result and supporting project records.', farmer: 'Stay in contact with the partner in case your farm record needs clarification.', proof: 'Review outcome.' },

   NSC_Recommendation: { owner: 'Registry team', action: 'The registry records its decision on the requested issue.', farmer: 'Ask your partner whether the request was accepted and what quantity it covers.', proof: 'Decision reference.' },

   Issuance_Review: { owner: 'Registry / project partner', action: 'The registry completes its final review and records the issue if approved.', farmer: 'Ask for the final registry reference, serials, and project settlement terms.', proof: 'Final issue reference, serials, quantity, and fee statement.' },

   Issued: { owner: 'External registry', action: 'Credits exist only after the external registry confirms an issue. The project partner first receives the issue for a group project.', farmer: 'Request the issue reference and the document explaining how the farmer share is calculated.', proof: 'External issue reference and serial numbers.' },

   Allocation_Pending: { owner: 'Project partner + farmer', action: 'The partner proposes the farmer’s credit quantity and revenue share from the confirmed issue.', farmer: 'Compare the quantity and proceeds percentage with your signed terms; accept only when they match.', proof: 'Signed allocation agreement linked to the issue.' },

   Farmer_Allocated: { owner: 'Farmer + project partner', action: 'The farmer accepts a documented share linked to the confirmed registry issue.', farmer: 'Keep the agreement and check whether credits will be transferred to you or sold by the partner.', proof: 'Accepted quantity, agreement reference, and registry link.' },

   Buyer_Sale_Settled: { owner: 'Project partner', action: 'The partner records buyer, invoice, sold quantity, net settled proceeds, and the buyer settlement reference.', farmer: 'Check the quantity sold and the agreed share of net proceeds.', proof: 'Sale / invoice reference and settlement receipt.' },

   Registry_Transfer_Recorded: { owner: 'Project partner + registry', action: 'The partner submits a transfer through the registry and records it only after units appear in the farmer account.', farmer: 'Check your own registry account and confirm the serials and quantity.', proof: 'Registry transfer reference, farmer account ID, serial range, and date.' },

   Farmer_Payout_Recorded: { owner: 'Project partner', action: 'If the partner sells the allocated units, it transfers the agreed amount to the farmer and records the bank or UPI reference.', farmer: 'Confirm the amount reached your account and keep the transfer reference.', proof: 'Payment amount, date, method, and UTR / transaction reference.' },

};

const LEGACY_STAGE_DISPLAY: Record<string, string> = { Enrolled: 'Intake_Submitted', Evidence_Pending: 'Intake_Submitted', Under_Review: 'Intake_Submitted', Audit_Failed: 'Intake_Submitted', Analyzing: 'Intake_Submitted', Public_Consultation: 'PDD_Preparation', Registration_Review: 'Validation', ICM_Administrator_Review: 'Issuance_Review', Technical_Committee_Review: 'Issuance_Review', NSC_Recommendation: 'Issuance_Review', Monitoring_Report_Ready: 'Participant_Records_Ready' };

const currentProjectStage = (project: any) => { const stage = project.workflow_stage || project.status || 'Intake_Submitted'; return LEGACY_STAGE_DISPLAY[stage] || stage; };

const projectStageLabel = (_project: any, stage: string) => CARBON_STAGE_LABELS[LEGACY_STAGE_DISPLAY[stage] || stage] || stage.replaceAll('_', ' ');

const projectOutcomeStatus = (project: any) => {
   const allocated = Number(project.allocated_credits || 0);
   const transferred = Number(project.credits_transferred || 0);
   const sold = Number(project.credits_sold || 0);
   const available = Number(project.available_credits || 0);
   const payoutDue = Number(project.farmer_payout_due_inr || 0);
   const payoutPaid = Number(project.farmer_payout_paid_inr || 0);
   const outcomes: string[] = [];

   if (project.status === 'Allocation_Pending') return 'Allocation offer is waiting for your decision';
   if (transferred > 0) outcomes.push(`${transferred.toFixed(2)} tCO₂e transferred to your registry`);
   if (sold > 0) outcomes.push(payoutDue > 0 && payoutPaid + 0.009 >= payoutDue
      ? `Partner sale recorded · ₹${payoutPaid.toFixed(0)} paid`
      : `Partner sale recorded · ₹${Math.max(0, payoutDue - payoutPaid).toFixed(0)} still due`);
   if (outcomes.length) return `${outcomes.join(' · ')} · ${available.toFixed(2)} tCO₂e remains`;
   if (allocated > 0) return 'Allocation accepted · partner delivery is still pending';
   if (project.registry_issuance_reference) return 'External registry issue recorded · farmer allocation is pending';
   if (Number(project.verified_credits || 0) > 0) return 'Verified quantity recorded · registry issue is still pending';
   return 'No credits issued yet';
};

type MonitoringField = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'select'; options?: string[] };

const MONITORING_FORM_FIELDS: Record<string, MonitoringField[]> = {

   practice_observation: [{ key: 'practice', label: 'Practice / activity', type: 'text' }, { key: 'field_condition', label: 'Field condition or result', type: 'text' }],

   field_operation: [{ key: 'operation_details', label: 'Operation performed', type: 'text' }, { key: 'quantity', label: 'Quantity', type: 'number' }, { key: 'unit', label: 'Unit', type: 'text' }],

   input_application: [{ key: 'input_name', label: 'Input used', type: 'text' }, { key: 'quantity', label: 'Quantity', type: 'number' }, { key: 'unit', label: 'Unit', type: 'text' }, { key: 'receipt_reference', label: 'Receipt / log reference', type: 'text' }],

   planting: [{ key: 'crop_or_cover', label: 'Crop / cover planted', type: 'text' }, { key: 'planting_date', label: 'Planting date', type: 'date' }, { key: 'seed_reference', label: 'Seed / field log reference', type: 'text' }],

   water_management: [{ key: 'water_practice', label: 'Water practice', type: 'text' }, { key: 'field_water_status', label: 'Field water status', type: 'select', options: ['dry', 'moist', 'flooded', 'not_applicable'] }],

   harvest: [{ key: 'crop_name', label: 'Crop', type: 'text' }, { key: 'area_ha', label: 'Area (ha)', type: 'number' }, { key: 'yield_kg', label: 'Harvest quantity (kg)', type: 'number' }],

   training: [{ key: 'training_topic', label: 'Training topic', type: 'text' }, { key: 'training_reference', label: 'Training record reference', type: 'text' }],

   field_observation: [{ key: 'observation_summary', label: 'Observation', type: 'text' }],

   farmer_note: [{ key: 'observation_summary', label: 'Farmer note', type: 'text' }],

};

const PRACTICE_OPTIONS = [

   ['no-till', 'No-till / reduced tillage'], ['cover-crop', 'Cover crops'], ['improved-rice-water-management', 'Improved rice water management'],

   ['organic-amendments', 'Compost / organic amendments'], ['agroforestry', 'Trees / agroforestry'], ['livestock-manure-management', 'Livestock / manure management'], ['other', 'Another practice'],

];

const CarbonVaultScreen: React.FC<CarbonVaultScreenProps> = ({ navigateTo }) => {

   const [loading, setLoading] = useState(true);

   const [projects, setProjects] = useState<any[]>([]);

   const [plots, setPlots] = useState<any[]>([]);

   const [activeTab, setActiveTab] = useState('projects');

   const [showEnrollModal, setShowEnrollModal] = useState(false);

   const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);

   const [selectedMethodology, setSelectedMethodology] = useState('no-till');

   const [monitoringPreview, setMonitoringPreview] = useState<any | null>(null);

   const [previewLoading, setPreviewLoading] = useState(false);

   const [showEvidenceModal, setShowEvidenceModal] = useState(false);

   const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

   const [evidenceDesc, setEvidenceDesc] = useState('');

   const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

   const [evidenceError, setEvidenceError] = useState('');

   const [uploadingEvidence, setUploadingEvidence] = useState(false);

   const [enrollLoading, setEnrollLoading] = useState(false);

   const [farmerConsent, setFarmerConsent] = useState(false);

   const [currentPractice, setCurrentPractice] = useState('');

   const [plannedPractice, setPlannedPractice] = useState('');

   const [otherPractice, setOtherPractice] = useState('');

   const [showMonitoringModal, setShowMonitoringModal] = useState(false);

   const [monitoringProjectId, setMonitoringProjectId] = useState<number | null>(null);

   const [monitoringRecordType, setMonitoringRecordType] = useState('practice_observation');

   const [monitoringDate, setMonitoringDate] = useState(new Date().toISOString().slice(0, 10));

   const [monitoringActivity, setMonitoringActivity] = useState('');

   const [monitoringQuantity, setMonitoringQuantity] = useState('');

   const [monitoringUnit, setMonitoringUnit] = useState('');

   const [monitoringNote, setMonitoringNote] = useState('');

   const [monitoringDetails, setMonitoringDetails] = useState<Record<string, string>>({});

   const [reportPeriodStart, setReportPeriodStart] = useState('');

   const [reportPeriodEnd, setReportPeriodEnd] = useState(new Date().toISOString().slice(0, 10));

   const [savingMonitoring, setSavingMonitoring] = useState(false);

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

               setMonitoringPreview(preview.analysis || preview);

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

         const [myPlots, myProjects] = await Promise.all([plotService.getPlots(), carbonService.getProjects()]);

         setPlots(myPlots || []);

         setProjects(myProjects || []);

      } catch (error) {

         console.error(error);

      } finally {

         setLoading(false);

      }

   };

   const handleEnroll = async () => {

      if (!selectedPlotId) return;

      if (!farmerConsent) {

         alert('Please confirm that you understand this is farmer enrollment record, not a promise of credits.');

         return;

      }

      const practiceToTrack = selectedMethodology === 'other' ? otherPractice.trim() : selectedMethodology;

       if (!practiceToTrack) { alert('Describe the farming practice you want to track.'); return; }

       const intakeData = { farmer_consent: true, current_practice: currentPractice.trim(), planned_practice: plannedPractice.trim() };

      setEnrollLoading(true);

      try {

         await carbonService.enrollPlot(selectedPlotId, practiceToTrack, intakeData);

         setShowEnrollModal(false);

         setFarmerConsent(false);

         setMonitoringPreview(null);

         await loadData();

      } catch (error: any) {

         console.error(error);

         const detail = error?.response?.data?.detail || 'Enrollment failed. Please try again.';

         alert(`Enrollment Error: ${detail}`);

         await loadData();

      } finally {

         setEnrollLoading(false);

      }

   };

   const handleSaveMonitoringRecord = async () => {

      if (!monitoringProjectId) return;

      const requiredFields = MONITORING_FORM_FIELDS[monitoringRecordType] || [];

      const missingFields = requiredFields.filter(field => !String(monitoringDetails[field.key] || '').trim());

      if (missingFields.length) {

         alert(`Complete these field record details first: ${missingFields.map(field => field.label).join(', ')}`);

         return;

      }

      setSavingMonitoring(true);

      try {

         await carbonService.addMonitoringRecord(monitoringProjectId, {

            record_date: monitoringDate,

            record_type: monitoringRecordType,

            observations: { ...monitoringDetails, farmer_observation: monitoringActivity.trim() || undefined, quantity: monitoringQuantity || undefined, unit: monitoringUnit || undefined },

            note: monitoringNote.trim(),

         });

         setMonitoringActivity('');

         setMonitoringQuantity('');

         setMonitoringUnit('');

         setMonitoringNote('');

         setMonitoringDetails({});

         await loadData();

         alert('Field activity saved to your project record. It does not calculate credits.');

      } catch (error: any) {

         alert(error?.response?.data?.detail || 'Monitoring record could not be saved.');

      } finally {

         setSavingMonitoring(false);

      }

   };

   const handleSubmitMonitoringReport = async () => {

      if (!monitoringProjectId || !reportPeriodStart || !reportPeriodEnd) return;

      setSavingMonitoring(true);

      try {

         const response = await carbonService.submitMonitoringReport(monitoringProjectId, { period_start: reportPeriodStart, period_end: reportPeriodEnd, farmer_report_note: monitoringNote });

         alert(response.message || 'Monitoring report prepared.');

         setShowMonitoringModal(false);

         setMonitoringNote('');

         await loadData();

      } catch (error: any) {

         alert(error?.response?.data?.detail || 'Monitoring report could not be prepared.');

      } finally {

         setSavingMonitoring(false);

      }

   };

   const handleAllocationDecision = async (projectId: number, accepted: boolean) => {

      const action = accepted ? 'accept' : 'decline';

      if (!window.confirm(accepted ? 'Accept the allocation shown in the signed agreement? Credits will be added only after you confirm.' : 'Decline this allocation proposal? No credits will be added.')) return;

      try {

         const response = await carbonService.confirmAllocation(projectId, accepted);

         alert(response.message || `Allocation ${action}ed.`);

         await loadData();

      } catch (error: any) {

         alert(error?.response?.data?.detail || `Could not ${action} allocation.`);

      }

   };

   const handleUploadEvidence = async () => {

      if (!selectedProjectId) return;

      if (!evidenceFile) {

         setEvidenceError('Choose a field photo before submitting.');

         return;

      }

      if (!evidenceFile.type.startsWith('image/')) {

         setEvidenceError('Choose a JPEG, PNG, or WebP image.');

         return;

      }

      if (evidenceFile.size > 10 * 1024 * 1024) {

         setEvidenceError('This image is larger than 10 MB. Choose a smaller photo.');

         return;

      }

      setUploadingEvidence(true);

      setEvidenceError('');

      try {

         const position = await getEvidenceUploadLocation();

         const formData = new FormData();

         formData.append('description', evidenceDesc || "Evidence photo uploaded via mobile");

         formData.append('geo_lat', position.lat.toString());

         formData.append('geo_lng', position.lng.toString());

         formData.append('file', evidenceFile);

         await carbonService.uploadEvidence(selectedProjectId, formData);

         setShowEvidenceModal(false);

         setEvidenceDesc('');

         setEvidenceFile(null);

         setEvidenceError('');

         alert('Field evidence saved to the project record. It is not independent verification.');

         await loadData();

      } catch (error: any) {

         console.error(error);

         const apiDetail = error?.response?.data?.detail;

         const detail = typeof apiDetail === 'string'

            ? apiDetail

            : error?.response?.status === 401

               ? 'Your session expired. Sign in again, then retry the upload.'

               : error?.response?.status === 413

                  ? 'The photo is too large. Choose an image under 10 MB.'

                  : error?.code === 'ERR_NETWORK' || error?.message === 'Network Error'

                     ? 'The server could not be reached. Check your connection and try again.'

                     : error?.message || 'Upload failed. Please try again.';

         setEvidenceError(detail);

      } finally {

         setUploadingEvidence(false);

      }

   };

   const handleEvidenceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {

      const file = event.target.files?.[0] || null;

      setEvidenceError('');

      if (!file) {

         setEvidenceFile(null);

         return;

      }

      if (!file.type.startsWith('image/')) {

         setEvidenceFile(null);

         setEvidenceError('Choose a JPEG, PNG, or WebP image.');

         return;

      }

      if (file.size > 10 * 1024 * 1024) {

         setEvidenceFile(null);

         setEvidenceError('This image is larger than 10 MB. Choose a smaller photo.');

         return;

      }

      setEvidenceFile(file);

   };

   const handleVerify = async (projectId: number) => {

      try {

         setEnrollLoading(true);

         const response = await carbonService.verifyProject(projectId);

         alert(response.message || 'Evidence submitted for independent review.');

         await loadData();

      } catch (error: any) {

         console.error(error);

         const detail = error?.response?.data?.detail || 'Verification failed';

         alert(`Verification failed: ${detail}`);

      } finally {

         setEnrollLoading(false);

      }

   };

   const handleUnenroll = async (projectId: number) => {

      const confirm = window.confirm("Withdraw this application? Its project record and submitted evidence will be retained for audit.");

      if (!confirm) return;

      try {

         const response = await carbonService.unenrollPlot(projectId);

         alert(response.message || "Project unenrolled successfully.");

         await loadData();

      } catch (error: any) {

         console.error(error);

         const detail = error?.response?.data?.detail || 'Failed to unenroll plot.';

         alert(`Error: ${detail}`);

      }

   };

   // Exclude plots that have an active project (ignore Audit_Failed — those can be re-enrolled)

   const activeProjectPlotIds = new Set(

      projects

         .filter((p: any) => !['Audit_Failed', 'Withdrawn'].includes(p.status))

         .map((p: any) => p.plot_id)

   );

   const unenrolledPlots = plots.filter((plot: any) => !activeProjectPlotIds.has(plot.id));

   const totalFarmerAllocation = projects.reduce((sum, project) => sum + Number(project.allocated_credits || project.available_credits || 0), 0);

   const totalCreditsSold = projects.reduce((sum, project) => sum + Number(project.credits_sold || 0), 0);

   const totalPayoutDue = projects.reduce((sum, project) => sum + Number(project.farmer_payout_due_inr || 0), 0);

   const totalPayoutPaid = projects.reduce((sum, project) => sum + Number(project.farmer_payout_paid_inr || 0), 0);

   const totalCreditsTransferred = projects.reduce((sum, project) => sum + Number(project.credits_transferred || 0), 0);

   const totalCreditsAvailable = projects.reduce((sum, project) => sum + Number(project.available_credits || 0), 0);

   const walletProjects = projects.filter(project => Boolean(project.registry_issuance_reference) && (Number(project.allocated_credits || 0) > 0 || Number(project.credits_sold || 0) > 0 || Number(project.credits_transferred || 0) > 0 || (project.sales || []).length > 0 || Number(project.farmer_payout_paid_inr || 0) > 0));

   const selectedPlot = plots.find(plot => plot.id === selectedPlotId);

   const monitoringProject = projects.find(project => project.id === monitoringProjectId);

   const evidenceProject = projects.find(project => project.id === selectedProjectId);

   const activeMonitoringFields = MONITORING_FORM_FIELDS[monitoringRecordType] || [];

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

               <p className="text-[11px] font-semibold" style={{ color: '#00BB78' }}>Farmer carbon project</p>

            </div>

         </div>

         <div className="mx-5 mt-4 rounded-3xl p-5 relative overflow-hidden" style={{ background: '#07352A' }}>

            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Accepted farmer allocation</p>

            <h3 className="text-3xl font-black text-white mt-1">{totalFarmerAllocation.toFixed(2)}<span className="text-sm ml-2 text-emerald-200">tCO₂e</span></h3>

             <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-white/80"><div><span className="block font-bold text-white">{totalCreditsAvailable.toFixed(2)} tCO₂e</span>available to you</div><div><span className="block font-bold text-white">{totalCreditsTransferred.toFixed(2)} tCO₂e</span>transferred to your registry</div><div><span className="block font-bold text-white">{totalCreditsSold.toFixed(2)} tCO₂e</span>sold by partner</div><div><span className="block font-bold text-white">₹{totalPayoutPaid.toFixed(0)} / ₹{totalPayoutDue.toFixed(0)}</span>paid / due</div></div>

            <p className="text-xs mt-2 text-white/70">Only confirmed external registry issues and accepted farmer allocations count here. Sales and payouts are recorded separately below.</p>

         </div>

         <div className="mx-5 mt-4 p-1 rounded-2xl flex gap-1" style={{ background: '#E9EFEC' }}>

            {(['projects', 'registry'] as const).map(tab => (

               <button key={tab} onClick={() => setActiveTab(tab)} className="flex-1 py-2.5 text-sm font-bold rounded-xl capitalize"

                  style={{ background: activeTab === tab ? '#fff' : 'transparent', color: activeTab === tab ? '#07352A' : '#66766F', boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>

                  {tab === 'projects' ? 'My projects' : 'Credits & payments'}

               </button>

            ))}

         </div>

         <div className="flex-1 overflow-y-auto px-5 py-4 pb-24 space-y-4">

            {loading ? (

               <div className="flex flex-col items-center justify-center py-20 gap-3">

                  <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #E8FBF3', borderTopColor: '#07966E' }} />

                  <p className="text-sm font-medium" style={{ color: '#66766F' }}>Loading project records…</p>

               </div>

            ) : activeTab === 'projects' ? (

               <>

                  <section className="rounded-2xl p-4 space-y-3" style={{ background: '#fff', border: '1px solid #E4ECE8' }}>

                     <div className="flex items-start justify-between gap-3">

                        <div><p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#07966E' }}>Farmer carbon journey</p><h3 className="text-sm font-extrabold mt-1" style={{ color: '#07352A' }}>From field practice to farmer payment</h3></div>

                        <span className="rounded-full px-2.5 py-1 text-[9px] font-bold whitespace-nowrap" style={{ color: '#765000', background: '#FFF4D8' }}>Partner + registry steps are external</span>

                     </div>

                     <div className="grid grid-cols-2 gap-2">

                        {[

                           ['1', 'Enroll', 'Farmer chooses a plot, records current and planned practice, and signs terms.'],

                           ['2', 'Monitor', 'Farmer logs dated field activities and saves evidence through the season.'],

                           ['3', 'Review', 'Project partner checks records; an independent reviewer validates and verifies results.'],

                           ['4', 'Issue', 'The registry records credits after the external project process is complete.'],

                           ['5', 'Agree share', 'Partner proposes a signed credit quantity and any cash share; farmer reviews and accepts.'],

                           ['6', 'Receive value', 'Either registry units transfer to the farmer account, or the partner sells externally and pays the agreed share.'],

                        ].map(([number, title, description]) => <div key={number} className="rounded-xl p-3" style={{ background: '#F7FAF8', border: '1px solid #E8EFEB' }}><p className="text-[10px] font-black uppercase" style={{ color: '#07966E' }}>Step {number} · {title}</p><p className="mt-1 text-[10px] leading-relaxed" style={{ color: '#49645A' }}>{description}</p></div>)}

                     </div>

                     <p className="text-[10px] leading-relaxed" style={{ color: '#66766F' }}>This app records the farmer's evidence and external references. It does not submit to a registry, create credits, sell units, or move money.</p>

                  </section>

                  <div className="rounded-2xl p-3 text-xs leading-relaxed" style={{ background: '#FFF8E8', color: '#765000' }}>Enrollment opens your project intake and records the farming practice you plan to follow. Credits appear only after a registry issue is confirmed and you accept a written farmer allocation. This app records those events; it does not calculate or issue credits, transfer registry units, or send payments.</div>

                  {projects.filter(project => project.status !== 'Withdrawn').length === 0 && (

                     <div className="py-8 flex flex-col items-center text-center rounded-2xl bg-white">

                        <p className="text-sm font-semibold" style={{ color: '#07352A' }}>No active carbon project yet</p>

                        <p className="text-xs mt-1 px-6" style={{ color: '#66766F' }}>Enroll a plot to start a project record and collect dated field evidence. Enrollment itself does not generate credits.</p>

                     </div>

                  )}

                  {projects.filter(project => project.status !== 'Withdrawn').map(project => (

                     <article key={project.id} className="bg-white rounded-2xl p-4 space-y-3" style={{ border: '1px solid #E4ECE8', boxShadow: '0 3px 12px rgba(7,53,42,.04)' }}>

                        <div className="flex items-start justify-between gap-3">

                           <div className="min-w-0">

                              <h4 className="font-bold text-sm truncate" style={{ color: '#07352A' }}>{project.plot_name}</h4>

                              <p className="text-[11px] mt-1" style={{ color: '#66766F' }}>Practice: {project.methodology} · {project.evidence_count || 0} evidence item(s)</p>

                           </div>

                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-right" style={{ background: ['Issued', 'Farmer_Allocated'].includes(project.status)  ? '#E8FBF3' : '#F3F6F4', color: ['Issued', 'Farmer_Allocated'].includes(project.status)  ? '#087A55' : '#66766F' }}>

                               {project.status === 'Under_Review' ? 'Evidence review' : project.status === 'Evidence_Pending' ? 'Evidence submitted' : project.status === 'Audit_Failed' ? 'Changes requested' : project.status === 'Legacy_Unverified' ? 'Historical · unverified' : projectStageLabel(project, project.workflow_stage || project.status)}

                           </span>

                        </div>

                        <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: '#F7FAF8', color: '#66766F' }}>Satellite signals may support monitoring; only independent verification and a confirmed external registry issue count as credits.</div>

                        <div className="rounded-xl p-3" style={{ background: '#F5F9F7', border: '1px solid #E4ECE8' }}>

                           <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#66766F' }}>Project progress</p><p className="text-[10px] font-bold" style={{ color: '#087A55' }}>{Math.max(1, Math.min(CARBON_WORKFLOW_STAGES.length, CARBON_WORKFLOW_STAGES.indexOf(currentProjectStage(project)) + 1))} / {CARBON_WORKFLOW_STAGES.length} steps</p></div>

                           <p className="mt-2 text-[10px] font-semibold" style={{ color: '#087A55' }}>Farmer outcome: {projectOutcomeStatus(project)}</p>

                           <p className="mt-1 text-[10px] leading-relaxed" style={{ color: '#66766F' }}>After you accept the written allocation, the partner records the agreed delivery: registry units transferred to your account, or a buyer sale and your payment. Each completed event should show its external transaction reference below.</p>

                           <p className="mt-2 text-[10px] leading-relaxed" style={{ color: '#66766F' }}>Expand the current step to see who acts, what the farmer does, and what proof to keep. The partner records references after each external handoff.</p>

                           <div className="mt-2 space-y-1.5">{CARBON_WORKFLOW_STAGES.map((stage, index) => {

                              const stageIndex = CARBON_WORKFLOW_STAGES.indexOf(currentProjectStage(project));

                              const activeIndex = stageIndex < 0 ? 0 : stageIndex;

                              const completed = activeIndex > index;

                              const current = index === activeIndex;

                              const reached = completed || current;

                              const guidance = CARBON_STAGE_GUIDANCE[stage];

                              return <details key={stage} open={current} className="rounded-lg px-2 py-1.5" style={{ background: current ? '#EAF8F2' : 'transparent' }}><summary className="flex cursor-pointer list-none items-center gap-2 text-[10px]" style={{ color: reached ? '#087A55' : '#83918A' }}><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: completed ? '#08A571' : current ? '#E9A700' : '#D6DED9' }} /><span className={current ? 'font-extrabold' : 'font-medium'}>{CARBON_STAGE_LABELS[stage]}</span>{current && <span className="ml-auto font-bold uppercase tracking-wide">{stage === 'Farmer_Payout_Recorded' && hasSales && !payoutComplete ? 'Payment due' : 'Current'}</span>}</summary><div className="ml-3.5 mt-2 space-y-1.5 border-l pl-2.5 text-[10px] leading-relaxed" style={{ borderColor: '#CBE8D9', color: '#49645A' }}><p><strong>Responsible:</strong> {guidance.owner}</p><p>{guidance.action}</p><p><strong>Your part:</strong> {guidance.farmer}</p><p><strong>Keep / ask for:</strong> {guidance.proof}</p></div></details>;

                           })}</div>

                        </div>

                         {Object.keys(project.intake_data || {}).length > 0 && <details className="rounded-xl p-3" style={{ background: '#F7FAF8', border: '1px solid #E4ECE8' }}><summary className="cursor-pointer text-xs font-bold" style={{ color: '#07352A' }}>Farmer intake details</summary><pre className="mt-2 whitespace-pre-wrap break-words text-[10px]" style={{ color: '#66766F' }}>{JSON.stringify(project.intake_data, null, 2)}</pre></details>}

                         {(project.monitoring_records || []).length > 0 && <details className="rounded-xl p-3" style={{ background: '#F7FAF8', border: '1px solid #E4ECE8' }}><summary className="cursor-pointer text-xs font-bold" style={{ color: '#07352A' }}>Monitoring log · {project.monitoring_records.length} record(s)</summary><div className="mt-2 space-y-2">{project.monitoring_records.map((record: any, index: number) => <div key={`${record.recorded_at || record.record_date}-${index}`} className="rounded-lg bg-white p-2 text-[10px]" style={{ color: '#49645A' }}><strong>{record.record_date} · {String(record.record_type || '').replaceAll('_', ' ')}</strong><p>{Object.entries(record.observations || {}).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`).join(' · ') || 'Field record saved'}</p></div>)}</div></details>}

                         {(project.workflow_history || []).length > 0 && <details className="rounded-xl p-3" style={{ background: '#F7FAF8', border: '1px solid #E4ECE8' }}><summary className="cursor-pointer text-xs font-bold" style={{ color: '#07352A' }}>Audit trail · {project.workflow_history.length} event(s)</summary><div className="mt-2 space-y-2">{project.workflow_history.map((event: any, index: number) => <div key={`${event.recorded_at || index}-${index}`} className="border-l-2 pl-2 text-[10px]" style={{ borderColor: '#08A571', color: '#49645A' }}><strong>{event.to_stage ? (projectStageLabel(project, event.to_stage)) : String(event.action || 'record').replaceAll('_', ' ')}</strong><span className="ml-2 text-[#819089]">{event.recorded_at ? new Date(event.recorded_at).toLocaleDateString() : ''}</span>{event.metadata?.aggregate_monitoring_report_reference && <p className="break-all">Project report submitted for review: {event.metadata.aggregate_monitoring_report_reference}</p>}{event.metadata?.participant_roster_reference && <p>Project roster ID: {event.metadata.participant_roster_reference}</p>}{event.metadata?.registry_issuance_reference && <p className="break-all">Registry: {event.metadata.registry_issuance_reference}</p>}{event.metadata?.agreement_reference && <p className="break-all">Agreement: {event.metadata.agreement_reference}</p>}{event.metadata?.credits && <p>{event.metadata.credits} tCO₂e</p>}{event.metadata?.report_digest_sha256 && <div className="mt-1 rounded-lg p-2" style={{ background: '#EAF8F2' }}><p>Monitoring package: {event.metadata.record_count} records · SHA-256 checksum</p><code className="mt-1 block break-all">{event.metadata.report_digest_sha256}</code><p className="mt-1">{event.metadata.report_digest_note}</p></div>}</div>)}</div></details>}

                        {['Issued', 'Allocation_Pending', 'Farmer_Allocated'].includes(project.status) && project.registry_issuance_reference ? (

                           <div className="rounded-xl p-3 space-y-1" style={{ background: '#EAF8F2' }}>

                              <p className="text-xs font-bold" style={{ color: '#087A55' }}>{project.shared_registry_issue ? 'Project partner group issue' : 'External registry issue'}: {Number(project.issued_credits || 0).toFixed(4)} tCO₂e</p>

                              <p className="text-xs" style={{ color: '#49645A' }}>Farmer share accepted: {Number(project.allocated_credits || project.available_credits || 0).toFixed(4)} tCO₂e · {project.farmer_share_percentage == null ? 'direct transfer agreement' : `${Number(project.farmer_share_percentage).toFixed(2)}% of net sale proceeds`}</p>

                              <p className="text-xs" style={{ color: '#49645A' }}>Sold: {Number(project.credits_sold || 0).toFixed(4)} tCO₂e · Directly transferred: {Number(project.credits_transferred || 0).toFixed(4)} tCO₂e · Remaining: {Number(project.available_credits || 0).toFixed(4)} tCO₂e</p>

                              <p className="text-xs" style={{ color: '#49645A' }}>Farmer proceeds: ₹{Number(project.farmer_payout_due_inr || 0).toFixed(2)} due · ₹{Number(project.farmer_payout_paid_inr || 0).toFixed(2)} paid</p>

                              <p className="text-[11px] break-all" style={{ color: '#66766F' }}>{project.registry_name || 'Registry'} · {project.registry_issuance_reference}</p>

                              {project.registry_serial_reference && <p className="text-[11px] break-all" style={{ color: '#66766F' }}>Serial: {project.registry_serial_reference}</p>}

                              <p className="text-[10px] leading-relaxed" style={{ color: '#49645A' }}>Your share is tracked against the external issue. Sale and payment appear below only after the project partner records settlement and a completed transfer reference.</p>

                              {(project.transfers || []).map((transfer: any) => <div key={transfer.transfer_reference} className="mt-2 rounded-lg bg-white p-2 text-[10px]" style={{ color: '#49645A' }}><strong>Registry transfer · {transfer.transfer_reference}</strong><p>{Number(transfer.credits_transferred || 0).toFixed(4)} tCO₂e to account {transfer.registry_account_reference}</p><p className="break-all">Serials: {transfer.serial_reference} · {transfer.transfer_date}</p></div>)}

                               {(project.sales || []).map((sale: any) => <div key={sale.sale_reference} className="mt-2 rounded-lg bg-white p-2 text-[10px]" style={{ color: '#49645A' }}><strong>{sale.buyer_name || 'Buyer'} · {sale.sale_reference}</strong><p>{Number(sale.credits_sold || 0).toFixed(4)} tCO₂e sold · Net proceeds ₹{Number(sale.net_proceeds_inr || 0).toFixed(2)}</p><p>Your agreed share due: ₹{Number(sale.farmer_share_due_inr || 0).toFixed(2)} · buyer settlement {sale.settlement_reference || 'reference unavailable'}</p>{(project.payouts || []).filter((payment: any) => payment.sale_reference === sale.sale_reference).map((payment: any) => <p key={payment.payment_reference}>Paid ₹{Number(payment.amount_paid_inr || 0).toFixed(2)} via {payment.payment_method || 'transfer'} · {payment.payment_reference} · {payment.payment_date}</p>)}</div>)}

                           </div>

                        ) : project.status === 'Verified' ? (

                           <div className="rounded-xl p-3 text-xs" style={{ background: '#FFF8E8', color: '#765000' }}>Independent verification is recorded, but verification is not issuance. Credits remain at zero until an external registry issue and the farmer’s documented share are confirmed.</div>

                        ) : project.status === 'Legacy_Unverified' ? (

                           <div className="rounded-xl p-3 text-xs" style={{ background: '#FFF1EF', color: '#8B3029' }}>This historical record has no supported verification and registry references, so it is excluded from credit totals.</div>

                        ) : null}

                        {project.status === 'Allocation_Pending' && <div className="rounded-xl p-3 space-y-2" style={{ background: '#FFF8E8', color: '#765000' }}><p className="text-xs font-bold">Review your proposed allocation</p><p className="text-[11px]">Quantity: <strong>{Number(project.pending_allocation?.credits || 0).toFixed(4)} tCO₂e</strong> · {project.pending_allocation?.farmer_share_percentage == null ? 'direct registry transfer (no cash share recorded)' : `${Number(project.pending_allocation.farmer_share_percentage).toFixed(2)}% of net sale proceeds`}</p><p className="break-all text-[10px]">Signed agreement: {project.pending_allocation?.agreement_reference || 'reference missing'} · Registry issue: {project.pending_allocation?.registry_issuance_reference || 'reference missing'}</p>{project.pending_allocation?.admin_note && <p className="text-[11px]">Partner note: {project.pending_allocation.admin_note}</p>}<p className="text-[11px]">Accept only if the quantity and agreement match what you signed. After acceptance, the partner must record a completed registry transfer or sell externally and pay the agreed proceeds.</p><div className="flex gap-2"><button onClick={() => handleAllocationDecision(project.id, true)} className="flex-1 rounded-lg py-2 text-xs font-bold text-white" style={{ background: '#07966E' }}>Accept allocation</button><button onClick={() => handleAllocationDecision(project.id, false)} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: '#F1E8E2', color: '#765000' }}>Decline</button></div></div>}

                        {(project.methodology_code || project.project_registry_reference || project.registry_issuance_reference) && (

                           <details className="rounded-xl p-3" style={{ background: '#F7FAF8', border: '1px solid #E4ECE8' }}>

                              <summary className="cursor-pointer text-xs font-bold" style={{ color: '#07352A' }}>Project and external references</summary>

                              <div className="mt-2 space-y-1 text-[11px] break-all" style={{ color: '#66766F' }}>

                                 {project.crediting_program && <p>Programme / protocol: {project.crediting_program} · {project.methodology_code}</p>}

                                 {project.project_registry_reference && <p>Registered project: {project.project_registry_reference}</p>}

                                 {project.project_participant_reference && <p>Project participant ID: {project.project_participant_reference}</p>}

                                 {project.aggregate_monitoring_report_reference && <p>Project report submitted for review: {project.aggregate_monitoring_report_reference}</p>}

                                 {project.validation_agency && <p>Validation: {project.validation_agency} · {project.validation_report_reference || 'report reference not recorded'}</p>}

                                 {project.verification_agency && <p>Verification: {project.verification_agency} · {project.verification_report_reference || 'report reference not recorded'}</p>}

                                 {(project.monitoring_period_start || project.monitoring_period_end) && <p>Monitoring period: {project.monitoring_period_start || '—'} to {project.monitoring_period_end || '—'}</p>}

                                 {project.registry_project_reference && <p>Registry project: {project.registry_project_reference}</p>}

                                 {project.registry_issuance_reference && <p>Issuance reference: {project.registry_issuance_reference}</p>}

                                 {project.registry_serial_reference && <p>Registry serial: {project.registry_serial_reference}</p>}

                                 {project.farmer_allocation_agreement_reference && <p>Farmer allocation agreement: {project.farmer_allocation_agreement_reference}</p>}

                                 {project.registry_recorded_at && <p>Recorded in this app: {new Date(project.registry_recorded_at).toLocaleDateString()}</p>}

                              </div>

                           </details>

                        )}

                        <div className="flex gap-2">

                            {['Intake_Submitted', 'Entity_Onboarding', 'PDD_Preparation', 'Public_Consultation', 'Validation', 'Registration_Review', 'Registered', 'Monitoring', 'Analyzing', 'Enrolled', 'Audit_Failed'].includes(project.status) && (

                               <button onClick={() => { setSelectedProjectId(project.id); setShowEvidenceModal(true); }} className="flex-1 py-3 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2" style={{ background: '#07352A' }}><Upload size={14} /> Add field evidence</button>

                           )}

                            {project.status === 'Monitoring' && <button onClick={() => { setMonitoringProjectId(project.id); setMonitoringRecordType('practice_observation'); setMonitoringDetails({}); setMonitoringDate(new Date().toISOString().slice(0, 10)); setReportPeriodStart(project.monitoring_period_start || project.start_date?.slice(0, 10) || new Date().toISOString().slice(0, 10)); setReportPeriodEnd(new Date().toISOString().slice(0, 10)); setShowMonitoringModal(true); }} className="flex-1 py-3 rounded-xl text-xs font-bold" style={{ background: '#EAF8F2', color: '#087A55' }}>Log field activity · {project.monitoring_records?.length || 0}</button>}

                            {project.status === 'Registered' && <div className="flex-1 py-3 rounded-xl text-xs font-semibold text-center" style={{ background: '#F3F6F4', color: '#66766F' }}>Project partner must set the monitoring period</div>}

                            {project.status === 'Monitoring' && <button onClick={() => { setMonitoringProjectId(project.id); setReportPeriodStart(project.monitoring_period_start || project.start_date?.slice(0, 10) || new Date().toISOString().slice(0, 10)); setReportPeriodEnd(new Date().toISOString().slice(0, 10)); setShowMonitoringModal(true); }} className="flex-1 py-3 rounded-xl text-xs font-bold" style={{ background: '#07352A', color: '#fff' }}>Prepare monitoring report</button>}

                           {project.status === 'Evidence_Pending' && (

                              <button onClick={() => handleVerify(project.id)} disabled={enrollLoading} className="flex-1 py-3 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: '#07966E' }}>{enrollLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Submit evidence for review</button>

                           )}

                           {project.status === 'Under_Review' && <div className="flex-1 py-3 rounded-xl text-xs font-semibold text-center" style={{ background: '#FFF8E8', color: '#765000' }}>Awaiting project partner review</div>}

                            {project.status === 'Verified' && <div className="flex-1 py-3 rounded-xl text-xs font-semibold text-center" style={{ background: '#FFF8E8', color: '#765000' }}>Independent verification recorded · registry review follows</div>}

                           {['Analyzing', 'Enrolled', 'Evidence_Pending', 'Audit_Failed'].includes(project.status) && <button onClick={() => handleUnenroll(project.id)} className="px-4 py-3 rounded-xl text-xs font-bold" style={{ background: '#F3F5F4', color: '#66766F' }}>Withdraw</button>}

                        </div>

                     </article>

                  ))}

                  {unenrolledPlots.length > 0 && (

                     <section className="space-y-2 pt-2">

                        <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#66766F' }}>Plots available to enroll</p>

                        <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E4ECE8' }}>

                           {unenrolledPlots.map(plot => (

                              <div key={plot.id} className="flex items-center gap-3 px-4 py-3.5 border-b last:border-0" style={{ borderColor: '#F0F3F1' }}>

                                 <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EAF8F2' }}>🌿</div>

                                 <div className="flex-1 min-w-0"><h4 className="text-sm font-bold truncate" style={{ color: '#07352A' }}>{plot.name}</h4><p className="text-[11px]" style={{ color: '#66766F' }}>{Number(plot.area || 0).toFixed(2)} acres · {plot.crop_type}</p></div>

                                  <button onClick={() => { setSelectedPlotId(plot.id); setSelectedMethodology('no-till'); setFarmerConsent(false); setCurrentPractice(''); setPlannedPractice(''); setOtherPractice(''); setMonitoringPreview(null); setShowEnrollModal(true); }} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#07966E' }}>Enroll</button>

                              </div>

                           ))}

                        </div>

                     </section>

                  )}

               </>

            ) : (

               <>

                  <div className="rounded-2xl p-4 text-xs leading-relaxed bg-white" style={{ color: '#49645A', border: '1px solid #E4ECE8' }}>This ledger shows confirmed external issuance, your accepted share, settled sales, and recorded transfers. Registry access and bank / UPI payments are external; each completed step needs its supporting reference.</div>

                  <section className="grid grid-cols-2 gap-2">

                     {[

                        ['Allocated to you', `${totalFarmerAllocation.toFixed(2)} tCO₂e`],

                        ['Still available', `${totalCreditsAvailable.toFixed(2)} tCO₂e`],

                        ['Transferred to your registry', `${totalCreditsTransferred.toFixed(2)} tCO₂e`],

                        ['Sold', `${totalCreditsSold.toFixed(2)} tCO₂e`],

                        ['Paid / due', `₹${totalPayoutPaid.toFixed(0)} / ₹${totalPayoutDue.toFixed(0)}`],

                     ].map(([label, value]) => <div key={label} className="rounded-xl bg-white p-3" style={{ border: '1px solid #E4ECE8' }}><p className="text-[10px] font-bold uppercase" style={{ color: '#819089' }}>{label}</p><p className="mt-1 text-sm font-extrabold" style={{ color: '#07352A' }}>{value}</p></div>)}

                  </section>

                  {walletProjects.length === 0 ? (

                     <div className="py-8 flex flex-col items-center text-center rounded-2xl bg-white" style={{ border: '1px solid #E4ECE8' }}>

                        <ShieldCheck size={24} className="mb-2" style={{ color: '#07966E' }} />

                        <p className="text-sm font-semibold" style={{ color: '#07352A' }}>No confirmed farmer allocation yet</p>

                        <p className="text-xs mt-1 px-5" style={{ color: '#66766F' }}>After external registry issuance, your project partner can propose a signed share for you to review and accept.</p>

                     </div>

                  ) : walletProjects.map(project => (

                     <article key={project.id} className="rounded-2xl bg-white p-4 space-y-3" style={{ border: '1px solid #E4ECE8' }}>

                        <div className="flex justify-between gap-3"><div><p className="text-sm font-bold" style={{ color: '#07352A' }}>{project.plot_name}</p><p className="text-[10px]" style={{ color: '#66766F' }}>Practice: {project.methodology}</p></div><strong className="text-xs whitespace-nowrap" style={{ color: '#07966E' }}>{Number(project.available_credits || 0).toFixed(2)} tCO₂e available</strong></div>

                        <div className="rounded-xl p-3 space-y-1" style={{ background: '#F5F9F7' }}>

                           <p className="text-xs" style={{ color: '#49645A' }}>Accepted allocation: <strong>{Number(project.allocated_credits || 0).toFixed(4)} tCO₂e</strong>{project.farmer_share_percentage != null ? ` · ${Number(project.farmer_share_percentage).toFixed(2)}% of net sale proceeds` : ''}</p>

                           <p className="text-xs" style={{ color: '#49645A' }}>Sold: <strong>{Number(project.credits_sold || 0).toFixed(4)} tCO₂e</strong> · Registry transfer: <strong>{Number(project.credits_transferred || 0).toFixed(4)} tCO₂e</strong> · Remaining: {Number(project.available_credits || 0).toFixed(4)} tCO₂e</p>

                           <p className="text-xs" style={{ color: '#49645A' }}>Farmer proceeds: <strong>₹{Number(project.farmer_payout_paid_inr || 0).toFixed(2)} paid</strong> · ₹{Math.max(0, Number(project.farmer_payout_due_inr || 0) - Number(project.farmer_payout_paid_inr || 0)).toFixed(2)} unpaid</p>

                           <p className="break-all text-[10px]" style={{ color: '#66766F' }}>{project.registry_name || 'External registry'} · Issue {project.registry_issuance_reference}</p>

                           {project.registry_serial_reference && <p className="break-all text-[10px]" style={{ color: '#66766F' }}>Serials: {project.registry_serial_reference}</p>}

                           {project.allocation_agreement_reference && <p className="break-all text-[10px]" style={{ color: '#66766F' }}>Signed agreement: {project.allocation_agreement_reference}</p>}

                        </div>

                        {(project.transfers || []).map((transfer: any) => <div key={transfer.transfer_reference} className="rounded-xl p-3 space-y-1" style={{ background: '#EAF8F2' }}><p className="text-xs font-bold" style={{ color: '#087A55' }}>Registry units transferred · {transfer.transfer_reference}</p><p className="text-[11px]" style={{ color: '#49645A' }}>{Number(transfer.credits_transferred || 0).toFixed(4)} tCO₂e to account {transfer.registry_account_reference}</p><p className="break-all text-[10px]" style={{ color: '#66766F' }}>Serials: {transfer.serial_reference} · {transfer.transfer_date}</p></div>)}

                        {(project.sales || []).length > 0 ? project.sales.map((sale: any) => {

                           const salePayments = (project.payouts || []).filter((payment: any) => payment.sale_reference === sale.sale_reference);

                           const paid = salePayments.reduce((sum: number, payment: any) => sum + Number(payment.amount_paid_inr || 0), 0);

                           return <div key={sale.sale_reference} className="rounded-xl p-3 space-y-1" style={{ background: '#F7FAF8', border: '1px solid #E4ECE8' }}>

                              <p className="text-xs font-bold" style={{ color: '#07352A' }}>{sale.buyer_name || 'Buyer'} · {sale.sale_reference}</p>

                              <p className="text-[11px]" style={{ color: '#49645A' }}>{Number(sale.credits_sold || 0).toFixed(4)} tCO₂e · net sale ₹{Number(sale.net_proceeds_inr || 0).toFixed(2)} · your share ₹{Number(sale.farmer_share_due_inr || 0).toFixed(2)}</p>

                              <p className="break-all text-[10px]" style={{ color: '#66766F' }}>Buyer settlement: {sale.settlement_reference || 'not recorded'} · {sale.settlement_date || ''}</p>

                              {salePayments.map((payment: any) => <p key={payment.payment_reference} className="break-all text-[10px]" style={{ color: '#087A55' }}>Payment: ₹{Number(payment.amount_paid_inr || 0).toFixed(2)} via {payment.payment_method || 'transfer'} · {payment.payment_reference} · {payment.payment_date}</p>)}

                              {paid + 0.009 < Number(sale.farmer_share_due_inr || 0) && <p className="text-[10px] font-semibold" style={{ color: '#956100' }}>Payment pending: ₹{(Number(sale.farmer_share_due_inr || 0) - paid).toFixed(2)}</p>}

                           </div>;

                        }) : <p className="text-[11px]" style={{ color: '#66766F' }}>No settled buyer sale has been recorded yet.</p>}

                     </article>

                  ))}

               </>

            )}

         </div>

         {/* ── ENROLL MODAL ── */}

         {showEnrollModal && (

            <div className="absolute inset-0 z-50 bg-black/50 flex items-end justify-center backdrop-blur-sm">

               <div className="bg-white w-full rounded-t-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">

                  <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E0E0E0' }} />

                  <h3 className="text-lg font-black mb-4" style={{ color: '#001A11' }}>Enroll a field</h3>

                  <div className="space-y-4 mb-6">

                     <div className="p-4 rounded-2xl" style={{ background: '#F7F9F8', border: '1px solid #EFEFEF' }}>

                        <p className="text-[10px] uppercase font-black mb-1" style={{ color: '#616B68' }}>Selected plot</p>

                        <h4 className="text-base font-black" style={{ color: '#001A11' }}>{selectedPlot?.name || 'Farm plot'}</h4>

                        <p className="text-xs mt-1" style={{ color: '#616B68' }}>This starts an enrollment record. The project partner and independent reviewers decide whether results become registry credits.</p>

                     </div>

                     <div>

                        <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Practice to track</label>

                        <div className="grid grid-cols-2 gap-2">

                           {PRACTICE_OPTIONS.map(([value, label]) => <button key={value} type="button" onClick={() => setSelectedMethodology(value)} className="min-h-[54px] rounded-xl p-3 text-left text-xs font-bold" style={{ border: `1.5px solid ${selectedMethodology === value ? '#00BB78' : '#E4ECE8'}`, background: selectedMethodology === value ? '#E8FBF3' : '#fff', color: '#07352A' }}>{label}</button>)}

                        </div>

                         {selectedMethodology === 'other' && <label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>Describe the practice<textarea value={otherPractice} onChange={event => setOtherPractice(event.target.value)} placeholder="Enter any farming practice you want this project to track" rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>}

                     </div>

                     <div className="space-y-3 rounded-2xl p-4" style={{ background: '#F7F9F8', border: '1px solid #E4ECE8' }}>

                        <p className="text-xs font-bold" style={{ color: '#07352A' }}>Farmer practice baseline and plan</p>

                        <label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>What do you do on this field now?<textarea value={currentPractice} onChange={event => setCurrentPractice(event.target.value)} placeholder="Describe the current practice and recent history" rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>

                        <label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>What practice do you plan to adopt?<textarea value={plannedPractice} onChange={event => setPlannedPractice(event.target.value)} placeholder="Describe the change you plan to make and when" rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>

                     </div>

                     <label className="flex items-start gap-2 rounded-xl p-3 text-[11px] leading-relaxed" style={{ background: '#E8FBF3', color: '#07352A' }}><input type="checkbox" checked={farmerConsent} onChange={event => setFarmerConsent(event.target.checked)} className="mt-0.5" /><span>I consent to save this field and practice information and understand enrollment does not guarantee verification, registry issuance, a credit quantity, or payment.</span></label>

                     <div className="p-3 rounded-xl flex gap-3 items-start" style={{ background: '#F7F9F8' }}>

                        <AlertCircle size={15} style={{ color: '#00BB78', marginTop: 2 }} />

                        <p className="text-xs leading-relaxed" style={{ color: '#49645A' }}>The partner sets the monitoring plan. Keep dated field records, photos, receipts, and measurements. Credits are counted only after external verification and registry issuance are recorded.</p>

                     </div>

                  </div>

                  <div className="flex gap-3">

                     <button onClick={() => { setShowEnrollModal(false); setMonitoringPreview(null); }} className="flex-1 py-3.5 text-sm font-bold rounded-2xl" style={{ color: '#616B68', background: '#F5F5F5' }}>Cancel</button>

                     <button onClick={handleEnroll} disabled={enrollLoading || !farmerConsent || !currentPractice.trim() || !plannedPractice.trim() || (selectedMethodology === 'other' && !otherPractice.trim())} className="flex-1 py-3.5 text-white text-sm font-bold rounded-2xl disabled:opacity-50" style={{ background: '#00BB78' }}>{enrollLoading ? 'Enrolling…' : 'Start enrollment'}</button>

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

                        <p className="text-xs leading-relaxed" style={{ color: '#001A11' }}>Upload a GPS-tagged field photo for {evidenceProject?.methodology || 'this project'}. This app stores field evidence for the project partner. It does not submit external reports or independently verify the evidence.</p>

                     </div>

                     <div>

                        <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: '#616B68' }}>Description</label>

                        <textarea

                           className="w-full rounded-xl p-3 text-sm font-medium outline-none transition-all"

                           style={{ background: '#F7F9F8', border: '1.5px solid #EBEBEB' }}

                           placeholder="Describe the field photo and the activity it documents"

                           rows={3}

                           value={evidenceDesc}

                           onChange={(event) => setEvidenceDesc(event.target.value)}

                        />

                     </div>

                     <label className="rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-green-50" style={{ border: '1.5px dashed #A5FFA7' }}>

                        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handleEvidenceFileChange} />

                        {evidenceFile ? (

                           <>

                              <CheckCircle2 size={22} style={{ color: '#00BB78' }} />

                              <span className="text-xs font-bold truncate max-w-full px-4" style={{ color: '#001A11' }}>{evidenceFile.name}</span>

                              <span className="text-[10px]" style={{ color: '#616B68' }}>Tap to change photo</span>

                           </>

                        ) : (

                           <>

                              <Upload size={22} style={{ color: '#00BB78' }} />

                              <span className="text-xs font-bold" style={{ color: '#616B68' }}>Tap to attach geotagged photo</span>

                           </>

                        )}

                     </label>

                  </div>

                  {evidenceError && (

                     <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">

                        {evidenceError}

                     </div>

                  )}

                  <div className="flex gap-3">

                     <button onClick={() => { if (!uploadingEvidence) setShowEvidenceModal(false); }} disabled={uploadingEvidence}

                        className="flex-1 py-3.5 text-sm font-bold rounded-2xl disabled:opacity-60" style={{ color: '#616B68', background: '#F5F5F5' }}>

                        Cancel

                     </button>

                     <button onClick={handleUploadEvidence} disabled={uploadingEvidence}

                        className="flex-1 py-3.5 text-white text-sm font-bold rounded-2xl disabled:opacity-60" style={{ background: '#001A11' }}>

                        {uploadingEvidence ? 'Uploading...' : 'Save field evidence'}

                     </button>

                  </div>

               </div>

            </div>

         )}

          {showMonitoringModal && monitoringProject && (

             <div className="absolute inset-0 z-[55] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="presentation" onClick={() => setShowMonitoringModal(false)}>

                <section className="w-full max-h-[94%] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="monitoring-title" onClick={event => event.stopPropagation()}>

                   <div className="flex items-start justify-between gap-3">

                      <div><p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#07966E' }}>Farmer field record</p><h3 id="monitoring-title" className="mt-1 text-lg font-black" style={{ color: '#07352A' }}>Project monitoring log</h3><p className="mt-1 text-xs" style={{ color: '#66766F' }}>{monitoringProject.plot_name} · {monitoringProject.methodology}</p></div>

                      <button type="button" onClick={() => setShowMonitoringModal(false)} className="rounded-full px-3 py-1 text-xl" aria-label="Close monitoring log" style={{ background: '#F2F5F3', color: '#49645A' }}>×</button>

                   </div>

                   <div className="mt-4 rounded-xl p-3 text-[11px] leading-relaxed" style={{ background: '#FFF8E8', color: '#765000' }}>Record dated farm activities and keep the original evidence. These records do not calculate credit quantities; an independent verifier must review project results.</div>

                   <div className="mt-4 space-y-3">

                      <label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>Record date<input type="date" value={monitoringDate} max={new Date().toISOString().slice(0, 10)} onChange={event => setMonitoringDate(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>

                      <label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>Field activity type<select value={monitoringRecordType} onChange={event => { setMonitoringRecordType(event.target.value); setMonitoringDetails({}); }} className="mt-1 w-full rounded-lg border p-2 text-sm">{Object.keys(MONITORING_FORM_FIELDS).map(value => [value, value.replaceAll('_', ' ')]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>

                      <div className="space-y-3 rounded-xl p-3" style={{ background: '#F5F9F7', border: '1px solid #E4ECE8' }}>

                         {activeMonitoringFields.map(field => <label key={field.key} className="block text-[11px] font-bold" style={{ color: '#66766F' }}>{field.label}{field.type === 'select' ? <select value={monitoringDetails[field.key] || ''} onChange={event => setMonitoringDetails(previous => ({ ...previous, [field.key]: event.target.value }))} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Select…</option>{field.options?.map(option => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select> : <input type={field.type || 'text'} min={field.type === 'number' ? '0' : undefined} step={field.type === 'number' ? 'any' : undefined} value={monitoringDetails[field.key] || ''} onChange={event => setMonitoringDetails(previous => ({ ...previous, [field.key]: event.target.value }))} className="mt-1 w-full rounded-lg border p-2 text-sm" />}</label>)}

                         <p className="text-[10px] leading-relaxed" style={{ color: '#66766F' }}>These are source records for the project partner. The partner prepares the project report and an independent verifier checks the reported results.</p>

                      </div>

                      <label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>Additional farmer note (optional)<input value={monitoringActivity} onChange={event => setMonitoringActivity(event.target.value)} placeholder="Context for this source record" className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>

                      <div className="grid grid-cols-2 gap-2"><label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>Measured quantity (optional)<input type="number" min="0" value={monitoringQuantity} onChange={event => setMonitoringQuantity(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label><label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>Unit<input value={monitoringUnit} onChange={event => setMonitoringUnit(event.target.value)} placeholder={'kg / ha / days / units'} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label></div>

                      <label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>Note or evidence reference (optional)<textarea value={monitoringNote} onChange={event => setMonitoringNote(event.target.value)} rows={2} placeholder="Describe the source record or attach a reference number" className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>

                      <button type="button" disabled={savingMonitoring || activeMonitoringFields.some(field => !String(monitoringDetails[field.key] || '').trim())} onClick={handleSaveMonitoringRecord} className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: '#07966E' }}>{savingMonitoring ? 'Saving…' : 'Save monitoring record'}</button>

                      {monitoringProject.status === 'Monitoring' && <div className="space-y-3 border-t pt-4" style={{ borderColor: '#E4ECE8' }}><div><p className="text-xs font-extrabold" style={{ color: '#07352A' }}>Send your records to the project entity</p><p className="mt-1 text-[10px]" style={{ color: '#66766F' }}>This packages your field log for the project partner. The partner combines participant records and submits the report for independent verification.</p></div><div className="grid grid-cols-2 gap-2"><label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>Record period start<input type="date" value={reportPeriodStart} onChange={event => setReportPeriodStart(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label><label className="block text-[11px] font-bold" style={{ color: '#66766F' }}>Record period end<input type="date" value={reportPeriodEnd} max={new Date().toISOString().slice(0, 10)} onChange={event => setReportPeriodEnd(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label></div><button type="button" disabled={savingMonitoring || !(monitoringProject.monitoring_records || []).length} onClick={handleSubmitMonitoringReport} className="w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50" style={{ background: '#07352A', color: '#fff' }}>{savingMonitoring ? 'Preparing…' : 'Prepare participant record package'}</button></div>}

                   </div>

                </section>

             </div>

          )}
      </div>

   );

};

export default CarbonVaultScreen;


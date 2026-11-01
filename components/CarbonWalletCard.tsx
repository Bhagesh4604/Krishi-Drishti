import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Leaf, Loader2, ShieldCheck } from 'lucide-react';
import { carbonService } from '../src/services/api';

const CarbonWalletCard: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await carbonService.getProjects();
      setProjects(rows || []);
    } catch (cause) {
      console.error('Could not load carbon registry allocations', cause);
      setError('Registry allocation details are unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const issued = projects.filter(project =>
    Number(project.available_credits || 0) > 0 && Boolean(project.registry_issuance_reference)
  );
  const allocation = issued.reduce((sum, project) => sum + Number(project.available_credits || 0), 0);

  return (
    <section className="bg-white rounded-3xl p-5 border border-green-50 shadow-sm my-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center"><Leaf size={22} /></div>
        <div>
          <h3 className="text-base font-extrabold text-gray-900">Carbon registry allocation</h3>
          <p className="text-xs text-gray-500">Farmer share recorded after external issuance</p>
        </div>
        {allocation > 0 && <CheckCircle2 className="ml-auto text-green-600" size={19} />}
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading registry records…</div>
      ) : error ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{error}</p>
      ) : allocation > 0 ? (
        <div className="mt-5 rounded-2xl bg-green-50 p-4">
          <p className="text-3xl font-black text-green-800">{allocation.toFixed(2)} <span className="text-sm">tCO₂e</span></p>
          <div className="mt-3 space-y-2">
            {issued.map(project => (
              <div key={project.id} className="border-t border-green-100 pt-2 text-xs text-gray-600">
                <div className="flex justify-between gap-2"><span className="font-semibold text-gray-800">{project.plot_name}</span><strong>{Number(project.available_credits).toFixed(2)} tCO₂e</strong></div>
                <p className="mt-1 break-all">{project.registry_name || 'Registry'} · {project.registry_issuance_reference}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-gray-50 p-4 flex gap-3">
          <Clock3 size={18} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-800">No issued farmer allocation yet</p>
            <p className="text-xs text-gray-500 mt-1">Satellite estimates and independent verification are not registry credits. Your balance appears after external registry issuance and allocation documentation.</p>
          </div>
        </div>
      )}

      <p className="mt-3 flex gap-2 items-start text-[11px] text-gray-500">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        Credits are not a cash balance. A payout requires a recorded buyer sale and settlement.
      </p>
    </section>
  );
};

export default CarbonWalletCard;

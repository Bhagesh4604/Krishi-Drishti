import React from 'react';
import { ArrowLeft, CircleDollarSign, ShieldAlert } from 'lucide-react';
import { Screen } from '../types';

interface Props {
  navigateTo: (screen: Screen, data?: any) => void;
}

const MarketplaceScreen: React.FC<Props> = ({ navigateTo }) => (
  <div className="h-full flex flex-col bg-gray-50">
    <header className="bg-white px-5 pt-10 pb-4 flex items-center gap-3 border-b border-gray-100">
      <button onClick={() => navigateTo('home')} aria-label="Go back" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
        <ArrowLeft size={18} />
      </button>
      <div>
        <h1 className="text-lg font-extrabold text-gray-900">Carbon-credit market</h1>
        <p className="text-xs text-gray-500">Registry and settlement status</p>
      </div>
    </header>
    <main className="flex-1 overflow-y-auto p-5 flex items-center">
      <section className="w-full max-w-md mx-auto bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
          <ShieldAlert size={26} />
        </div>
        <h2 className="text-xl font-black text-gray-900">Trading is not connected yet</h2>
        <p className="text-sm leading-relaxed text-gray-600 mt-2">
          There is no live registry transfer, credit retirement, buyer order, payment verification, or farmer settlement integration in this app. The previous listings and prices were demo data and must not be treated as real offers.
        </p>
        <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
          A future sale flow must reserve a specific issued serial range, verify buyer payment, retire or transfer those serials in the registry, record the final farmer allocation and settlement, and prevent resale.
        </div>
        <button onClick={() => navigateTo('carbon-vault')} className="w-full mt-5 rounded-xl bg-emerald-700 text-white py-3.5 text-sm font-bold flex items-center justify-center gap-2">
          <CircleDollarSign size={17} /> View registry-backed allocation
        </button>
      </section>
    </main>
  </div>
);

export default MarketplaceScreen;

// Design tokens from template
const C = { primary: '#00BB78', dark: '#001A11', gray: '#616B68', mint: '#A5FFA7', bg: '#E8FBF3' };

import React, { useMemo, useState, useEffect } from 'react';
import { Screen } from '../types';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, Loader2, MapPin, RefreshCw, Search } from 'lucide-react';
import api from '../src/services/api';

interface MarketScreenProps {
  navigateTo: (screen: Screen, data?: any) => void;
  t: any;
}

interface MandiPriceRecord {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  variety?: string;
  grade?: string;
  arrival_date?: string;
  min_price?: string | number;
  max_price?: string | number;
  modal_price?: string | number;
}

const MARKET_PAGE_SIZE = 100;
const recordKey = (record: MandiPriceRecord) => [
  record.state, record.district, record.market, record.commodity,
  record.variety, record.grade, record.arrival_date, record.modal_price,
].join('|');

const formatRupees = (value?: string | number) => {
  const amount = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(amount) && amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : '—';
};

const DATA_GOV_KEY = (import.meta.env.VITE_DATA_GOV_IN_API_KEY as string) || '579b464db66ec23bdd0000013e185fdda1964ea5599175b084174d64';

const fetchDirectFromGov = async (nextOffset: number, filters: { commodity?: string; state?: string }) => {
  const directUrl = new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
  directUrl.searchParams.set('api-key', DATA_GOV_KEY);
  directUrl.searchParams.set('format', 'json');
  directUrl.searchParams.set('limit', String(MARKET_PAGE_SIZE));
  directUrl.searchParams.set('offset', String(nextOffset));
  if (filters.commodity?.trim()) directUrl.searchParams.set('filters[Commodity]', filters.commodity.trim());
  if (filters.state?.trim()) directUrl.searchParams.set('filters[State]', filters.state.trim());

  const res = await fetch(directUrl.toString());
  if (!res.ok) throw new Error(`Gov API returned status ${res.status}`);
  const data = await res.json();
  const records: MandiPriceRecord[] = Array.isArray(data?.records) ? data.records : [];
  const reportedTotal = Number(data?.total ?? data?.count ?? 0);
  return { records, reportedTotal };
};

const LiveMandiPrices = () => {
  const [prices, setPrices] = useState<MandiPriceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [draftCommodity, setDraftCommodity] = useState('');
  const [draftState, setDraftState] = useState('');
  const [activeFilters, setActiveFilters] = useState({ commodity: '', state: '' });

  const fetchPage = async (nextOffset: number, filters = activeFilters) => {
    const firstPage = nextOffset === 0;
    if (firstPage) setLoading(true);
    else setLoadingMore(true);
    setErrorMessage('');

    try {
      let records: MandiPriceRecord[] = [];
      let reportedTotal = 0;

      try {
        const response = await api.get('/market/live-prices', {
          params: {
            limit: MARKET_PAGE_SIZE,
            offset: nextOffset,
            ...(filters.commodity ? { commodity: filters.commodity } : {}),
            ...(filters.state ? { state: filters.state } : {}),
          },
        });
        const backendRecords: MandiPriceRecord[] = Array.isArray(response.data?.records) ? response.data.records : [];
        const isStaticFallback = backendRecords.length > 0 && backendRecords.length <= 10 && !backendRecords[0]?.variety && !backendRecords[0]?.district;

        if (backendRecords.length > 0 && !isStaticFallback) {
          records = backendRecords;
          reportedTotal = Number(response.data?.total ?? response.data?.count ?? 0);
        } else {
          // Backend returned empty or static fallback; fetch live from data.gov.in directly
          const directData = await fetchDirectFromGov(nextOffset, filters);
          records = directData.records.length > 0 ? directData.records : backendRecords;
          reportedTotal = directData.reportedTotal || Number(response.data?.total ?? response.data?.count ?? 0);
        }
      } catch (backendErr) {
        console.warn('Backend live prices proxy failed, falling back to direct AGMARKNET fetch:', backendErr);
        const directData = await fetchDirectFromGov(nextOffset, filters);
        records = directData.records;
        reportedTotal = directData.reportedTotal;
      }

      setPrices(previous => {
        const combined = firstPage ? records : [...previous, ...records];
        const seen = new Set<string>();
        return combined.filter(record => {
          const key = recordKey(record);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
      setTotal(reportedTotal || nextOffset + records.length);
      setOffset(nextOffset + records.length);
    } catch (error: any) {
      console.error('Failed to load APMC prices', error);
      const detail = error?.response?.data?.detail;
      setErrorMessage(typeof detail === 'string'
        ? detail
        : 'Live APMC prices are temporarily unavailable. Please retry shortly.');
      if (firstPage) {
        setPrices([]);
        setTotal(0);
        setOffset(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { void fetchPage(0, { commodity: '', state: '' }); }, []);

  const states = useMemo(() => [...new Set(prices.map(record => record.state).filter(Boolean) as string[])].sort(), [prices]);
  const commodities = useMemo(() => [...new Set(prices.map(record => record.commodity).filter(Boolean) as string[])].sort(), [prices]);
  const filteredPrices = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return prices;
    return prices.filter(record => [record.commodity, record.variety, record.market, record.district, record.state]
      .some(value => value?.toLocaleLowerCase().includes(term)));
  }, [prices, search]);
  const hasMore = offset < total;

  const applyFilters = () => {
    const filters = { commodity: draftCommodity.trim(), state: draftState };
    setActiveFilters(filters);
    setSearch('');
    void fetchPage(0, filters);
  };

  const clearFilters = () => {
    const filters = { commodity: '', state: '' };
    setDraftCommodity('');
    setDraftState('');
    setActiveFilters(filters);
    setSearch('');
    void fetchPage(0, filters);
  };

  if (loading) {
    return <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(index => <div key={index} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
    </div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
        <label className="relative block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search loaded crops, APMCs, districts"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-emerald-400"
          />
        </label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            list="market-commodity-options"
            value={draftCommodity}
            onChange={event => setDraftCommodity(event.target.value)}
            placeholder="Filter all mandis by crop"
            className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-emerald-400"
          />
          <datalist id="market-commodity-options">
            {commodities.map(commodity => <option key={commodity} value={commodity} />)}
          </datalist>
          <input
            list="market-state-options"
            value={draftState}
            onChange={event => setDraftState(event.target.value)}
            placeholder="Filter by state (optional)"
            className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 outline-none focus:border-emerald-400"
          />
          <datalist id="market-state-options">
            {states.map(state => <option key={state} value={state} />)}
          </datalist>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button type="button" onClick={applyFilters} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
            Apply crop/state filters
          </button>
          <button type="button" onClick={clearFilters} className="rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-white">
            Clear
          </button>
          <button type="button" onClick={() => void fetchPage(0)} aria-label="Refresh market prices" className="ml-auto rounded-xl p-2 text-emerald-700 hover:bg-white">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Live mandi feed unavailable</p>
          <p className="mt-1 text-xs leading-relaxed">{errorMessage}</p>
          <button type="button" onClick={() => void fetchPage(0)} className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-amber-900 shadow-sm">
            Retry feed
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1 text-[11px] text-gray-500">
            <span>{filteredPrices.length} shown · {prices.length.toLocaleString('en-IN')} loaded · {total.toLocaleString('en-IN')} available</span>
            <span>₹ / quintal</span>
          </div>

          {filteredPrices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-xs text-gray-500">
              {prices.length ? 'No loaded records match this search.' : 'No mandi price records were returned for these filters.'}
              {hasMore && <p className="mt-1">Load more records or apply an exact crop filter.</p>}
            </div>
          ) : filteredPrices.map((item, index) => {
            const location = [item.market, item.district, item.state].filter(Boolean).join(', ');
            const priceRange = item.min_price && item.max_price
              ? `${formatRupees(item.min_price)} – ${formatRupees(item.max_price)}`
              : '';
            return (
              <motion.article
                key={`${recordKey(item)}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3.5"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-gray-900">{item.commodity || 'Commodity'}</h3>
                  {item.variety && <p className="mt-0.5 truncate text-[10px] font-medium text-gray-500">{item.variety}{item.grade ? ` · ${item.grade}` : ''}</p>}
                  <div className="mt-1 flex items-center gap-1">
                    <MapPin size={10} className="shrink-0 text-gray-400" />
                    <span className="truncate text-[11px] text-gray-500">{location || 'Market not specified'}</span>
                  </div>
                  {item.arrival_date && <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400"><CalendarDays size={10} />{item.arrival_date}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">{formatRupees(item.modal_price)}<span className="ml-1 text-[10px] font-medium text-gray-500">/q</span></p>
                  {priceRange && <p className="mt-0.5 text-[10px] text-gray-500">{priceRange}</p>}
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">Modal</p>
                </div>
              </motion.article>
            );
          })}

          {hasMore && (
            <button
              type="button"
              onClick={() => void fetchPage(offset)}
              disabled={loadingMore}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-3 text-xs font-bold text-emerald-800 disabled:opacity-60"
            >
              {loadingMore && <Loader2 size={14} className="animate-spin" />}
              {loadingMore ? 'Loading records…' : `Load more APMC prices (${Math.max(total - offset, 0).toLocaleString('en-IN')} remaining)`}
            </button>
          )}
          <p className="px-1 pb-2 text-[10px] leading-relaxed text-gray-400">Prices are daily AGMARKNET reports and may vary by variety and arrival date.</p>
        </>
      )}
    </div>
  );
};

const MarketScreen: React.FC<MarketScreenProps> = ({ navigateTo }) => {
  return (
    <div className="bg-white min-h-full pb-24" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ─── HEADER ─── */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-white sticky top-0 z-30" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateTo('home')} className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform" style={{ background: '#F5F5F5', border: '1px solid #EBEBEB' }}>
            <ArrowLeft size={16} style={{ color: C.dark }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: C.dark }}>Live Market</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[11px] text-green-600 font-bold uppercase tracking-wider">APMC Feed</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION TITLE ─── */}
      <div className="px-5 mt-4 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800">Live APMC Market Prices</h2>
        <span className="text-xs text-green-600 font-bold flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live
        </span>
      </div>

      {/* ─── LIVE DATA ─── */}
      <div className="px-5">
        <LiveMandiPrices />
      </div>
    </div>
  );
};

export default MarketScreen;

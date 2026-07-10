/**
 * LanguageContext — Krishi-Drishti
 * ================================
 * Provides:
 *  - `t(key)`      — instant static UI string lookup (no network)
 *  - `translate()` — LLM-powered async translation for dynamic content
 *  - 8 languages already present in the project's `translations.ts`
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  translate: (text: string) => Promise<string>;
  t: (key: string) => string;
  isTranslating: boolean;
}

// ── Static dictionary (no API cost for common UI strings) ─────────────────────
type TranslationDict = Record<string, Record<string, string>>;

const STATIC: TranslationDict = {
  en: {
    dashboard: 'Dashboard', smart_irrigation: 'Smart Irrigation',
    add_field: 'Add Field', irrigation_schedule: 'Irrigation Schedule',
    digital_twin: 'Digital Twin', crop_health: 'Crop Health',
    weather: 'Weather', market: 'Market', settings: 'Settings',
    save: 'Save', cancel: 'Cancel', loading: 'Loading...',
    water_per_acre: 'Water / Acre / Day', total_weekly: 'Total Weekly Water',
    efficiency: 'Efficiency Score', day: 'Day', rest: 'Rest',
    drip: 'Drip Irrigation', sprinkler: 'Sprinkler',
    tips: 'Expert Tips', savings: 'Savings vs Flood Irrigation',
  },
  hi: {
    dashboard: 'डैशबोर्ड', smart_irrigation: 'स्मार्ट सिंचाई',
    add_field: 'खेत जोड़ें', irrigation_schedule: 'सिंचाई कार्यक्रम',
    digital_twin: 'डिजिटल ट्विन', crop_health: 'फसल स्वास्थ्य',
    weather: 'मौसम', market: 'बाज़ार', settings: 'सेटिंग्स',
    save: 'सहेजें', cancel: 'रद्द करें', loading: 'लोड हो रहा है...',
    water_per_acre: 'पानी / एकड़ / दिन', total_weekly: 'साप्ताहिक कुल पानी',
    efficiency: 'दक्षता स्कोर', day: 'दिन', rest: 'विश्राम',
    drip: 'ड्रिप सिंचाई', sprinkler: 'फव्वारा',
    tips: 'विशेषज्ञ सुझाव', savings: 'बाढ़ सिंचाई की तुलना में बचत',
  },
  kn: {
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', smart_irrigation: 'ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ',
    add_field: 'ಕ್ಷೇತ್ರ ಸೇರಿಸಿ', irrigation_schedule: 'ನೀರಾವರಿ ವೇಳಾಪಟ್ಟಿ',
    digital_twin: 'ಡಿಜಿಟಲ್ ಟ್ವಿನ್', crop_health: 'ಬೆಳೆ ಆರೋಗ್ಯ',
    weather: 'ಹವಾಮಾನ', market: 'ಮಾರುಕಟ್ಟೆ', settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    save: 'ಉಳಿಸಿ', cancel: 'ರದ್ದು ಮಾಡಿ', loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    water_per_acre: 'ನೀರು / ಎಕರೆ / ದಿನ', total_weekly: 'ಒಟ್ಟು ಸಾಪ್ತಾಹಿಕ ನೀರು',
    efficiency: 'ದಕ್ಷತೆ ಸ್ಕೋರ್', day: 'ದಿನ', rest: 'ವಿಶ್ರಾಂತಿ',
    drip: 'ಡ್ರಿಪ್ ನೀರಾವರಿ', sprinkler: 'ಸ್ಪ್ರಿಂಕ್ಲರ್',
    tips: 'ತಜ್ಞರ ಸಲಹೆಗಳು', savings: 'ಪ್ರವಾಹ ನೀರಾವರಿಗೆ ಹೋಲಿಸಿದರೆ ಉಳಿತಾಯ',
  },
  mr: {
    dashboard: 'डॅशबोर्ड', smart_irrigation: 'स्मार्ट सिंचन',
    add_field: 'शेत जोडा', irrigation_schedule: 'सिंचन वेळापत्रक',
    digital_twin: 'डिजिटल ट्विन', crop_health: 'पीक आरोग्य',
    weather: 'हवामान', market: 'बाजार', settings: 'सेटिंग्ज',
    save: 'जतन करा', cancel: 'रद्द करा', loading: 'लोड होत आहे...',
    water_per_acre: 'पाणी / एकर / दिवस', total_weekly: 'साप्ताहिक एकूण पाणी',
    efficiency: 'कार्यक्षमता स्कोर', day: 'दिवस', rest: 'विश्रांती',
    drip: 'ठिबक सिंचन', sprinkler: 'तुषार सिंचन',
    tips: 'तज्ज्ञ सल्ला', savings: 'पूर सिंचनापेक्षा बचत',
  },
};

// ── Translation cache to avoid redundant API calls ────────────────────────────
const translationCache = new Map<string, string>();

// ── Context ───────────────────────────────────────────────────────────────────
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLang] = useState<string>(
    () => localStorage.getItem('kd_language') || 'en'
  );
  const [isTranslating, setIsTranslating] = useState(false);

  const setLanguage = useCallback((lang: string) => {
    setLang(lang);
    localStorage.setItem('kd_language', lang);
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  /** Static lookup — instant, no network */
  const t = useCallback((key: string): string => {
    return STATIC[language]?.[key] ?? STATIC['en']?.[key] ?? key;
  }, [language]);

  /** Dynamic LLM translation for user-generated / DB content */
  const translate = useCallback(async (text: string): Promise<string> => {
    if (language === 'en' || !text.trim()) return text;

    const cacheKey = `${language}:${text}`;
    if (translationCache.has(cacheKey)) return translationCache.get(cacheKey)!;

    setIsTranslating(true);
    try {
      const res = await fetch(`${API_BASE}/api/translate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target_language: language }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated: string = data.translated ?? text;
      translationCache.set(cacheKey, translated);
      return translated;
    } catch (err) {
      console.warn('[LanguageContext] Translation failed, using original:', err);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate, t, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
};

/// <reference types="vite/client" />
import { Adega, Wine, Consumption, Spirit, SpiritConsumption } from '../types';

const SB_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const SB_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export async function sbLogin(email: string, pass: string): Promise<{ token: string; user: any }> {
  if (!SB_URL) throw new Error('VITE_SUPABASE_URL missing');
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!r.ok) {
    const e = await r.json();
    throw new Error(e.error_description || e.message || 'Erro ao autenticar');
  }
  const data = await r.json();
  return { token: data.access_token, user: data.user };
}

function getHeaders() {
  const sessionString = localStorage.getItem('adega_session');
  let token = SB_KEY;
  if (sessionString) {
    try {
      const session = JSON.parse(sessionString);
      if (session.token && session.token !== 'dummy') {
        token = session.token;
      }
    } catch (e) {
      console.warn('Failed to parse session', e);
    }
  }
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function sbGet<T>(table: string, query: string = '', retries: number = 2): Promise<T[]> {
  if (!SB_URL) {
    console.error('Supabase URL is missing. Please set VITE_SUPABASE_URL in Secrets.');
    throw new Error('Configuração de banco de dados ausente (VITE_SUPABASE_URL).');
  }
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
        headers: {
          ...getHeaders(),
          Prefer: 'count=none',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        signal: ctrl.signal,
      });
      clearTimeout(timeoutId);
      if (!r.ok) {
        const e = await r.text();
        throw new Error(`${r.status}: ${e}`);
      }
      return r.json();
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function sbUpsert<T>(table: string, data: any): Promise<T[]> {
  if (!SB_URL) throw new Error('VITE_SUPABASE_URL missing');
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`${r.status}: ${e}`);
  }
  return r.json();
}

export async function sbPatch<T>(table: string, id: string, data: any): Promise<T[]> {
  if (!SB_URL) throw new Error('VITE_SUPABASE_URL missing');
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      ...getHeaders(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`${r.status}: ${e}`);
  }
  return r.json();
}

export async function sbDel(table: string, id: string): Promise<void> {
  if (!SB_URL) throw new Error('VITE_SUPABASE_URL missing');
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`${r.status}: ${e}`);
  }
}

// Data Mappers
export function wineFromDB(r: any): Wine {
  return {
    id: r.id,
    adegaId: r.adega_id,
    name: r.name,
    producer: r.producer || "",
    country: r.country || "",
    type: r.type || "Tinto",
    grape: r.grape || "",
    vintage: r.vintage || "",
    qty: r.qty != null ? r.qty : 1,
    score: r.score != null ? r.score : null,
    notes: r.notes || "",
    expertSummary: r.expert_summary || "",
    personalNotes: r.personal_notes || "",
    imageB64: r.image_b64 || "",
    imageUrl: r.image_url || "",
    drinkFrom: r.drink_from || null,
    drinkUntil: r.drink_until || null,
    entryDate: r.entry_date || null,
    level: r.level != null ? r.level : null,
  };
}

export function wineToDB(w: Wine): any {
  return {
    id: w.id,
    adega_id: w.adegaId,
    name: w.name,
    producer: w.producer || null,
    country: w.country || null,
    type: w.type,
    grape: w.grape || null,
    vintage: w.vintage || null,
    qty: w.qty,
    score: w.score != null ? w.score : null,
    notes: w.notes || null,
    expert_summary: w.expertSummary || null,
    personal_notes: w.personalNotes || null,
    image_b64: w.imageB64 && w.imageB64.startsWith("data:") ? w.imageB64 : null,
    image_url: w.imageUrl || null,
    drink_from: w.drinkFrom || null,
    drink_until: w.drinkUntil || null,
    entry_date: w.entryDate || null,
    level: w.level != null ? w.level : null,
  };
}

export function consumptionFromDB(r: any): Consumption {
  return {
    id: r.id,
    wineId: r.wine_id,
    wineSnapshot: r.wine_snapshot || {},
    qty: r.qty != null ? r.qty : 1,
    levelBefore: r.level_before != null ? r.level_before : null,
    levelAfter: r.level_after != null ? r.level_after : null,
    date: r.date || "",
    occasion: r.occasion || "",
    score: r.score != null ? r.score : null,
    notes: r.notes || "",
  };
}

export function consumptionToDB(c: Consumption): any {
  return {
    id: c.id,
    wine_id: c.wineId,
    wine_snapshot: c.wineSnapshot,
    qty: c.qty,
    level_before: c.levelBefore != null ? c.levelBefore : null,
    level_after: c.levelAfter != null ? c.levelAfter : null,
    date: c.date,
    occasion: c.occasion || null,
    score: c.score != null ? c.score : null,
    notes: c.notes || null,
  };
}

export function spiritFromDB(r: any): Spirit {
  return {
    id: r.id,
    adegaId: r.adega_id,
    name: r.name,
    producer: r.producer || "",
    country: r.country || "",
    region: r.region || "",
    type: r.type || "Whisky",
    subtype: r.subtype || "",
    volume: r.volume || null,
    aging: r.aging || "",
    abv: r.abv || null,
    level: r.level != null ? r.level : 100,
    qty: r.qty != null ? r.qty : 1,
    isOpen: r.is_open || false,
    parentId: r.parent_id || null,
    score: r.score != null ? r.score : null,
    notes: r.notes || "",
    expertSummary: r.expert_summary || "",
    personalNotes: r.personal_notes || "",
    imageUrl: r.image_url || "",
    entryDate: r.entry_date || null,
  };
}

export function spiritToDB(s: Spirit): any {
  return {
    id: s.id,
    adega_id: s.adegaId,
    name: s.name,
    producer: s.producer || null,
    country: s.country || null,
    region: s.region || null,
    type: s.type,
    subtype: s.subtype || null,
    volume: s.volume || null,
    aging: s.aging || null,
    abv: s.abv || null,
    level: s.level != null ? s.level : 100,
    qty: s.qty != null ? s.qty : 1,
    is_open: s.isOpen || false,
    parent_id: s.parentId || null,
    score: s.score != null ? s.score : null,
    notes: s.notes || null,
    expert_summary: s.expertSummary || null,
    personal_notes: s.personalNotes || null,
    image_url: s.imageUrl || null,
    entry_date: s.entryDate || null,
  };
}

export function spiritConsumptionFromDB(r: any): SpiritConsumption {
  return {
    id: r.id,
    spiritId: r.spirit_id,
    spiritSnapshot: r.spirit_snapshot || {},
    levelBefore: r.level_before,
    levelAfter: r.level_after,
    date: r.date || "",
    occasion: r.occasion || "",
    score: r.score != null ? r.score : null,
    notes: r.notes || "",
  };
}

export function spiritConsumptionToDB(c: SpiritConsumption): any {
  return {
    id: c.id,
    spirit_id: c.spiritId,
    spirit_snapshot: c.spiritSnapshot,
    level_before: c.levelBefore,
    level_after: c.levelAfter,
    date: c.date,
    occasion: c.occasion || null,
    score: c.score != null ? c.score : null,
    notes: c.notes || null,
  };
}

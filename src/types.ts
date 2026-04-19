export interface Adega {
  id: string;
  name: string;
  emoji: string;
}

export interface Wine {
  id: string;
  adegaId: string;
  name: string;
  producer?: string;
  country?: string;
  type: string;
  grape?: string;
  vintage?: string;
  qty: number;
  score?: number | null;
  notes?: string;
  expertSummary?: string;
  personalNotes?: string;
  imageB64?: string;
  imageUrl?: string;
  drinkFrom?: number | null;
  drinkUntil?: number | null;
  entryDate?: string | null;
  level?: number | null; // For Porto/Sobremesa
  _imgLoaded?: boolean;
}

export interface Consumption {
  id: string;
  wineId: string;
  wineSnapshot: Partial<Wine>;
  qty: number;
  levelBefore?: number | null;
  levelAfter?: number | null;
  date: string;
  occasion?: string;
  score?: number | null;
  notes?: string;
}

export interface Spirit {
  id: string;
  adegaId: string;
  name: string;
  producer?: string;
  country?: string;
  region?: string;
  type: string;
  subtype?: string;
  volume?: number | null;
  aging?: string;
  abv?: number | null;
  level: number; // 0-100
  qty: number;
  isOpen: boolean;
  parentId?: string | null;
  score?: number | null;
  notes?: string;
  expertSummary?: string;
  personalNotes?: string;
  imageUrl?: string;
  entryDate?: string | null;
}

export interface SpiritConsumption {
  id: string;
  spiritId: string;
  spiritSnapshot: Partial<Spirit>;
  levelBefore: number;
  levelAfter: number;
  date: string;
  occasion?: string;
  score?: number | null;
  notes?: string;
}

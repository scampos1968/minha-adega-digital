const BACKUP_APP = 'adega98';
const BACKUP_VERSION = '1.0';

export const BACKUP_TABLES = [
  'adegas',
  'wines',
  'spirits',
  'consumptions',
  'spirit_consumptions',
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

export interface BackupDataTables {
  adegas: any[];
  wines: any[];
  spirits: any[];
  consumptions: any[];
  spirit_consumptions: any[];
}

export interface BackupManifest {
  app: string;
  backup_version: string;
  created_at: string;
  source: {
    environment: string;
    supabase_url: string | null;
    schema_version: string | null;
  };
  counts: Record<BackupTableName, number>;
  data: BackupDataTables;
}

export interface BackupParseResult {
  backup: BackupManifest;
  warnings: string[];
}

export interface BackupPreviewRow {
  table: BackupTableName;
  total: number;
  inserts: number;
  updates: number;
}

export interface BackupPreview {
  app: string;
  backupVersion: string;
  createdAt: string;
  source: BackupManifest['source'];
  rows: BackupPreviewRow[];
  warnings: string[];
}

export interface RestoreTableReport {
  table: BackupTableName;
  total: number;
  status: 'applied' | 'skipped' | 'failed';
  message?: string;
}

export interface RestoreExecutionReport {
  success: boolean;
  preRestoreBackupName: string;
  tables: RestoreTableReport[];
  failedTable: BackupTableName | null;
}

export type ExistingIdMap = Record<BackupTableName, Set<string>>;

function buildCounts(data: BackupDataTables): Record<BackupTableName, number> {
  return BACKUP_TABLES.reduce((acc, table) => {
    acc[table] = data[table].length;
    return acc;
  }, {} as Record<BackupTableName, number>);
}

function assertArray(value: unknown, label: string): any[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`Backup inválido: "${label}" deve ser uma lista.`);
  }
  return value;
}

function validateRecord(table: BackupTableName, record: any, index: number) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`Backup inválido: registro ${index + 1} de "${table}" não é um objeto.`);
  }
  if (!record.id || typeof record.id !== 'string') {
    throw new Error(`Backup inválido: registro ${index + 1} de "${table}" está sem "id".`);
  }

  switch (table) {
    case 'adegas':
      if (!record.name || typeof record.name !== 'string') {
        throw new Error(`Backup inválido: adega ${record.id} está sem "name".`);
      }
      break;
    case 'wines':
      if (!record.adega_id || !record.name || !record.type) {
        throw new Error(`Backup inválido: vinho ${record.id} precisa de "adega_id", "name" e "type".`);
      }
      break;
    case 'spirits':
      if (!record.adega_id || !record.name || !record.type) {
        throw new Error(`Backup inválido: destilado ${record.id} precisa de "adega_id", "name" e "type".`);
      }
      break;
    case 'consumptions':
      if (!record.wine_id || !record.date) {
        throw new Error(`Backup inválido: consumo ${record.id} precisa de "wine_id" e "date".`);
      }
      break;
    case 'spirit_consumptions':
      if (!record.spirit_id || !record.date) {
        throw new Error(`Backup inválido: consumo de destilado ${record.id} precisa de "spirit_id" e "date".`);
      }
      break;
  }
}

function validateDataTables(data: BackupDataTables) {
  for (const table of BACKUP_TABLES) {
    data[table].forEach((record, index) => validateRecord(table, record, index));
  }
}

function normalizeCurrentFormat(raw: any): BackupManifest {
  const data: BackupDataTables = {
    adegas: assertArray(raw.data?.adegas, 'data.adegas'),
    wines: assertArray(raw.data?.wines, 'data.wines'),
    spirits: assertArray(raw.data?.spirits, 'data.spirits'),
    consumptions: assertArray(raw.data?.consumptions, 'data.consumptions'),
    spirit_consumptions: assertArray(
      raw.data?.spirit_consumptions ?? raw.data?.spiritCons,
      'data.spirit_consumptions'
    ),
  };

  validateDataTables(data);

  const computedCounts = buildCounts(data);
  for (const table of BACKUP_TABLES) {
    const declared = raw.counts?.[table];
    if (declared != null && declared !== computedCounts[table]) {
      throw new Error(`Backup inválido: contagem de "${table}" não confere com o conteúdo do arquivo.`);
    }
  }

  return {
    app: raw.app,
    backup_version: raw.backup_version,
    created_at: raw.created_at,
    source: {
      environment: raw.source?.environment || 'unknown',
      supabase_url: raw.source?.supabase_url || null,
      schema_version: raw.source?.schema_version || null,
    },
    counts: computedCounts,
    data,
  };
}

function normalizeLegacyFormat(raw: any): BackupManifest {
  const data: BackupDataTables = {
    adegas: assertArray(raw.adegas, 'adegas'),
    wines: assertArray(raw.wines, 'wines'),
    spirits: assertArray(raw.spirits, 'spirits'),
    consumptions: assertArray(raw.consumptions, 'consumptions'),
    spirit_consumptions: assertArray(raw.spirit_consumptions ?? raw.spiritCons, 'spirit_consumptions'),
  };

  validateDataTables(data);

  return {
    app: BACKUP_APP,
    backup_version: BACKUP_VERSION,
    created_at: raw.timestamp || new Date().toISOString(),
    source: {
      environment: 'legacy-import',
      supabase_url: null,
      schema_version: raw.version || null,
    },
    counts: buildCounts(data),
    data,
  };
}

export function createBackupManifest(
  data: BackupDataTables,
  source: Partial<BackupManifest['source']> = {}
): BackupManifest {
  validateDataTables(data);

  return {
    app: BACKUP_APP,
    backup_version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    source: {
      environment: source.environment || 'production',
      supabase_url: source.supabase_url || null,
      schema_version: source.schema_version || BACKUP_VERSION,
    },
    counts: buildCounts(data),
    data,
  };
}

export function downloadBackupFile(backup: BackupManifest, fileName: string) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackupFileContent(text: string): BackupParseResult {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Arquivo inválido: o conteúdo não é um JSON válido.');
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Arquivo inválido: o backup precisa ser um objeto JSON.');
  }

  if (raw.app === BACKUP_APP && raw.data) {
    if (!raw.backup_version || typeof raw.backup_version !== 'string') {
      throw new Error('Backup inválido: "backup_version" ausente.');
    }
    if (raw.backup_version !== BACKUP_VERSION) {
      throw new Error(`Versão de backup não suportada: ${raw.backup_version}.`);
    }
    if (!raw.created_at || typeof raw.created_at !== 'string') {
      throw new Error('Backup inválido: "created_at" ausente.');
    }

    return {
      backup: normalizeCurrentFormat(raw),
      warnings: [],
    };
  }

  const hasLegacyShape = BACKUP_TABLES.some((table) => table in raw) || 'spiritCons' in raw;
  if (hasLegacyShape) {
    return {
      backup: normalizeLegacyFormat(raw),
      warnings: ['Arquivo em formato legado: ele será tratado como backup compatível v1.'],
    };
  }

  throw new Error('Arquivo incompatível: este JSON não parece ser um backup reconhecido do Adega 98.');
}

export function buildBackupPreview(backup: BackupManifest, existingIds: ExistingIdMap): BackupPreview {
  return {
    app: backup.app,
    backupVersion: backup.backup_version,
    createdAt: backup.created_at,
    source: backup.source,
    warnings: [],
    rows: BACKUP_TABLES.map((table) => {
      const total = backup.data[table].length;
      let updates = 0;
      for (const item of backup.data[table]) {
        if (existingIds[table]?.has(item.id)) updates += 1;
      }
      return {
        table,
        total,
        updates,
        inserts: total - updates,
      };
    }),
  };
}

export async function applyBackupRestore(
  backup: BackupManifest,
  upsertTable: (table: BackupTableName, rows: any[]) => Promise<unknown>
): Promise<RestoreExecutionReport> {
  const tables: RestoreTableReport[] = [];

  for (const table of BACKUP_TABLES) {
    const rows = backup.data[table];
    if (rows.length === 0) {
      tables.push({
        table,
        total: 0,
        status: 'skipped',
        message: 'Nenhum registro nesta tabela.',
      });
      continue;
    }

    try {
      await upsertTable(table, rows);
      tables.push({
        table,
        total: rows.length,
        status: 'applied',
      });
    } catch (error) {
      tables.push({
        table,
        total: rows.length,
        status: 'failed',
        message: (error as Error).message,
      });

      return {
        success: false,
        preRestoreBackupName: '',
        tables,
        failedTable: table,
      };
    }
  }

  return {
    success: true,
    preRestoreBackupName: '',
    tables,
    failedTable: null,
  };
}

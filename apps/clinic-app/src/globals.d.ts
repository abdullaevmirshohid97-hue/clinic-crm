interface ElectronPrintOptions {
  silent?: boolean;
  width?: number;
  printerName?: string;
}

interface ElectronAuthAPI {
  getCurrentUser?: () => Promise<number | null>;
  setCurrentUser?: (id: number) => Promise<void>;
  getFeatures?: () => Promise<Array<{ id: number; name: string; label?: string }>>;
  getRolePermissions?: (
    role: string
  ) => Promise<Array<{ feature_name: string; canAccess: boolean }>>;
  updatePermission?: (payload: {
    roleName: string;
    featureName: string;
    canAccess: boolean;
  }) => Promise<{ success: boolean }>;
}

interface ElectronJournalAPI {
  addExpense?: (
    category: string,
    amount: string | number,
    description: string
  ) => Promise<{ success: boolean }>;
  payDebt?: (
    type: string,
    id: number,
    paymentType: string,
    amount: number
  ) => Promise<{ success: boolean }>;
  closeShift?: (date?: string) => Promise<{ success: boolean }>;
  getComprehensive?: (
    filters: Record<string, unknown>
  ) => Promise<{ success: boolean; data?: unknown[] }>;
  getFinancialStats?: () => Promise<{ success: boolean; data?: unknown }>;
}

interface ElectronPrintAPI {
  receipt?: (html: string, opts: ElectronPrintOptions) => Promise<{ success: boolean }>;
  getPrinters?: () => Promise<{ success: boolean; data?: string[] }>;
}

interface ElectronQrAPI {
  upload?: (
    base64: string,
    filename: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
}

interface ElectronBackupAPI {
  export?: () => Promise<{ success: boolean; path?: string; error?: string }>;
  import?: () => Promise<{ success: boolean; error?: string }>;
}

interface ElectronAPI {
  auth?: ElectronAuthAPI;
  print?: ElectronPrintAPI;
  qr?: ElectronQrAPI;
  backup?: ElectronBackupAPI;
  journal?: ElectronJournalAPI;
  invoke?: (channel: string, ...args: unknown[]) => Promise<{ success: boolean; error?: string }>;
}

interface Window {
  electronAPI?: ElectronAPI;
}

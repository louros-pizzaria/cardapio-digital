// ===== TIPOS PARA SISTEMA DE IMPRESSÃO TÉRMICA =====

export enum PrintErrorType {
  NETWORK_ERROR = 'network_error',
  PRINTER_OFFLINE = 'printer_offline',
  TIMEOUT = 'timeout',
  INVALID_DATA = 'invalid_data',
  PAPER_OUT = 'paper_out',
  PRINTER_BUSY = 'printer_busy',
  UNKNOWN = 'unknown'
}

export interface PrintError {
  type: PrintErrorType;
  message: string;
  details?: any;
  retryable: boolean;
  suggestedAction: string;
}

export interface PrintQueueItem {
  id: string;
  orderId: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  error?: PrintError;
  timestamp: Date;
  lastAttemptAt?: Date;
}

export interface PrintResponse {
  success: boolean;
  message: string;
  copies_printed: number;
  copies_requested: number;
  order_id: string;
  timestamp: string;
  error_type?: PrintErrorType;
  error_message?: string;
  retryable?: boolean;
  suggested_action?: string;
}

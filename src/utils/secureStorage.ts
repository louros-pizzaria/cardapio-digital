// ===== SECURE STORAGE - CRIPTOGRAFIA DE DADOS SENSÍVEIS =====

import { dataEncryption } from '@/utils/dataEncryption';

interface SecureStorageOptions {
  expiresIn?: number; // Tempo em MS (padrão: 15 minutos)
}

interface StoragePayload<T> {
  data: T;
  expiresAt: number;
  version: string;
}

/**
 * Wrapper seguro para localStorage com:
 * - Criptografia AES-256-GCM (usando dataEncryption existente)
 * - Expiração automática de dados
 * - Limpeza automática ao deslogar
 * - Sanitização de dados sensíveis
 */
export class SecureStorage {
  private static readonly DEFAULT_EXPIRY = 15 * 60 * 1000; // 15 minutos
  private static readonly VERSION = '1.0';
  
  /**
   * Salvar dados com criptografia e expiração
   */
  static async set<T>(key: string, data: T, options?: SecureStorageOptions): Promise<void> {
    try {
      const expiresAt = Date.now() + (options?.expiresIn || this.DEFAULT_EXPIRY);
      
      const payload: StoragePayload<T> = {
        data,
        expiresAt,
        version: this.VERSION
      };
      
      // Criptografar payload completo
      const encrypted = await dataEncryption.encrypt(JSON.stringify(payload));
      localStorage.setItem(key, encrypted);
      
      console.log('[SECURE_STORAGE] Data encrypted and saved:', key, {
        expiresIn: Math.floor((options?.expiresIn || this.DEFAULT_EXPIRY) / 1000) + 's'
      });
    } catch (error) {
      console.error('[SECURE_STORAGE] Failed to encrypt data:', error);
      throw new Error('Erro ao salvar dados de forma segura');
    }
  }
  
  /**
   * Recuperar dados descriptografando e validando expiração
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) {
        console.log('[SECURE_STORAGE] No data found for key:', key);
        return null;
      }
      
      const decrypted = await dataEncryption.decrypt(encrypted);
      const payload: StoragePayload<T> = JSON.parse(decrypted);
      
      // Validar versão
      if (payload.version !== this.VERSION) {
        console.warn('[SECURE_STORAGE] Version mismatch, clearing data:', key);
        localStorage.removeItem(key);
        return null;
      }
      
      // Validar expiração
      if (Date.now() > payload.expiresAt) {
        console.log('[SECURE_STORAGE] Data expired, clearing:', key);
        localStorage.removeItem(key);
        return null;
      }
      
      console.log('[SECURE_STORAGE] Data decrypted successfully:', key);
      return payload.data;
    } catch (error) {
      console.error('[SECURE_STORAGE] Failed to decrypt data:', error);
      // Se falhar a descriptografia, remover dados corrompidos
      localStorage.removeItem(key);
      return null;
    }
  }
  
  /**
   * Remover dados específicos
   */
  static remove(key: string): void {
    localStorage.removeItem(key);
    console.log('[SECURE_STORAGE] Data removed:', key);
  }
  
  /**
   * Limpar todos os dados criptografados (logout)
   */
  static clearAll(): void {
    const keysToRemove = [
      'pendingOrder', 
      'userSession', 
      'paymentData',
      'checkout_state'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('[SECURE_STORAGE] All sensitive data cleared');
  }
  
  /**
   * Verificar se uma chave existe e não expirou
   */
  static async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }
}

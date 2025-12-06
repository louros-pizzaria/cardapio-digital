// ===== SISTEMA DE CRIPTOGRAFIA PARA DADOS SENSÍVEIS =====

// ===== CLASSE PARA CRIPTOGRAFIA DE DADOS =====
class DataEncryption {
  private static instance: DataEncryption;
  private key: CryptoKey | null = null;

  private constructor() {}

  public static getInstance(): DataEncryption {
    if (!DataEncryption.instance) {
      DataEncryption.instance = new DataEncryption();
    }
    return DataEncryption.instance;
  }

  // ===== GERAR/OBTER CHAVE DE CRIPTOGRAFIA =====
  private async getKey(): Promise<CryptoKey> {
    if (this.key) return this.key;

    // Em produção, a chave deveria vir de um gerenciador de chaves seguro
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('your-secret-key-32-characters!!'),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('salt-for-encryption'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return this.key;
  }

  // ===== CRIPTOGRAFAR DADOS =====
  async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getKey();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(data);

      const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      // Combinar IV + dados criptografados
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Retornar como base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Erro na criptografia:', error);
      throw new Error('Falha ao criptografar dados');
    }
  }

  // ===== DESCRIPTOGRAFAR DADOS =====
  async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.getKey();
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decryptedData = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('Erro na descriptografia:', error);
      throw new Error('Falha ao descriptografar dados');
    }
  }

  // ===== MASCARAR DADOS SENSÍVEIS =====
  static maskCPF(cpf: string): string {
    if (!cpf) return '';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return cpf;
    return `***.***.${clean.slice(6, 9)}-**`;
  }

  static maskPhone(phone: string): string {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) return phone;
    const ddd = clean.slice(0, 2);
    const end = clean.slice(-2);
    return `(${ddd}) ****-**${end}`;
  }

  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    const maskedLocal = local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
    return `${maskedLocal}@${domain}`;
  }

  static maskCardNumber(cardNumber: string): string {
    if (!cardNumber) return '';
    const clean = cardNumber.replace(/\D/g, '');
    if (clean.length < 8) return cardNumber;
    return `****-****-****-${clean.slice(-4)}`;
  }

  // ===== HASH PARA DADOS NÃO REVERSÍVEIS =====
  static async hashData(data: string): Promise<string> {
    const encodedData = new TextEncoder().encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ===== VALIDAR INTEGRIDADE DOS DADOS =====
  static async verifyIntegrity(data: string, expectedHash: string): Promise<boolean> {
    const actualHash = await this.hashData(data);
    return actualHash === expectedHash;
  }
}

// ===== CLASSE PARA BACKUP SEGURO =====
class SecureBackup {
  private static instance: SecureBackup;
  
  private constructor() {}

  public static getInstance(): SecureBackup {
    if (!SecureBackup.instance) {
      SecureBackup.instance = new SecureBackup();
    }
    return SecureBackup.instance;
  }

  // ===== CRIAR BACKUP DE DADOS PESSOAIS =====
  async createUserDataBackup(userId: string): Promise<{
    success: boolean;
    backupId?: string;
    error?: string;
  }> {
    try {
      // Simular criação de backup - em produção, usar serviço real
      const backupId = `backup_${userId}_${Date.now()}`;
      
      console.log(`Backup criado para usuário ${userId}: ${backupId}`);
      
      // Em produção:
      // 1. Coletar dados do usuário
      // 2. Criptografar dados sensíveis
      // 3. Armazenar em local seguro
      // 4. Criar hash de integridade
      // 5. Registrar no log de auditoria
      
      return { success: true, backupId };
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      return { success: false, error: 'Falha na criação do backup' };
    }
  }

  // ===== RESTAURAR BACKUP =====
  async restoreUserDataBackup(backupId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Simular restauração - em produção, usar serviço real
      console.log(`Restaurando backup: ${backupId}`);
      
      // Em produção:
      // 1. Verificar integridade do backup
      // 2. Descriptografar dados
      // 3. Validar dados
      // 4. Retornar dados limpos
      
      return { success: true, data: {} };
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      return { success: false, error: 'Falha na restauração do backup' };
    }
  }

  // ===== LISTAR BACKUPS DISPONÍVEIS =====
  async listUserBackups(userId: string): Promise<{
    success: boolean;
    backups?: Array<{
      id: string;
      createdAt: string;
      size: number;
      integrity: 'valid' | 'corrupted';
    }>;
    error?: string;
  }> {
    try {
      // Simular listagem - em produção, consultar serviço real
      const backups = [
        {
          id: `backup_${userId}_1`,
          createdAt: new Date().toISOString(),
          size: 1024,
          integrity: 'valid' as const
        }
      ];
      
      return { success: true, backups };
    } catch (error) {
      console.error('Erro ao listar backups:', error);
      return { success: false, error: 'Falha ao listar backups' };
    }
  }
}

// ===== AUDITORIA DE ACESSO A DADOS =====
class DataAccessAudit {
  private static instance: DataAccessAudit;
  
  private constructor() {}

  public static getInstance(): DataAccessAudit {
    if (!DataAccessAudit.instance) {
      DataAccessAudit.instance = new DataAccessAudit();
    }
    return DataAccessAudit.instance;
  }

  // ===== REGISTRAR ACESSO A DADOS SENSÍVEIS =====
  async logDataAccess(params: {
    userId: string;
    dataType: 'cpf' | 'phone' | 'email' | 'address' | 'payment' | 'profile';
    action: 'read' | 'write' | 'delete' | 'export';
    resource: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const auditLog = {
        ...params,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent
      };

      // Em produção, salvar no banco de auditoria
      console.log('Audit Log:', auditLog);
      
      // Detectar padrões suspeitos
      await this.detectSuspiciousPatterns(auditLog);
      
    } catch (error) {
      console.error('Erro no log de auditoria:', error);
    }
  }

  // ===== DETECTAR PADRÕES SUSPEITOS =====
  private async detectSuspiciousPatterns(auditLog: any): Promise<void> {
    // Implementar detecção de:
    // - Acesso fora do horário normal
    // - Múltiplos acessos em pouco tempo
    // - Acesso de IPs diferentes
    // - Tentativas de export em massa
    
    const suspicious = false; // Lógica de detecção aqui
    
    if (suspicious) {
      console.warn('Padrão suspeito detectado:', auditLog);
      // Disparar alerta de segurança
    }
  }

  // ===== OBTER ID DA SESSÃO =====
  private getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'anonymous';
  }

  // ===== OBTER IP DO CLIENTE =====
  private async getClientIP(): Promise<string> {
    try {
      // Em produção, usar serviço para obter IP real
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // ===== GERAR RELATÓRIO DE AUDITORIA =====
  async generateAuditReport(params: {
    userId?: string;
    startDate: string;
    endDate: string;
    dataTypes?: string[];
  }): Promise<{
    success: boolean;
    report?: any;
    error?: string;
  }> {
    try {
      // Simular geração de relatório
      const report = {
        period: { start: params.startDate, end: params.endDate },
        totalAccesses: 42,
        byDataType: {
          cpf: 5,
          phone: 8,
          email: 15,
          address: 10,
          payment: 4
        },
        suspiciousActivities: 0,
        mostAccessedData: 'email'
      };
      
      return { success: true, report };
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return { success: false, error: 'Falha na geração do relatório' };
    }
  }
}

// ===== EXPORTAR INSTÂNCIAS =====
export const dataEncryption = DataEncryption.getInstance();
export const secureBackup = SecureBackup.getInstance();
export const dataAccessAudit = DataAccessAudit.getInstance();

// ===== HELPERS =====
export const sensitiveDataHelpers = {
  // Identificar campos sensíveis automaticamente
  isSensitiveField: (fieldName: string): boolean => {
    const sensitiveFields = ['cpf', 'phone', 'email', 'password', 'card', 'account'];
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field)
    );
  },

  // Aplicar mascaramento baseado no tipo
  autoMask: (value: string, fieldType: string): string => {
    switch (fieldType.toLowerCase()) {
      case 'cpf':
        return DataEncryption.maskCPF(value);
      case 'phone':
        return DataEncryption.maskPhone(value);
      case 'email':
        return DataEncryption.maskEmail(value);
      case 'card':
        return DataEncryption.maskCardNumber(value);
      default:
        return value;
    }
  },

  // Verificar se dados devem ser criptografados
  shouldEncrypt: (fieldName: string): boolean => {
    const encryptFields = ['cpf', 'card_number', 'account_number'];
    return encryptFields.some(field => 
      fieldName.toLowerCase().includes(field)
    );
  }
};
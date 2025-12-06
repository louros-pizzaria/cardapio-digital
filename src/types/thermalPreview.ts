// ===== TIPOS PARA PREVIEW DE IMPRESSÃO TÉRMICA =====

export type PreviewLineType = 'text' | 'separator' | 'bold' | 'center' | 'double-height' | 'cut';

export interface PreviewLine {
  type: PreviewLineType;
  content: string;
  centered?: boolean;
  bold?: boolean;
}

export interface ThermalPreviewProps {
  lines: PreviewLine[];
  zoom?: number;
  className?: string;
}

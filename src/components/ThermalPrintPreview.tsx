// ===== PREVIEW VISUAL DE COMANDA TÉRMICA =====

import { PreviewLine, ThermalPreviewProps } from '@/types/thermalPreview';
import { cn } from '@/lib/utils';

export function ThermalPrintPreview({ lines, zoom = 1, className }: ThermalPreviewProps) {
  const renderLine = (line: PreviewLine, index: number) => {
    const baseClasses = "font-mono whitespace-pre";
    const classes = cn(
      baseClasses,
      line.bold && "font-bold",
      line.centered && "text-center",
      line.type === 'double-height' && "text-lg font-bold",
      line.type === 'separator' && "text-muted-foreground/50",
      line.type === 'cut' && "border-t-2 border-dashed border-muted-foreground/30 mt-2"
    );

    return (
      <div key={index} className={classes}>
        {line.content}
      </div>
    );
  };

  return (
    <div 
      className={cn("thermal-preview-container", className)}
      style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
    >
      <div className="thermal-paper">
        <div className="thermal-content">
          {lines.map((line, index) => renderLine(line, index))}
        </div>
      </div>
    </div>
  );
}

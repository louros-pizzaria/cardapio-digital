// ===== DIALOG PARA PREVIEW DE COMANDA TÉRMICA =====

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ThermalPrintPreview } from './ThermalPrintPreview';
import { PreviewLine } from '@/types/thermalPreview';
import { ZoomIn, ZoomOut, Printer, X } from 'lucide-react';
import './ThermalPrintPreview.css';

interface ThermalPrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: PreviewLine[];
  onConfirm?: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  showPrintButton?: boolean;
}

export function ThermalPrintPreviewDialog({
  open,
  onOpenChange,
  lines,
  onConfirm,
  onCancel,
  title = "Preview da Comanda",
  description = "Visualize como a comanda será impressa na impressora térmica",
  showPrintButton = true
}: ThermalPrintPreviewDialogProps) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.6));

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-2 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.6}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ThermalPrintPreview lines={lines} zoom={zoom} />
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          {showPrintButton && (
            <Button onClick={handleConfirm}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

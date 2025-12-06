import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ModalImportar({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Produtos</DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha com os produtos para importação em massa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Área de upload */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">
              Arraste um arquivo ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground">
              Formatos: CSV, XLSX (máx. 5MB)
            </p>
          </div>

          {/* Template */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">Baixar modelo</p>
                <p className="text-xs text-muted-foreground">
                  Planilha com formato correto
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Download
            </Button>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button>Importar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

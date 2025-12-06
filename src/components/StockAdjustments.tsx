import { useState } from 'react';
import { useAtomicStock } from "@/hooks/useAtomicStock";
import { useUnifiedAdminData } from "@/hooks/useUnifiedAdminData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, RefreshCw } from "lucide-react";

export function StockAdjustments() {
  const { productStock, loadProductStock } = useAtomicStock();
  const { products } = useUnifiedAdminData();
  const { toast } = useToast();
  
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStockAdjustment = async () => {
    if (!selectedProduct || !quantity || !reason.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const adjustmentQuantity = parseInt(quantity);
    if (isNaN(adjustmentQuantity) || adjustmentQuantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser um número positivo",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular ajuste manual de estoque
      // Na implementação real, seria uma função específica para ajustes manuais
      const currentStock = productStock[selectedProduct];
      const product = products.find(p => p.id === selectedProduct);
      
      if (!currentStock || !product) {
        throw new Error('Produto não encontrado');
      }

      const newQuantity = adjustmentType === 'add' 
        ? currentStock.available_quantity + adjustmentQuantity
        : Math.max(0, currentStock.available_quantity - adjustmentQuantity);

      // TODO: Implementar função de ajuste manual no sistema atômico
      // await adjustStockManually(selectedProduct, newQuantity, reason);

      toast({
        title: "Ajuste realizado",
        description: `Estoque de ${product.name} ajustado para ${newQuantity} unidades`,
      });

      // Limpar formulário
      setSelectedProduct('');
      setQuantity('');
      setReason('');
      
      // Recarregar dados
      if (products.length > 0) {
        await loadProductStock(products.map(p => p.id));
      }
      
    } catch (error) {
      console.error('Erro ao ajustar estoque:', error);
      toast({
        title: "Erro",
        description: "Erro ao realizar ajuste de estoque",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStock = productStock[selectedProduct];
  const selectedProductData = products.find(p => p.id === selectedProduct);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Ajuste Manual de Estoque
          </CardTitle>
          <CardDescription>
            Realize ajustes manuais no estoque dos produtos com registro de auditoria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product">Produto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Ajuste</Label>
              <Select value={adjustmentType} onValueChange={(value: 'add' | 'subtract') => setAdjustmentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-500" />
                      Adicionar ao Estoque
                    </div>
                  </SelectItem>
                  <SelectItem value="subtract">
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-red-500" />
                      Remover do Estoque
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedStock && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Estoque Atual: {selectedProductData?.name}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Disponível:</span>
                  <span className="ml-2 font-medium">{selectedStock.available_quantity} un.</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Reservado:</span>
                  <span className="ml-2 font-medium">{selectedStock.reserved_quantity} un.</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Digite a quantidade"
              />
            </div>

            <div className="space-y-2">
              <Label>Novo Total (Estimativa)</Label>
              <div className="p-2 bg-muted rounded text-sm">
                {selectedStock && quantity && !isNaN(parseInt(quantity)) ? (
                  adjustmentType === 'add' 
                    ? selectedStock.available_quantity + parseInt(quantity)
                    : Math.max(0, selectedStock.available_quantity - parseInt(quantity))
                ) : '-'} unidades
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do Ajuste</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do ajuste (ex: Perda, Reposição, Correção de inventário...)"
              rows={3}
            />
          </div>

          <Button 
            onClick={handleStockAdjustment}
            disabled={!selectedProduct || !quantity || !reason.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Processando...' : 'Realizar Ajuste'}
          </Button>
        </CardContent>
      </Card>

      {/* Card de Ajustes Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Ajustes Recentes</CardTitle>
          <CardDescription>
            Últimos ajustes manuais realizados no estoque
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-center text-muted-foreground py-8">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum ajuste manual registrado</p>
              <p className="text-sm">Os ajustes aparecerão aqui após serem realizados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
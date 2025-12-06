// ===== SISTEMA DE CARRINHO UNIFICADO =====

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Plus, Minus, Trash2, MapPin } from 'lucide-react';
import { useUnifiedStore } from '@/stores/simpleStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { messageSystem, showMessage } from '@/utils/messageSystem';
import { performanceOptimizer } from '@/utils/performanceOptimizer';
import { useStoreSchedule } from '@/hooks/useStoreSchedule';

interface UnifiedCartSystemProps {
  variant?: 'drawer' | 'footer' | 'inline';
  showTrigger?: boolean;
  className?: string;
}

export const UnifiedCartSystem = ({ 
  variant = 'drawer', 
  showTrigger = true, 
  className 
}: UnifiedCartSystemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const { 
    items, 
    deliveryFee, 
    deliveryMethod,
    removeItem, 
    updateQuantity, 
    getSubtotal, 
    getTotal, 
    getItemCount, 
    clearCart,
    setDeliveryMethod 
  } = useUnifiedStore();
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOpen: isStoreOpen, nextOpening, scheduleData } = useStoreSchedule();

  const itemCount = getItemCount();
  const subtotal = getSubtotal();
  const total = getTotal();

  // Performance optimization with debounced updates
  const debouncedQuantityUpdate = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      showMessage(messageSystem.orders.itemRemoved(), toast);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  }, [removeItem, updateQuantity, toast]);

  const handleQuantityUpdate = useCallback(
    performanceOptimizer.debounce(debouncedQuantityUpdate, 300),
    [debouncedQuantityUpdate]
  );

  const handleRemoveItem = useCallback((itemId: string, itemName: string) => {
    removeItem(itemId);
    showMessage(messageSystem.orders.itemRemovedNamed(itemName), toast);
  }, [removeItem, toast]);

  const handleClearCart = useCallback(() => {
    clearCart();
    showMessage(messageSystem.orders.cartCleared(), toast);
    setIsOpen(false);
  }, [clearCart, toast]);

  const handleCheckout = useCallback(() => {
    // Rate limiting for checkout action
    if (isRateLimited) {
      showMessage(messageSystem.orders.rateLimitExceeded(), toast);
      return;
    }

    // Verificar se loja está aberta
    if (scheduleData?.autoSchedule && !isStoreOpen) {
      toast({
        title: "Loja fechada",
        description: `Não é possível fazer pedidos no momento. ${nextOpening ? `Abriremos ${nextOpening}` : ''}`,
        variant: "destructive"
      });
      return;
    }

    setIsRateLimited(true);
    setTimeout(() => setIsRateLimited(false), 2000);

    setIsOpen(false);
    navigate('/checkout');
  }, [isRateLimited, isStoreOpen, nextOpening, scheduleData, navigate, toast]);

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getCustomizationText = (customizations?: any): string => {
    if (!customizations) return '';
    
    const parts: string[] = [];
    
    if (customizations.halfAndHalf) {
      parts.push(`Meio a meio: ${customizations.halfAndHalf.flavor1} / ${customizations.halfAndHalf.flavor2}`);
    }
    
    // Usar crustName ao invés de crust
    if (customizations.crustName) {
      const crustDisplay = customizations.crustName.replace(/^(borda recheada -?|borda -?)/i, '').trim();
      parts.push(`Borda recheada: ${crustDisplay}`);
    } else if (customizations.crust && customizations.crust !== 'tradicional') {
      // Fallback caso crustName não exista (dados antigos do carrinho)
      parts.push(`Borda: ${customizations.crust}`);
    }
    
    // Usar extrasNames se disponível
    const extrasToShow = customizations.extrasNames || customizations.extras || [];
    if (extrasToShow.length > 0) {
      parts.push(`Extras: ${extrasToShow.join(', ')}`);
    }
    
    return parts.join(' • ');
  };

  // ===== CART ITEM COMPONENT =====
  const CartItem = ({ item }: { item: any }) => (
    <div className="flex items-center space-x-3 py-3">
      <div className="flex-shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-12 h-12 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{item.name}</h4>
        
        {getCustomizationText(item.customizations) && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {getCustomizationText(item.customizations)}
          </p>
        )}
        
        {item.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            Obs: {item.notes}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm font-medium min-w-[24px] text-center">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <span className="font-semibold text-sm">{formatPrice(item.price * item.quantity)}</span>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => handleRemoveItem(item.id, item.name)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  // ===== CART SUMMARY COMPONENT =====
  const CartSummary = () => (
    <div className="space-y-2 pt-4 border-t">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{formatPrice(subtotal)}</span>
      </div>
      
      {deliveryFee > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Taxa de entrega</span>
          <span className="font-medium">{formatPrice(deliveryFee)}</span>
        </div>
      )}
      
      {deliveryMethod === 'pickup' && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Retirada</span>
          <span className="text-green-600 font-medium">Grátis</span>
        </div>
      )}
      
      <Separator />
      
      <div className="flex justify-between font-bold text-base">
        <span>Total</span>
        <span className="text-primary">{formatPrice(total)}</span>
      </div>
    </div>
  );

  // ===== DRAWER VARIANT =====
  if (variant === 'drawer') {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        {showTrigger && (
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="relative"
              disabled={itemCount === 0}
            >
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-pizza-orange text-white">
                  {itemCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
        )}
        
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Seu Pedido
            </SheetTitle>
            <SheetDescription>
              {itemCount === 0 
                ? 'Seu carrinho está vazio' 
                : `${itemCount} ${itemCount === 1 ? 'item' : 'itens'} no carrinho`
              }
            </SheetDescription>
          </SheetHeader>
          
          {itemCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Carrinho vazio</h3>
              <p className="text-muted-foreground mb-4">
                Adicione alguns itens deliciosos do nosso cardápio!
              </p>
              <Button onClick={() => {
                setIsOpen(false);
                navigate('/menu');
              }}>
                Ver Cardápio
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-1">
                  {items.map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                </div>
              </ScrollArea>
              
              <div className="space-y-4 -mx-6 px-6 pb-4">
                <CartSummary />
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={handleClearCart}
                    className="flex-1"
                  >
                    Limpar
                  </Button>
                  <Button 
                    onClick={handleCheckout}
                    className="flex-1 gradient-pizza text-white"
                    disabled={isRateLimited || (scheduleData?.autoSchedule && !isStoreOpen)}
                  >
                    Finalizar Pedido
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  // ===== FOOTER VARIANT =====
  if (variant === 'footer' && itemCount > 0) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 md:left-64 z-40 ${className}`}>
        <div className="max-w-2xl mx-auto">
          <Button 
            className="w-full gradient-pizza text-white h-12 flex items-center justify-between"
            onClick={handleCheckout}
            disabled={isRateLimited || (scheduleData?.autoSchedule && !isStoreOpen)}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-pizza-orange text-white">
                  {itemCount}
                </Badge>
              </div>
              <span>Ver sacola</span>
            </div>
            <span className="font-bold">{formatPrice(total)}</span>
          </Button>
        </div>
      </div>
    );
  }

  // ===== INLINE VARIANT (sem sheet, só resumo) =====
  if (variant === 'inline') {
    return (
      <div className={`space-y-4 ${className}`}>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Seu carrinho está vazio</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
            <CartSummary />
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handleClearCart}
                className="flex-1"
              >
                Limpar
              </Button>
              <Button 
                onClick={handleCheckout}
                className="flex-1 gradient-pizza text-white"
                disabled={isRateLimited || (scheduleData?.autoSchedule && !isStoreOpen)}
              >
                Finalizar
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
};

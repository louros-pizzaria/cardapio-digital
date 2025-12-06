
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pizza } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  showToggle?: boolean;
  toggleText?: string;
  onToggle?: () => void;
}

export const AuthLayout = ({ 
  children, 
  title, 
  description, 
  showToggle = false, 
  toggleText, 
  onToggle 
}: AuthLayoutProps) => {
  return (
    <div className="min-h-screen gradient-pizza flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-3 rounded-full shadow-lg">
              <Pizza className="h-8 w-8 text-pizza-red" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Pizza Premium</h1>
          <p className="text-white/80">Seu cardápio exclusivo de pizzas</p>
        </div>
        
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {children}
            {showToggle && (
              <div className="text-center">
                <Button variant="link" onClick={onToggle} className="text-sm">
                  {toggleText}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

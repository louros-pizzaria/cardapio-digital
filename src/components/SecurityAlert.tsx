import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SecurityAlertProps {
  type: 'warning' | 'error' | 'success';
  title: string;
  message: string;
  showIcon?: boolean;
}

export const SecurityAlert = ({ 
  type, 
  title, 
  message, 
  showIcon = true 
}: SecurityAlertProps) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <Shield className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getAlertClass = () => {
    switch (type) {
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'error':
        return 'border-red-500 bg-red-50 text-red-800';
      case 'success':
        return 'border-green-500 bg-green-50 text-green-800';
      default:
        return '';
    }
  };

  return (
    <Alert className={getAlertClass()}>
      {showIcon && getIcon()}
      <div>
        <div className="font-medium">{title}</div>
        <AlertDescription className="mt-1">
          {message}
        </AlertDescription>
      </div>
    </Alert>
  );
};
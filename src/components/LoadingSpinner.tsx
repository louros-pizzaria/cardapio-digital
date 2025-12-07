import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner = ({ size = 'md', text }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  const colorMap = {
    sm: 'bg-blue-400',
    md: 'bg-blue-500',
    lg: 'bg-blue-600'
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="flex items-center justify-center gap-1">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className={`rounded-full ${sizeClasses[size]} ${colorMap[size]}`}
            initial={{ x: 0 }}
            animate={{
              x: [0, 10, 0],
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
      {text && <p className="mt-4 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
};

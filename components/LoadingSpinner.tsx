'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

export function LoadingSpinner({ size = 'md', className = '', label }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <div
        className={`
          ${SIZE_CLASSES[size]}
          border-gray-600 border-t-blue-500
          rounded-full animate-spin
        `}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && <span className="text-gray-400 text-sm">{label}</span>}
    </div>
  );
}

interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({ message = 'Loading...' }: FullPageLoaderProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" />
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}

'use client';

import { CheckCircle, Info, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

export default function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // 等待动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const icons = {
    success: <CheckCircle className='h-5 w-5' />,
    error: <XCircle className='h-5 w-5' />,
    info: <Info className='h-5 w-5' />,
  };

  const colors = {
    success: 'bg-green-500/90',
    error: 'bg-red-500/90',
    info: 'bg-blue-500/90',
  };

  return (
    <div
      className={`fixed left-1/2 top-20 z-[9999] -translate-x-1/2 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div
        className={`${colors[type]} flex min-w-[300px] items-center gap-3 rounded-lg px-6 py-3 text-white shadow-lg`}
      >
        <div className='flex-shrink-0'>{icons[type]}</div>
        <div className='flex-1 text-sm font-medium'>{message}</div>
        <button
          onClick={handleClose}
          className='flex-shrink-0 rounded p-1 transition-colors hover:bg-white/20'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}

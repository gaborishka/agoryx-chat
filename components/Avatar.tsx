'use client'

import React from 'react';
import { SenderType, UiColor } from '../types';

interface AvatarProps {
  src?: string;
  fallback: string;
  senderType: SenderType;
  uiColor?: UiColor;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, fallback, senderType, uiColor, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  let ringColor = 'ring-slate-200';
  let bgColor = 'bg-slate-500'; // default badge bg

  if (uiColor === 'blue') { ringColor = 'ring-blue-400'; bgColor = 'bg-blue-500'; }
  if (uiColor === 'amber') { ringColor = 'ring-amber-400'; bgColor = 'bg-amber-500'; }
  if (uiColor === 'purple') { ringColor = 'ring-purple-400'; bgColor = 'bg-purple-500'; }
  if (uiColor === 'green') { ringColor = 'ring-green-400'; bgColor = 'bg-green-500'; }
  if (uiColor === 'teal') { ringColor = 'ring-teal-400'; bgColor = 'bg-teal-500'; }
  if (uiColor === 'pink') { ringColor = 'ring-pink-400'; bgColor = 'bg-pink-500'; }
  if (uiColor === 'emerald') { ringColor = 'ring-emerald-400'; bgColor = 'bg-emerald-500'; }
  if (uiColor === 'rose') { ringColor = 'ring-rose-400'; bgColor = 'bg-rose-500'; }
  if (uiColor === 'slate') { ringColor = 'ring-slate-400'; bgColor = 'bg-slate-500'; }
  if (uiColor === 'indigo') { ringColor = 'ring-indigo-400'; bgColor = 'bg-indigo-500'; }
  if (uiColor === 'orange') { ringColor = 'ring-orange-400'; bgColor = 'bg-orange-500'; }
  if (uiColor === 'cyan') { ringColor = 'ring-cyan-400'; bgColor = 'bg-cyan-500'; }

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden ring-2 ${ringColor} ring-offset-2 bg-white flex items-center justify-center shadow-sm`}>
        {src ? (
          <img src={src} alt={fallback} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-slate-500">{fallback[0]}</span>
        )}
      </div>
      {senderType === 'agent' && uiColor && (
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full flex items-center justify-center ${bgColor} text-white text-[8px]`}>
          {uiColor === 'blue' && '⚡'}
          {uiColor === 'amber' && '🧠'}
          {uiColor === 'purple' && '⚖️'}
          {uiColor === 'green' && '📈'}
          {uiColor === 'teal' && '♟️'}
          {uiColor === 'pink' && '💻'}
          {uiColor === 'emerald' && '✓'}
          {uiColor === 'rose' && '✕'}
          {uiColor === 'slate' && 'M'}
          {uiColor === 'indigo' && '✦'}
          {uiColor === 'orange' && '★'}
          {uiColor === 'cyan' && '❄'}
        </div>
      )}
    </div>
  );
};

export default Avatar;

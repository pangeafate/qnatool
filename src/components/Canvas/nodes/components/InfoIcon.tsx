import React from 'react';

interface InfoIconProps {
  onClick: () => void;
  hasInfo: boolean;
  className?: string;
}

export const InfoIcon: React.FC<InfoIconProps> = ({ onClick, hasInfo, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold
        transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-300
        ${hasInfo 
          ? 'bg-blue-500 text-white shadow-sm hover:bg-blue-600' 
          : 'bg-gray-300 text-gray-600 hover:bg-gray-400 hover:text-gray-700'
        }
        ${className}
      `}
      title={hasInfo ? "Has additional info - click to edit" : "Add additional info"}
      type="button"
    >
      i
    </button>
  );
}; 
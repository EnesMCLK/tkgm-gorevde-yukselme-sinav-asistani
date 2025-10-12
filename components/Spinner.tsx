
import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center space-x-2">
      <div className="w-4 h-4 rounded-full animate-pulse bg-blue-600"></div>
      <div className="w-4 h-4 rounded-full animate-pulse bg-blue-600" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-4 h-4 rounded-full animate-pulse bg-blue-600" style={{ animationDelay: '0.4s' }}></div>
      <span className="text-slate-500">Cevaplanıyor...</span>
    </div>
  );
};

export default Spinner;
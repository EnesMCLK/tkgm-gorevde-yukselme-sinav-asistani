import React from 'react';
import { ProgressUpdate } from '../services/geminiService';

type OverallStatus = 'running' | 'cancelled' | 'error';

interface ThinkingProcessProps {
  updates: ProgressUpdate[];
  overallStatus: OverallStatus;
  errorMessage?: string | null;
}

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CheckIcon: React.FC = () => (
    <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const RetryIcon: React.FC = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="animate-spin h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4a12.008 12.008 0 0116 0M20 20a12.008 12.008 0 01-16 0" />
    </svg>
);

const ErrorStopIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
);

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ updates, overallStatus, errorMessage }) => {
    
    if (overallStatus === 'cancelled' || overallStatus === 'error') {
        const isError = overallStatus === 'error';
        const defaultErrorMessage = 'Lütfen daha sonra tekrar deneyiniz.';
        return (
            <div className="text-center p-4 w-full">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                   <ErrorStopIcon />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-red-700">
                    {isError ? 'İşlem Başarısız Oldu' : 'İşlem Durduruldu'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                    {isError ? (errorMessage || defaultErrorMessage) : 'Yeni bir sorgu başlatabilirsiniz.'}
                </p>
            </div>
        );
    }

    if (updates.length === 0 && overallStatus === 'running') {
        return (
             <div className="flex flex-col items-center justify-center p-4">
                <SpinnerIcon />
                <p className="mt-2 text-slate-600">Bağlantı kuruluyor...</p>
            </div>
        )
    }

    return (
        <div className="w-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 text-center">Asistanınız Düşünüyor...</h3>
            <div className="space-y-4">
                {updates.map((update, index) => {
                    const isLastStep = index === updates.length - 1;
                    const isCompleted = !isLastStep;
                    const isActive = isLastStep && overallStatus === 'running';
                    
                    let IconComponent;
                    if (isCompleted) {
                        IconComponent = <CheckIcon />;
                    } else if (isActive) {
                        IconComponent = update.status === 'retrying' ? <RetryIcon /> : <SpinnerIcon />;
                    } else {
                        IconComponent = <div className="w-5 h-5 rounded-full bg-slate-200" />;
                    }

                    return (
                        <div key={index} className="flex items-start transition-all duration-300 ease-in-out">
                            <div className="w-6 h-6 mr-4 mt-0.5 flex-shrink-0 flex items-center justify-center">
                               {IconComponent}
                            </div>
                            <span className={`
                                ${isCompleted ? 'text-slate-500 line-through opacity-70' : ''} 
                                ${isActive && update.status === 'retrying' ? 'text-amber-600 font-semibold' : ''}
                                ${isActive && update.status === 'running' ? 'text-slate-800 font-semibold' : ''}
                                ${!isActive && !isCompleted ? 'text-slate-500' : ''}
                                transition-colors duration-300
                            `}>
                                {update.message}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ThinkingProcess;
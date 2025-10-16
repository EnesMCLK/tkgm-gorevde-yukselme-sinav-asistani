
import React, { useEffect, useState } from 'react';

type ProcessStatus = 'running' | 'cancelled' | 'error';

interface ThinkingProcessProps {
  steps: string[];
  status: ProcessStatus;
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

const StopIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
);


const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ steps, status, errorMessage }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        if (status !== 'running') {
            return;
        }
        
        setCurrentStepIndex(0);

        const intervalId = setInterval(() => {
            // Animasyonun son adıma ulaştığında ilerlemeyi durdur.
            // Bu, son adımın spinner ikonunun, API'den gerçek cevap gelene kadar
            // dönmeye devam etmesini sağlar, böylece senkronizasyon sağlanır.
            setCurrentStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev));
        }, 1500);

        // 'status' değiştiğinde (örn: 'success' veya 'cancelled' olduğunda)
        // veya bileşen ekrandan kaldırıldığında interval'ı temizle.
        return () => {
            clearInterval(intervalId);
        };
    }, [status, steps.length]);

    if (status === 'cancelled' || status === 'error') {
        const isError = status === 'error';
        const defaultErrorMessage = 'Lütfen daha sonra tekrar deneyiniz.';

        return (
            <div className="text-center p-4 w-full">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                   <StopIcon />
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

    return (
        <div className="w-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 text-center">Asistanınız Düşünüyor...</h3>
            <div className="space-y-4">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isActive = index === currentStepIndex;

                    return (
                        <div key={index} className="flex items-center transition-all duration-300 ease-in-out">
                            <div className="w-6 h-6 mr-4 flex-shrink-0 flex items-center justify-center">
                                {isCompleted ? 
                                  <CheckIcon /> : 
                                  (isActive ? <SpinnerIcon /> : <div className="w-5 h-5 rounded-full bg-slate-200" />) 
                                }
                            </div>
                            <span className={`
                                ${isCompleted ? 'text-slate-500 line-through opacity-70' : ''} 
                                ${isActive ? 'text-slate-800 font-semibold' : 'text-slate-500'}
                                transition-all duration-300
                            `}>
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ThinkingProcess;
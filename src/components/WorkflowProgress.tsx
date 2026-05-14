import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface WorkflowProgressProps {
  currentStep: 'PR' | 'PO' | 'GRN' | 'STOCK';
}

const steps = [
  { id: 'PR', label: 'PR' },
  { id: 'PO', label: 'PO' },
  { id: 'GRN', label: 'GRN' },
  { id: 'STOCK', label: 'Stock Update' },
];

export function WorkflowProgress({ currentStep }: WorkflowProgressProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className="flex items-center space-x-2 py-4 px-6 bg-white border-b border-slate-200">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center space-x-2">
            <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border",
                index < currentIndex ? "bg-green-500 border-green-500 text-white" : 
                index === currentIndex ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-100 border-slate-300 text-slate-500"
            )}>
              {index < currentIndex ? <Check className="w-3 h-3"/> : index + 1}
            </div>
            <span className={cn(
                "text-sm font-medium",
                index === currentIndex ? "text-blue-700" : "text-slate-500"
            )}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
                "h-0.5 w-12",
                index < currentIndex ? "bg-green-500" : "bg-slate-200"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { MaterialPriceHistoryService } from '@/services/store';
import { MaterialPriceHistoryRecord } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface PriceComparisonBadgeProps {
  materialId: string;
  currentPrice: number;
}

export function PriceComparisonBadge({ materialId, currentPrice }: PriceComparisonBadgeProps) {
  const [lastRecord, setLastRecord] = useState<MaterialPriceHistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!materialId) {
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    const fetchLatest = async () => {
      setLoading(true);
      const record = await MaterialPriceHistoryService.getLatestPrice(materialId);
      if (isMounted) {
        setLastRecord(record as MaterialPriceHistoryRecord);
        setLoading(false);
      }
    };
    fetchLatest();
    return () => { isMounted = false; };
  }, [materialId]);

  if (loading || !lastRecord) {
    return null; // Return null if no history or loading
  }

  const prevPrice = lastRecord.unitPrice;
  const diff = currentPrice - prevPrice;
  const percentDiff = prevPrice > 0 ? (diff / prevPrice) * 100 : 0;
  const absPercent = Math.abs(percentDiff);

  let status: 'lower' | 'similar' | 'higher' = 'similar';
  if (percentDiff > 2) {
    status = 'higher';
  } else if (percentDiff < -2) {
    status = 'lower';
  }

  const badgeProps = {
    higher: { color: 'bg-red-100 text-red-800 hover:bg-red-100', icon: <ArrowUp className="w-3 h-3 mr-1" /> },
    lower: { color: 'bg-green-100 text-green-800 hover:bg-green-100', icon: <ArrowDown className="w-3 h-3 mr-1" /> },
    similar: { color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', icon: <Minus className="w-3 h-3 mr-1" /> }
  };

  const { color, icon } = badgeProps[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={
          <Badge className={`cursor-help ml-2 flex items-center ${color}`} variant="outline">
            {icon}
            {absPercent.toFixed(1)}%
          </Badge>
        } />
        <TooltipContent className="p-3 text-sm space-y-1 w-64 bg-white shadow-lg border border-slate-200 text-slate-800">
          <div className="font-medium border-b border-slate-100 pb-1 mb-2">Price Comparison</div>
          <div className="flex justify-between">
            <span className="text-slate-500">Last Price:</span>
            <span className="font-bold">₹{prevPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current:</span>
            <span className="font-bold">₹{currentPrice.toLocaleString()}</span>
          </div>
          <div className={`flex justify-between ${status === 'higher' ? 'text-red-600' : (status === 'lower' ? 'text-green-600' : 'text-yellow-600')}`}>
            <span>{status === 'higher' ? 'Increase:' : (status === 'lower' ? 'Saving:' : 'Difference:')}</span>
            <span className="font-bold">₹{Math.abs(diff).toLocaleString()} ({absPercent.toFixed(1)}%)</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">
            Prev. Vendor: {lastRecord.vendorName}
          </div>
          <div className="text-xs text-slate-400">
            Date: {format(new Date(lastRecord.purchaseDate), 'dd MMM yyyy')}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

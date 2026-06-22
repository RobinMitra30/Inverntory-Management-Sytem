import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type StockStatus = 'NO_STOCK' | 'LOW_STOCK' | 'IN_STOCK';

export function getStockStatus(currentStock: number, minStockLevel: number): StockStatus {
  if (currentStock <= 0) return 'NO_STOCK';
  if (currentStock < minStockLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case 'NO_STOCK': return 'bg-red-100 text-red-800';
    case 'LOW_STOCK': return 'bg-yellow-100 text-yellow-800';
    case 'IN_STOCK': return 'bg-green-100 text-green-800';
    default: return 'bg-slate-100 text-slate-800';
  }
}

export function cleanObject<T extends object>(obj: T): T {
  const result = { ...obj };
  Object.keys(result).forEach(key => {
    if (result[key as keyof T] === undefined) {
      delete result[key as keyof T];
    } else if (result[key as keyof T] !== null && typeof result[key as keyof T] === 'object' && !Array.isArray(result[key as keyof T])) {
      result[key as keyof T] = cleanObject(result[key as keyof T] as object) as any;
    }
  });
  return result;
}

export function formatMaterialName(name: string | undefined): string {
  if (!name) return 'Unknown Material';
  
  // If it's a UUID or auto-id (like 20 alphanumeric chars)
  if (/^[a-zA-Z0-9]{20}$/.test(name)) {
    return 'Material ' + name.substring(0, 4).toUpperCase();
  }
  
  // Replace dashes, underscores, and multiple spaces with a single space
  let formatted = name.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Common acronyms to preserve as uppercase
  const commonAcronyms = ['PVC', 'GI', 'LED', 'COB', 'MCB', 'MCCB', 'RCCB', 'ACB', 'MCC', 'LAN', 'CAT6', 'UPS', 'OPC', 'PPC', 'HSN', 'UOM', 'PO', 'GRN', 'XYZ'];
  
  formatted = formatted
    .split(' ')
    .map(word => {
      if (!word) return '';
      const upperWord = word.toUpperCase();
      if (commonAcronyms.includes(upperWord)) {
        return upperWord;
      }
      
      // Keep "1.5mm", "10mm", "0.75mm", "50kg" formatted nicely (lowercase or mixed is fine, let's keep word as-is or capitalize)
      if (/^\d+(\.\d+)?[a-zA-Z]+$/.test(word)) {
        return word;
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return formatted;
}

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, onSnapshot, where } from 'firebase/firestore';
import { PurchaseOrder, Product, Vendor } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileSpreadsheet, TrendingDown, TrendingUp, Filter, ShieldAlert, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { POService, ProductService, VendorService, MaterialPriceHistoryService } from '@/services/store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ProcurementIntelligencePage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    const unsubPos = POService.subscribe(setPos);
    const unsubProducts = ProductService.subscribe(setProducts);
    const unsubVendors = VendorService.subscribe(setVendors);
    
    // Fetch History
    MaterialPriceHistoryService.getAll().then(setHistory);

    // Fetch Audit Logs
    const q = query(collection(db, 'auditLogs'), where('action', 'in', ['PRICE_VERIFICATION_APPROVED']));
    const unsubAudit = onSnapshot(q, (snapshot) => {
       setAuditLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubPos();
      unsubProducts();
      unsubVendors();
      unsubAudit();
    };
  }, []);

  const kpis = useMemo(() => {
    let highPricePurchases = 0;
    let savingsAchieved = 0;
    let potentialSavings = 0;
    let blockedPurchases = 0;
    let vendorAlerts = 0;

    const vendorStats: Record<string, { spend: number, orders: number, cheapOptions: number; overPriced: number }> = {};

    pos.forEach(po => {
       if (po.status === 'PRICE_VERIFICATION_REQUIRED') {
         blockedPurchases++;
         if (po.priceVerification?.flaggedItems) {
           vendorAlerts += po.priceVerification.flaggedItems.length;
           highPricePurchases++;
         }
       }
       
       if (!vendorStats[po.vendorId]) {
         vendorStats[po.vendorId] = { spend: 0, orders: 0, cheapOptions: 0, overPriced: 0 };
       }
       vendorStats[po.vendorId].orders++;
       vendorStats[po.vendorId].spend += po.totalAmount;

       if (po.status === 'PRICE_VERIFICATION_REQUIRED') {
         vendorStats[po.vendorId].overPriced++;
       }
       
       // Calculate basic savings against avg
       po.items.forEach(item => {
          const itemHistory = history.filter(h => h.materialId === item.productId);
          if (itemHistory.length > 0) {
             const avg = itemHistory.reduce((s, h) => s + h.unitPrice, 0) / itemHistory.length;
             const min = Math.min(...itemHistory.map(h => h.unitPrice));
             if (item.unitPrice < avg) {
               savingsAchieved += (avg - item.unitPrice) * item.quantityOrdered;
               vendorStats[po.vendorId].cheapOptions++;
             }
             if (item.unitPrice > min && po.status !== 'APPROVED' && po.status !== 'CLOSED' && po.status !== 'SHIPPED' && po.status !== 'PARTIAL_RECEIVED') {
               potentialSavings += (item.unitPrice - min) * item.quantityOrdered;
             }
          }
       });
    });

    const vendorArray = Object.entries(vendorStats).map(([vendorId, stats]) => ({
      vendorId,
      vendorName: vendors.find(v => v.id === vendorId)?.name || 'Unknown',
      ...stats
    }));

    vendorArray.sort((a, b) => b.cheapOptions - a.cheapOptions);
    const bestVendor = vendorArray.length > 0 ? vendorArray[0].vendorName : 'N/A';

    return {
      highPricePurchases,
      savingsAchieved,
      potentialSavings,
      blockedPurchases,
      vendorAlerts,
      bestVendor
    };
  }, [pos, history, vendors]);

  const exportCSV = () => {
     const headers = ['Action', 'PO Number', 'User', 'Reason', 'Date'];
     const rows = auditLogs.map(log => [
        log.action,
        log.poNumber || '-',
        log.userName || '-',
        log.reason || '-',
        new Date(log.timestamp?.toMillis?.() || Date.now()).toLocaleDateString()
     ]);
     const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", "Procurement_Audit_Logs.csv");
     document.body.appendChild(link);
     link.click();
     link.remove();
  };

  const exportExcel = () => {
    const data = auditLogs.map(log => ({
      Action: log.action,
      'PO Number': log.poNumber || '-',
      User: log.userName || '-',
      Reason: log.reason || '-',
      Date: new Date(log.timestamp?.toMillis?.() || Date.now()).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
    XLSX.writeFile(wb, "Procurement_Audit_Logs.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Procurement Approval Audit Logs", 14, 15);
    const tableData = auditLogs.map(log => [
        log.action,
        log.poNumber || '-',
        log.userName || '-',
        log.reason || '-',
        new Date(log.timestamp?.toMillis?.() || Date.now()).toLocaleDateString()
    ]);
    autoTable(doc, {
      head: [['Action', 'PO Number', 'User', 'Reason', 'Date']],
      body: tableData,
      startY: 20
    });
    doc.save('Procurement_Audit_Logs.pdf');
  };

  const expensivePurchases = useMemo(() => {
     return pos.filter(p => p.priceVerification).sort((a,b) => b.totalAmount - a.totalAmount).slice(0,10);
  }, [pos]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Procurement AI</h1>
          <p className="text-slate-500 text-sm">Monitor intelligent alerts, high-price purchases, and vendor behavior.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={exportCSV}><FileSpreadsheet className="w-4 h-4 mr-2"/> CSV</Button>
           <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="w-4 h-4 mr-2"/> Excel</Button>
           <Button variant="outline" onClick={exportPDF}><FileSpreadsheet className="w-4 h-4 mr-2"/> PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-800 uppercase flex items-center"><ShieldAlert className="w-4 h-4 mr-2"/> Blocked Purchases</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold font-mono text-slate-900">{kpis.blockedPurchases}</div>
             <p className="text-xs text-red-600 font-medium">Pending Manager Approval</p>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50 border-amber-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800 uppercase flex items-center"><AlertCircle className="w-4 h-4 mr-2"/> Vendor Alerts</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold font-mono text-slate-900">{kpis.vendorAlerts}</div>
             <p className="text-xs text-amber-700 font-medium">Overpricing Flags Active</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-green-800 uppercase flex items-center"><TrendingDown className="w-4 h-4 mr-2"/> Savings</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex justify-between items-end">
               <div>
                 <div className="text-2xl font-bold font-mono text-slate-900 mb-1 leading-none">₹{kpis.savingsAchieved.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs text-green-700 font-medium font-sans">Achieved</span></div>
                 <div className="text-xl font-bold font-mono text-slate-500 leading-none">₹{kpis.potentialSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs text-slate-500 font-medium font-sans">Potential</span></div>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Most Expensive Purchases */}
         <Card className="shadow-sm">
           <CardHeader>
             <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-red-500"/> High Price Purchases
             </CardTitle>
           </CardHeader>
           <CardContent className="p-0">
             <Table>
               <TableHeader>
                 <TableRow className="bg-slate-50">
                   <TableHead>PO ID</TableHead>
                   <TableHead>Vendor</TableHead>
                   <TableHead className="text-right">Increase</TableHead>
                   <TableHead className="text-right">Total</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {expensivePurchases.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-4">No high price purchases detected.</TableCell></TableRow>
                 ) : expensivePurchases.map(po => (
                   <TableRow key={po.id}>
                     <TableCell className="font-mono text-xs">{po.poNumber}</TableCell>
                     <TableCell className="text-xs">{vendors.find(v => v.id === po.vendorId)?.name || 'Unknown'}</TableCell>
                     <TableCell className="text-right">
                       <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">
                         +{po.priceVerification?.highestPercentageIncrease?.toFixed(1)}%
                       </Badge>
                     </TableCell>
                     <TableCell className="text-right font-mono font-medium">₹{po.totalAmount.toLocaleString()}</TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </CardContent>
         </Card>

         {/* Audit Logs */}
         <Card className="shadow-sm">
           <CardHeader>
             <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
               <ClipboardList className="w-4 h-4 text-blue-500"/> Verification Audit Logs
             </CardTitle>
           </CardHeader>
           <CardContent className="p-0">
             <Table>
               <TableHeader>
                 <TableRow className="bg-slate-50">
                   <TableHead>Date</TableHead>
                   <TableHead>PO</TableHead>
                   <TableHead>Approver</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {auditLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-slate-500 py-4">No verification logs.</TableCell></TableRow>
                 ) : auditLogs.slice(0, 8).map(log => (
                   <TableRow key={log.id}>
                     <TableCell className="text-xs whitespace-nowrap">{log.timestamp ? format(log.timestamp.toMillis(), 'dd MMM HH:mm') : '-'}</TableCell>
                     <TableCell className="font-mono text-xs">{log.poNumber}</TableCell>
                     <TableCell>
                       <div className="text-xs font-medium">{log.userName}</div>
                       <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{log.reason}</div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}

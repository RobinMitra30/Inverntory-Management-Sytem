import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  FileText, 
  Share2, 
  CheckCircle2, 
  Clock,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Building,
  FileSpreadsheet,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressService, ProjectService, ProductService } from '@/services/store';
import { DailyReport, Project, UserRole, Product } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { domToJpeg } from 'modern-screenshot';

export default function DailyReportDetailsPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [report, setReport] = useState<DailyReport | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubReport = () => {};
    let unsubProducts = ProductService.subscribe(setProducts);
    if (reportId) {
      unsubReport = ProgressService.subscribe(reports => {
        const found = reports.find(r => r.id === reportId);
        if (found) {
          setReport(found);
          ProjectService.subscribe(projects => {
            const p = projects.find(proj => proj.id === found.projectId);
            if (p) setProject(p);
          });
        }
        setIsLoading(false);
      });
    }
    return () => {
      unsubReport();
      unsubProducts();
    }
  }, [reportId]);

  useEffect(() => {
    if (report && !isLoading) {
      const params = new URLSearchParams(window.location.search);
      const shouldDownload = params.get('download') === 'true';
      const shouldPrint = params.get('print') === 'true';

      if (shouldDownload || shouldPrint) {
        // Wait for images and layouts to settle
        const timer = setTimeout(() => {
          if (shouldDownload) handleDownloadPDF();
          if (shouldPrint) handlePrint();
          
          // Clear query params
          navigate(window.location.pathname, { replace: true });
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [report, isLoading]);

  const handlePrint = () => {
    window.print();
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!printRef.current || !report) return;
    
    try {
      setIsDownloading(true);
      toast.info('Preparing your PDF download...');
      
      const element = printRef.current;
      
      // Use domToJpeg for smaller file sizes (JPEG vs PNG)
      // scale: 1.5 provides a good balance between readability and file size
      const dataUrl = await domToJpeg(element, {
        quality: 0.8,
        scale: 1.5,
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = (heightLeft - pdfHeight) - position; 
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, heightLeft - pdfHeight, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`DailyReport_${report.date}_${report.id.slice(-6)}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: DailyReport['status']) => {
    if (!reportId) return;
    try {
      await ProgressService.updateStatus(reportId, newStatus);
      toast.success(`Report ${newStatus.toLowerCase()} successfully`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center p-12">
        <h2 className="text-xl font-bold text-slate-900 italic font-serif tracking-tight">Report not found</h2>
        <Button variant="link" onClick={() => navigate(-1)} className="mt-4">Go back</Button>
      </div>
    );
  }

  const isReviewer = profile?.role === UserRole.ADMIN || profile?.role === UserRole.PROJECT_MANAGER;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Actions - Hidden on Print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </Button>
        <div className="flex flex-wrap gap-2">
          {isReviewer && report.status === 'SUBMITTED' && (
             <Button className="bg-purple-600 hover:bg-purple-700 font-bold italic" onClick={() => handleStatusUpdate('REVIEWED')}>
               <ShieldCheck className="w-4 h-4 mr-2" />
               Mark Reviewed
             </Button>
          )}
          {isReviewer && (report.status === 'REVIEWED' || report.status === 'SUBMITTED') && (
             <Button className="bg-green-600 hover:bg-green-700 font-bold italic" onClick={() => handleStatusUpdate('APPROVED')}>
               <CheckCircle2 className="w-4 h-4 mr-2" />
               Approve Report
             </Button>
          )}
          <Button variant="outline" className="font-bold italic" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
          <Button 
            className="bg-blue-600 font-bold italic" 
            onClick={handleDownloadPDF} 
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Main Report Container */}
      <div ref={printRef} className="bg-white border border-slate-200 shadow-2xl p-8 max-w-5xl mx-auto print:border-none print:shadow-none print:p-0">
        
        {/* Report Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold italic text-xl">S</div>
                <div>
                   <h1 className="text-2xl font-black italic tracking-tighter text-slate-900">SiteFlow</h1>
                   <p className="text-[10px] uppercase font-mono tracking-[0.3em] text-slate-500 font-bold leading-none">by Structure Makers</p>
                </div>
            </div>
            <div className="mt-4">
               <h2 className="text-xl font-bold italic text-slate-900">Daily Site Progress Report</h2>
               <p className="text-xs text-slate-500 font-mono italic">#{report.id.toUpperCase()}</p>
            </div>
          </div>
          <div className="text-right space-y-1">
             <div className="inline-block">
                <Badge variant="outline" className={
                  report.status === 'APPROVED' ? "bg-green-50 text-green-700 border-green-200 font-bold" :
                  report.status === 'SUBMITTED' ? "bg-blue-50 text-blue-700 border-blue-200 font-bold" :
                  "bg-slate-50 text-slate-700 border-slate-200 font-bold"
                }>
                  Status: {report.status}
                </Badge>
             </div>
             <p className="text-sm font-bold text-slate-900">{format(new Date(report.date), 'EEEE, MMMM dd, yyyy')}</p>
             <p className="text-[10px] text-slate-400 font-mono italic uppercase">Submitted at: {format(new Date(report.createdAt), 'hh:mm a')}</p>
          </div>
        </div>

        {/* Project Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-sm">
           <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                 <Building className="w-3 h-3" /> Project
              </p>
              <p className="font-bold text-slate-900 capitalize">{project?.name || report.projectName || 'N/A'}</p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                 <MapPin className="w-3 h-3" /> Site Location
              </p>
              <p className="font-bold text-slate-900">{project?.location || report.siteInchargeName || 'Main Site'}</p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                 <User className="w-3 h-3" /> Supervisor
              </p>
              <p className="font-bold text-slate-900">{report.supervisorName || 'N/A'}</p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                 <Calendar className="w-3 h-3" /> Report Date
              </p>
              <p className="font-bold text-slate-900 font-mono">{report.date}</p>
           </div>
        </div>

        {/* Section: Stock Details */}
        <div className="mb-8 overflow-x-auto">
           <div className="bg-slate-900 text-white p-2 px-4 flex items-center gap-2 mb-4">
              <Package className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Stock Movement Details</h3>
           </div>
           <table className="w-full border-collapse border border-slate-200 text-sm">
              <thead className="bg-slate-100 italic">
                 <tr>
                    <th className="border p-2 text-left">Material / Name</th>
                    <th className="border p-2 text-right">Received</th>
                    <th className="border p-2 text-right">Used</th>
                    <th className="border p-2 text-right">Balance</th>
                 </tr>
              </thead>
              <tbody>
                 {report.stockDetails?.filter(s => s.receivedQuantity > 0 || s.usedQuantity > 0).map((stock, i) => {
                    const product = products.find(p => p.id === stock.productId);
                    return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                       <td className="border p-2 font-medium">{product?.name || stock.productId}</td>
                       <td className="border p-2 text-right font-mono">{stock.receivedQuantity}</td>
                       <td className="border p-2 text-right font-mono text-red-600">-{stock.usedQuantity}</td>
                       <td className="border p-2 text-right font-bold font-mono">{stock.remainingBalance}</td>
                    </tr>
                    );
                 }) || (
                   <tr>
                     <td colSpan={4} className="border p-4 text-center italic text-slate-400">No stock movements reported today</td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>

        {/* Section: Work Details */}
        <div className="mb-8 overflow-x-auto">
           <div className="bg-slate-900 text-white p-2 px-4 flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Work Execution Details</h3>
           </div>
           <table className="w-full border-collapse border border-slate-200 text-sm">
              <thead className="bg-slate-100 italic">
                 <tr>
                    <th className="border p-2 text-left">Work Description</th>
                    <th className="border p-2 text-right">Total Work</th>
                    <th className="border p-2 text-right">Today</th>
                    <th className="border p-2 text-right">Balance</th>
                    <th className="border p-2 text-center">% Progress</th>
                    <th className="border p-2 text-center">Drawing</th>
                 </tr>
              </thead>
              <tbody>
                 {report.workDetails?.map((work, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                       <td className="border p-2 font-medium">{work.workType}</td>
                       <td className="border p-2 text-right font-mono">{work.totalWork} <span className="text-[10px] text-slate-400">{work.unitOfWork}</span></td>
                       <td className="border p-2 text-right font-mono text-blue-600">{work.todayWork}</td>
                       <td className="border p-2 text-right font-mono">{work.balanceWork}</td>
                       <td className="border p-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                             <span className="font-bold text-[10px]">{work.progressPercent.toFixed(1)}%</span>
                             <div className="w-16 bg-slate-200 rounded-full h-1">
                                <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${work.progressPercent}%` }} />
                             </div>
                          </div>
                       </td>
                       <td className="border p-2 text-center">
                          <Badge variant={work.drawingReceived ? "outline" : "secondary"} className={work.drawingReceived ? "bg-green-50 text-green-700" : ""}>
                             {work.drawingReceived ? 'YES' : 'NO'}
                          </Badge>
                       </td>
                    </tr>
                 )) || (
                   <tr>
                     <td colSpan={6} className="border p-4 text-center italic text-slate-400">No work details recorded</td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>

        {/* Two Column Grid: Timeline and Manpower */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
           <div>
              <div className="bg-slate-900 text-white p-2 px-4 flex items-center gap-2 mb-4">
                 <Clock className="w-4 h-4" />
                 <h3 className="text-xs font-bold uppercase tracking-widest">Work Timeline</h3>
              </div>
              <table className="w-full border-collapse border border-slate-200 text-[11px]">
                 <thead className="bg-slate-50 italic">
                    <tr>
                       <th className="border p-2 text-left">Activity</th>
                       <th className="border p-2 text-left">Start</th>
                       <th className="border p-2 text-left">EST End</th>
                    </tr>
                 </thead>
                 <tbody>
                    {report.workTimelines?.map((t, i) => (
                       <tr key={i}>
                          <td className="border p-2 font-medium">{t.workType}</td>
                          <td className="border p-2">{t.startDate}</td>
                          <td className="border p-2">{t.endDate}</td>
                       </tr>
                    )) || <tr><td colSpan={3} className="border p-2 text-center italic">None</td></tr>}
                 </tbody>
              </table>
           </div>
           <div>
              <div className="bg-slate-900 text-white p-2 px-4 flex items-center gap-2 mb-4">
                 <Users className="w-4 h-4" />
                 <h3 className="text-xs font-bold uppercase tracking-widest">Manpower Details</h3>
              </div>
              <table className="w-full border-collapse border border-slate-200 text-[11px]">
                 <thead className="bg-slate-50 italic">
                    <tr>
                       <th className="border p-2 text-left">Work Item</th>
                       <th className="border p-2 text-center">Skilled</th>
                       <th className="border p-2 text-center">Unskilled</th>
                    </tr>
                 </thead>
                 <tbody>
                    {report.workerDetails?.map((w, i) => (
                       <tr key={i}>
                          <td className="border p-2 font-medium">{w.workType}</td>
                          <td className="border p-2 text-center">{w.skilledWorkers}</td>
                          <td className="border p-2 text-center">{w.nonSkilledWorkers}</td>
                       </tr>
                    )) || <tr><td colSpan={3} className="border p-2 text-center italic">None</td></tr>}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Section: Issues / Remarks */}
        <div className="mb-8">
           <div className="bg-slate-900 text-white p-2 px-4 flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Observations & Blockers</h3>
           </div>
           <div className="p-4 border-2 border-slate-100 rounded-lg bg-slate-50 min-h-[100px] text-sm text-slate-700 italic font-medium leading-relaxed">
              "{report.issues || 'No issues or safety concerns reported for today.'}"
           </div>
        </div>

        {/* Section: Photos disabled
        {report.photoUrls && report.photoUrls.length > 0 && (
           <div className="mb-8 print:break-inside-avoid">
              <div className="bg-slate-900 text-white p-2 px-4 flex items-center gap-2 mb-4">
                 <Camera className="w-4 h-4" />
                 <h3 className="text-xs font-bold uppercase tracking-widest">Site Photographs</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                 {report.photoUrls.map((url, i) => (
                    <img 
                      key={i} 
                      src={url} 
                      alt={`Site Photo ${i+1}`} 
                      className="w-full h-48 object-cover rounded-lg border border-slate-200" 
                      referrerPolicy="no-referrer"
                    />
                 ))}
              </div>
           </div>
        )}
        */}

        {/* Section: Signature */}
        <div className="mt-16 flex justify-end print:break-inside-avoid">
           <div className="text-center w-64 space-y-2">
              <div className="border-b-2 border-slate-900 pb-2 mb-2 min-h-[60px] flex items-center justify-center italic text-xl font-serif text-slate-900">
                 {report.signature}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Authorized Signature</p>
              <p className="text-xs font-bold text-slate-900">{report.supervisorName}</p>
              <p className="text-[9px] text-slate-500 font-mono italic">{report.supervisorId}</p>
           </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-slate-100 pt-4 text-center">
            <p className="text-[9px] text-slate-300 uppercase tracking-[0.3em] font-mono italic">
               Automatically Generated by SiteFlow OS - Site Data Verfied & Timestamped
            </p>
        </div>
      </div>
    </div>
  );
}

function Plus(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function Users(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M11 7.05a4 4 0 0 1 4-4" />
    </svg>
  )
}

function Package(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

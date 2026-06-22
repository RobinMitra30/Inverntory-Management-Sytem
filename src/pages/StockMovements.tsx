import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  Download,
  Calendar,
  Box,
  LayoutGrid,
  ChevronRight,
  User,
  MapPin,
  Clipboard
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { MovementService, ProjectService } from '@/services/store';
import { StockMovement, MovementType, Project } from '@/types';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const getMovementIcon = (type: MovementType, quantity?: number) => {
  switch (type) {
    case MovementType.STOCK_IN:
    case MovementType.PURCHASE_ENTRY:
    case MovementType.GRN_ENTRY:
    case MovementType.RETURN_TO_STORE:
    case MovementType.PURCHASE_RECEIPT:
    case MovementType.WAREHOUSE_RECEIPT:
    case MovementType.DIRECT_SITE_DELIVERY_VIRTUAL:
      return <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />;
    case MovementType.ISSUE_TO_SITE:
      if (quantity !== undefined && quantity < 0) {
        return <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />;
      }
      return <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />;
    case MovementType.STOCK_OUT:
    case MovementType.MATERIAL_ISSUE:
    case MovementType.SITE_TRANSFER:
    case MovementType.RETURN_TO_VENDOR:
    case MovementType.DAMAGE_ENTRY:
    case MovementType.SCRAP_ENTRY:
    case MovementType.CONSUMPTION_ENTRY:
      return <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />;
    case MovementType.ADJUSTMENT_ENTRY:
    case MovementType.ADJUSTMENT:
      return <RefreshCw className="w-3.5 h-3.5 text-blue-500" />;
    default:
      return <ArrowDownLeft className="w-3.5 h-3.5 text-slate-400" />;
  }
};

const getMovementColor = (type: MovementType, quantity?: number) => {
  switch (type) {
    case MovementType.STOCK_IN:
    case MovementType.PURCHASE_ENTRY:
    case MovementType.GRN_ENTRY:
    case MovementType.RETURN_TO_STORE:
    case MovementType.PURCHASE_RECEIPT:
    case MovementType.WAREHOUSE_RECEIPT:
    case MovementType.DIRECT_SITE_DELIVERY_VIRTUAL:
      return "bg-green-500/10 text-green-600 border-green-200";
    case MovementType.ISSUE_TO_SITE:
      if (quantity !== undefined && quantity < 0) {
        return "bg-red-500/10 text-red-600 border-red-200";
      }
      return "bg-green-500/10 text-green-600 border-green-200";
    case MovementType.STOCK_OUT:
    case MovementType.MATERIAL_ISSUE:
    case MovementType.SITE_TRANSFER:
    case MovementType.RETURN_TO_VENDOR:
    case MovementType.DAMAGE_ENTRY:
    case MovementType.SCRAP_ENTRY:
    case MovementType.CONSUMPTION_ENTRY:
      return "bg-red-500/10 text-red-600 border-red-200";
    case MovementType.ADJUSTMENT_ENTRY:
    case MovementType.ADJUSTMENT:
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    default:
      return "bg-slate-500/10 text-slate-600 border-slate-200";
  }
};

export default function StockMovements() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProject, search, typeFilter]);

  const getProjectDisplayName = (projectId: string, proj?: Project, fallbackName?: string): string => {
    if (proj?.name && !/^[a-zA-Z0-9]{18,22}$/.test(proj.name)) {
      return proj.name;
    }
    const defaultMappings: Record<string, string> = {
      'pMUUAjtOuJ8BjHiHoBgY': 'Grand Horizon Mall',
      'demo-project': 'Grand Horizon Mall',
    };
    if (defaultMappings[projectId]) return defaultMappings[projectId];
    const nameToTest = proj?.name || fallbackName;
    if (nameToTest && /^[a-zA-Z0-9]{18,22}$/.test(nameToTest)) {
      return `Horizon Project (${nameToTest.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9]{18,22}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    // General check if string looks like an auto-generated Firestore ID
    if (nameToTest && /^[a-zA-Z0-9_-]{5,30}$/.test(nameToTest)) {
      return `Horizon Project (${nameToTest.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    return nameToTest || projectId || 'Grand Horizon Mall';
  };

  const isSupervisor = profile?.role === 'SITE_SUPERVISOR';
  const allowedProjectIds = isSupervisor ? (profile?.assignedProjects || []) : [];

  const allowedProjects = isSupervisor 
    ? projects.filter(p => allowedProjectIds.includes(p.id)) 
    : projects;

  // Sync selectedProject state with user role permissions
  useEffect(() => {
    if (isSupervisor && allowedProjectIds.length > 0) {
      if (selectedProject === 'ALL' || !allowedProjectIds.includes(selectedProject)) {
        setSelectedProject(allowedProjectIds[0]);
      }
    }
  }, [isSupervisor, allowedProjectIds, selectedProject]);

  useEffect(() => {
    const unsubMovements = MovementService.subscribe((data) => {
      setMovements(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setIsLoading(false);
    });
    const unsubProjects = ProjectService.subscribe(setProjects);

    return () => {
      unsubMovements();
      unsubProjects();
    };
  }, []);

  const filteredMovements = movements.filter(m => {
    // If supervisor, check project level access control
    if (isSupervisor && !allowedProjectIds.includes(m.projectId)) {
      return false;
    }

    // Segregate and view inventory movement data project-wise
    const matchesProject = selectedProject === 'ALL' || m.projectId === selectedProject;
    if (!matchesProject) return false;

    const productName = m.productName?.toLowerCase() || '';
    const sku = m.sku?.toLowerCase() || '';
    const projectName = m.projectName?.toLowerCase() || '';
    const refNum = m.referenceNumber?.toLowerCase() || '';
    const searchTerm = search.toLowerCase();

    const matchesSearch = 
      productName.includes(searchTerm) ||
      sku.includes(searchTerm) ||
      projectName.includes(searchTerm) ||
      refNum.includes(searchTerm);
    
    const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const paginatedMovements = filteredMovements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('ellipsis1');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis2');
      }
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredMovements.map(m => ({
      'Date': m.createdAt ? format(new Date(m.createdAt), 'yyyy-MM-dd HH:mm') : '',
      'Product': m.productName || 'Unknown',
      'SKU': m.sku || 'N/A',
      'Site': m.projectName || 'Unknown',
      'Type': (m.type || '').replace(/_/g, ' '),
      'Quantity': m.quantity || 0,
      'Stock After': m.currentStock || 0,
      'Location': m.location || '',
      'Dept': m.department || '',
      'User': m.userName || 'System',
      'Reference': m.referenceNumber || '',
      'Remarks': m.remarks || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movements");
    XLSX.writeFile(wb, "stock_movements_report.xlsx");
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            Stock Movement History
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">Complete audit trail for all inventory transactions</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-xl font-semibold gap-2" onClick={exportToExcel}>
             <Download className="w-4 h-4" />
             Export Ledger
           </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by Product, SKU, Project, or Ref#" 
              className="pl-11 h-11 bg-slate-50/50 border-slate-200 focus:bg-white transition-all rounded-xl w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          {/* Mobile Filter Toggle */}
          <div className="md:hidden flex justify-end">
             <Button variant="outline" className="h-11 rounded-xl w-full flex justify-center items-center gap-2" onClick={() => {
                const el = document.getElementById('mobile-filters-stock-movements');
                if (el) el.classList.toggle('hidden');
             }}>
                <Filter className="w-4 h-4" /> Filters
             </Button>
          </div>

          <div id="mobile-filters-stock-movements" className="hidden md:flex flex-col md:flex-row gap-2 w-full md:w-auto">
            {/* Project/Site filter selector */}
            <div className="w-full md:w-56">
              <Select 
                value={selectedProject} 
                onValueChange={setSelectedProject}
                disabled={isSupervisor && allowedProjectIds.length <= 1}
              >
                <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 w-full">
                  <SelectValue placeholder="All Projects / Sites">
                    {selectedProject === 'ALL' 
                      ? 'All Project Sites' 
                      : getProjectDisplayName(selectedProject, projects.find(p => p.id === selectedProject))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {!isSupervisor && (
                    <SelectItem value="ALL">All Project Sites</SelectItem>
                  )}
                  {allowedProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {getProjectDisplayName(project.id, project)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-56">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <SelectValue placeholder="All Transaction Types" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All Transactions</SelectItem>
                  {Object.values(MovementType).map(type => (
                    <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-11 w-full md:w-11 rounded-xl border border-slate-200 shrink-0" 
              onClick={() => { 
                setSearch(''); 
                setTypeFilter('ALL'); 
                setSelectedProject(isSupervisor && allowedProjectIds.length > 0 ? allowedProjectIds[0] : 'ALL'); 
              }}
            >
              <span className="md:hidden mr-2 font-bold">Reset Filters</span>
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <div className="hidden md:block min-w-full">
          <Table compact>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="py-4 font-bold text-slate-900">Date & Time</TableHead>
                <TableHead className="font-bold text-slate-900">Material</TableHead>
                <TableHead className="font-bold text-slate-900 text-center">Movement Type</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Quantity</TableHead>
                <TableHead className="font-bold text-slate-900">Source</TableHead>
                <TableHead className="font-bold text-slate-900">Destination</TableHead>
                <TableHead className="font-bold text-slate-900">Project Context</TableHead>
                <TableHead className="font-bold text-slate-900">Ref / User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`} className="animate-pulse">
                      <TableCell colSpan={7} className="h-20 bg-slate-50/20"></TableCell>
                    </TableRow>
                  ))
                ) : filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                       <div className="flex flex-col items-center justify-center space-y-2 opacity-40">
                         <Clipboard className="w-12 h-12" />
                         <p className="font-medium">No movement records found matching your filters</p>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMovements.map((m) => (
                    <motion.tr 
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-all duration-300"
                    >
                      <TableCell className="py-5">
                         <div className="flex flex-col">
                           <span className="font-semibold text-slate-900">
                             {format(new Date(m.createdAt), 'MMM dd, yyyy')}
                           </span>
                           <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-1">
                             <Calendar className="w-3 h-3" />
                             {format(new Date(m.createdAt), 'HH:mm:ss')}
                           </span>
                         </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            <Box className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{m.productName}</span>
                            <span className="text-[10px] font-mono text-slate-400 truncate">{m.sku}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge 
                           variant="outline" 
                           className={cn("px-2.5 py-1 rounded-lg border flex items-center gap-1.5 w-fit mx-auto", getMovementColor(m.type, m.quantity))}
                         >
                           {getMovementIcon(m.type, m.quantity)}
                           <span className="text-[10px] font-bold tracking-wide">{m.type.replace(/_/g, ' ')}</span>
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex flex-col items-end">
                            <span className={cn(
                              "text-sm font-black font-mono tracking-tight px-2 py-0.5 rounded-md",
                              m.quantity > 0 ? "text-green-600 bg-green-50" : m.quantity < 0 ? "text-red-600 bg-red-50" : "text-slate-400"
                            )}>
                              {m.quantity > 0 ? '+' : ''}{m.quantity}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-1">Bal: {m.currentStock}</span>
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2">
                           <MapPin className="w-3 h-3 text-slate-300" />
                           <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]">
                             {m.sourceProjectName || '-'}
                           </span>
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2">
                           <MapPin className="w-3 h-3 text-primary/40" />
                           <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                             {m.destinationProjectName || '-'}
                           </span>
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                           <div className="flex items-center gap-1 text-slate-900 font-semibold text-xs">
                             <LayoutGrid className="w-3 h-3 opacity-40" />
                             {getProjectDisplayName(m.projectId, projects.find(p => p.id === m.projectId), m.projectName)}
                           </div>
                           {m.department && (
                             <div className="flex items-center gap-1 text-slate-400 text-[10px] font-mono uppercase mt-0.5">
                               {m.department}
                             </div>
                           )}
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                           {m.referenceNumber ? (
                             <div className="flex items-center gap-1 text-primary font-bold text-[10px] mb-1 truncate max-w-[100px]">
                               <RefreshCw className="w-2.5 h-2.5" />
                               {m.referenceNumber}
                             </div>
                           ) : (
                             <div className="h-4" />
                           )}
                           <div className="flex items-center gap-1.5 grayscale opacity-60">
                             <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center text-[8px] font-black text-slate-600">{m.userName?.charAt(0) || '?'}</div>
                             <span className="text-[10px] font-medium text-slate-500 truncate max-w-[80px]">{m.userName || 'System'}</span>
                           </div>
                         </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100">
             <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={`skeleton-mob-${i}`} className="p-4 animate-pulse">
                       <div className="h-16 bg-slate-50/20 rounded-xl"></div>
                    </div>
                  ))
                ) : filteredMovements.length === 0 ? (
                  <div className="p-8 text-center">
                     <div className="flex flex-col items-center justify-center space-y-2 opacity-40">
                       <Clipboard className="w-12 h-12" />
                       <p className="font-medium">No movement records found</p>
                     </div>
                  </div>
                ) : (
                  paginatedMovements.map((m) => (
                    <motion.div 
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 flex flex-col gap-3 group hover:bg-slate-50/50 transition-all duration-300"
                    >
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                              <Box className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{m.productName}</span>
                              <span className="text-[10px] font-mono text-slate-400 truncate">{m.sku}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <span className="text-[10px] font-bold text-slate-900">
                              {format(new Date(m.createdAt), 'MMM dd, yyyy')}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(m.createdAt), 'HH:mm')}
                            </span>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={cn("px-2 py-0.5 rounded-md border flex items-center gap-1 w-fit", getMovementColor(m.type, m.quantity))}
                          >
                            {getMovementIcon(m.type, m.quantity)}
                            <span className="text-[9px] font-bold tracking-wide">{m.type.replace(/_/g, ' ')}</span>
                          </Badge>
                          <div className="flex-1" />
                          <div className="flex flex-col items-end">
                              <span className={cn(
                                "text-sm font-black font-mono tracking-tight px-2 py-0.5 rounded-md",
                                m.quantity > 0 ? "text-green-600 bg-green-50" : m.quantity < 0 ? "text-red-600 bg-red-50" : "text-slate-400"
                              )}>
                                {m.quantity > 0 ? '+' : ''}{m.quantity}
                              </span>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Source</span>
                            <span className="text-xs font-medium text-slate-600 truncate">
                              {m.sourceProjectName || '-'}
                            </span>
                          </div>
                          <div className="flex flex-col border-l border-slate-200 pl-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Destination</span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {m.destinationProjectName || '-'}
                            </span>
                          </div>
                       </div>

                       <div className="flex justify-between items-center mt-2">
                         <div className="flex items-center gap-1.5 grayscale opacity-60">
                           <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-[8px] font-black text-slate-600">{m.userName?.charAt(0) || '?'}</div>
                           <span className="text-[10px] font-medium text-slate-500 truncate max-w-[100px]">{m.userName || 'System'}</span>
                         </div>
                         {m.referenceNumber && (
                           <div className="flex items-center gap-1 text-primary font-bold text-[10px] truncate max-w-[120px]">
                             <RefreshCw className="w-2.5 h-2.5" />
                             {m.referenceNumber}
                           </div>
                         )}
                       </div>
                    </motion.div>
                  ))
                )}
             </AnimatePresence>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 rounded-b-[2rem]">
              <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest leading-none">
                Page {currentPage} of {totalPages} <span className="text-slate-200 mx-2">|</span> Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredMovements.length)}-{Math.min(currentPage * itemsPerPage, filteredMovements.length)} of {filteredMovements.length} Movements
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg px-3 font-bold border-slate-200 bg-white"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                
                {getPageNumbers().map((page, index) => {
                  if (typeof page === 'string') {
                    return <span key={`ellipse-${index}`} className="text-slate-400 font-mono text-xs px-1 font-bold">...</span>;
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      className={`h-9 w-9 p-0 rounded-lg font-mono font-bold transition-all ${
                        currentPage === page ? "bg-primary shadow-sm shadow-primary/10 text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg px-3 font-bold border-slate-200 bg-white"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {movements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-8 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today's Inflow</p>
                <div className="w-10 h-10 rounded-2xl bg-white/90 border border-white/60 flex items-center justify-center shadow-xs">
                   <ArrowDownLeft className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-green-600 leading-none">
                  {movements.filter(m => {
                    const d = new Date(m.createdAt);
                    const today = new Date();
                    return m.quantity > 0 && d.toDateString() === today.toDateString();
                  }).reduce((sum, m) => sum + m.quantity, 0)}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2">Materials Received Today</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-8 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today's Consumption</p>
                <div className="w-10 h-10 rounded-2xl bg-white/90 border border-white/60 flex items-center justify-center shadow-xs">
                   <ArrowUpRight className="w-5 h-5 text-red-500" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-red-600 leading-none">
                  {Math.abs(movements.filter(m => {
                    const d = new Date(m.createdAt);
                    const today = new Date();
                    return m.quantity < 0 && d.toDateString() === today.toDateString();
                  }).reduce((sum, m) => sum + m.quantity, 0))}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2">Materials Issued Today</p>
              </div>
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-8 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Log Count</p>
                <div className="w-10 h-10 rounded-2xl bg-white/90 border border-white/60 flex items-center justify-center shadow-xs">
                   <Clipboard className="w-5 h-5 text-teal-600" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-950 leading-none">{movements.length}</p>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2">Total Audit Trail Entries</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { computeProjectFinancials } from '@/services/financials';
import { 
  ProjectService, 
  TaskService, 
  POService, 
  PRService, 
  GRNService, 
  InventoryService, 
  ProductService, 
  UserService,
  IssueService,
  ProjectReturnService,
  ProgressService
} from '@/services/store';
import { 
  Project, 
  UserRole, 
  SiteTask, 
  PurchaseOrder, 
  PurchaseRequisition, 
  GRN, 
  Stock, 
  Product, 
  UserProfile,
  ProjectIssue,
  ProjectReturn,
  DailyReport
} from '@/types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cleanObject } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

import { 
  LayoutGrid, 
  List, 
  Table as TableIcon,
  Search,
  Plus,
  Download,
  Upload,
  Filter,
  MoreVertical,
  Building2,
  Calendar,
  Wallet,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  User,
  MapPin,
  Tag,
  Package,
  Layers,
  FileCheck,
  X,
  Edit2,
  Copy,
  Archive,
  BarChart2,
  Settings,
  ClipboardList,
  Trash2,
  Database,
  HelpCircle,
  FileText,
  Loader2
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ProjectsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projectReturns, setProjectReturns] = useState<ProjectReturn[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);

  useEffect(() => {
    const unsubscribes = [
      ProjectService.subscribe(setProjects),
      TaskService.subscribe(setTasks),
      POService.subscribe(setPos),
      PRService.subscribe(setPrs),
      GRNService.subscribe(setGrns),
      InventoryService.subscribe(setStocks),
      ProductService.subscribe(setProducts),
      (UserService as any).subscribe?.(setUsers) || (() => {}),
      IssueService.subscribe(setIssues),
      ProjectReturnService.subscribe(setProjectReturns),
      ProgressService.subscribe(setDailyReports)
    ];
    return () => unsubscribes.forEach(fn => fn());
  }, []);

  // Export / Import Dialog States
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'pdf' | 'json'>('xlsx');
  const [exportRange, setExportRange] = useState<'all' | 'single' | 'selected'>('all');
  const [exportSelectedProjId, setExportSelectedProjId] = useState<string>('');
  const [exportSelectedIds, setExportSelectedIds] = useState<string[]>([]);
  const [exportIncludeOptions, setExportIncludeOptions] = useState({
    inventory: true,
    materialSummary: true,
    pendingPr: true,
    pendingPo: true,
    pendingGrn: true,
    returns: true,
    tasks: true,
    issues: true,
    reports: true,
    attachments: true,
  });

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [selectedImportIndices, setSelectedImportIndices] = useState<number[]>([]);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // UI States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedManager, setSelectedManager] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [previewProject, setPreviewProject] = useState<Project | null>(null);

  const [newProject, setNewProject] = useState<Omit<Project, 'id'>>({
    name: '',
    location: '',
    status: 'ACTIVE',
    budget: 0,
    managerId: '',
    progress: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    createdAt: new Date().toISOString()
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ProjectService.add({ ...newProject });
      setIsAddOpen(false);
      toast.success('Project initiated successfully');
      setNewProject({
        name: '',
        location: '',
        status: 'ACTIVE',
        budget: 0,
        managerId: '',
        progress: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      toast.error('Failed to create project');
    }
  };

  const isAdmin = profile?.role === UserRole.ADMIN || profile?.role === 'ADMIN';
  const isProjManager = profile?.role === UserRole.PROJECT_MANAGER || profile?.role === 'PROJECT_MANAGER';

  const handleDeleteProject = async (pId: string) => {
    if (!isAdmin) {
      toast.error("Only administrators are permitted to delete projects.");
      return;
    }
    const target = projects.find(p => p.id === pId);
    if (!target) return;
    if (!target.isImported) {
      toast.error("Only imported projects can be deleted by admins.");
      return;
    }
    if (confirm(`Are you absolutely sure you want to permanently delete the imported project "${target.name}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'projects', pId));
        toast.success("Imported project has been successfully deleted.");
        if (previewProject?.id === pId) {
          setPreviewProject(null);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(`Deletion failed: ${err.message || 'database error'}`);
      }
    }
  };

  const downloadSampleTemplate = () => {
    const headers = [
      "Project Name",
      "Project Code",
      "Client Name",
      "Project Manager",
      "Project Type",
      "Location",
      "Address",
      "Start Date",
      "Expected End Date",
      "Budget",
      "Priority",
      "Status",
      "Description"
    ];
    
    const rows = [
      [
        "ABC Mall Construction",
        "PRJ-001",
        "ABC Developers",
        "Robin Mitra",
        "Commercial",
        "Jabalpur",
        "Napier Town",
        "2026-06-20",
        "2027-04-30",
        "50000000",
        "High",
        "Active",
        "Commercial Mall Project"
      ],
      [
        "XYZ Apartments",
        "PRJ-002",
        "XYZ Builders",
        "Rahul Sharma",
        "Residential",
        "Bhopal",
        "Arera Colony",
        "2026-07-10",
        "2028-02-15",
        "120000000",
        "Medium",
        "Planning",
        "Residential Apartment"
      ]
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => {
        const stringified = String(val);
        if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n")) {
          return `"${stringified.replace(/"/g, '""')}"`;
        }
        return stringified;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Project_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample template downloaded!");
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportSummary(null);

    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = async (evt) => {
      try {
        const dataArr = evt?.target?.result;
        let parsedRows: any[] = [];

        if (fileExtension === 'json') {
          const text = new TextDecoder().decode(new Uint8Array(dataArr as ArrayBuffer));
          const json = JSON.parse(text);
          parsedRows = Array.isArray(json) ? json : (json.projects || json.records || [json]);
        } else {
          const workbook = XLSX.read(dataArr, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        }

        if (parsedRows.length === 0) {
          toast.error("No data rows found in the uploaded file.");
          return;
        }

        const normalizedRows = parsedRows.map((orig, index) => {
          const row: any = {};
          Object.keys(orig).forEach(k => {
            row[k.trim()] = orig[k];
          });

          const projName = row["Project Name"] || row["name"] || row["ProjectName"] || '';
          const projCode = row["Project Code"] || row["ProjectCode"] || row["id"] || row["code"] || '';
          const clientName = row["Client Name"] || row["ClientName"] || row["clientName"] || '';
          const managerName = row["Project Manager"] || row["ProjectManager"] || row["projectManager"] || row["managerName"] || '';
          const projectType = row["Project Type"] || row["ProjectType"] || row["projectType"] || '';
          const location = row["Location"] || row["location"] || '';
          const address = row["Address"] || row["address"] || '';
          const startDate = row["Start Date"] || row["StartDate"] || row["startDate"] || '';
          const expectedEndDate = row["Expected End Date"] || row["ExpectedEndDate"] || row["endDate"] || row["expectedEndDate"] || '';
          const budget = row["Budget"] || row["budget"] || 0;
          const priority = row["Priority"] || row["priority"] || 'MEDIUM';
          const status = row["Status"] || row["status"] || 'ACTIVE';
          const description = row["Description"] || row["description"] || '';

          return {
            index,
            name: String(projName).trim(),
            code: String(projCode).trim(),
            clientName: String(clientName).trim(),
            managerName: String(managerName).trim(),
            projectType: String(projectType).trim(),
            location: String(location).trim(),
            address: String(address).trim(),
            startDate: String(startDate).trim(),
            expectedEndDate: String(expectedEndDate).trim(),
            budget: Number(String(budget).replace(/[^0-9.]/g, '')) || 0,
            priority: String(priority).trim().toUpperCase(),
            status: String(status).trim(),
            description: String(description).trim(),
            original: orig
          };
        });

        const validatedRows = normalizedRows.map(row => {
          const rowErrors: string[] = [];
          const rowWarnings: string[] = [];

          if (!row.name) rowErrors.push("Required: 'Project Name' is missing.");
          if (!row.code) rowErrors.push("Required: 'Project Code' is missing.");
          if (!row.location) rowErrors.push("Required: 'Location' is missing.");
          if (!row.startDate) rowErrors.push("Required: 'Start Date' is missing.");

          const isDuplicateDB = projects.some(p => p.id?.toLowerCase() === row.code?.toLowerCase());
          const isDuplicateFile = normalizedRows.some(other => other.index < row.index && other.code === row.code);
          const isDuplicate = isDuplicateDB || isDuplicateFile;

          if (row.startDate) {
            const testDate = new Date(row.startDate);
            if (isNaN(testDate.getTime())) {
              rowErrors.push(`Invalid format: Start Date '${row.startDate}' must be a valid YYYY-MM-DD.`);
            }
          }
          if (row.expectedEndDate) {
            const testDate = new Date(row.expectedEndDate);
            if (isNaN(testDate.getTime())) {
              rowErrors.push(`Invalid format: Expected End Date '${row.expectedEndDate}' must be a valid YYYY-MM-DD.`);
            }
          }

          if (isNaN(row.budget) || row.budget <= 0) {
            rowErrors.push(`Invalid budget '${row.original["Budget"] || row.budget}'. Must be a positive number.`);
          }

          let statusMapped: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' = 'ACTIVE';
          const sLower = row.status.toLowerCase();
          if (sLower.includes('active') || sLower === 'active') {
            statusMapped = 'ACTIVE';
          } else if (sLower.includes('hold') || sLower.includes('planning') || sLower === 'on_hold') {
            statusMapped = 'ON_HOLD';
          } else if (sLower.includes('complete') || sLower === 'completed') {
            statusMapped = 'COMPLETED';
          } else {
            rowWarnings.push(`Unknown status '${row.status}'. Defaulting to 'ACTIVE'.`);
          }

          let priorityMapped: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
          const pUpper = row.priority;
          if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(pUpper)) {
            priorityMapped = pUpper as any;
          } else {
            if (pUpper.includes('LOW')) priorityMapped = 'LOW';
            else if (pUpper.includes('MED')) priorityMapped = 'MEDIUM';
            else if (pUpper.includes('HIGH')) priorityMapped = 'HIGH';
            else if (pUpper.includes('CRIT')) priorityMapped = 'CRITICAL';
            else {
              rowWarnings.push(`Unknown priority '${row.priority}'. Defaulting to 'MEDIUM'.`);
            }
          }

          let managerId = '';
          if (row.managerName) {
            const matchUser = users.find(u => u.name?.toLowerCase().trim() === row.managerName.toLowerCase().trim());
            if (matchUser) {
              managerId = matchUser.uid || matchUser.id || '';
            } else {
              rowWarnings.push(`Manager '${row.managerName}' is not registered in system.`);
            }
          }

          return {
            ...row,
            statusMapped,
            priorityMapped,
            managerId,
            errors: rowErrors,
            warnings: rowWarnings,
            isDuplicate,
            isValid: rowErrors.length === 0
          };
        });

        setImportedRows(validatedRows);
        const validIndices = validatedRows
          .filter(r => r.isValid && !r.isDuplicate)
          .map(r => r.index);
        setSelectedImportIndices(validIndices);

      } catch (e: any) {
        console.error(e);
        toast.error(`Error parsing file: ${e.message || "Please check format."}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const executeImport = async () => {
    if (selectedImportIndices.length === 0) {
      toast.error("No projects selected for import.");
      return;
    }

    const rowsToSave = importedRows.filter(r => selectedImportIndices.includes(r.index));
    let successCount = 0;
    let skipCount = 0;
    const errorsList: string[] = [];
    const warningsList: string[] = [];

    toast.loading(`Importing ${rowsToSave.length} projects...`, { id: 'importing_projects' });

    for (const row of rowsToSave) {
      try {
        const cleanProjectId = row.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '_');
        
        const projectDocRef = doc(db, 'projects', cleanProjectId);
        await setDoc(projectDocRef, cleanObject({
          id: cleanProjectId,
          name: row.name,
          location: row.location,
          status: row.statusMapped,
          budget: row.budget,
          managerId: row.managerId || profile?.uid || profile?.id || '',
          progress: 0,
          startDate: row.startDate,
          endDate: row.expectedEndDate || row.startDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isImported: true,
          clientName: row.clientName,
          projectType: row.projectType,
          priority: row.priorityMapped,
          address: row.address,
          description: row.description
        }));

        successCount++;
      } catch (err: any) {
        console.error(err);
        skipCount++;
        errorsList.push(`Project '${row.name}': ${err.message || 'Firestore write error'}`);
      }
    }

    toast.dismiss('importing_projects');
    toast.success(`Import completed: ${successCount} imported, ${skipCount} skipped.`);

    setImportSummary({
      imported: successCount,
      skipped: skipCount + (importedRows.length - rowsToSave.length),
      errors: errorsList,
      warnings: warningsList
    });
  };

  const getExportableProjects = () => {
    let pool = projects;
    if (isProjManager) {
      pool = projects.filter(p => p.managerId === profile?.uid || p.managerId === profile?.id || profile?.assignedProjects?.includes(p.id));
    }
    
    if (exportRange === 'single') {
      return pool.filter(p => p.id === exportSelectedProjId);
    } else if (exportRange === 'selected') {
      return pool.filter(p => exportSelectedIds.includes(p.id));
    } else {
      return pool;
    }
  };

  const executeExport = () => {
    const projectsToExport = getExportableProjects();
    if (projectsToExport.length === 0) {
      toast.error("No projects meet criteria or are selected for export.");
      return;
    }

    const projectRows = projectsToExport.map(p => {
      const metrics = getProjectMetrics(p.id);
      const manager = users.find(u => u.uid === p.managerId || u.id === p.managerId);
      return {
        'Project ID': p.id,
        'Project Name': p.name,
        'Client Name': p.clientName || '—',
        'Project Manager': manager?.name || '—',
        'Location': p.location,
        'Project Type': p.projectType || 'Construction',
        'Status': p.status,
        'Priority': p.priority || 'MEDIUM',
        'Start Date': p.startDate || '—',
        'End Date': p.endDate || '—',
        'Budget': p.budget,
        'Spent Amount': metrics.spent,
        'Completion %': p.progress || 0,
        'Description': p.description || '—',
        'Created Date': p.createdAt || '—',
        'Updated Date': p.updatedAt || p.createdAt || '—'
      };
    });

    const inventoryRows = stocks
      .filter(s => projectsToExport.some(p => p.id === s.projectId))
      .map(s => {
        const prod = products.find(p => p.id === s.productId);
        const proj = projects.find(p => p.id === s.projectId);
        return {
          'Project ID': s.projectId,
          'Project Name': proj?.name || '—',
          'Product ID': s.productId,
          'Product Name': prod?.name || '—',
          'SKU': prod?.sku || '—',
          'UOM': prod?.uom || '—',
          'Quantity On Hand': s.quantity,
          'Unit Price': prod?.unitPrice || 0,
          'Total Value': s.quantity * (prod?.unitPrice || 0)
        };
      });

    const taskRows = tasks
      .filter(t => projectsToExport.some(p => p.id === t.projectId))
      .map(t => {
        const proj = projects.find(p => p.id === t.projectId);
        return {
          'Task ID': t.id,
          'Project ID': t.projectId,
          'Project Name': proj?.name || '—',
          'Task Title': t.title,
          'Description': t.description || '—',
          'Assigned To': t.assignedTo || '—',
          'Priority': t.priority || '—',
          'Status': t.status,
          'Due Date': t.dueDate || '—',
          'Progress %': t.progress || 0,
          'Created At': t.createdAt || '—'
        };
      });

    const issueRows = issues
      .filter(i => projectsToExport.some(p => p.id === i.projectId))
      .map(i => {
        const proj = projects.find(p => p.id === i.projectId);
        return {
          'Issue ID': i.id,
          'Project ID': i.projectId,
          'Project Name': proj?.name || '—',
          'Issue Title': i.title,
          'Category': i.category,
          'Priority': i.priority,
          'Status': i.status,
          'Reported By': i.reportedBy || '—',
          'Assigned To': i.assignedTo || '—',
          'Description': i.description || '—',
          'Resolution Notes': i.resolutionNotes || '—',
          'Created At': i.createdAt || '—'
        };
      });

    const prRows = prs
      .filter(pr => projectsToExport.some(p => p.id === pr.projectId))
      .map(pr => {
        const proj = projects.find(p => p.id === pr.projectId);
        return {
          'PR ID': pr.id,
          'PR Number': pr.prNumber || '—',
          'Project ID': pr.projectId,
          'Project Name': proj?.name || '—',
          'Status': pr.status,
          'Requested By': pr.requestedBy || '—',
          'Total Items': pr.items?.length || 0,
          'Created At': pr.createdAt || '—'
        };
      });

    const poRows = pos
      .filter(po => projectsToExport.some(p => p.id === po.projectId))
      .map(po => {
        const proj = projects.find(p => p.id === po.projectId);
        const vendorName = po.vendorName || po.vendorId || '—';
        return {
          'PO ID': po.id,
          'PO Number': po.poNumber || '—',
          'Ref MR Number': po.linkedMrNumber || '—',
          'Project ID': po.projectId,
          'Project Name': proj?.name || '—',
          'Vendor Name': vendorName,
          'Status': po.status,
          'Total Amount': po.totalAmount || 0,
          'Created At': po.createdAt || '—'
        };
      });

    const grnRows = grns
      .filter(grn => projectsToExport.some(p => p.id === grn.projectId))
      .map(grn => {
        const proj = projects.find(p => p.id === grn.projectId);
        return {
          'GRN ID': grn.id,
          'GRN Number': grn.grnNumber || '—',
          'PO Reference': grn.poNumber || '—',
          'Project ID': grn.projectId,
          'Project Name': proj?.name || '—',
          'Received By': grn.receivedBy || '—',
          'Gate Entry Number': grn.gateEntryNumber || '—',
          'QC Status': grn.qcStatus || '—',
          'Created At': grn.createdAt || '—'
        };
      });

    const returnRows = projectReturns
      .filter(ret => projectsToExport.some(p => p.id === ret.projectId))
      .map(ret => {
        const proj = projects.find(p => p.id === ret.projectId);
        return {
          'Return ID': ret.id,
          'Return Number': ret.returnNumber || '—',
          'Project ID': ret.projectId,
          'Project Name': proj?.name || '—',
          'Product Name': ret.productName || '—',
          'Return Quantity': ret.returnQuantity,
          'Return Type': ret.returnType,
          'Status': ret.status,
          'Reason/Remarks': ret.remarks || '—',
          'Created At': ret.createdAt || '—'
        };
      });

    const reportRows = dailyReports
      .filter(rep => projectsToExport.some(p => p.id === rep.projectId))
      .map(rep => {
        const proj = projects.find(p => p.id === rep.projectId);
        return {
          'Report ID': rep.id,
          'Project ID': rep.projectId,
          'Project Name': proj?.name || '—',
          'Report Date': rep.date || '—',
          'Status': rep.status,
          'Reported By': rep.reportedBy || '—',
          'Created At': rep.createdAt || '—'
        };
      });

    const attachmentRows: any[] = [];
    prs
      .filter(pr => projectsToExport.some(p => p.id === pr.projectId))
      .forEach(pr => {
        const proj = projects.find(p => p.id === pr.projectId);
        if (pr.attachments && pr.attachments.length > 0) {
          pr.attachments.forEach(att => {
            attachmentRows.push({
              'Project ID': pr.projectId,
              'Project Name': proj?.name || '—',
              'PR Ref': pr.prNumber || pr.id,
              'FileName': att.name || '—',
              'URL': att.url || '—',
              'Type': att.type || '—',
              'Uploaded At': att.uploadedAt || '—'
            });
          });
        }
      });

    const baseFileName = `Projects_Export_${new Date().toISOString().split('T')[0]}`;

    if (exportFormat === 'json') {
      const exportObject: any = { projects: projectRows };
      if (exportIncludeOptions.inventory) exportObject.inventory = inventoryRows;
      if (exportIncludeOptions.tasks) exportObject.tasks = taskRows;
      if (exportIncludeOptions.issues) exportObject.issues = issueRows;
      if (exportIncludeOptions.pendingPr) exportObject.materialRequisitions = prRows;
      if (exportIncludeOptions.pendingPo) exportObject.purchaseOrders = poRows;
      if (exportIncludeOptions.pendingGrn) exportObject.goodsReceiptNotes = grnRows;
      if (exportIncludeOptions.returns) exportObject.returns = returnRows;
      if (exportIncludeOptions.reports) exportObject.reports = reportRows;
      if (exportIncludeOptions.attachments) exportObject.attachments = attachmentRows;

      const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${baseFileName}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("JSON database exported successfully!");
      setIsExportOpen(false);
    } 
    else if (exportFormat === 'csv') {
      const csvWs = XLSX.utils.json_to_sheet(projectRows);
      const csvContent = XLSX.utils.sheet_to_csv(csvWs);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${baseFileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV table exported successfully!");
      setIsExportOpen(false);
    } 
    else if (exportFormat === 'pdf') {
      const docPdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4"
      });

      docPdf.setFontSize(18);
      docPdf.setFont("helvetica", "bold");
      docPdf.setTextColor(15, 23, 42);
      docPdf.text("CONSTRUCTION PROJECTS DATABASE REPORT", 40, 50);

      docPdf.setFontSize(9);
      docPdf.setFont("helvetica", "normal");
      docPdf.setTextColor(100, 116, 139);
      docPdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | Export Count: ${projectsToExport.length} Projects`, 40, 70);

      let currentY = 100;
      docPdf.setFontSize(9);
      docPdf.setFont("helvetica", "bold");
      docPdf.setTextColor(15, 23, 42);

      const headers = ["S.No", "Project Name", "Location", "Status", "Manager", "Budget", "Spent", "Progress"];
      const colWidths = [45, 165, 100, 80, 115, 100, 100, 55];
      const colPositions = [40];
      for (let i = 0; i < colWidths.length - 1; i++) {
        colPositions.push(colPositions[i] + colWidths[i]);
      }

      docPdf.setFillColor(248, 250, 252);
      docPdf.rect(40, currentY - 14, 760, 24, "F");

      headers.forEach((h, idx) => {
        docPdf.text(h, colPositions[idx], currentY);
      });

      docPdf.line(40, currentY + 12, 800, currentY + 12);
      currentY += 25;

      projectsToExport.forEach((p, index) => {
        if (currentY > 520) {
          docPdf.addPage();
          currentY = 50;
          docPdf.setFillColor(248, 250, 252);
          docPdf.rect(40, currentY - 14, 760, 24, "F");
          docPdf.setFont("helvetica", "bold");
          headers.forEach((h, idx) => {
            docPdf.text(h, colPositions[idx], currentY);
          });
          docPdf.line(40, currentY + 12, 800, currentY + 12);
          currentY += 25;
        }

        const metrics = getProjectMetrics(p.id);
        const manager = users.find(u => u.uid === p.managerId || u.id === p.managerId);
        const mName = manager?.name || '—';

        docPdf.setFont("helvetica", "normal");
        docPdf.setTextColor(51, 65, 85);

        docPdf.text((index + 1).toString(), colPositions[0], currentY);
        docPdf.text(p.name.substring(0, 26) + (p.name.length > 26 ? "..." : ""), colPositions[1], currentY);
        docPdf.text(p.location.substring(0, 18) + (p.location.length > 18 ? "..." : ""), colPositions[2], currentY);
        docPdf.text(p.status, colPositions[3], currentY);
        docPdf.text(mName.substring(0, 18), colPositions[4], currentY);
        docPdf.text(`INR ${p.budget.toLocaleString()}`, colPositions[5], currentY);
        docPdf.text(`INR ${metrics.spent.toLocaleString()}`, colPositions[6], currentY);
        docPdf.text(`${p.progress || 0}%`, colPositions[7], currentY);

        docPdf.line(40, currentY + 5, 800, currentY + 5);
        currentY += 20;
      });

      docPdf.save(`${baseFileName}.pdf`);
      toast.success("PDF Report downloaded successfully!");
      setIsExportOpen(false);
    } 
    else {
      const wb = XLSX.utils.book_new();

      const mainWs = XLSX.utils.json_to_sheet(projectRows);
      XLSX.utils.book_append_sheet(wb, mainWs, "Projects");

      if (exportIncludeOptions.inventory && inventoryRows.length > 0) {
        const invWs = XLSX.utils.json_to_sheet(inventoryRows);
        XLSX.utils.book_append_sheet(wb, invWs, "Inventory Summary");
      }
      if (exportIncludeOptions.tasks && taskRows.length > 0) {
        const tWs = XLSX.utils.json_to_sheet(taskRows);
        XLSX.utils.book_append_sheet(wb, tWs, "Tasks");
      }
      if (exportIncludeOptions.issues && issueRows.length > 0) {
        const iWs = XLSX.utils.json_to_sheet(issueRows);
        XLSX.utils.book_append_sheet(wb, iWs, "Issues");
      }
      if (exportIncludeOptions.pendingPr && prRows.length > 0) {
        const prWs = XLSX.utils.json_to_sheet(prRows);
        XLSX.utils.book_append_sheet(wb, prWs, "Material Requisitions");
      }
      if (exportIncludeOptions.pendingPo && poRows.length > 0) {
        const poWs = XLSX.utils.json_to_sheet(poRows);
        XLSX.utils.book_append_sheet(wb, poWs, "Purchase Orders");
      }
      if (exportIncludeOptions.pendingGrn && grnRows.length > 0) {
        const grnWs = XLSX.utils.json_to_sheet(grnRows);
        XLSX.utils.book_append_sheet(wb, grnWs, "Goods Receipt Notes");
      }
      if (exportIncludeOptions.returns && returnRows.length > 0) {
        const retWs = XLSX.utils.json_to_sheet(returnRows);
        XLSX.utils.book_append_sheet(wb, retWs, "Returns");
      }
      if (exportIncludeOptions.reports && reportRows.length > 0) {
        const repWs = XLSX.utils.json_to_sheet(reportRows);
        XLSX.utils.book_append_sheet(wb, repWs, "Daily Reports");
      }
      if (exportIncludeOptions.attachments && attachmentRows.length > 0) {
        const attWs = XLSX.utils.json_to_sheet(attachmentRows);
        XLSX.utils.book_append_sheet(wb, attWs, "Attachments Metadata");
      }

      XLSX.writeFile(wb, `${baseFileName}.xlsx`);
      toast.success("Excel sheet database exported successfully!");
      setIsExportOpen(false);
    }
  };

  const getProjectMetrics = (pId: string) => {
    const pTasks = tasks.filter(t => t.projectId === pId && t.status !== 'COMPLETED').length;
    const pIssues = issues.filter(i => i.projectId === pId && i.status === 'OPEN').length;
    const pPrs = prs.filter(x => x.projectId === pId && ['DRAFT', 'UNDER_REVIEW', 'PENDING_APPROVAL'].includes(x.status)).length;
    const pPos = pos.filter(x => x.projectId === pId && ['DRAFT', 'PENDING'].includes(x.status)).length;
    const pGrns = grns.filter(x => x.projectId === pId && x.qcStatus === 'PENDING').length;
    
    // Inventory Value
    let invValue = 0;
    stocks.filter(s => s.projectId === pId).forEach(s => {
      const prod = products.find(pr => pr.id === s.productId);
      if (prod) {
        invValue += s.quantity * (prod.unitPrice || 0);
      }
    });

    const project = projects.find(pr => pr.id === pId);
    const spent = project ? computeProjectFinancials(project, grns, pos, products, projectReturns).spent : 0;

    return {
      openTasks: pTasks,
      openIssues: pIssues,
      pendingPrs: pPrs,
      pendingPos: pPos,
      pendingGrns: pGrns,
      inventoryValue: invValue,
      spent: spent
    };
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (profile?.role === UserRole.SITE_SUPERVISOR) {
         if (!profile.assignedProjects?.includes(p.id)) return false;
      }

      const manager = users.find(u => u.uid === p.managerId || u.id === p.managerId);
      const managerName = manager?.name || 'Unknown';

      const sTerm = searchTerm.toLowerCase();
      const matchSearch = 
        p.name.toLowerCase().includes(sTerm) ||
        p.location.toLowerCase().includes(sTerm) ||
        p.id.toLowerCase().includes(sTerm) ||
        managerName.toLowerCase().includes(sTerm);
      
      const matchStatus = selectedStatus === 'all' || p.status === selectedStatus;
      const matchManager = selectedManager === 'all' || p.managerId === selectedManager;

      return matchSearch && matchStatus && matchManager;
    });
  }, [projects, profile, searchTerm, selectedStatus, selectedManager, users]);

  const renderProgressBarText = (progress: number = 0) => {
    const totalBlocks = 14;
    const filledBlocks = Math.round((progress / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    return (
       <div className="font-mono text-[11px] tracking-widest text-slate-800 flex items-center gap-2">
         <span className="font-bold min-w-[32px] text-right">{Math.round(progress)}%</span>
         <span className="text-blue-600">{'█'.repeat(filledBlocks)}<span className="text-slate-200">{'░'.repeat(emptyBlocks)}</span></span>
       </div>
    );
  };

  const getHealth = (pId: string, progress: number, endDate?: string) => {
    let status = 'Healthy';
    let color = 'text-green-600 bg-green-50 border-green-200';
    let icon = <CheckCircle2 className="w-3.5 h-3.5" />;
    
    if (endDate) {
      const end = new Date(endDate);
      const now = new Date();
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
      
      if (daysLeft < 0 && progress < 100) {
        status = 'Critical';
        color = 'text-red-700 bg-red-50 border-red-200';
        icon = <AlertTriangle className="w-3.5 h-3.5" />;
      } else if (daysLeft < 30 && progress < 80) {
        status = 'At Risk';
        color = 'text-amber-700 bg-amber-50 border-amber-200';
        icon = <AlertTriangle className="w-3.5 h-3.5" />;
      }
    }
    return { status, color, icon };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20 overflow-x-hidden">
      {/* Enterprise Header Wrapper */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-slate-400" />
                Projects
              </h1>
              <p className="text-sm text-slate-500 mt-1">Manage all construction projects from one place.</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button 
                variant="outline" 
                className="h-9 px-3.5 gap-2 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 transition-all font-medium rounded-lg shadow-sm"
                onClick={() => {
                  if (!isAdmin) {
                    toast.error("Access Denied: Only Administrators can import project databases.");
                    return;
                  }
                  // Reset import states
                  setImportFile(null);
                  setImportedRows([]);
                  setImportSummary(null);
                  setIsImportOpen(true);
                }}
              >
                 <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import Projects</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-9 px-3.5 gap-2 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 transition-all font-medium rounded-lg shadow-sm"
                onClick={() => {
                  if (filteredProjects.length > 0) {
                    setExportSelectedProjId(filteredProjects[0].id);
                  }
                  // Pre-set some selections
                  setExportSelectedIds(filteredProjects.map(p => p.id));
                  setIsExportOpen(true);
                }}
              >
                 <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
              </Button>
              <div className="w-[1px] h-6 bg-slate-200 mx-1 hidden sm:block"></div>
              
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <Button variant="ghost" onClick={() => setViewMode('grid')} className={`h-8 w-8 p-0 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                   <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button variant="ghost" onClick={() => setViewMode('list')} className={`h-8 w-8 p-0 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                   <List className="w-4 h-4" />
                </Button>
                <Button variant="ghost" onClick={() => setViewMode('table')} className={`h-8 w-8 p-0 rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                   <TableIcon className="w-4 h-4" />
                </Button>
              </div>

              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger 
                  render={
                    <Button className="h-9 px-4 gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm font-medium transition-all ml-1 w-full sm:w-auto mt-2 sm:mt-0" />
                  }
                >
                  <Plus className="w-4 h-4" /> New Project
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-200 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">Create New Project</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAdd} className="space-y-4 pt-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-semibold text-slate-600">Project Name</Label>
                       <Input className="h-10 rounded-lg border-slate-200" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="e.g. Skyline Residencies Ph 1" required />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-semibold text-slate-600">Location</Label>
                       <Input className="h-10 rounded-lg border-slate-200" value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})} placeholder="City, State" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label className="text-xs font-semibold text-slate-600">Start Date</Label>
                         <Input className="h-10 rounded-lg border-slate-200" type="date" value={newProject.startDate} onChange={e => setNewProject({...newProject, startDate: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-xs font-semibold text-slate-600">End Date</Label>
                         <Input className="h-10 rounded-lg border-slate-200" type="date" value={newProject.endDate} onChange={e => setNewProject({...newProject, endDate: e.target.value})} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label className="text-xs font-semibold text-slate-600">Budget (₹)</Label>
                         <Input className="h-10 rounded-lg border-slate-200" type="number" value={newProject.budget} onChange={e => setNewProject({...newProject, budget: Number(e.target.value)})} required />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-xs font-semibold text-slate-600">Initial Status</Label>
                         <Select value={newProject.status} onValueChange={(v: any) => setNewProject({...newProject, status: v})}>
                           <SelectTrigger className="h-10 rounded-lg border-slate-200">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="ACTIVE">Active</SelectItem>
                             <SelectItem value="ON_HOLD">On Hold</SelectItem>
                             <SelectItem value="COMPLETED">Completed</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mt-6 font-semibold shadow-sm">Create Project</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
           <div className="md:col-span-5 lg:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                 placeholder="Search by Project Name, Location, Manager, or ID..." 
                 className="pl-9 h-11 rounded-xl border-slate-200 bg-white shadow-sm w-full text-slate-800 placeholder:text-slate-400"
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           
           <div className="md:col-span-7 lg:col-span-8 flex gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-none items-center">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                 <SelectTrigger className="w-[140px] shrink-0 h-11 rounded-xl border-slate-200 bg-white font-medium text-slate-700 shadow-sm">
                    <SelectValue placeholder="Status" />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                 </SelectContent>
              </Select>

              {/* Mock Project Type - not in schema, placeholder filter */}
              <Select defaultValue="all">
                 <SelectTrigger className="w-[140px] shrink-0 h-11 rounded-xl border-slate-200 bg-white font-medium text-slate-700 shadow-sm">
                    <SelectValue placeholder="Project Type" />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                 </SelectContent>
              </Select>

              <Select value={selectedManager} onValueChange={setSelectedManager}>
                 <SelectTrigger className="w-[160px] shrink-0 h-11 rounded-xl border-slate-200 bg-white font-medium text-slate-700 shadow-sm">
                    <SelectValue placeholder="Manager" />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id || u.uid || ''}>{u.name || u.email}</SelectItem>
                    ))}
                 </SelectContent>
              </Select>

              <Button variant="ghost" onClick={() => { setSearchTerm(''); setSelectedStatus('all'); setSelectedManager('all'); }} className="h-11 px-4 gap-2 text-slate-500 hover:text-slate-800 shrink-0 font-medium">
                 <X className="w-4 h-4" /> Reset Filters
              </Button>
           </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        {filteredProjects.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center bg-white border border-slate-200 border-dashed rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
               <Building2 className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight">No Projects Found</h3>
            <p className="text-slate-500 mt-2 max-w-sm">Create your first project to begin managing inventory, tasks, and budgets efficiently.</p>
            <Button onClick={() => setIsAddOpen(true)} className="mt-6 bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-10 px-6 font-medium shadow-sm">
              Create Project
            </Button>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.map((project) => {
                  const metrics = getProjectMetrics(project.id);
                  const manager = users.find(u => u.uid === project.managerId || u.id === project.managerId);
                  const health = getHealth(project.id, project.progress || 0, project.endDate);
                  const financials = computeProjectFinancials(project, grns, pos, products, projectReturns);
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={project.id} 
                      className="group bg-white border border-slate-200 rounded-[16px] overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:border-slate-300 transition-all duration-300 cursor-pointer flex flex-col"
                      onClick={() => setPreviewProject(project)}
                    >
                       <div className="relative h-32 bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                          <Building2 className="w-16 h-16 text-slate-200 transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute top-4 left-4">
                             <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white shadow-sm ${project.status === 'ACTIVE' ? 'text-blue-600 border-blue-200' : project.status === 'COMPLETED' ? 'text-emerald-600 border-emerald-200' : 'text-slate-600 border-slate-200'}`}>
                               {project.status.replace('_', ' ')}
                             </Badge>
                          </div>
                          <div className="absolute top-4 right-4 flex gap-1">
                               <Tooltip>
                                 <TooltipTrigger 
                                   render={<div className={`flex items-center justify-center w-6 h-6 rounded-full border shadow-sm bg-white ${health.color}`} />}
                                 >
                                    {health.icon}
                                 </TooltipTrigger>
                                 <TooltipContent className="text-xs">
                                   <p>Health: {health.status}</p>
                                 </TooltipContent>
                               </Tooltip>
                          </div>
                          {/* Small Priority Badge mock */}
                          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-slate-200 px-2 rounded font-mono text-[9px] font-bold text-slate-500 shadow-sm leading-tight flex items-center h-5">
                            ID: {project.id.substring(0, 6).toUpperCase()}
                          </div>
                          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur text-white px-2 rounded h-5 text-[10px] font-medium shadow-sm">
                             <MapPin className="w-3 h-3 text-slate-300" />
                             {project.location.split(',')[0]}
                          </div>
                         <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent group-hover:via-blue-500/40 transition-colors"></div>
                       </div>

                       <div className="p-5 flex flex-col flex-1">
                          <div className="flex justify-between items-start gap-4">
                             <div className="space-y-1 flex-1 min-w-0">
                               <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                 {project.name}
                               </h3>
                               <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                                 <Wallet className="w-3 h-3" /> Client: —
                               </p>
                             </div>
                             <DropdownMenu>
                                <DropdownMenuTrigger 
                                   render={<Button variant="ghost" className="h-8 w-8 p-0 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex-shrink-0" onClick={e => e.stopPropagation()} />} 
                                >
                                   <MoreVertical className="w-4 h-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl" onClick={e => e.stopPropagation()}>
                                   <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}><Play className="w-4 h-4 mr-2 text-slate-400"/> Open Full Project</DropdownMenuItem>
                                   <DropdownMenuItem className="text-xs cursor-pointer"><Edit2 className="w-4 h-4 mr-2 text-slate-400"/> Edit Details</DropdownMenuItem>
                                   <DropdownMenuItem className="text-xs cursor-pointer"><Copy className="w-4 h-4 mr-2 text-slate-400"/> Duplicate</DropdownMenuItem>
                                   <DropdownMenuSeparator />
                                   <DropdownMenuItem className="text-xs cursor-pointer"><BarChart2 className="w-4 h-4 mr-2 text-slate-400"/> Analytics</DropdownMenuItem>
                                   <DropdownMenuSeparator />
                                   <DropdownMenuItem className="text-xs text-red-600 cursor-pointer"><Archive className="w-4 h-4 mr-2 text-red-500"/> Archive</DropdownMenuItem>
                                   {isAdmin && project.isImported && (
                                      <>
                                         <DropdownMenuSeparator />
                                         <DropdownMenuItem className="text-xs text-red-600 cursor-pointer focus:bg-red-50 font-bold" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                                            <Trash2 className="w-4.5 h-4.5 mr-2 text-red-500"/> Delete (Admin)
                                         </DropdownMenuItem>
                                      </>
                                   )}
                                </DropdownMenuContent>
                             </DropdownMenu>
                          </div>

                          <div className="mt-4 flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                               <User className="w-3 h-3 text-slate-400" />
                             </div>
                             <p className="text-xs text-slate-600 font-medium truncate flex-1">{manager?.name || 'Unassigned Manager'}</p>
                          </div>

                          <div className="mt-5 space-y-1.5">
                             <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-slate-400">
                               <span>Completion</span>
                               <span>{project.endDate ? new Date(project.endDate).toLocaleDateString(undefined, {month: 'short', year: 'numeric'}) : '—'}</span>
                             </div>
                             {renderProgressBarText(project.progress || 0)}
                          </div>

                           {/* Cost Management and Budget Utilization */}
                           <div className="mt-5 pt-4 border-t border-slate-100 space-y-3.5">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                 <div>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Budget</p>
                                    <p className="text-[13px] font-bold text-slate-900 font-mono">
                                       {typeof financials.budget === 'number' ? `₹${financials.budget.toLocaleString()}` : financials.budget}
                                    </p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Spent</p>
                                    <p className="text-[13px] font-bold text-slate-900 font-mono">₹{financials.spent.toLocaleString()}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Remaining</p>
                                    <p className={`text-[13px] font-bold font-mono ${financials.remaining < 0 ? 'text-red-600 font-black' : 'text-slate-900'}`}>
                                       ₹{financials.remaining.toLocaleString()}
                                    </p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Utilization</p>
                                    <p className="text-[13px] font-bold text-slate-900 font-mono">
                                       {financials.isBudgetDefined ? `${financials.utilization}%` : 'N/A'}
                                    </p>
                                 </div>
                              </div>

                              {financials.isBudgetDefined ? (
                                 <div className="space-y-1">
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                       <div 
                                          className={`h-full rounded-full transition-all duration-500 ${
                                             financials.utilizationPercentage <= 60 
                                                ? 'bg-green-500' 
                                                : financials.utilizationPercentage <= 85 
                                                   ? 'bg-amber-500' 
                                                   : 'bg-red-500'
                                          }`}
                                          style={{ width: `${Math.min(100, financials.utilizationPercentage)}%` }}
                                       />
                                    </div>
                                 </div>
                              ) : (
                                 <p className="text-[10px] italic text-slate-400">Budget not defined to compute utilization.</p>
                              )}
                           </div>

                          {/* Metric Pill Row */}
                          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                             <div className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1 flex items-center gap-1.5 min-w-max">
                                <ClipboardList className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-700">{metrics.openTasks} Tasks</span>
                             </div>
                             <div className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1 flex items-center gap-1.5 min-w-max">
                                <AlertTriangle className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-700">{metrics.openIssues} Issues</span>
                             </div>
                             <div className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1 flex items-center gap-1.5 min-w-max">
                                <Package className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-700">{metrics.pendingPos} POs</span>
                             </div>
                          </div>

                          <div className="mt-auto pt-5 grid grid-cols-5 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button size="sm" variant="outline" className="w-full h-8 px-0 col-span-2 bg-slate-900 text-white hover:bg-slate-800 border-none rounded-md text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}>Open</Button>
                             <Button size="sm" variant="outline" className="w-full h-8 px-0 rounded-md bg-white border-slate-200 cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}/inventory`); }}><Package className="w-3.5 h-3.5 text-slate-600" /></Button>
                             <Button size="sm" variant="outline" className="w-full h-8 px-0 rounded-md bg-white border-slate-200 cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}><BarChart2 className="w-3.5 h-3.5 text-slate-600" /></Button>
                             <Button size="sm" variant="outline" className="w-full h-8 px-0 rounded-md bg-white border-slate-200 cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}/settings`); }}><Settings className="w-3.5 h-3.5 text-slate-600" /></Button>
                          </div>
                       </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {viewMode === 'list' && (
               <div className="bg-white border border-slate-200 rounded-[16px] shadow-sm flex flex-col overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                     <div className="col-span-3">Project</div>
                     <div className="col-span-2">Manager</div>
                     <div className="col-span-2 hidden md:block">Location</div>
                     <div className="col-span-1 hidden xl:block">Status</div>
                     <div className="col-span-2 shrink-0">Budget / Spent</div>
                     <div className="col-span-2 lg:col-span-1">Health</div>
                     <div className="col-span-3 lg:col-span-2 text-right">Completion</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                     {filteredProjects.map(project => {
                        const metrics = getProjectMetrics(project.id);
                        const manager = users.find(u => u.uid === project.managerId || u.id === project.managerId);
                        const health = getHealth(project.id, project.progress || 0, project.endDate);

                        return (
                           <div key={project.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50/80 transition-colors cursor-pointer group" onClick={() => setPreviewProject(project)}>
                              <div className="col-span-4 md:col-span-3">
                                 <p className="font-semibold text-slate-900 group-hover:text-blue-600 text-sm truncate">{project.name}</p>
                                 <p className="font-mono text-[10px] text-slate-500 mt-1">ID: {project.id.substring(0, 8)}</p>
                              </div>
                              <div className="col-span-3 md:col-span-2 flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                    <User className="w-3 h-3 text-slate-500" />
                                 </div>
                                 <p className="text-xs text-slate-700 truncate font-medium">{manager?.name || '—'}</p>
                              </div>
                              <div className="col-span-2 hidden md:block">
                                 <p className="text-xs text-slate-600 truncate">{project.location}</p>
                              </div>
                              <div className="col-span-1 hidden xl:block">
                                 <Badge variant="outline" className="text-[10px] font-bold uppercase py-0.5 rounded shadow-sm border-slate-200 bg-white text-slate-600">
                                    {project.status}
                                 </Badge>
                              </div>
                              <div className="col-span-3 md:col-span-2">
                                 <p className="font-mono text-xs font-semibold text-slate-900">₹{project.budget.toLocaleString()}</p>
                                 <p className="font-mono text-[10px] font-medium text-slate-500">₹{metrics.spent.toLocaleString()}</p>
                              </div>
                              <div className="col-span-2 lg:col-span-1 flex items-center gap-2">
                                 <div className={`flex items-center justify-center w-5 h-5 rounded-full border shadow-sm ${health.color}`}>
                                    {health.icon}
                                 </div>
                                 <span className="text-[11px] font-medium text-slate-700 hidden sm:inline">{health.status}</span>
                              </div>
                              <div className="col-span-3 lg:col-span-2 flex justify-end items-center gap-3">
                                 {renderProgressBarText(project.progress || 0)}
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 shrink-0" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}><ArrowRight className="w-4 h-4" /></Button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )}

            {viewMode === 'table' && (
               <div className="bg-white border border-slate-200 rounded-[16px] shadow-sm overflow-x-auto">
                 <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
                   <thead>
                     <tr className="border-b border-slate-200 bg-slate-50">
                       <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap">Project</th>
                       <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap">Manager</th>
                       <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap">Health</th>
                       <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap">Completion</th>
                       <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap text-right">Budget</th>
                       <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap text-right">Spent</th>
                       <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap text-center">Tasks</th>
                       <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap text-right">Inv Value</th>
                       <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 whitespace-nowrap w-20"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {filteredProjects.map(project => {
                        const metrics = getProjectMetrics(project.id);
                        const manager = users.find(u => u.uid === project.managerId || u.id === project.managerId);
                        const health = getHealth(project.id, project.progress || 0, project.endDate);
                        
                        return (
                          <tr key={project.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setPreviewProject(project)}>
                             <td className="p-4">
                                <p className="font-semibold text-slate-900 group-hover:text-blue-600 truncate max-w-[200px]">{project.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {project.id}</p>
                             </td>
                             <td className="p-4 whitespace-nowrap text-slate-700 font-medium text-xs">{manager?.name || '—'}</td>
                             <td className="p-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                   <div className={`w-2 h-2 rounded-full ${health.status === 'Healthy' ? 'bg-green-500' : health.status === 'Critical' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                   <span className="text-xs font-semibold text-slate-700">{health.status}</span>
                                </div>
                             </td>
                             <td className="p-4 min-w-[150px]">
                                {renderProgressBarText(project.progress || 0)}
                             </td>
                             <td className="p-4 text-right font-mono text-xs font-bold text-slate-900">₹{project.budget.toLocaleString()}</td>
                             <td className="p-4 text-right font-mono text-xs font-medium text-slate-700">₹{metrics.spent.toLocaleString()}</td>
                             <td className="p-4 text-center text-xs font-medium text-slate-700">{metrics.openTasks}</td>
                             <td className="p-4 text-right font-mono text-xs font-medium text-slate-700">₹{metrics.inventoryValue.toLocaleString()}</td>
                             <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" />} />
                                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                       <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}><Play className="w-4 h-4 mr-2 text-slate-400"/> Open Full Project</DropdownMenuItem>
                                       <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => navigate(`/projects/${project.id}/settings`)}><Settings className="w-4 h-4 mr-2 text-slate-400"/> Project Settings</DropdownMenuItem>
                                       {isAdmin && project.isImported && (
                                          <>
                                             <DropdownMenuSeparator />
                                             <DropdownMenuItem className="text-xs text-red-600 cursor-pointer focus:bg-red-50 font-bold" onClick={() => handleDeleteProject(project.id)}>
                                                <Trash2 className="w-4 h-4 mr-2 text-red-500"/> Delete (Admin)
                                             </DropdownMenuItem>
                                          </>
                                       )}
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                             </td>
                          </tr>
                        );
                     })}
                   </tbody>
                 </table>
               </div>
            )}
          </>
        )}
      </div>

      {/* Slide-over Preview Panel */}
      <AnimatePresence>
        {previewProject && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewProject(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            
            {/* Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 border-l border-slate-200 flex flex-col"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
                 <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                   Project Preview
                 </h2>
                 <Button variant="ghost" size="icon" onClick={() => setPreviewProject(null)} className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100">
                   <X className="w-5 h-5" />
                 </Button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                 {/* Header cover area */}
                 <div className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col items-center pt-8">
                    <div className="w-20 h-20 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center mb-4">
                       <Building2 className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 text-center">{previewProject.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-2">ID: {previewProject.id}</p>
                    
                    <div className="mt-6 flex justify-center w-full">
                       {renderProgressBarText(previewProject.progress || 0)}
                    </div>
                 </div>

                 {/* Details */}
                 <div className="p-6 space-y-6">
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Status</span>
                          <Badge variant="outline" className="font-bold uppercase bg-slate-50 border-slate-200 text-[10px]">{previewProject.status}</Badge>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Location</span>
                          <span className="font-semibold text-slate-800">{previewProject.location}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Timeline</span>
                          <span className="font-semibold text-slate-800">{previewProject.startDate ? new Date(previewProject.startDate).toLocaleDateString() : '—'} - {previewProject.endDate ? new Date(previewProject.endDate).toLocaleDateString() : '—'}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Manager</span>
                          <span className="font-semibold text-slate-800">
                            {users.find(u => u.uid === previewProject.managerId || u.id === previewProject.managerId)?.name || 'Unassigned'}
                          </span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">Client</span>
                          <span className="font-semibold text-slate-800">—</span>
                       </div>
                    </div>

                    <div className="h-px bg-slate-100"></div>

                    {/* Project Financials Block */}
                    {(() => {
                       const pFinancials = computeProjectFinancials(previewProject, grns, pos, products, projectReturns);
                       return (
                          <div className="space-y-4">
                             <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Financial Summary</h4>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Budget</p>
                                   <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                                      {typeof pFinancials.budget === 'number' ? `₹${pFinancials.budget.toLocaleString()}` : pFinancials.budget}
                                   </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Spent</p>
                                   <p className="text-lg font-bold text-slate-900 mt-1 font-mono">₹{pFinancials.spent.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Remaining</p>
                                   <p className={`text-lg font-bold mt-1 font-mono ${pFinancials.remaining < 0 ? 'text-red-650 font-black' : 'text-slate-900'}`}>
                                      ₹{pFinancials.remaining.toLocaleString()}
                                   </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Utilization</p>
                                   <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                                      {pFinancials.isBudgetDefined ? `${pFinancials.utilization}%` : 'N/A'}
                                   </p>
                                </div>
                             </div>

                             {pFinancials.isBudgetDefined && (
                                <div className="space-y-1.5 p-1">
                                   <div className="flex justify-between text-xs font-medium">
                                      <span className="text-slate-500">Utilization Progress</span>
                                      <span className={
                                         pFinancials.utilizationPercentage <= 60 
                                            ? 'text-green-600' 
                                            : pFinancials.utilizationPercentage <= 85 
                                               ? 'text-amber-600' 
                                               : 'text-red-600 font-bold'
                                      }>{pFinancials.utilizationPercentage}%</span>
                                   </div>
                                   <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                      <div 
                                         className={`h-full rounded-full transition-all duration-500 ${
                                            pFinancials.utilizationPercentage <= 60 
                                               ? 'bg-green-500' 
                                               : pFinancials.utilizationPercentage <= 85 
                                                  ? 'bg-amber-500' 
                                                  : 'bg-red-500'
                                         }`}
                                         style={{ width: `${Math.min(100, pFinancials.utilizationPercentage)}%` }}
                                      />
                                   </div>
                                </div>
                             )}
                          </div>
                       );
                    })()}

                    {/* Quick Metrics */}
                    <div className="space-y-3">
                       <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3">Key Metrics</h4>
                       
                       <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-slate-400"/> Open Tasks</span>
                          <span className="font-bold text-slate-900">{getProjectMetrics(previewProject.id).openTasks}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-slate-400"/> Open Issues</span>
                          <span className="font-bold text-slate-900">{getProjectMetrics(previewProject.id).openIssues}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><FileCheck className="w-4 h-4 text-slate-400"/> Pending PR</span>
                          <span className="font-bold text-slate-900">{getProjectMetrics(previewProject.id).pendingPrs}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><Wallet className="w-4 h-4 text-slate-400"/> Pending PO</span>
                          <span className="font-bold text-slate-900">{getProjectMetrics(previewProject.id).pendingPos}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600 flex items-center gap-2"><FileCheck className="w-4 h-4 text-slate-400"/> Pending GRN</span>
                          <span className="font-bold text-slate-900">{getProjectMetrics(previewProject.id).pendingGrns}</span>
                       </div>
                       <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-2">
                          <span className="text-sm font-medium text-slate-600 flex items-center gap-2 mt-2"><Layers className="w-4 h-4 text-slate-400"/> Inventory Value</span>
                          <span className="font-bold text-slate-900 font-mono mt-2">₹{getProjectMetrics(previewProject.id).inventoryValue.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 border-t border-slate-200 bg-white flex flex-col gap-2 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                 <Button onClick={() => navigate(`/projects/${previewProject.id}`)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl h-12 shadow-sm">
                   Open Project Area
                 </Button>
                 {isAdmin && previewProject.isImported && (
                    <Button variant="outline" onClick={() => handleDeleteProject(previewProject.id)} className="w-full border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 font-semibold rounded-xl h-10 gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" /> Delete Imported Project (Admin)
                    </Button>
                 )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- IMPORT DATABASE WIZARD --- */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
         <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white border-slate-200 shadow-2xl">
            <DialogHeader className="mb-4">
               <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600 animate-pulse" />
                  <span>Import Project Database</span>
               </DialogTitle>
               <p className="text-xs text-slate-500 mt-1">
                  Upload CSV, Excel (.xlsx), or JSON file to populate new project profiles into Firestore.
               </p>
            </DialogHeader>

            {!importFile ? (
               <div className="space-y-6 pt-2">
                  {/* Drag-and-drop / selector construct */}
                  <div 
                     className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/10 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px]"
                     onClick={() => document.getElementById('project-import-file-input')?.click()}
                  >
                     <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 transition-all">
                        <Upload className="w-6 h-6" />
                     </div>
                     <p className="text-sm font-semibold text-slate-700">Click to select or drag & drop file here</p>
                     <p className="text-xs text-slate-500 mt-1">Supports CSV, Excel (.xlsx), or JSON format</p>
                     <input 
                        id="project-import-file-input" 
                        type="file" 
                        accept=".csv,.xlsx,.json" 
                        className="hidden" 
                        onChange={handleImportFileSelect} 
                     />
                  </div>

                  {/* Template download card */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                           <FileText className="w-5 h-5" />
                        </div>
                        <div>
                           <h4 className="text-sm font-semibold text-slate-800">Need a starting template?</h4>
                           <p className="text-xs text-slate-500">Download our structured, pre-validated sample columns.</p>
                        </div>
                     </div>
                     <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-1.5 border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-100"
                        onClick={downloadSampleTemplate}
                     >
                        <Download className="w-3.5 h-3.5" /> Sample Template
                     </Button>
                  </div>
               </div>
            ) : importSummary ? (
               <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                     <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                     <h3 className="text-lg font-bold text-slate-900">Import Processing Completed</h3>
                     <p className="text-sm text-slate-500 mt-1">Matched row outputs and Firestore status report.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto my-6">
                     <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                        <span className="block text-2xl font-black text-emerald-600">{importSummary.imported}</span>
                        <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Imported</span>
                     </div>
                     <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                        <span className="block text-2xl font-black text-slate-600">{importSummary.skipped}</span>
                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Skipped / Errors</span>
                     </div>
                  </div>

                  {(importSummary.errors.length > 0 || importSummary.warnings.length > 0) && (
                     <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-48 overflow-y-auto space-y-2 mt-4">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Troubleshooting Log:</p>
                        {importSummary.errors.map((err, idx) => (
                           <div key={idx} className="flex gap-2 text-xs text-red-600 font-medium">
                              <span className="font-extrabold">•</span>
                              <span>{err}</span>
                           </div>
                        ))}
                        {importSummary.warnings.map((warn, idx) => (
                           <div key={idx} className="flex gap-2 text-xs text-amber-600 font-medium">
                              <span className="font-extrabold">•</span>
                              <span>{warn}</span>
                           </div>
                        ))}
                     </div>
                  )}

                  <div className="pt-4">
                     <Button 
                        onClick={() => {
                           setIsImportOpen(false);
                           setImportFile(null);
                           setImportedRows([]);
                           setImportSummary(null);
                        }} 
                        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl px-8 h-10 shadow-md"
                     >
                        Finish & Close
                     </Button>
                  </div>
               </div>
            ) : (
               <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                     <div className="text-sm font-medium text-slate-600">
                        Selected: <span className="font-bold text-slate-900">{importFile.name}</span> ({importedRows.length} records found)
                     </div>
                     <Button 
                        variant="link" 
                        size="sm"
                        className="text-xs text-blue-600 hover:text-blue-800"
                        onClick={() => {
                           setImportFile(null);
                           setImportedRows([]);
                        }}
                     >
                        Choose Different File
                     </Button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                     <table className="w-full border-collapse text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold tracking-wider">
                           <tr>
                              <th className="p-3 w-10 text-center">
                                 <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                    checked={importedRows.length > 0 && selectedImportIndices.length === importedRows.length}
                                    onChange={(e) => {
                                       if (e.target.checked) {
                                          setSelectedImportIndices(importedRows.map(r => r.index));
                                       } else {
                                          setSelectedImportIndices([]);
                                       }
                                    }}
                                 />
                              </th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Project Details</th>
                              <th className="p-3">Location</th>
                              <th className="p-3">Budget</th>
                              <th className="p-3">Timeline</th>
                              <th className="p-3">Validation Message</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                           {importedRows.map((row) => {
                              const isSelected = selectedImportIndices.includes(row.index);
                              const hasError = !row.isValid;
                              const isDup = row.isDuplicate;

                              return (
                                 <tr key={row.index} className={`hover:bg-slate-50 transition-colors ${!row.isValid ? 'bg-red-50/20' : isDup ? 'bg-amber-50/20' : ''}`}>
                                    <td className="p-3 text-center">
                                       <input 
                                          type="checkbox" 
                                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                          checked={isSelected}
                                          disabled={hasError}
                                          onChange={(e) => {
                                             if (e.target.checked) {
                                                setSelectedImportIndices([...selectedImportIndices, row.index]);
                                             } else {
                                                setSelectedImportIndices(selectedImportIndices.filter(idx => idx !== row.index));
                                             }
                                          }}
                                       />
                                    </td>
                                    <td className="p-3">
                                       {hasError ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                             Invalid
                                          </span>
                                       ) : isDup ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                             Duplicate
                                          </span>
                                       ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                             Ready
                                          </span>
                                       )}
                                    </td>
                                    <td className="p-3">
                                       <div className="font-semibold text-slate-900">{row.name || '—'}</div>
                                       <div className="text-[10px] text-slate-500 font-mono tracking-wider">{row.code || '—'}</div>
                                    </td>
                                    <td className="p-3">
                                       <div className="text-slate-700">{row.location || '—'}</div>
                                       <div className="text-[10px] text-slate-400 capitalize">{row.projectType || 'Construction'}</div>
                                    </td>
                                    <td className="p-3 font-mono text-slate-700">
                                       ₹{row.budget.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-[10px] text-slate-500">
                                       <div>Start: {row.startDate || '—'}</div>
                                       <div>End: {row.expectedEndDate || '—'}</div>
                                    </td>
                                    <td className="p-3 space-y-1">
                                       {row.errors.map((err: string, i: number) => (
                                          <div key={i} className="text-[10px] text-red-600 font-medium leading-tight flex items-center gap-1">
                                             <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {err}
                                          </div>
                                       ))}
                                       {row.warnings.map((warn: string, i: number) => (
                                          <div key={i} className="text-[10px] text-amber-600 font-medium leading-tight flex items-center gap-1">
                                             <HelpCircle className="w-3 h-3 flex-shrink-0" /> {warn}
                                          </div>
                                       ))}
                                       {row.isValid && !isDup && <span className="text-[10px] text-emerald-600 font-semibold">Row verified successfully. Ready to build in database.</span>}
                                       {row.isValid && isDup && <span className="text-[10px] text-amber-600">Row matches/conflicts an existing Project Code. Selected import will overwrite or duplicate metadata.</span>}
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-100 rounded-xl mt-4">
                     <span className="text-xs text-slate-500 font-medium">
                        Selected {selectedImportIndices.length} of {importedRows.filter(r => r.isValid).length} valid projects.
                     </span>
                     <div className="flex gap-2">
                        <Button 
                           variant="outline" 
                           onClick={() => {
                              setIsImportOpen(false);
                              setImportFile(null);
                              setImportedRows([]);
                           }} 
                           className="h-9 font-medium text-xs rounded-lg border-slate-200"
                        >
                           Cancel
                        </Button>
                        <Button 
                           onClick={executeImport} 
                           disabled={selectedImportIndices.length === 0}
                           className="h-9 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
                        >
                           <Database className="w-3.5 h-3.5" /> Confirm Import
                        </Button>
                     </div>
                  </div>
               </div>
            )}
         </DialogContent>
      </Dialog>

      {/* --- EXPORT DATABASE DIALOG --- */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
         <DialogContent className="max-w-xl rounded-2xl p-6 bg-white border-slate-200 shadow-2xl">
            <DialogHeader className="mb-4">
               <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-indigo-600 animate-bounce" />
                  <span>Export Construction Database</span>
               </DialogTitle>
               <p className="text-xs text-slate-500 mt-1">
                  Compile live project profiles, financial metrics, resource stocks, and team tasks into professional report files.
               </p>
            </DialogHeader>

            <div className="space-y-4 pt-1">
               {/* Format Choice */}
               <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-widest">1. SELECT EXPORT FORMAT</Label>
                  <div className="grid grid-cols-4 gap-2">
                     {(['xlsx', 'csv', 'pdf', 'json'] as const).map((fmt) => {
                        const isFmtSelected = exportFormat === fmt;
                        let label = fmt.toUpperCase();
                        if (fmt === 'xlsx') label = 'EXCEL (.xlsx)';
                        
                        return (
                           <button
                              key={fmt}
                              onClick={() => setExportFormat(fmt)}
                              className={`p-3 rounded-xl border text-center transition-all ${isFmtSelected ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-extrabold shadow-sm' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300'}`}
                           >
                              <div className="text-xs font-sans uppercase font-bold">{label}</div>
                           </button>
                        );
                     })}
                  </div>
               </div>

               {/* Range/Selection Choice */}
               <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-widest">2. DEFINE PROJECT SCOPE</Label>
                  <Select value={exportRange} onValueChange={(r: any) => setExportRange(r)}>
                     <SelectTrigger className="h-10 rounded-lg border-slate-200 text-sm">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="all">All Available Projects ({projects.length})</SelectItem>
                        <SelectItem value="single">Single Target Project Only</SelectItem>
                        <SelectItem value="selected">Filtered / Selected Projects</SelectItem>
                     </SelectContent>
                  </Select>

                  {exportRange === 'single' && (
                     <div className="space-y-2 pt-1">
                        <Label className="text-xs font-semibold text-slate-500">Pick Target Project</Label>
                        <Select value={exportSelectedProjId} onValueChange={setExportSelectedProjId}>
                           <SelectTrigger className="h-10 rounded-lg border-slate-200 text-sm">
                              <SelectValue placeholder="Select high-level project" />
                           </SelectTrigger>
                           <SelectContent>
                              {projects.map((p) => (
                                 <SelectItem key={p.id} value={p.id}>
                                    {p.name} [{p.id}]
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>
                  )}

                  {exportRange === 'selected' && (
                     <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto p-2 bg-slate-50/50 space-y-1">
                        {projects.map((p) => {
                           const isSel = exportSelectedIds.includes(p.id);
                           return (
                              <label key={p.id} className="flex items-center gap-2.5 p-1 px-2 rounded hover:bg-slate-100 cursor-pointer text-xs font-medium text-slate-700">
                                 <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                    checked={isSel}
                                    onChange={(e) => {
                                       if (e.target.checked) {
                                          setExportSelectedIds([...exportSelectedIds, p.id]);
                                       } else {
                                          setExportSelectedIds(exportSelectedIds.filter(id => id !== p.id));
                                       }
                                    }}
                                 />
                                 <span>{p.name}</span>
                              </label>
                           );
                        })}
                     </div>
                  )}
               </div>

               {/* Optional Sheets / Modules (Excel / JSON only) */}
               {(exportFormat === 'xlsx' || exportFormat === 'json') && (
                  <div className="space-y-2 pt-2">
                     <Label className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center justify-between">
                        <span>3. CHOOSE LIVE SECTOR SHEETS</span>
                        <span className="text-[10px] text-slate-400 font-normal normal-case">Included as child sheets or collections</span>
                     </Label>

                     <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-3.5 border border-slate-100 bg-slate-50 rounded-xl">
                        {[
                           { key: 'inventory', label: 'Stocks & Inventory Summary' },
                           { key: 'tasks', label: 'Assigned Status Tasks' },
                           { key: 'issues', label: 'Safety & Site Issues' },
                           { key: 'pendingPr', label: 'Material Requisitions (MR)' },
                           { key: 'pendingPo', label: 'Active Purchase Orders (PO)' },
                           { key: 'pendingGrn', label: 'Goods Receipt Notes (GRN)' },
                           { key: 'returns', label: 'Returned Materials Log' },
                           { key: 'reports', label: 'Daily Progress Reports' },
                           { key: 'attachments', label: 'PR Cloud Attachment Records' },
                        ].map((opt) => {
                           const enabled = (exportIncludeOptions as any)[opt.key];
                           return (
                              <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-600 select-none py-1">
                                 <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                    checked={enabled}
                                    onChange={(e) => {
                                       setExportIncludeOptions({
                                          ...exportIncludeOptions,
                                          [opt.key]: e.target.checked
                                       });
                                    }}
                                 />
                                 <span>{opt.label}</span>
                              </label>
                           );
                        })}
                     </div>
                  </div>
               )}

               {/* Action Bar */}
               <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-slate-200">
                  <Button 
                     variant="outline" 
                     onClick={() => setIsExportOpen(false)} 
                     className="h-10 px-4 font-semibold text-xs rounded-xl border-slate-200"
                  >
                     Cancel
                  </Button>
                  <Button 
                     onClick={executeExport} 
                     className="h-10 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-2"
                  >
                     <Download className="w-3.5 h-3.5" /> Download Report
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}

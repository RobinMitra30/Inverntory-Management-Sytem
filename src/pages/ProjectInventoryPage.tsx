import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  InventoryService,
  ProductService,
  ProjectService,
  MovementService,
  ProjectReturnService,
} from "@/services/store";
import {
  Stock,
  Product,
  Project,
  StockMovement,
  MovementType,
  UserRole,
  MAIN_WAREHOUSE_PROJECT_ID,
  ProjectReturn,
} from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Settings2,
  History,
  Box,
  Calendar,
  LayoutGrid,
  Clipboard,
  RotateCcw,
  ImageIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ProjectInventoryPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [projectReturns, setProjectReturns] = useState<ProjectReturn[]>([]);

  const [isAdjusting, setIsAdjusting] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Return Management states
  const [isReturning, setIsReturning] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnType, setReturnType] = useState<
    | "UNUSED_MATERIAL"
    | "EXCESS_MATERIAL"
    | "DAMAGED_MATERIAL"
    | "WRONG_MATERIAL"
  >("UNUSED_MATERIAL");
  const [returnRemarks, setReturnRemarks] = useState("");

  useEffect(() => {
    const unsubStock = InventoryService.subscribe(setStocks);
    const unsubProduct = ProductService.subscribe(setProducts);
    const unsubProject = ProjectService.subscribe(setProjects);
    const unsubMovements = MovementService.subscribe(setMovements);
    const unsubReturns = ProjectReturnService.subscribe(setProjectReturns);
    return () => {
      unsubStock();
      unsubProduct();
      unsubProject();
      unsubMovements();
      unsubReturns();
    };
  }, []);

  const project = projects.find((p) => p.id === id);

  const getProductDisplayName = (
    productId: string,
    product?: Product,
  ): string => {
    if (product?.name) return product.name;
    const defaultMappings: Record<string, string> = {
      pMUUAjtOuJ8BjHiHoBgY: "OPC Cement 53 Grade",
    };
    if (defaultMappings[productId]) return defaultMappings[productId];
    if (/^[a-zA-Z0-9]{18,22}$/.test(productId)) {
      return `Unspecified Material (${productId.substring(0, 6)})`;
    }
    return productId;
  };

  const getMovementIcon = (type: MovementType, quantity?: number) => {
    switch (type) {
      case MovementType.STOCK_IN:
      case MovementType.PURCHASE_ENTRY:
      case MovementType.GRN_ENTRY:
      case MovementType.RETURN_TO_STORE:
      case MovementType.PURCHASE_RECEIPT:
        return (
          <ArrowUpRight className="w-3.5 h-3.5 text-green-500 rotate-45" />
        );
      case MovementType.ISSUE_TO_SITE:
        if (quantity !== undefined && quantity < 0) {
          return <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />;
        }
        return (
          <ArrowUpRight className="w-3.5 h-3.5 text-green-500 rotate-45" />
        );
      case MovementType.STOCK_OUT:
      case MovementType.MATERIAL_ISSUE:
      case MovementType.SITE_TRANSFER:
      case MovementType.RETURN_TO_VENDOR:
      case MovementType.DAMAGE_ENTRY:
      case MovementType.SCRAP_ENTRY:
      case MovementType.CONSUMPTION_ENTRY:
        return <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Settings2 className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const getMovementColor = (type: MovementType, quantity?: number) => {
    switch (type) {
      case MovementType.STOCK_IN:
      case MovementType.PURCHASE_ENTRY:
      case MovementType.GRN_ENTRY:
      case MovementType.RETURN_TO_STORE:
      case MovementType.PURCHASE_RECEIPT:
        return "bg-green-50 text-green-700 border-green-100";
      case MovementType.ISSUE_TO_SITE:
        if (quantity !== undefined && quantity < 0) {
          return "bg-red-50 text-red-700 border-red-100";
        }
        return "bg-green-50 text-green-700 border-green-100";
      case MovementType.STOCK_OUT:
      case MovementType.MATERIAL_ISSUE:
      case MovementType.SITE_TRANSFER:
      case MovementType.RETURN_TO_VENDOR:
      case MovementType.DAMAGE_ENTRY:
      case MovementType.SCRAP_ENTRY:
      case MovementType.CONSUMPTION_ENTRY:
        return "bg-red-50 text-red-700 border-red-100";
      default:
        return "bg-blue-50 text-blue-700 border-blue-100";
    }
  };

  const getProjectDisplayName = (
    projectId: string,
    project?: Project,
  ): string => {
    const isRawId = (str?: string) => {
      if (!str) return true;
      if (str.includes(" ")) return false;
      return /^[a-zA-Z0-9_-]{5,30}$/.test(str);
    };
    if (project?.name && !isRawId(project.name)) {
      return project.name;
    }
    const defaultMappings: Record<string, string> = {
      pMUUAjtOuJ8BjHiHoBgY: "Grand Horizon Mall",
      "demo-project": "Grand Horizon Mall",
    };
    if (defaultMappings[projectId]) return defaultMappings[projectId];
    if (project?.name && isRawId(project.name)) {
      return `Horizon Project (${project.name.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    return project?.name || projectId || "Grand Horizon Mall";
  };

  const filteredStocks = stocks
    .filter((stock) => stock.projectId === id)
    .map((stock) => ({
      ...stock,
      product: products.find((p) => p.id === stock.productId),
      project: project,
    }))
    .filter((s) => {
      const productName = getProductDisplayName(
        s.productId,
        s.product,
      ).toLowerCase();
      const searchTerm = search.toLowerCase();
      return productName.includes(searchTerm);
    });

  const canAdjust =
    profile?.role === UserRole.ADMIN ||
    profile?.role === UserRole.PROJECT_MANAGER ||
    profile?.role === UserRole.STORE_KEEPER ||
    profile?.role === UserRole.SITE_SUPERVISOR;

  const handleAdjust = async () => {
    if (!selectedStock || !user) return;
    const qty = parseFloat(newQuantity);
    if (isNaN(qty)) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      await InventoryService.adjustStock({
        productId: selectedStock.productId,
        projectId: selectedStock.projectId,
        newQuantity: qty,
        userId: user.uid,
        userName: profile?.name || "System",
        remarks: remarks || "Manual adjustment",
      });
      toast.success("Stock adjusted successfully");
      setIsAdjusting(false);
      setSelectedStock(null);
      setRemarks("");
    } catch (err) {
      toast.error("Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedStock || !user || !project) return;
    const qty = parseFloat(returnQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid return quantity greater than 0");
      return;
    }
    if (qty > selectedStock.quantity) {
      toast.error("Return quantity cannot exceed current site stock");
      return;
    }

    setIsSubmitting(true);
    try {
      await ProjectReturnService.create({
        returnNumber: `RTW-${Math.floor(1000 + Math.random() * 9000)}`,
        projectId: selectedStock.projectId,
        projectName: project?.name || selectedStock.projectId,
        productId: selectedStock.productId,
        productName: selectedStock.product?.name || selectedStock.productId,
        issuedQuantity: selectedStock.quantity, // reference to current stock
        currentSiteStock: selectedStock.quantity,
        returnQuantity: qty,
        returnType,
        condition: returnType === "DAMAGED_MATERIAL" ? "DAMAGED" : "GOOD",
        remarks: returnRemarks,
        photoUrls: [],
        status: "SUBMITTED",
        requesterId: profile?.uid || "",
        requesterName: profile?.name || "System",
        history: [
          {
            status: "SUBMITTED",
            userId: profile?.uid || "",
            userName: profile?.name || "System",
            timestamp: new Date().toISOString(),
            notes: "Return request created from Site Inventory",
          },
        ],
      });
      toast.success("Return requested successfully");
      setIsReturning(false);
      setSelectedStock(null);
      setReturnRemarks("");
      setReturnQuantity("");
    } catch (err: any) {
      toast.error(err.message || "Failed to request return");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingReturnsCount = projectReturns.filter(
    (r) => r.projectId === id && r.status === "SUBMITTED",
  ).length;
  const returnedMaterialsCount = projectReturns.filter(
    (r) => r.projectId === id && r.status === "RETURNED",
  ).length;

  return (
    <div className="space-y-6">
      <WorkflowProgress currentStep="STOCK" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">
            Site Inventory
          </h1>
          <p className="text-slate-500 text-sm">
            Real-time material tracking for{" "}
            {getProjectDisplayName(id || "", project)}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
        <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">
            Stock Items
          </p>
          <div className="flex items-center gap-4 mt-1">
            <div className="w-12 h-12 bg-white/90 border border-white/60 rounded-2xl flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-950 leading-none">
                {filteredStocks.length}
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                Active Materials
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">
            Site Value
          </p>
          <div className="flex items-center gap-4 mt-1">
            <div className="w-12 h-12 bg-white/90 border border-white/60 rounded-2xl flex items-center justify-center shadow-xs">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-950 leading-none">
                ₹{(filteredStocks.length * 15000).toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                Estimated Value
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">
            Low Stock
          </p>
          <div className="flex items-center gap-4 mt-1">
            <div className="w-12 h-12 bg-white/90 border border-white/60 rounded-2xl flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-950 leading-none">
                {
                  filteredStocks.filter(
                    (s) => s.quantity <= (s.product?.lowStockThreshold || 0),
                  ).length
                }
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                Needs replenishment
              </p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50/50 backdrop-blur-md border border-orange-200/40 rounded-[2rem] p-6 shadow-xl shadow-orange-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">
            Pending Returns
          </p>
          <div className="flex items-center gap-4 mt-1">
            <div className="w-12 h-12 bg-orange-100/90 border border-orange-200/60 rounded-2xl flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-950 leading-none">
                {pendingReturnsCount}
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                Awaiting Approval
              </p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50/50 backdrop-blur-md border border-blue-200/40 rounded-[2rem] p-6 shadow-xl shadow-blue-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">
            Returned
          </p>
          <div className="flex items-center gap-4 mt-1">
            <div className="w-12 h-12 bg-blue-100/90 border border-blue-200/60 rounded-2xl flex items-center justify-center shadow-xs">
              <Box className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-950 leading-none">
                {returnedMaterialsCount}
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                Processed to Store
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search material..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <div className="hidden md:block min-w-full">
        <Table compact>
          <TableHeader>
            <TableRow className="text-[10px] font-mono uppercase tracking-widest italic bg-slate-50">
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-sm">
            {filteredStocks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-slate-500 italic"
                >
                  No materials found in inventory for this site.
                </TableCell>
              </TableRow>
            ) : (
              filteredStocks.map((stock) => {
                const isLow =
                  stock.quantity <= (stock.product?.lowStockThreshold || 0);
                return (
                  <TableRow key={stock.id}>
                    <TableCell className="font-semibold text-slate-900">
                      {getProductDisplayName(stock.productId, stock.product)}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {stock.product?.category ||
                        (stock.productId === "pMUUAjtOuJ8BjHiHoBgY"
                          ? "Cement"
                          : "Other")}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-bold ${isLow ? "text-red-600" : "text-slate-900"}`}
                    >
                      {stock.quantity}
                    </TableCell>
                    <TableCell className="text-xs uppercase font-mono text-slate-400">
                      {stock.product?.uom}
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge className="bg-red-50 text-red-700 border-red-100 hover:bg-red-50">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge className="bg-green-50 text-green-700 border-green-100 hover:bg-green-50">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500 font-mono italic">
                      {new Date(stock.lastUpdated).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {canAdjust && (
                        <div className="flex justify-end gap-2 items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5 px-3 rounded-full"
                            onClick={() => {
                              setSelectedStock(stock);
                              setNewQuantity((stock.quantity ?? 0).toString());
                              setIsAdjusting(true);
                            }}
                          >
                            <Settings2 className="w-3.5 h-3.5" /> Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-1.5 px-3 rounded-full"
                            onClick={() => {
                              setSelectedStock(stock);
                              setIsReturning(true);
                            }}
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Return
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
        
        {/* Mobile View */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
           {filteredStocks.length === 0 ? (
             <div className="p-8 text-center text-slate-500 italic">No materials found in inventory for this site.</div>
           ) : filteredStocks.map((stock) => {
              const isLow = stock.quantity <= (stock.product?.lowStockThreshold || 0);
              return (
                 <div key={stock.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="font-bold text-slate-900 text-sm">{getProductDisplayName(stock.productId, stock.product)}</p>
                          <p className="text-[10px] text-slate-500">{stock.product?.category || (stock.productId === "pMUUAjtOuJ8BjHiHoBgY" ? "Cement" : "Other")}</p>
                       </div>
                       {isLow ? (
                         <Badge className="bg-red-50 text-red-700 border-red-100 hover:bg-red-50 text-[10px]">
                           Low
                         </Badge>
                       ) : (
                         <Badge className="bg-green-50 text-green-700 border-green-100 hover:bg-green-50 text-[10px]">
                           In Stock
                         </Badge>
                       )}
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                       <p className="text-[10px] text-slate-500 italic font-mono">{new Date(stock.lastUpdated).toLocaleString()}</p>
                       <div className="text-right">
                          <span className={`font-black tracking-tight ${isLow ? "text-red-600" : "text-slate-900"}`}>{stock.quantity}</span>
                          <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">{stock.product?.uom}</span>
                       </div>
                    </div>
                    {canAdjust && (
                       <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-blue-600 border-blue-200 bg-blue-50/50 flex-1"
                            onClick={() => {
                              setSelectedStock(stock);
                              setNewQuantity((stock.quantity ?? 0).toString());
                              setIsAdjusting(true);
                            }}
                          >
                            <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Adjust
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-orange-600 border-orange-200 bg-orange-50/50 flex-1"
                            onClick={() => {
                              setSelectedStock(stock);
                              setIsReturning(true);
                            }}
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Return
                          </Button>
                       </div>
                    )}
                 </div>
              );
           })}
        </div>
        </div>
      </div>

      {projectReturns.length > 0 &&
        projectReturns.filter((r) => r.projectId === id).length > 0 && (
          <div className="bg-white p-6 border border-slate-200 rounded-sm mt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Recent Returns
                </h2>
                <p className="text-sm text-slate-500">
                  Material returns submitted to warehouse for this site.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto w-full">
              <div className="hidden md:block min-w-full">
            <Table compact>
              <TableHeader>
                <TableRow className="text-[10px] font-mono uppercase tracking-widest italic bg-slate-50">
                  <TableHead>Return ID</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Submitted On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-sm">
                {projectReturns
                  .filter((r) => r.projectId === id)
                  .sort((a, b) =>
                    a.createdAt && b.createdAt
                      ? new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                      : 0,
                  )
                  .map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-500">
                        {r.returnNumber}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {r.productName}
                      </TableCell>
                      <TableCell className="text-xs uppercase text-slate-500 tracking-wider">
                        {r.returnType.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-orange-600">
                        {r.returnQuantity}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "APPROVED"
                              ? "default"
                              : r.status === "RETURNED"
                                ? "default"
                                : r.status === "REJECTED"
                                  ? "destructive"
                                  : "secondary"
                          }
                          className="rounded-full px-2 py-0.5 font-bold tracking-tighter text-[9px] uppercase"
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-500 font-mono italic">
                        {r.createdAt
                          ? format(new Date(r.createdAt), "MMM dd, yyyy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "SUBMITTED" &&
                          (profile?.role === UserRole.ADMIN ||
                            profile?.role === UserRole.STORE_KEEPER) && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-green-50 text-green-700 hover:bg-green-100"
                                onClick={async () => {
                                  try {
                                    await ProjectReturnService.updateStatus(
                                      r.id,
                                      "APPROVED",
                                      profile.uid,
                                      profile.name,
                                    );
                                    toast.success("Return Approved");
                                  } catch (err) {
                                    toast.error("Error approving return");
                                  }
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-red-50 text-red-700 hover:bg-red-100"
                                onClick={async () => {
                                  try {
                                    await ProjectReturnService.updateStatus(
                                      r.id,
                                      "REJECTED",
                                      profile.uid,
                                      profile.name,
                                    );
                                    toast.success("Return Rejected");
                                  } catch (err) {
                                    toast.error("Error rejecting return");
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        {r.status === "APPROVED" &&
                          (profile?.role === UserRole.ADMIN ||
                            profile?.role === UserRole.STORE_KEEPER) && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                                onClick={async () => {
                                  try {
                                    await ProjectReturnService.processReturnToWarehouse(
                                      r.id,
                                      profile.uid,
                                      profile.name,
                                    );
                                    toast.success("Return Processed to Store");
                                  } catch (err: any) {
                                    toast.error(
                                      err.message || "Error processing return",
                                    );
                                  }
                                }}
                              >
                                <Box className="w-3 h-3 mr-1" /> Re-stock
                              </Button>
                            </div>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            </div>
            
            {/* Mobile View */}
            <div className="md:hidden flex flex-col gap-4 mt-4">
               {projectReturns
                  .filter((r) => r.projectId === id)
                  .sort((a, b) => a.createdAt && b.createdAt ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : 0)
                  .map((r) => (
                    <div key={r.id} className="bg-white border text-sm border-slate-100 p-4 rounded-xl shadow-sm flex flex-col gap-3">
                       <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900">{r.productName}</p>
                            <p className="text-[10px] uppercase font-mono text-slate-500 mt-1">{r.returnType.replace(/_/g, " ")}</p>
                          </div>
                          <Badge variant={r.status === "APPROVED" ? "default" : r.status === "RETURNED" ? "default" : r.status === "REJECTED" ? "destructive" : "secondary"} className="rounded-full px-2 py-0.5 tracking-tighter text-[9px] uppercase">
                            {r.status}
                          </Badge>
                       </div>
                       <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs">
                          <span className="text-slate-500 font-mono italic">
                            {r.returnNumber}
                          </span>
                          <span className="font-mono font-bold text-orange-600">
                             Qty: {r.returnQuantity}
                          </span>
                       </div>
                       {r.status === "SUBMITTED" && (profile?.role === UserRole.ADMIN || profile?.role === UserRole.STORE_KEEPER) && (
                          <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs bg-green-50 text-green-700 hover:bg-green-100" onClick={async () => {
                                  try { await ProjectReturnService.updateStatus(r.id, "APPROVED", profile.uid, profile.name); toast.success("Approved"); } catch (err) { toast.error("Error"); }
                                }}>Approve</Button>
                              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs bg-red-50 text-red-700 hover:bg-red-100" onClick={async () => {
                                  try { await ProjectReturnService.updateStatus(r.id, "REJECTED", profile.uid, profile.name); toast.success("Rejected"); } catch (err) { toast.error("Error"); }
                                }}>Reject</Button>
                          </div>
                       )}
                       {r.status === "APPROVED" && (profile?.role === UserRole.ADMIN || profile?.role === UserRole.STORE_KEEPER) && (
                          <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="outline" className="w-full h-8 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={async () => {
                                  try { await ProjectReturnService.processReturnToWarehouse(r.id, profile.uid, profile.name); toast.success("Processed"); } catch (err: any) { toast.error(err.message || "Error"); }
                                }}><Box className="w-3 h-3 mr-1" /> Re-stock</Button>
                          </div>
                       )}
                    </div>
                  ))}
            </div>
            </div>
          </div>
        )}

      <div className="bg-white p-6 border border-slate-200 rounded-sm mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight">
            Inventory History
          </h2>
          <div className="relative w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search history..."
              className="pl-9 h-9"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <div className="hidden md:block min-w-full">
        <Table compact>
          <TableHeader>
            <TableRow className="text-[10px] font-mono uppercase tracking-widest italic bg-slate-50">
              <TableHead>Date & Time</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-sm">
            {movements
              .filter((m) => {
                const match =
                  m.projectId === id ||
                  (m.projectId === MAIN_WAREHOUSE_PROJECT_ID &&
                    project?.name &&
                    m.remarks?.includes(project.name));
                const searchMatch =
                  m.productName
                    ?.toLowerCase()
                    .includes(historySearch.toLowerCase()) ||
                  m.sku?.toLowerCase().includes(historySearch.toLowerCase());
                return match && searchMatch;
              })
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs font-mono text-slate-500">
                    {format(new Date(m.createdAt), "MMM dd, HH:mm")}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {m.productName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "gap-1.5",
                        getMovementColor(m.type, m.quantity),
                      )}
                    >
                      {getMovementIcon(m.type, m.quantity)}
                      {m.type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono font-bold",
                      m.quantity > 0 ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {m.currentStock}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {m.userName}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        </div>
        
        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-4 mt-4">
           {movements
              .filter((m) => {
                const match = m.projectId === id || (m.projectId === MAIN_WAREHOUSE_PROJECT_ID && project?.name && m.remarks?.includes(project.name));
                const searchMatch = m.productName?.toLowerCase().includes(historySearch.toLowerCase()) || m.sku?.toLowerCase().includes(historySearch.toLowerCase());
                return match && searchMatch;
              })
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((m) => (
                 <div key={m.id} className="bg-white border text-sm border-slate-100 p-4 rounded-xl shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                       <div>
                         <p className="font-bold text-slate-900">{m.productName}</p>
                         <p className="text-[10px] text-slate-500 italic mt-1">{format(new Date(m.createdAt), "MMM dd, HH:mm")}</p>
                       </div>
                       <Badge className={cn("gap-1 text-[10px] uppercase", getMovementColor(m.type, m.quantity))}>
                          {m.type.replace(/_/g, " ")}
                       </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-50 py-1">
                       <span className="text-slate-500">{m.userName || 'System'}</span>
                       <div className="text-right flex items-center gap-3">
                          <span className={cn("font-mono font-bold text-sm", m.quantity > 0 ? "text-green-600" : "text-red-600")}>
                             {m.quantity > 0 ? "+" : ""}{m.quantity}
                          </span>
                          <span className="font-mono text-slate-400">
                             Bal: {m.currentStock}
                          </span>
                       </div>
                    </div>
                 </div>
              ))}
        </div>
        </div>
      </div>

      <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Site Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter">
                Product
              </p>
              <p className="font-semibold">
                {getProductDisplayName(
                  selectedStock?.productId,
                  selectedStock?.product,
                )}
              </p>
              <p className="text-xs text-slate-500">
                {getProjectDisplayName(id || "", project)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                New Quantity ({selectedStock?.product?.uom})
              </Label>
              <Input
                id="quantity"
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="Enter new stack count..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Adjustment Reason</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Why is this stock being adjusted?"
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjusting(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Updating..." : "Save Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReturning} onOpenChange={setIsReturning}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-2xl tracking-tight">
              Return Material
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Material:</span>
                <span className="font-bold text-slate-900">
                  {getProductDisplayName(
                    selectedStock?.productId,
                    selectedStock?.product,
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">
                  Project Site:
                </span>
                <span className="font-bold text-slate-900">
                  {getProjectDisplayName(id || "", project)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                  Available Qty:
                </span>
                <span className="font-mono text-lg font-black text-teal-600">
                  {selectedStock?.quantity} {selectedStock?.product?.uom}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Return Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={returnType}
                  onValueChange={(val: any) => setReturnType(val)}
                >
                  <SelectTrigger className="font-medium bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNUSED_MATERIAL">
                      Unused Material
                    </SelectItem>
                    <SelectItem value="EXCESS_MATERIAL">
                      Excess Material
                    </SelectItem>
                    <SelectItem value="DAMAGED_MATERIAL">
                      Damaged Material
                    </SelectItem>
                    <SelectItem value="WRONG_MATERIAL">
                      Wrong Material Issued
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Return Quantity <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(e.target.value)}
                    placeholder="0"
                    className="pr-16 text-lg font-mono placeholder:text-slate-300"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono uppercase bg-slate-50 px-2 py-1 rounded">
                    {selectedStock?.product?.uom || "UN"}
                  </div>
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Remarks <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder="Provide details about why this is being returned..."
                  className="resize-none h-20 placeholder:text-slate-300"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Photos (Optional)
                </Label>
                <label className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors group">
                  <ImageIcon className="w-6 h-6 text-slate-300 group-hover:text-primary mb-2 transition-colors" />
                  <span className="text-xs text-slate-500 font-medium">
                    Click to upload photos (Max 3)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsReturning(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReturn}
              disabled={
                isSubmitting ||
                !returnQuantity ||
                !returnRemarks ||
                parseFloat(returnQuantity) <= 0 ||
                parseFloat(returnQuantity) > selectedStock?.quantity
              }
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold tracking-tight shadow-md shadow-orange-600/20"
            >
              {isSubmitting ? "Submitting..." : "Submit Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

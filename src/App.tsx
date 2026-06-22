import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import DataSeeder from './components/DataSeeder';

import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import AboutUs from './pages/AboutUs';
import ProgressPage from './pages/ProgressPage';
import TasksPage from './pages/TasksPage';
import ProductsPage from './pages/ProductsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import GRNPage from './pages/GRNPage';
import InventoryPage from './pages/InventoryPage';
import ProjectInventoryPage from './pages/ProjectInventoryPage';
import InventoryControl from './pages/InventoryControl';
import InventoryDashboard from './pages/InventoryDashboard';
import StockMovements from './pages/StockMovements';
import ReturnsManagement from './pages/ReturnsManagement';
import DailyReportPage from './pages/DailyReportPage';
import DailyReportListPage from './pages/DailyReportListPage';
import DailyReportDetailsPage from './pages/DailyReportDetailsPage';
import IssuesPage from './pages/IssuesPage';
import ReportsPage from './pages/ReportsPage';
import OrdersPage from './pages/OrdersPage';
import AdminPage from './pages/AdminPage';
import AdminDataManagement from './pages/AdminDataManagement';
import VendorsPage from './pages/VendorsPage';
import RequisitionPage from './pages/RequisitionPage';
import PurchaseRequisitionDetailsPage from './pages/PurchaseRequisitionDetailsPage';
import MaterialPriceHistoryPage from './pages/MaterialPriceHistoryPage';
import ProcurementIntelligencePage from './pages/ProcurementIntelligencePage';

import UsersPage from './pages/UsersPage';

import LoginPage from './pages/LoginPage';
import MaterialRequirementsPage from './pages/MaterialRequirementsPage';
import MaterialRequirementDetailsPage from './pages/MaterialRequirementDetailsPage';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <DataSeeder />
        <TooltipProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <DashboardLayout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/progress" element={<ProgressPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailsPage />} />
                  <Route path="/projects/:id/settings" element={<ProjectSettingsPage />} />
                  <Route path="/projects/:id/daily-report" element={<DailyReportPage />} />
                  <Route path="/projects/:id/daily-reports-list" element={<DailyReportListPage />} />
                  <Route path="/all-daily-reports" element={<DailyReportListPage />} />
                  <Route path="/daily-reports/:reportId" element={<DailyReportDetailsPage />} />
                  <Route path="/projects/:id/reports" element={<ReportsPage />} />
                  <Route path="/projects/:id/tasks" element={<TasksPage />} />
                  <Route path="/projects/:id/progress" element={<ProgressPage />} />
                  <Route path="/projects/:id/inventory" element={<ProjectInventoryPage />} />
                  <Route path="/projects/:id/requisitions" element={<RequisitionPage />} />
                  <Route path="/projects/:id/orders" element={<OrdersPage />} />
                  <Route path="/projects/:id/grns" element={<GRNPage />} />
                  <Route path="/projects/:id/issues" element={<IssuesPage />} />
                  <Route path="/vendors" element={<VendorsPage />} />
                  <Route path="/requisitions" element={<RequisitionPage />} />
                  <Route path="/purchase-requisitions/:id" element={<PurchaseRequisitionDetailsPage />} />
                  <Route path="/requisitions/:id" element={<PurchaseRequisitionDetailsPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/grns" element={<GRNPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/inventory/dashboard" element={<InventoryDashboard />} />
                  <Route path="/inventory/control" element={<InventoryControl />} />
                  <Route path="/inventory/movements" element={<StockMovements />} />
                  <Route path="/inventory/returns" element={<ReturnsManagement />} />
                  <Route path="/material-requirements" element={<MaterialRequirementsPage />} />
                  <Route path="/material-requirements/:id" element={<MaterialRequirementDetailsPage />} />
                  <Route path="/material-price-history" element={<MaterialPriceHistoryPage />} />
                  <Route path="/procurement-intelligence" element={<ProcurementIntelligencePage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/data-management" element={<AdminDataManagement />} />
                  <Route path="*" element={<div>404 Not Found</div>} />
                </Routes>
              </DashboardLayout>
            } />
          </Routes>
          <Toaster position="top-right" />
        </TooltipProvider>
      </AuthProvider>
    </Router>
  );
}

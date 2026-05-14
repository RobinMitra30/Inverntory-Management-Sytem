import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import DataSeeder from './components/DataSeeder';

import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import ProgressPage from './pages/ProgressPage';
import TasksPage from './pages/TasksPage';
import ProductsPage from './pages/ProductsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import GRNPage from './pages/GRNPage';
import InventoryPage from './pages/InventoryPage';
import ProjectInventoryPage from './pages/ProjectInventoryPage';
import DailyReportPage from './pages/DailyReportPage';
import DailyReportListPage from './pages/DailyReportListPage';
import DailyReportDetailsPage from './pages/DailyReportDetailsPage';
import ReportsPage from './pages/ReportsPage';
import OrdersPage from './pages/OrdersPage';
import AdminPage from './pages/AdminPage';
import VendorsPage from './pages/VendorsPage';
import RequisitionPage from './pages/RequisitionPage';

import UsersPage from './pages/UsersPage';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <DataSeeder />
        <TooltipProvider>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/attendance" element={<AttendancePage />} />
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
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/requisitions" element={<RequisitionPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/grns" element={<GRNPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
          </DashboardLayout>
          <Toaster position="top-right" />
        </TooltipProvider>
      </AuthProvider>
    </Router>
  );
}

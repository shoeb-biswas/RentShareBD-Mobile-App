import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth, type AuthUser } from './context/AuthContext';

import { HomePage } from './pages/public/HomePage';
import { MarketplacePage } from './pages/public/MarketplacePage';
import { PropertyDetailsPage } from './pages/public/PropertyDetailsPage';
import { RoommateDiscoveryPage } from './pages/public/RoommateDiscoveryPage';
import { AboutPage, HowItWorksPage } from './pages/public/InfoPages';
import { LoginPage, RegisterPage } from './pages/public/AuthPages';

import {
  TenantDashboardPage,
  TenantProfilePage,
  TenantMatchesPage,
  TenantRentalRequestsPage,
  SavedPropertiesPage,
  TenantAgreementPage,
} from './pages/tenant/TenantCorePages';
import {
  RoommateGroupPage,
  GroupChatPage,
  PrivateChatPage,
} from './pages/tenant/TenantChatPages';
import {
  ExpenseDashboardPage,
  ExpenseSplittingPage,
  UtilityBillsPage,
} from './pages/tenant/TenantFinancePages';
import {
  MealPlannerPage,
  GroceryManagerPage,
  TenantMaintenancePage,
  AiFinancialAssistantPage,
  NotificationsPage,
  SettingsPage,
} from './pages/tenant/TenantLivingAndAiPages';

import {
  LandlordDashboardPage,
  LandlordPropertiesPage,
  AddPropertyPage,
  EditPropertyPage,
  LandlordApplicationsPage,
  LandlordTenantsPage,
  LandlordAgreementsPage,
  LandlordMaintenancePage,
  LandlordReviewsPage,
} from './pages/landlord/LandlordPages';

import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminPropertyVerificationPage,
  AdminSuspiciousListingsPage,
  AdminComplaintsPage,
  AdminReportsPage,
} from './pages/admin/AdminPages';

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: Array<AuthUser['role']>;
  children: React.ReactElement;
}) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    const redirect =
      user.role === 'admin' ? '/admin' : user.role === 'landlord' ? '/landlord' : '/tenant';
    return <Navigate to={redirect} replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Pages (8) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/properties" element={<MarketplacePage />} />
          <Route path="/properties/:id" element={<PropertyDetailsPage />} />
          <Route path="/roommates" element={<RoommateDiscoveryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Tenant Pages (18) */}
          <Route path="/tenant" element={<ProtectedRoute allowedRoles={['tenant']}><TenantDashboardPage /></ProtectedRoute>} />
          <Route path="/tenant/profile" element={<ProtectedRoute allowedRoles={['tenant']}><TenantProfilePage /></ProtectedRoute>} />
          <Route path="/tenant/matches" element={<ProtectedRoute allowedRoles={['tenant']}><TenantMatchesPage /></ProtectedRoute>} />
          <Route path="/tenant/requests" element={<ProtectedRoute allowedRoles={['tenant']}><TenantRentalRequestsPage /></ProtectedRoute>} />
          <Route path="/tenant/saved" element={<ProtectedRoute allowedRoles={['tenant']}><SavedPropertiesPage /></ProtectedRoute>} />
          <Route path="/tenant/agreement" element={<ProtectedRoute allowedRoles={['tenant']}><TenantAgreementPage /></ProtectedRoute>} />
          <Route path="/tenant/group" element={<ProtectedRoute allowedRoles={['tenant']}><RoommateGroupPage /></ProtectedRoute>} />
          <Route path="/tenant/chat" element={<ProtectedRoute allowedRoles={['tenant']}><GroupChatPage /></ProtectedRoute>} />
          <Route path="/tenant/private-chat" element={<ProtectedRoute allowedRoles={['tenant']}><PrivateChatPage /></ProtectedRoute>} />
          <Route path="/tenant/expenses" element={<ProtectedRoute allowedRoles={['tenant']}><ExpenseDashboardPage /></ProtectedRoute>} />
          <Route path="/tenant/splits" element={<ProtectedRoute allowedRoles={['tenant']}><ExpenseSplittingPage /></ProtectedRoute>} />
          <Route path="/tenant/utilities" element={<ProtectedRoute allowedRoles={['tenant']}><UtilityBillsPage /></ProtectedRoute>} />
          <Route path="/tenant/meals" element={<ProtectedRoute allowedRoles={['tenant']}><MealPlannerPage /></ProtectedRoute>} />
          <Route path="/tenant/groceries" element={<ProtectedRoute allowedRoles={['tenant']}><GroceryManagerPage /></ProtectedRoute>} />
          <Route path="/tenant/maintenance" element={<ProtectedRoute allowedRoles={['tenant']}><TenantMaintenancePage /></ProtectedRoute>} />
          <Route path="/tenant/ai-assistant" element={<ProtectedRoute allowedRoles={['tenant']}><AiFinancialAssistantPage /></ProtectedRoute>} />
          <Route path="/tenant/notifications" element={<ProtectedRoute allowedRoles={['tenant']}><NotificationsPage /></ProtectedRoute>} />
          <Route path="/tenant/settings" element={<ProtectedRoute allowedRoles={['tenant']}><SettingsPage /></ProtectedRoute>} />

          {/* Landlord Pages (9) */}
          <Route path="/landlord" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordDashboardPage /></ProtectedRoute>} />
          <Route path="/landlord/properties" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordPropertiesPage /></ProtectedRoute>} />
          <Route path="/landlord/properties/new" element={<ProtectedRoute allowedRoles={['landlord']}><AddPropertyPage /></ProtectedRoute>} />
          <Route path="/landlord/properties/:id/edit" element={<ProtectedRoute allowedRoles={['landlord']}><EditPropertyPage /></ProtectedRoute>} />
          <Route path="/landlord/applications" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordApplicationsPage /></ProtectedRoute>} />
          <Route path="/landlord/tenants" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordTenantsPage /></ProtectedRoute>} />
          <Route path="/landlord/agreements" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordAgreementsPage /></ProtectedRoute>} />
          <Route path="/landlord/maintenance" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordMaintenancePage /></ProtectedRoute>} />
          <Route path="/landlord/reviews" element={<ProtectedRoute allowedRoles={['landlord']}><LandlordReviewsPage /></ProtectedRoute>} />

          {/* Admin Pages (6) */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/properties" element={<ProtectedRoute allowedRoles={['admin']}><AdminPropertyVerificationPage /></ProtectedRoute>} />
          <Route path="/admin/suspicious" element={<ProtectedRoute allowedRoles={['admin']}><AdminSuspiciousListingsPage /></ProtectedRoute>} />
          <Route path="/admin/complaints" element={<ProtectedRoute allowedRoles={['admin']}><AdminComplaintsPage /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReportsPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

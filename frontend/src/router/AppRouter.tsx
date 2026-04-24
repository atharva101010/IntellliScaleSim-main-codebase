import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from '../components/Auth/Login'
import Register from '../components/Auth/Register'
import ForgotPassword from '../components/Auth/ForgotPassword'
import ResetPassword from '../components/Auth/ResetPassword'
import Deployment from '../pages/Deployment'
import DeploymentDetails from '../pages/DeploymentDetails'
import { useAuth } from '../hooks/useAuth'
import React from 'react'
import AppShell from '../components/layout/AppShell'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentDashboard from '../pages/StudentDashboard'
import TeacherDashboard from '../pages/TeacherDashboard'
import AdminDashboard from '../pages/AdminDashboard'
import DeploymentGuides from '../pages/DeploymentGuides'
import Monitoring from '../pages/Monitoring'
import AutoScaling from '../pages/AutoScaling'
import LoadTesting from '../pages/LoadTesting'
import Billing from '../pages/Billing'
import Profile from '../pages/Profile'
import Classes from '../pages/Classes'
import StudentClasses from '../pages/StudentClasses'
import UsersAdmin from '../pages/UsersAdmin'
import Systems from '../pages/Systems'
import Settings from '../pages/Settings'

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

const RoleGate: React.FC<{ role: 'student' | 'teacher' | 'admin', children: React.ReactNode }> = ({ role, children }) => {
  const { user } = useAuth()
  if (user?.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

const RoleRedirect: React.FC = () => {
  const { user } = useAuth()
  if (user?.role === 'teacher') return <Navigate to="/teacher" replace />
  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/student" replace />
}

export default function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Protected><RoleRedirect /></Protected>} />
          <Route path="/student" element={<Protected><RoleGate role="student"><DashboardLayout><StudentDashboard /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/student/classes" element={<Protected><RoleGate role="student"><DashboardLayout><StudentClasses /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/student/deployments" element={<Protected><RoleGate role="student"><DashboardLayout><Deployment /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/student/deployments/:id" element={<Protected><RoleGate role="student"><DashboardLayout><DeploymentDetails /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/student/guides" element={<Protected><RoleGate role="student"><DashboardLayout><DeploymentGuides /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/student/monitoring" element={<Protected><RoleGate role="student"><DashboardLayout><Monitoring /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/student/autoscaling" element={<Protected><RoleGate role="student"><DashboardLayout><AutoScaling /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/student/loadtest" element={<Protected><RoleGate role="student"><DashboardLayout><LoadTesting /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/student/billing" element={<Protected><RoleGate role="student"><DashboardLayout><Billing /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/student/profile" element={<Protected><RoleGate role="student"><DashboardLayout><Profile /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/teacher" element={<Protected><RoleGate role="teacher"><DashboardLayout><TeacherDashboard /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/teacher/deployments" element={<Protected><RoleGate role="teacher"><DashboardLayout><Deployment /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/teacher/deployments/:id" element={<Protected><RoleGate role="teacher"><DashboardLayout><DeploymentDetails /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/teacher/guides" element={<Protected><RoleGate role="teacher"><DashboardLayout><DeploymentGuides /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/teacher/monitoring" element={<Protected><RoleGate role="teacher"><DashboardLayout><Monitoring /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/teacher/billing" element={<Protected><RoleGate role="teacher"><DashboardLayout><Billing /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/teacher/classes" element={<Protected><RoleGate role="teacher"><DashboardLayout><Classes /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/teacher/profile" element={<Protected><RoleGate role="teacher"><DashboardLayout><Profile /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin" element={<Protected><RoleGate role="admin"><DashboardLayout><AdminDashboard /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/deployments" element={<Protected><RoleGate role="admin"><DashboardLayout><Deployment /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/deployments/:id" element={<Protected><RoleGate role="admin"><DashboardLayout><DeploymentDetails /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/guides" element={<Protected><RoleGate role="admin"><DashboardLayout><DeploymentGuides /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/monitoring" element={<Protected><RoleGate role="admin"><DashboardLayout><Monitoring /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/autoscaling" element={<Protected><RoleGate role="admin"><DashboardLayout><AutoScaling /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/loadtest" element={<Protected><RoleGate role="admin"><DashboardLayout><LoadTesting /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/billing" element={<Protected><RoleGate role="admin"><DashboardLayout><Billing /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/users" element={<Protected><RoleGate role="admin"><DashboardLayout><UsersAdmin /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/systems" element={<Protected><RoleGate role="admin"><DashboardLayout><Systems /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/settings" element={<Protected><RoleGate role="admin"><DashboardLayout><Settings /></DashboardLayout></RoleGate></Protected>} />
          <Route path="/admin/profile" element={<Protected><RoleGate role="admin"><DashboardLayout><Profile /></DashboardLayout></RoleGate></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}

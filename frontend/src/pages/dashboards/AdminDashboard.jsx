import { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Users, Package, LogOut, ShoppingCart, MessageCircle, FileText } from 'lucide-react';
import logo from '../../assets/logo1.png';
import Overview from './admin/Overview';
import UserManagement from './admin/UserManagement';
import ProductModeration from './admin/ProductModeration';
import AdminOrderList from './admin/AdminOrderList';
import AdminUserMessages from './admin/AdminUserMessages';
import FinancialStatement from './admin/FinancialStatement';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Overview', href: '/dashboard/admin', icon: Shield },
    { name: 'User Management', href: '/dashboard/admin/users', icon: Users },
    { name: 'Product Moderation', href: '/dashboard/admin/products', icon: Package },
    { name: 'Order Management', href: '/dashboard/admin/orders', icon: ShoppingCart },
    { name: 'Financial Statement', href: '/dashboard/admin/financials', icon: FileText },
    { name: 'Messages from Users', href: '/dashboard/admin/messages', icon: MessageCircle },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Slate-900 */}
      <div className="w-64 flex-shrink-0 bg-slate-900 text-white flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <img 
              src={logo} 
              alt="EverTrend Logo" 
              className="h-10 w-10 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold">EverTrend Platform</h1>
              <p className="text-sm text-slate-400">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {navigation.find(item => item.href === location.pathname)?.name || 'Admin Dashboard'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Manage and monitor the EverTrend platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 font-medium">
                {user?.email || 'admin@evertrend.com'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto min-w-0">
          <Routes>
            <Route path="" element={<Overview />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="products" element={<ProductModeration />} />
            <Route path="orders" element={<AdminOrderList />} />
            <Route path="financials" element={<FinancialStatement />} />
            <Route path="messages" element={<AdminUserMessages />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

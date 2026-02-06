import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Products from './seller/Products';
import Stats from './seller/Stats';
import Orders from './seller/Orders';
import Profile from './seller/Profile';
import Coupons from './seller/Coupons';
import RefundsManager from './seller/RefundsManager';
import Chat from './seller/Chat';
import { FiPackage, FiBarChart2, FiShoppingBag, FiUser, FiTag, FiRefreshCw, FiMessageSquare } from 'react-icons/fi';

const SellerDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'My Products', href: '/dashboard/seller/products', icon: FiShoppingBag },
    { name: 'Statistics', href: '/dashboard/seller/stats', icon: FiBarChart2 },
    { name: 'Orders', href: '/dashboard/seller/orders', icon: FiPackage },
    { name: 'Messages', href: '/dashboard/seller/chat', icon: FiMessageSquare },
    { name: 'Refunds', href: '/dashboard/seller/refunds', icon: FiRefreshCw },
    { name: 'Coupons', href: '/dashboard/seller/coupons', icon: FiTag },
    { name: 'Profile', href: '/dashboard/seller/profile', icon: FiUser },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your products and orders</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64">
            <nav className="bg-white rounded-lg shadow-md p-4">
              <ul className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-md transition ${
                          isActive
                            ? 'text-white'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        style={isActive ? { backgroundColor: '#fab242' } : {}}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Routes>
              <Route path="products" element={<Products />} />
              <Route path="stats" element={<Stats />} />
              <Route path="orders" element={<Orders />} />
              <Route path="chat" element={<Chat />} />
              <Route path="refunds" element={<RefundsManager />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="profile" element={<Profile />} />
              <Route path="" element={<Products />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;


import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Users from './admin/Users';
import Products from './admin/Products';
import Orders from './admin/Orders';
import Analytics from './admin/Analytics';
import Coupons from './seller/Coupons';
import { FiUsers, FiPackage, FiShoppingBag, FiBarChart2, FiTag } from 'react-icons/fi';

const AdminDashboard = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Analytics', href: '/dashboard/admin', icon: FiBarChart2 },
    { name: 'Users', href: '/dashboard/admin/users', icon: FiUsers },
    { name: 'Products', href: '/dashboard/admin/products', icon: FiShoppingBag },
    { name: 'Orders', href: '/dashboard/admin/orders', icon: FiPackage },
    { name: 'Coupons', href: '/dashboard/admin/coupons', icon: FiTag },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage the platform</p>
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
              <Route path="" element={<Analytics />} />
              <Route path="users" element={<Users />} />
              <Route path="products" element={<Products />} />
              <Route path="orders" element={<Orders />} />
              <Route path="coupons" element={<Coupons />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


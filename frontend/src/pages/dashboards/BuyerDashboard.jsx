import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Profile from './buyer/Profile';
import Orders from './buyer/Orders';
import Points from './buyer/Points';
import Chat from './buyer/Chat';
import { FiUser, FiPackage, FiStar, FiMessageSquare } from 'react-icons/fi';

const BuyerDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Profile', href: '/dashboard/buyer/profile', icon: FiUser },
    { name: 'Orders', href: '/dashboard/buyer/orders', icon: FiPackage },
    { name: 'Messages', href: '/dashboard/buyer/chat', icon: FiMessageSquare },
    { name: 'TrendPoints', href: '/dashboard/buyer/points', icon: FiStar },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Buyer Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.username}!</p>
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
              <Route path="profile" element={<Profile />} />
              <Route path="orders" element={<Orders />} />
              <Route path="chat" element={<Chat />} />
              <Route path="points" element={<Points />} />
              <Route path="" element={<Profile />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;


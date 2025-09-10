import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from './ui/Button';
import NotificationCenter from './NotificationCenter';
import { connectSocket, getSocket } from '../services/socket';

export default function TopBar({ auth, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (auth.user) {
      const socket = getSocket();
      if (!socket) {
        connectSocket();
      }
    }
  }, [auth.user]);

  return (
    <>
      <header className="bg-white shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xl md:text-2xl font-bold text-slate-700">Civic Connect</Link>
          <nav className="hidden md:flex gap-3">
            <Link to="/report" className="text-slate-600 hover:text-slate-900">Report</Link>
            <Link to="/reports" className="text-slate-600 hover:text-slate-900">Incidents</Link>
            {auth.user && (
              <Link to="/my-reports" className="text-slate-600 hover:text-slate-900">My Reports</Link>
            )}
            {auth.user && (auth.user.role === 'staff' || auth.user.role === 'admin') && (
              <>
                <Link to="/admin" className="text-slate-600 hover:text-slate-900">Admin</Link>
                <Link to="/ops" className="text-slate-600 hover:text-slate-900">Ops</Link>
                <Link to="/department" className="text-slate-600 hover:text-slate-900">Department</Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification bell */}
          {auth.user && (
            <button
              className="relative p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              onClick={() => setNotificationOpen(!notificationOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop auth section */}
          <div className="hidden md:block">
            {auth.user ? (
              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-600">{auth.user.name}</div>
                <Button variant="ghost" onClick={onLogout}>Logout</Button>
              </div>
            ) : (
              <Link to="/login"><Button>Login</Button></Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-slate-200">
          <nav className="flex flex-col gap-2">
            <Link to="/report" className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md">Report</Link>
            <Link to="/reports" className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md">Incidents</Link>
            {auth.user && (
              <Link to="/my-reports" className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md">My Reports</Link>
            )}
            {auth.user && (auth.user.role === 'staff' || auth.user.role === 'admin') && (
              <>
                <Link to="/admin" className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md">Admin</Link>
                <Link to="/ops" className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md">Ops</Link>
                <Link to="/department" className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md">Department</Link>
              </>
            )}
            {auth.user ? (
              <div className="px-3 py-2 border-t border-slate-200 mt-2 pt-2">
                <div className="text-sm text-slate-600 mb-2">{auth.user.name}</div>
                <Button variant="ghost" onClick={onLogout} className="w-full justify-start">Logout</Button>
              </div>
            ) : (
              <div className="px-3 py-2">
                <Link to="/login"><Button className="w-full">Login</Button></Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>

    {/* Notification Center */}
    <NotificationCenter 
      isOpen={notificationOpen} 
      onClose={() => setNotificationOpen(false)} 
    />
    </>
  );
}

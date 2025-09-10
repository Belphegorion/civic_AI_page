import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import NotificationCenter from './components/NotificationCenter';
import LoginPage from './pages/Login';
import Home from './pages/Home';
import ReportForm from './pages/ReportForm';
import ReportsList from './pages/ReportsList';
import MyReports from './pages/MyReports';
import AdminPanel from './pages/AdminPanel';
import OpsPanel from './pages/OpsPanel';
import DepartmentDashboard from './pages/DepartmentDashboard';
import useAuth from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';

export default function App() {
  const auth = useAuth();

  // Register Service Worker for PWA and initialize IndexedDB
  useEffect(() => {
    const initializeApp = async () => {
      // Register Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          console.log('SW registered: ', registration);
          
          // Handle Service Worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, notify user
                window.dispatchEvent(new CustomEvent('swUpdateAvailable'));
              }
            });
          });
        } catch (error) {
          console.error('SW registration failed: ', error);
        }
      }

      // Initialize IndexedDB for offline data
      if ('indexedDB' in window) {
        try {
          const dbName = 'civicConnectOfflineDB';
          const request = indexedDB.open(dbName, 1);
          
          request.onerror = (event) => {
            console.error('IndexedDB initialization error:', event);
          };

          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pendingReports')) {
              db.createObjectStore('pendingReports', { keyPath: 'id', autoIncrement: true });
            }
          };
        } catch (error) {
          console.error('IndexedDB setup failed:', error);
        }
      }
    };

    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-slate-50">
          <OfflineIndicator />
          <TopBar auth={auth} onLogout={auth.logout} />
          <NotificationCenter />
          <main className="py-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage auth={auth} />} />
              <Route path="/report" element={<ProtectedRoute auth={auth}><ReportForm auth={auth} /></ProtectedRoute>} />
              <Route path="/reports" element={<ReportsList />} />
              <Route path="/my-reports" element={<ProtectedRoute auth={auth}><MyReports auth={auth} /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute auth={auth} roles={['admin']}><AdminPanel /></ProtectedRoute>} />
              <Route path="/ops" element={<ProtectedRoute auth={auth} roles={['staff']}><OpsPanel /></ProtectedRoute>} />
              <Route path="/department" element={<ProtectedRoute auth={auth} roles={['staff']}><DepartmentDashboard /></ProtectedRoute>} />
              <Route path="*" element={<div className="p-6">Not found</div>} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

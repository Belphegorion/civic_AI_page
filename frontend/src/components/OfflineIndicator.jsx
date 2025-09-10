import React, { useState, useEffect, useCallback } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info', 'warning', 'error', 'success'
  const [hasOfflineData, setHasOfflineData] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncError, setSyncError] = useState(null);

  // Check for offline data in IndexedDB
  const checkOfflineData = useCallback(async () => {
    try {
      const request = indexedDB.open('civicConnectOfflineDB', 1);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        showNotification('Error checking offline data', 'error');
      };

      request.onsuccess = async () => {
        const db = request.result;
        const transaction = db.transaction('pendingReports', 'readonly');
        const store = transaction.objectStore('pendingReports');
        const count = await store.count();
        setHasOfflineData(count > 0);
        if (count > 0) {
          showNotification(`${count} reports waiting to be synced`, 'info');
        }
      };
    } catch (err) {
      console.error('Failed to check offline data:', err);
      showNotification('Error checking offline data', 'error');
    }
  }, []);

  // Handle online status changes
  const handleOnline = useCallback(async () => {
    setIsOnline(true);
    if (hasOfflineData) {
      setIsSyncing(true);
      setSyncProgress(0);
      showNotification('Syncing offline data...', 'info');
      try {
        await syncOfflineData((progress) => {
          setSyncProgress(progress);
        });
        showNotification('All data synced successfully', 'success');
        setHasOfflineData(false);
      } catch (err) {
        setSyncError('Failed to sync some data. Will retry automatically.');
        console.error('Sync failed:', err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      showNotification('Back online', 'success');
    }
  }, [hasOfflineData]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setShowOfflineMessage(true);
    checkOfflineData();
  }, [checkOfflineData]);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection status using fetch
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache'
        });
        setIsOnline(response.ok);
      } catch {
        setIsOnline(false);
      }
    };

    // Periodic connection check
    const intervalId = setInterval(checkConnection, 30000);

    // Initial checks
    checkConnection();
    checkOfflineData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [handleOnline, handleOffline, checkOfflineData]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful');
          
          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'OFFLINE_DATA_UPDATED') {
              checkOfflineData();
            }
          });
        },
        (err) => {
          console.error('ServiceWorker registration failed:', err);
        }
      );
    }
  }, [checkOfflineData]);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white" role="alert" data-testid="offline-indicator">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">
                You're offline. {hasOfflineData ? "Changes will sync when you're back online." : "Some features may be limited."}
              </span>
            </div>
            {hasOfflineData && (
              <span className="text-sm bg-orange-600 px-2 py-1 rounded" data-testid="pending-changes">
                Pending Changes
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showOfflineMessage) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white" role="alert" data-testid="online-indicator">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {messageType === 'success' ? (
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : messageType === 'error' ? (
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              <div className="flex flex-col">
                <span className="font-medium" data-testid="offline-message">
                  {message || (isOnline ? "You're online" : "You're offline")}
                </span>
                {isSyncing && (
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${syncProgress}%` }}
                        data-testid="sync-progress"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {(syncError || !isOnline) && (
              <div className="flex space-x-2">
                {syncError && (
                  <button 
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    onClick={handleOnline}
                    data-testid="retry-sync"
                  >
                    Retry Sync
                  </button>
                )}
                {!isOnline && (
                  <button
                    className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                    onClick={() => checkOfflineData()}
                    data-testid="check-offline-data"
                  >
                    Check Offline Data
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// IndexedDB utilities
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('offlineData', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getOfflineDataCount(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reports'], 'readonly');
    const store = transaction.objectStore('reports');
    const countRequest = store.count();
    
    countRequest.onsuccess = () => resolve(countRequest.result);
    countRequest.onerror = () => reject(countRequest.error);
  });
}

async function syncOfflineData(onProgress = () => {}) {
  const db = await openDB();
  const transaction = db.transaction(['reports'], 'readwrite');
  const store = transaction.objectStore('reports');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    
    request.onsuccess = async () => {
      const offlineData = request.result;
      const total = offlineData.length;
      let completed = 0;
      
      try {
        // Sync each item
        for (const item of offlineData) {
          try {
            const response = await fetch('/api/reports', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(item),
            });
            
            if (!response.ok) {
              throw new Error(`Failed to sync item ${item.id}: ${response.statusText}`);
            }
            
            // Remove synced item
            await store.delete(item.id);
            completed++;
            onProgress(Math.round((completed / total) * 100));
          } catch (itemError) {
            console.error(`Failed to sync item ${item.id}:`, itemError);
            // Continue with next item instead of failing completely
            completed++;
            onProgress(Math.round((completed / total) * 100));
          }
        }
        
        // Even if some items failed, we've completed the sync attempt
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

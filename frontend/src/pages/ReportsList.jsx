import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { connectSocket } from '../services/socket';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import Card from '../components/ui/Card';

export default function ReportsList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', category: '', priority: '' });
  const [showHeatmap, setShowHeatmap] = useState(false);

  const fetch = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.category) params.append('category', filter.category);
      if (filter.priority) params.append('priority', filter.priority);
      
      const res = await api.get(`/reports?${params.toString()}`);
      // Handle new API response format with pagination
      setReports(res.data.reports || res.data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      // Could add user-friendly error message here
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const socket = connectSocket();
    
    const handleReportCreated = (r) => setReports(prev => [r, ...prev]);
    const handleReportUpdated = (r) => setReports(prev => prev.map(p => p._id === r._id ? r : p));
    const handleReportProcessed = (r) => setReports(prev => prev.map(p => p._id === r._id ? r : p));
    
    socket.on('report:created', handleReportCreated);
    socket.on('report:updated', handleReportUpdated);
    socket.on('report:processed', handleReportProcessed);
    
    return () => {
      socket.off('report:created', handleReportCreated);
      socket.off('report:updated', handleReportUpdated);
      socket.off('report:processed', handleReportProcessed);
    };
  }, [filter]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#dc2626'; // red
      case 'high': return '#ea580c'; // orange
      case 'medium': return '#d97706'; // amber
      case 'low': return '#16a34a'; // green
      default: return '#6b7280'; // gray
    }
  };

  const getPriorityRadius = (priority) => {
    switch (priority) {
      case 'critical': return 12;
      case 'high': return 10;
      case 'medium': return 8;
      case 'low': return 6;
      default: return 5;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h3 className="text-lg font-semibold">Reported issues</h3>
            <div className="flex flex-wrap gap-2">
              <select 
                value={filter.status} 
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="text-xs px-2 py-1 border rounded"
              >
                <option value="">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <select 
                value={filter.category} 
                onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
                className="text-xs px-2 py-1 border rounded"
              >
                <option value="">All Categories</option>
                <option value="pothole">Pothole</option>
                <option value="streetlight">Streetlight</option>
                <option value="trash">Trash</option>
                <option value="water_leak">Water Leak</option>
                <option value="tree_hazard">Tree Hazard</option>
              </select>
              <select 
                value={filter.priority} 
                onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
                className="text-xs px-2 py-1 border rounded"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <Card className="h-64 md:h-96 overflow-hidden">
            <MapContainer 
              center={[20,0]} 
              zoom={2} 
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {reports.map(r => (
                <CircleMarker
                  key={r._id}
                  center={[r.location.coordinates[1], r.location.coordinates[0]]}
                  radius={getPriorityRadius(r.priority)}
                  color={getPriorityColor(r.priority)}
                  fillColor={getPriorityColor(r.priority)}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.3}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{r.title}</strong>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full text-white`} 
                              style={{ backgroundColor: getPriorityColor(r.priority) }}>
                          {r.priority?.toUpperCase() || 'MEDIUM'}
                        </span>
                        <span>{r.category} — {r.status}</span>
                      </div>
                      <div className="text-xs mt-1">{r.description?.slice(0,120)}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </Card>
        </div>

        <aside className="space-y-3">
          <h3 className="text-lg font-semibold">List ({reports.length})</h3>
          <div className="space-y-2 max-h-64 md:max-h-96 overflow-auto">
            {reports.length === 0 ? (
              <div className="text-center text-slate-500 py-8">No reports found</div>
            ) : (
              reports.map(r => (
                <div key={r._id} className="p-2 border rounded hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm md:text-base">{r.title}</div>
                      <div className="text-xs text-slate-600">{r.category} — {r.status}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full text-white ml-2`} 
                          style={{ backgroundColor: getPriorityColor(r.priority) }}>
                      {r.priority?.toUpperCase() || 'MEDIUM'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

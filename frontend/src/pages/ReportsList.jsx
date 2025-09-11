import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { connectSocket } from '../services/socket';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// A mapping for colors to avoid complex functions in the render part
const priorityStyles = {
  critical: { color: '#ef4444', radius: 12 },
  high: { color: '#f97316', radius: 10 },
  medium: { color: '#f59e0b', radius: 8 },
  low: { color: '#22c55e', radius: 6 },
  default: { color: '#6b7280', radius: 5 },
};

const ReportItem = ({ report }) => {
  const { color } = priorityStyles[report.priority] || priorityStyles.default;
  return (
    <Card className="mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-primary">{report.title}</h3>
          <p className="text-sm text-secondary capitalize">
            {report.category?.replace(/_/g, ' ')} - <span className="font-medium">{report.status}</span>
          </p>
        </div>
        <span className="text-xs font-bold uppercase px-2 py-1 rounded-full text-white" style={{ backgroundColor: color }}>
          {report.priority}
        </span>
      </div>
      {report.description && <p className="mt-2 text-sm text-secondary">{report.description}</p>}
    </Card>
  );
};

export default function ReportsList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'map'

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await api.get('/reports');
        setReports(res.data.reports || []);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
    const socket = connectSocket();

    const handleReportUpdate = (updatedReport) => {
      setReports(prev => prev.map(r => r._id === updatedReport._id ? updatedReport : r));
    };
    const handleReportCreate = (newReport) => {
        setReports(prev => [newReport, ...prev]);
    };

    socket.on('report:created', handleReportCreate);
    socket.on('report:updated', handleReportUpdate);
    socket.on('report:processed', handleReportUpdate);

    return () => {
      socket.off('report:created', handleReportCreate);
      socket.off('report:updated', handleReportUpdate);
      socket.off('report:processed', handleReportUpdate);
    };
  }, []);

  if (loading) {
    return <div className="text-center p-8">Loading reports...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Public Reports</h1>
        <div>
          <Button variant={view === 'list' ? 'default' : 'secondary'} onClick={() => setView('list')} className="mr-2">List</Button>
          <Button variant={view === 'map' ? 'default' : 'secondary'} onClick={() => setView('map')}>Map</Button>
        </div>
      </div>

      {view === 'list' && (
        <div>
          {reports.length > 0 ? (
            reports.map(report => <ReportItem key={report._id} report={report} />)
          ) : (
            <p className="text-center text-secondary">No reports found.</p>
          )}
        </div>
      )}

      {view === 'map' && (
        <Card className="h-[600px] p-0 overflow-hidden">
          <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {reports.map(report => {
               const { color, radius } = priorityStyles[report.priority] || priorityStyles.default;
               return (
                <CircleMarker
                  key={report._id}
                  center={[report.location.coordinates[1], report.location.coordinates[0]]}
                  radius={radius}
                  color={color}
                  fillColor={color}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.4}
                >
                  <Popup>
                    <div className="font-semibold">{report.title}</div>
                    <div className="text-sm capitalize">{report.category?.replace(/_/g, ' ')} - {report.status}</div>
                  </Popup>
                </CircleMarker>
              )}
            )}
          </MapContainer>
        </Card>
      )}
    </div>
  );
}

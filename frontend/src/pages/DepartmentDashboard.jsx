import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function DepartmentDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState(null);
  const [stats, setStats] = useState({});
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  const fetchDepartmentReports = async (retryCount = 0) => {
    try {
      setLoading(true);
      const res = await api.get('/reports/department');
      setReports(res.data.reports || res.data);
      setError(null);
      
      // Calculate stats
      const total = res.data.reports?.length || res.data.length || 0;
      const byStatus = (res.data.reports || res.data || []).reduce((acc, report) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
      }, {});
      
      setStats({ total, byStatus });
    } catch (err) {
      console.error('Failed to fetch department reports:', err);
      if (retryCount < 3) {
        setTimeout(() => fetchDepartmentReports(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        setError('Failed to load department reports. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentMetrics = async () => {
    try {
      const res = await Promise.all([
        api.get('/department/reports'),
        api.get('/department/metrics')
      ]);

      const reportsData = res[0].data;
      const metricsData = res[1].data;

      setReports(reportsData);
      setMetrics(metricsData);
    } catch (err) {
      setError('Failed to fetch department data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId, status) => {
    try {
      await api.put(`/reports/${reportId}/status`, { status });
      fetchDepartmentReports();
    } catch (err) {
      console.error('Failed to update report status:', err);
    }
  };

  useEffect(() => {
    fetchDepartmentReports();
    fetchDepartmentMetrics();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading department reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">{error}</div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Department Dashboard</h2>
        <p className="text-slate-600">Manage reports assigned to your department</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm text-gray-500">Active Reports</h3>
          <p className="text-2xl font-bold">{metrics?.activeReports || '0'}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm text-gray-500">Average Response Time</h3>
          <p className="text-2xl font-bold">{metrics?.avgResponseTime || '0'}h</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm text-gray-500">Resolution Rate</h3>
          <p className="text-2xl font-bold">{metrics?.resolutionRate || '0'}%</p>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Assigned Reports</h3>
        </div>
        <div className="divide-y">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No reports assigned to your department</div>
          ) : (
            reports.map(report => (
              <div key={report._id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{report.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        report.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        report.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        report.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {report.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        report.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                        report.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {report.status?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{report.description}</p>
                    <div className="text-xs text-slate-500">
                      {report.category} • {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {report.status === 'submitted' && (
                      <Button 
                        size="sm" 
                        onClick={() => updateReportStatus(report._id, 'in_progress')}
                      >
                        Start Work
                      </Button>
                    )}
                    {report.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        onClick={() => updateReportStatus(report._id, 'resolved')}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

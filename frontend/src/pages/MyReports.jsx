import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { connectSocket } from '../services/socket';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function MyReports({ auth }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchMyReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/my');
      setReports(res.data.reports || res.data);
    } catch (err) {
      console.error('Failed to fetch my reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.user) {
      fetchMyReports();
      
      // Listen for real-time updates
      const socket = connectSocket();
      const handleReportUpdated = (report) => {
        setReports(prev => prev.map(r => r._id === report._id ? report : r));
      };
      
      socket.on('report:updated', handleReportUpdated);
      
      return () => {
        socket.off('report:updated', handleReportUpdated);
      };
    }
  }, [auth.user]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const statusCounts = reports.reduce((acc, report) => {
    acc[report.status] = (acc[report.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your reports...</p>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="p-6 text-center">
        <Card className="p-8">
          <h2 className="text-xl font-semibold mb-4">Please log in to view your reports</h2>
          <p className="text-slate-600">You need to be logged in to track your submitted reports.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">My Reports</h2>
        <p className="text-slate-600">Track the progress of your submitted reports</p>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              filter === 'all' 
                ? 'bg-sky-600 text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({reports.length})
          </button>
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
                filter === status 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status.replace('_', ' ')} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-slate-500">
              {filter === 'all' 
                ? "You haven't submitted any reports yet." 
                : `No reports with status "${filter.replace('_', ' ')}" found.`
              }
            </div>
            {filter === 'all' && (
              <div className="mt-4">
                <Button onClick={() => window.location.href = '/report'}>
                  Submit Your First Report
                </Button>
              </div>
            )}
          </Card>
        ) : (
          filteredReports.map(report => (
            <Card key={report._id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{report.title}</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}>
                      {report.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`text-sm font-medium ${getPriorityColor(report.priority)}`}>
                      {report.priority?.toUpperCase() || 'MEDIUM'} Priority
                    </span>
                    <span className="text-sm text-slate-500">
                      {report.category.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-600 mb-3">{report.description}</p>
                  
                  {/* Audio Player */}
                  {report.audio && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">Voice Recording:</p>
                      <audio controls src={report.audio.url} className="w-full max-w-md">
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {/* Images */}
                  {report.images && report.images.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-2">Photos:</p>
                      <div className="flex gap-2 flex-wrap">
                        {report.images.map((image, index) => (
                          <img
                            key={index}
                            src={image.url}
                            alt={`Report image ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-500">
                    Submitted on {new Date(report.createdAt).toLocaleDateString()} at{' '}
                    {new Date(report.createdAt).toLocaleTimeString()}
                    {report.updatedAt !== report.createdAt && (
                      <span>
                        • Last updated {new Date(report.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Progress Timeline</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-slate-600">
                      Report submitted on {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {report.status !== 'submitted' && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-slate-600">
                        Report acknowledged and assigned to department
                      </span>
                    </div>
                  )}
                  
                  {['in_progress', 'resolved', 'closed'].includes(report.status) && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm text-slate-600">
                        Work in progress
                      </span>
                    </div>
                  )}
                  
                  {['resolved', 'closed'].includes(report.status) && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-slate-600">
                        Issue resolved on {new Date(report.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

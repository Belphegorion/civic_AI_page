import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function OpsPanel() {
  const [data, setData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetch = async () => {
    try {
      const res = await api.get('/ops/metrics');
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetch(); }, []);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/ops/reports?filter=${filter}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reportId, status) => {
    try {
      const response = await fetch(`/api/ops/reports/${reportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchReports();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Ops — Snapshot</h2>
      <Card>
        <pre className="max-h-96 overflow-auto text-sm">{JSON.stringify(data, null, 2)}</pre>
      </Card>

      <div className="container mx-auto px-4 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Operations Dashboard</h1>
          <div className="space-x-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'ghost'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'ghost'}
              onClick={() => setFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={filter === 'in-progress' ? 'default' : 'ghost'}
              onClick={() => setFilter('in-progress')}
            >
              In Progress
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {reports.map(report => (
            <Card key={report.id} className="p-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold">{report.title}</h3>
                  <p className="text-sm text-gray-500">{report.description}</p>
                  <p className="text-sm text-gray-500">Location: {report.location}</p>
                </div>
                <div className="space-x-2">
                  <Button
                    variant="ghost"
                    onClick={() => updateStatus(report.id, 'in-progress')}
                  >
                    Start
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => updateStatus(report.id, 'completed')}
                  >
                    Complete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto text-center">
      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-4">Welcome to Civic Connect</h1>
        <p className="text-slate-600 mb-6">Report issues in your city and track progress. Use the Report page to capture photos and location.</p>
        <div className="flex justify-center gap-3">
          <Link to="/report"><Button>Create Report</Button></Link>
          <Link to="/reports"><Button variant="ghost">View Reports</Button></Link>
        </div>
      </Card>
    </div>
  );
}

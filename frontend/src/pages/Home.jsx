import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 tracking-tight">
          Make Your Voice Heard
        </h1>
        <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
          Civic Connect is the easiest way to report non-emergency issues to your local government.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/report">
            <Button size="lg" className="w-full sm:w-auto">Submit a New Report</Button>
          </Link>
          <Link to="/reports">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              View Public Reports
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

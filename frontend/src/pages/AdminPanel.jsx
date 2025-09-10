import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Dialog from '../components/ui/Dialog';
import Input from '../components/ui/Input';

// Status constants for better maintainability
const STATUS_OPTIONS = ['New', 'In Progress', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedReports, setSelectedReports] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    dateRange: '',
    search: '',
    assignedTo: ''
  });
  const [bulkAction, setBulkAction] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', content: null });
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories(response.data);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Failed to load categories');
      }
    };
    fetchCategories();
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
      setPage(1); // Reset to first page on search
    }, 500),
    []
  );

  // Handle search input
  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  // Fetch reports with filters and pagination
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('page', page);
      
      const response = await api.get(`/reports?${params.toString()}`);
      setReports(response.data.reports);
      setTotalPages(Math.ceil(response.data.total / response.data.perPage));
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  // Fetch data on mount and when filters/page change
  useEffect(() => {
    fetchReports();
  }, [fetchReports, refreshTrigger]);

  // Fetch users and analytics
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, analyticsRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/analytics')
        ]);

        setUsers(usersRes.data);
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load some data. Some features may be limited.');
      }
    };

    fetchData();
  }, [refreshTrigger]);

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedReports.length === 0) return;

    try {
      setActionLoading({ bulk: true });
      await api.post('/admin/bulk-action', {
        action: bulkAction,
        reportIds: selectedReports
      });
      
      setSelectedReports([]);
      setBulkAction('');
      setRefreshTrigger(prev => prev + 1);
      showNotification('Bulk action completed successfully');
    } catch (err) {
      setError('Failed to perform bulk action');
    } finally {
      setActionLoading({ bulk: false });
    }
  };

  // Handle individual report actions
  const handleReportAction = async (reportId, action, data = {}) => {
    try {
      setActionLoading(prev => ({ ...prev, [reportId]: true }));
      
      await api.post(`/admin/reports/${reportId}/${action}`, data);
      setRefreshTrigger(prev => prev + 1);
      showNotification(`Report ${action} successful`);
    } catch (err) {
      setError(`Failed to ${action} report`);
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Show dialog for assignment
  const showAssignDialog = (reportId) => {
    setDialogConfig({
      title: 'Assign Report',
      content: (
        <div className="space-y-4">
          <select
            className="w-full border rounded p-2"
            onChange={(e) => handleReportAction(reportId, 'assign', { userId: e.target.value })}
          >
            <option value="">Select User</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.department})
              </option>
            ))}
          </select>
        </div>
      )
    });
    setDialogOpen(true);
  };

  const showNotification = (message) => {
    // You can integrate this with a proper notification system
    alert(message);
  };

  // Utility function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Analytics Summary */}
      {analytics && (
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded">
              <h3 className="text-lg font-semibold text-blue-700">Total Reports</h3>
              <p className="text-2xl">{analytics.totalReports}</p>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <h3 className="text-lg font-semibold text-green-700">Resolved</h3>
              <p className="text-2xl">{analytics.resolvedReports}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded">
              <h3 className="text-lg font-semibold text-yellow-700">In Progress</h3>
              <p className="text-2xl">{analytics.inProgressReports}</p>
            </div>
            <div className="p-4 bg-red-50 rounded">
              <h3 className="text-lg font-semibold text-red-700">Urgent</h3>
              <p className="text-2xl">{analytics.urgentReports}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4 p-4">
          <Input
            type="text"
            placeholder="Search reports..."
            onChange={handleSearchChange}
            className="flex-1"
            data-testid="search-input"
          />
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="secondary"
            data-testid="toggle-filters"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        {showFilters && (
          <div className="p-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              className="border rounded p-2"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              data-testid="status-filter"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              className="border rounded p-2"
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              data-testid="priority-filter"
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>

            <select
              className="border rounded p-2"
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              data-testid="category-filter"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <select
              className="border rounded p-2"
              value={filters.assignedTo}
              onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
              data-testid="assigned-to-filter"
            >
              <option value="">All Assignees</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>

            <select
              className="border rounded p-2"
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              data-testid="date-range-filter"
            >
              <option value="">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            <Button
              onClick={() => {
                setFilters({
                  status: '',
                  category: '',
                  priority: '',
                  dateRange: '',
                  search: '',
                  assignedTo: ''
                });
                setPage(1);
              }}
              variant="secondary"
              data-testid="clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedReports.length > 0 && (
        <Card className="mb-6">
          <div className="p-4 flex items-center gap-4">
            <select
              className="border rounded p-2"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              data-testid="bulk-action-select"
            >
              <option value="">Select Action</option>
              <option value="markResolved">Mark as Resolved</option>
              <option value="markInProgress">Mark as In Progress</option>
              <option value="setPriority">Set Priority</option>
            </select>
            <Button
              onClick={handleBulkAction}
              disabled={!bulkAction || actionLoading.bulk}
              data-testid="apply-bulk-action"
            >
              {actionLoading.bulk ? 'Applying...' : 'Apply to Selected'}
            </Button>
            <Button
              onClick={() => setSelectedReports([])}
              variant="secondary"
              data-testid="clear-selection"
            >
              Clear Selection
            </Button>
          </div>
        </Card>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <Card key={report.id} className="relative">
              <div className="absolute top-4 right-4">
                <input
                  type="checkbox"
                  checked={selectedReports.includes(report.id)}
                  onChange={(e) => {
                    setSelectedReports(prev => 
                      e.target.checked
                        ? [...prev, report.id]
                        : prev.filter(id => id !== report.id)
                    );
                  }}
                  className="h-5 w-5"
                  data-testid={`report-checkbox-${report.id}`}
                />
              </div>
              
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{report.title}</h3>
                    <p className="text-gray-600 mb-4">{report.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-500">Status</span>
                    <div className={`mt-1 font-medium ${getStatusColor(report.status)}`}>
                      {report.status}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Priority</span>
                    <div className={`mt-1 font-medium ${getPriorityColor(report.priority)}`}>
                      {report.priority}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Category</span>
                    <div className="mt-1 font-medium">{report.category}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Assigned To</span>
                    <div className="mt-1 font-medium">
                      {report.assignedTo || 'Unassigned'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => showAssignDialog(report.id)}
                    variant="secondary"
                    disabled={actionLoading[report.id]}
                    data-testid={`assign-button-${report.id}`}
                  >
                    Assign
                  </Button>
                  <Button
                    onClick={() => handleReportAction(report.id, 'markInProgress')}
                    variant="secondary"
                    disabled={actionLoading[report.id] || report.status === 'In Progress'}
                    data-testid={`progress-button-${report.id}`}
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    onClick={() => handleReportAction(report.id, 'markResolved')}
                    variant="secondary"
                    disabled={actionLoading[report.id] || report.status === 'Resolved'}
                    data-testid={`resolve-button-${report.id}`}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    onClick={() => navigate(`/reports/${report.id}`)}
                    variant="secondary"
                    data-testid={`view-button-${report.id}`}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                variant="secondary"
                data-testid="prev-page"
              >
                Previous
              </Button>
              <span className="text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                variant="secondary"
                data-testid="next-page"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogConfig.title}
      >
        {dialogConfig.content}
      </Dialog>
    </div>
  );
}

// Utility functions for status and priority colors
function getStatusColor(status) {
  switch (status) {
    case 'New': return 'text-blue-600';
    case 'In Progress': return 'text-yellow-600';
    case 'Resolved': return 'text-green-600';
    case 'Closed': return 'text-gray-600';
    default: return 'text-gray-600';
  }
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'Low': return 'text-green-600';
    case 'Medium': return 'text-yellow-600';
    case 'High': return 'text-orange-600';
    case 'Urgent': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Dialog from '../components/ui/Dialog';
import MapPicker from '../components/MapPicker';
import VoiceRecorder from '../components/VoiceRecorder';

export default function ReportForm({ auth }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: null,
    photo: null,
    voiceNote: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // File validation
  const validateFile = (file, type) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }
    if (type === 'photo') {
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image (JPEG, PNG, etc.)');
      }
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    try {
      const file = e.target.files[0];
      if (file) {
        validateFile(file, 'photo');
        setFormData(prev => ({ ...prev, photo: file }));
        setError('');
      }
    } catch (err) {
      setError(err.message);
      e.target.value = ''; // Reset input
    }
  };

  // Handle location selection
  const handleLocationSelect = (location) => {
    setFormData(prev => ({ ...prev, location }));
    setShowLocationPicker(false);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadProgress(0);

    // Validate required fields
    if (!formData.title.trim()) {
      setError('Please enter a title');
      setLoading(false);
      return;
    }

    if (!formData.location) {
      setError('Please select a location');
      setLoading(false);
      return;
    }

    try {
      const formPayload = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          if (key === 'location') {
            formPayload.append(key, JSON.stringify(formData[key]));
          } else {
            formPayload.append(key, formData[key]);
          }
        }
      });

      const xhr = new XMLHttpRequest();
      const promise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded * 100) / e.total);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      });

      xhr.open('POST', '/api/reports');
      xhr.withCredentials = true;
      xhr.send(formPayload);

      await promise;
      navigate('/my-reports');
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Submit New Report</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          required
          placeholder="Brief description of the issue"
          data-testid="report-title"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Detailed description of the issue"
            data-testid="report-description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            data-testid="photo-input"
          />
          <div className="flex items-center space-x-4">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              data-testid="upload-photo-button"
            >
              {formData.photo ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {formData.photo && (
              <span className="text-sm text-gray-600">
                Selected: {formData.photo.name}
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <div className="flex items-center space-x-4">
            <Button
              type="button"
              onClick={() => setShowLocationPicker(true)}
              variant="secondary"
              data-testid="select-location-button"
            >
              {formData.location ? 'Change Location' : 'Select Location'}
            </Button>
            {formData.location && (
              <span className="text-sm text-gray-600">
                Selected: {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
              </span>
            )}
          </div>
        </div>

        {uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          data-testid="submit-report"
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </Button>
      </form>

      <Dialog
        open={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        title="Select Location"
      >
        <div className="p-4">
          <MapPicker
            selected={formData.location}
            onChange={handleLocationSelect}
          />
        </div>
      </Dialog>
    </Card>
  );
}

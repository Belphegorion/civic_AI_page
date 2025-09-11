import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // Added missing import
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog'; // Corrected to named import
import MapPicker from '../components/MapPicker';
import VoiceRecorder from '../components/VoiceRecorder';

const reportCategories = [
  'pothole','streetlight','trash','graffiti','water_leak','tree_hazard',
  'sidewalk','traffic_signal','noise','parking','animal_control','public_safety','other'
];

export default function ReportForm({ auth }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other', // Default category
    location: null,
    photo: null,
    voiceNote: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const validateFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image (JPEG, PNG, etc.)');
    }
  };

  const handleFileChange = (e) => {
    try {
      const file = e.target.files[0];
      if (file) {
        validateFile(file);
        setFormData(prev => ({ ...prev, photo: file }));
        setError('');
      }
    } catch (err) {
      setError(err.message);
      e.target.value = '';
    }
  };

  const handleLocationSelect = (location) => {
    setFormData(prev => ({ ...prev, location }));
    setShowLocationPicker(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadProgress(0);

    if (!formData.title.trim() || !formData.category || !formData.location) {
      setError('Please fill out the title, category, and location.');
      setLoading(false);
      return;
    }

    try {
      const formPayload = new FormData();
      formPayload.append('title', formData.title);
      formPayload.append('description', formData.description);
      formPayload.append('category', formData.category);
      formPayload.append('lat', formData.location.lat);
      formPayload.append('lng', formData.location.lng);
      if (formData.photo) {
        formPayload.append('images', formData.photo);
      }
      if (formData.voiceNote) {
        formPayload.append('audio', formData.voiceNote);
      }

      const config = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      await api.post('/reports', formPayload, config);
      navigate('/my-reports');

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.errors?.[0]?.msg || err.message || 'Failed to submit report';
      setError(errorMsg);
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
          placeholder="e.g., Large pothole on Main St"
        />

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full border rounded-md px-3 py-2 bg-white"
          >
            {reportCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

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
            placeholder="Provide details about the issue, location, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo
          </label>
          <div className="flex items-center space-x-4">
            <Button type="button" onClick={() => fileInputRef.current?.click()} variant="secondary">
              {formData.photo ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {formData.photo && <span className="text-sm text-gray-600">{formData.photo.name}</span>}
          </div>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <div className="flex items-center space-x-4">
            <Button type="button" onClick={() => setShowLocationPicker(true)} variant="secondary">
              {formData.location ? 'Change Location' : 'Select Location'}
            </Button>
            {formData.location && <span className="text-sm text-gray-600">Selected: {formData.location.lat.toFixed(4)}, {formData.location.lng.toFixed(4)}</span>}
          </div>
        </div>

        {uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? `Submitting... ${uploadProgress}%` : 'Submit Report'}
        </Button>
      </form>

      <Dialog open={showLocationPicker} onClose={() => setShowLocationPicker(false)} title="Select Location">
        <div className="p-4">
          <MapPicker selected={formData.location} onChange={handleLocationSelect} />
        </div>
      </Dialog>
    </Card>
  );
}

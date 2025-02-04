import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Hospital {
  id: string;
  name: string;
}

interface IncidentType {
  id: string;
  name: string;
}

export default function DriverDashboard() {
  const [numberOfPersonsInjured, setNumberOfPersonsInjured] = useState('');
  const [stateOfConsciousness, setStateOfConsciousness] = useState('');
  const [location, setLocation] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('submit');
  const [requestStatus, setRequestStatus] = useState<any>(null);

  const hospitals: Record<string, Hospital[]> = {
    'Banashankari': [
      { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Sagar Hospitals' },
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Fortis Hospital' }
    ]
  };

  const incidentTypes: IncidentType[] = [
    { id: 'accident', name: 'Accident' },
    { id: 'fire', name: 'Fire' },
    { id: 'natural_disaster', name: 'Natural Disaster' },
    { id: 'medical', name: 'Medical Emergency' }
  ];

  const fetchRequestStatus = async () => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('form_submissions')
        .select('*, hospitals(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setRequestStatus(data[0]);
      } else {
        setRequestStatus(null);
      }
    } catch (err) {
      console.error('Error fetching request status:', err);
      setError('Failed to fetch request status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    if (!selectedHospital || !incidentType) {
      setError('Please select a hospital and type of incident');
      setLoading(false);
      return;
    }

    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        console.error('User not authenticated');
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const { data, error: submitError } = await supabase
        .from('form_submissions')
        .insert([
          {
            numberOfPersonsInjured,
            stateOfConsciousness,
            location,
            hospital_id: selectedHospital,
            hospital_name: hospitals[location].find(hospital => hospital.id === selectedHospital)?.name,
            user_id: userId,
            incident_type: incidentType,
            status: 'Pending',
          }
        ]);

      if (submitError) {
        console.error(submitError);
        setError('Failed to submit form. Please try again.');
        setLoading(false);
        return;
      }

      console.log('Form submitted successfully:', data);
      setSuccessMessage('Request sent successfully! Status: Pending');
      setNumberOfPersonsInjured('');
      setStateOfConsciousness('');
      setLocation('');
      setSelectedHospital('');
      setIncidentType('');
      setActiveTab('status');
      fetchRequestStatus();
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Failed to submit form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'status') {
      fetchRequestStatus();
    }
  }, [activeTab]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return '✅';
      case 'rejected':
        return '❌';
      case 'pending':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md">
        <div className="p-6">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('submit')}
              className={`py-2 px-4 rounded-md ${activeTab === 'submit' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Submit Request
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`py-2 px-4 rounded-md ${activeTab === 'status' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Check Request Status
            </button>
          </div>

          {activeTab === 'submit' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Submit Request</h1>

              {error && <div className="mb-4 text-red-700">{error}</div>}
              {successMessage && <div className="mb-4 text-green-700">{successMessage}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Number of Persons Injured</label>
                  <input
                    type="number"
                    value={numberOfPersonsInjured}
                    onChange={(e) => setNumberOfPersonsInjured(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">State of Consciousness</label>
                  <select
                    value={stateOfConsciousness}
                    onChange={(e) => setStateOfConsciousness(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select State of Consciousness</option>
                    <option value="conscious">Conscious</option>
                    <option value="semi_conscious">Semi-Conscious</option>
                    <option value="unconscious">Unconscious</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Type of Incident</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Incident Type</option>
                    {incidentTypes.map((incident) => (
                      <option key={incident.id} value={incident.id}>
                        {incident.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <select
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setSelectedHospital('');
                    }}
                    className="mt-1 block w-full border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Location</option>
                    {Object.keys(hospitals).map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Select Hospital</label>
                    <select
                      value={selectedHospital}
                      onChange={(e) => setSelectedHospital(e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select Hospital</option>
                      {hospitals[location]?.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md disabled:bg-gray-300"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'status' && requestStatus && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Request Status</h1>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Status:</h3>
                  <p className={`text-lg ${getStatusColor(requestStatus.status)}`}>
                    {getStatusIcon(requestStatus.status)} {requestStatus.status}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium">Hospital:</h3>
                  <p className="text-lg">{requestStatus.hospitals?.name || 'Not available'}</p>
                </div>

                <div>
                  <h3 className="font-medium">Incident Type:</h3>
                  <p className="text-lg">{requestStatus.incident_type}</p>
                </div>

                <div>
                  <h3 className="font-medium">Location:</h3>
                  <p className="text-lg">{requestStatus.location}</p>
                </div>

                {requestStatus.status === 'Accepted' && (
                  <div>
                    <a
                      href="https://maps.app.goo.gl/sg7GZJnKcw4kuL6aA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 underline"
                    >
                      Navigate to Hospital 🚑
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
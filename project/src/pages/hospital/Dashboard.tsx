import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface FormSubmission {
  id: string;
  numberOfPersonsInjured: string;
  stateOfConsciousness: string;
  location: string;
  incident_type: string;
  created_at: string;
  status: string;
}

export default function HospitalDashboard() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubmissions();

    const subscription = supabase
      .channel('form_submissions_channel')
      .on(
        'postgres_changes',
        { event: ['INSERT', 'UPDATE'], schema: 'public', table: 'form_submissions' },
        (payload) => {
          console.log('Realtime update received:', payload.new);

          setSubmissions((prev) => {
            const updatedData = payload.new as FormSubmission;
            const existingIndex = prev.findIndex((submission) => submission.id === updatedData.id);

            if (existingIndex !== -1) {
              const updatedSubmissions = [...prev];
              updatedSubmissions[existingIndex] = updatedData;
              return updatedSubmissions;
            } else {
              return [updatedData, ...prev];
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      console.log('Fetched submissions:', data);
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (id: string, status: 'Accepted' | 'Rejected') => {
    try {
      const { error } = await supabase
        .from('form_submissions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setSubmissions((prev) =>
        prev.map((submission) =>
          submission.id === id ? { ...submission, status } : submission
        )
      );
    } catch (err) {
      console.error(`Error ${status.toLowerCase()}ing submission:`, err);
      setError(`Failed to ${status.toLowerCase()} submission`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">Accepted</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">Rejected</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">Pending</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Hospital Dashboard</h1>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading submissions...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <p className="text-center text-gray-600 py-4">No submissions found.</p>
              ) : (
                submissions.map((submission) => (
                  <div key={submission.id} className="bg-white p-6 border rounded-lg shadow-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Emergency Details</h3>
                        <div className="mt-2 space-y-2">
                          <p><span className="font-medium">Location:</span> {submission.location}</p>
                          <p><span className="font-medium">Incident Type:</span> {submission.incident_type}</p>
                          <p><span className="font-medium">Persons Injured:</span> {submission.numberOfPersonsInjured || 'Not provided'}</p>
                          <p><span className="font-medium">Consciousness:</span> {submission.stateOfConsciousness || 'Not provided'}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">Status</h3>
                            <div className="mt-2">{getStatusBadge(submission.status)}</div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(submission.created_at).toLocaleString()}
                          </div>
                        </div>
                        {submission.status.toLowerCase() === 'pending' && (
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => updateSubmissionStatus(submission.id, 'Accepted')}
                              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateSubmissionStatus(submission.id, 'Rejected')}
                              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
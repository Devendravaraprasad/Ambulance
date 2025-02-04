import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Add error state

  useEffect(() => {
    // Try to get session on mount
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error; // Handle errors when fetching the session
        setSession(session);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to fetch session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession(); // Fetch session

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Cleanup on unmount
    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, error }; // Return error state as well
}

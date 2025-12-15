import React, { createContext, useContext, useEffect, useState } from 'react';
import { Trip } from '@/types/trip';
import { supabase } from '@/lib/supabase';

interface TripContextValue {
  currentTrip: Trip | null;
  setCurrentTrip: (trip: Trip | null) => void;
  trips: Trip[];
  loading: boolean;
  refreshTrips: () => Promise<void>;
}

const TripContext = createContext<TripContextValue | undefined>(undefined);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTrips();
  }, []);

  const value = {
    currentTrip,
    setCurrentTrip,
    trips,
    loading,
    refreshTrips,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}
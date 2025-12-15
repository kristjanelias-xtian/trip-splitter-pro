import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SettlementForm } from '@/components/SettlementForm';
import { useTrip } from '@/contexts/TripContext';
import { Settlement } from '@/types/settlement';
import { Participant } from '@/types/participant';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Calendar, DollarSign, FileText, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTrip } = useTrip();
  const { toast } = useToast();

  useEffect(() => {
    if (currentTrip) {
      fetchData();
    }
  }, [currentTrip]);

  const fetchData = async () => {
    if (!currentTrip) return;

    try {
      setLoading(true);
      
      // Fetch settlements
      const { data: settlementsData, error: settlementsError } = await supabase
        .from('settlements')
        .select(`
          *,
          from_participant:participants!settlements_from_participant_id_fkey(id, name, family_id),
          to_participant:participants!settlements_to_participant_id_fkey(id, name, family_id)
        `)
        .eq('trip_id', currentTrip.id)
        .order('settlement_date', { ascending: false });

      if (settlementsError) throw settlementsError;
      
      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('trip_id', currentTrip.id)
        .order('name');

      if (participantsError) throw participantsError;
      
      setSettlements(settlementsData || []);
      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load settlements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettlementAdded = (newSettlement: Settlement) => {
    setSettlements(prev => [newSettlement, ...prev]);
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm('Are you sure you want to delete this settlement?')) return;

    try {
      const { error } = await supabase
        .from('settlements')
        .delete()
        .eq('id', settlementId);

      if (error) throw error;

      setSettlements(prev => prev.filter(s => s.id !== settlementId));
      toast({
        title: "Success",
        description: "Settlement deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting settlement:', error);
      toast({
        title: "Error",
        description: "Failed to delete settlement",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Trip Selected</h2>
          <p className="text-gray-600">Please select a trip to view settlements.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
          <p className="text-gray-600 mt-1">
            Track payments between participants
          </p>
        </div>
        {participants.length > 1 && (
          <SettlementForm
            participants={participants}
            onSettlementAdded={handleSettlementAdded}
          />
        )}
      </div>

      {participants.length <= 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-6">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add Participants
              </h3>
              <p className="text-gray-600 mb-4">
                You need at least 2 participants to record settlements.
              </p>
              <Button variant="outline">
                Manage Participants
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {settlements.length === 0 && participants.length > 1 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-6">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Settlements Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Record payments between participants to keep track of who owes what.
              </p>
              <SettlementForm
                participants={participants}
                onSettlementAdded={handleSettlementAdded}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {settlements.map((settlement) => (
            <Card key={settlement.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${settlement.amount.toFixed(2)}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(settlement.settlement_date)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 text-lg font-medium mb-2">
                      <span className="text-gray-900">
                        {settlement.from_participant.name}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">
                        {settlement.to_participant.name}
                      </span>
                    </div>
                    
                    {settlement.description && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>{settlement.description}</p>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSettlement(settlement.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settlement Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              <p>Total settlements recorded: <strong>{settlements.length}</strong></p>
              <p>Total amount settled: <strong>${settlements.reduce((sum, s) => sum + s.amount, 0).toFixed(2)}</strong></p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
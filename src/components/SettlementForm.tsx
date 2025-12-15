import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useTrip } from '@/contexts/TripContext';
import { Settlement } from '@/types/settlement';
import { Participant } from '@/types/participant';
import { supabase } from '@/lib/supabase';
import { PlusCircle } from 'lucide-react';

interface SettlementFormProps {
  participants: Participant[];
  onSettlementAdded: (settlement: Settlement) => void;
}

export function SettlementForm({ participants, onSettlementAdded }: SettlementFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    from_participant_id: '',
    to_participant_id: '',
    amount: '',
    description: '',
    settlement_date: new Date().toISOString().split('T')[0]
  });
  
  const { currentTrip } = useTrip();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTrip) {
      toast({
        title: "Error",
        description: "No trip selected",
        variant: "destructive"
      });
      return;
    }

    if (formData.from_participant_id === formData.to_participant_id) {
      toast({
        title: "Error",
        description: "Cannot settle with the same participant",
        variant: "destructive"
      });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('settlements')
        .insert({
          trip_id: currentTrip.id,
          from_participant_id: formData.from_participant_id,
          to_participant_id: formData.to_participant_id,
          amount: parseFloat(formData.amount),
          description: formData.description.trim() || null,
          settlement_date: formData.settlement_date
        })
        .select(`
          *,
          from_participant:participants!settlements_from_participant_id_fkey(id, name, family_id),
          to_participant:participants!settlements_to_participant_id_fkey(id, name, family_id)
        `)
        .single();

      if (error) {
        console.error('Error creating settlement:', error);
        throw error;
      }

      onSettlementAdded(data);
      
      // Reset form
      setFormData({
        from_participant_id: '',
        to_participant_id: '',
        amount: '',
        description: '',
        settlement_date: new Date().toISOString().split('T')[0]
      });
      
      setOpen(false);
      
      toast({
        title: "Success",
        description: "Settlement recorded successfully"
      });
    } catch (error) {
      console.error('Error creating settlement:', error);
      toast({
        title: "Error",
        description: "Failed to record settlement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fromParticipant = participants.find(p => p.id === formData.from_participant_id);
  const toParticipant = participants.find(p => p.id === formData.to_participant_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          Record Settlement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Settlement</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from_participant">From</Label>
            <Select
              value={formData.from_participant_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, from_participant_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select who paid" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to_participant">To</Label>
            <Select
              value={formData.to_participant_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, to_participant_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select who received" />
              </SelectTrigger>
              <SelectContent>
                {participants
                  .filter(p => p.id !== formData.from_participant_id)
                  .map((participant) => (
                    <SelectItem key={participant.id} value={participant.id}>
                      {participant.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settlement_date">Date</Label>
            <Input
              id="settlement_date"
              type="date"
              value={formData.settlement_date}
              onChange={(e) => setFormData(prev => ({ ...prev, settlement_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="e.g., Venmo payment for dinner"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          {fromParticipant && toParticipant && formData.amount && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <strong>{fromParticipant.name}</strong> paid <strong>${parseFloat(formData.amount).toFixed(2)}</strong> to <strong>{toParticipant.name}</strong>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.from_participant_id || !formData.to_participant_id || !formData.amount}
              className="flex-1"
            >
              {loading ? 'Recording...' : 'Record Settlement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
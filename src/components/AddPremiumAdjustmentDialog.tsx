import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AddPremiumAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSuccess: () => void;
}

export const AddPremiumAdjustmentDialog: React.FC<AddPremiumAdjustmentDialogProps> = ({
  open,
  onOpenChange,
  employee,
  onSuccess
}) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee) return;
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }

    if (!reason.trim()) {
      toast.error('Bitte geben Sie einen Grund für die Prämie ein');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('premium_adjustments')
        .insert({
          employee_id: employee.id,
          amount: parseFloat(amount),
          reason: reason.trim(),
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error('Error adding premium adjustment:', error);
        toast.error('Fehler beim Hinzufügen der Prämie');
        return;
      }

      toast.success(`Prämie von €${amount} für ${employee.first_name} ${employee.last_name} hinzugefügt`);
      setAmount('');
      setReason('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding premium adjustment:', error);
      toast.error('Fehler beim Hinzufügen der Prämie');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Prämie hinzufügen für {employee?.first_name} {employee?.last_name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Betrag (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Grund für die Prämie</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="z.B. Bonus für außergewöhnliche Leistung, Weihnachtsprämie..."
              rows={3}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Hinzufügen...
                </>
              ) : (
                'Prämie hinzufügen'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
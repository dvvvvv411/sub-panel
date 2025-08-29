
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  const [isOrderRelated, setIsOrderRelated] = useState(false);
  const [orderTitle, setOrderTitle] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderProvider, setOrderProvider] = useState('');
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

    if (isOrderRelated) {
      if (!orderTitle.trim()) {
        toast.error('Bitte geben Sie einen Auftragstitel ein');
        return;
      }
      if (!orderNumber.trim()) {
        toast.error('Bitte geben Sie eine Auftragsnummer ein');
        return;
      }
      if (!orderProvider.trim()) {
        toast.error('Bitte geben Sie einen Anbieter ein');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('premium_adjustments')
        .insert({
          employee_id: employee.id,
          amount: parseFloat(amount),
          reason: reason.trim(),
          is_order_related: isOrderRelated,
          order_title: isOrderRelated ? orderTitle.trim() : null,
          order_number: isOrderRelated ? orderNumber.trim() : null,
          order_provider: isOrderRelated ? orderProvider.trim() : null,
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
      setIsOrderRelated(false);
      setOrderTitle('');
      setOrderNumber('');
      setOrderProvider('');
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

          <div className="flex items-center space-x-2">
            <Switch
              id="order-related"
              checked={isOrderRelated}
              onCheckedChange={setIsOrderRelated}
            />
            <Label htmlFor="order-related">Prämie für Auftrag</Label>
          </div>

          {isOrderRelated && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="order-title">Auftragstitel</Label>
                <Input
                  id="order-title"
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  placeholder="z.B. App-Test für Platzhalter"
                  required={isOrderRelated}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="order-number">Auftragsnummer</Label>
                <Input
                  id="order-number"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="z.B. #157425"
                  required={isOrderRelated}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="order-provider">Anbieter</Label>
                <Input
                  id="order-provider"
                  value={orderProvider}
                  onChange={(e) => setOrderProvider(e.target.value)}
                  placeholder="z.B. BBVA"
                  required={isOrderRelated}
                />
              </div>
            </div>
          )}

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

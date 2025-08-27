
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Minus, DollarSign } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface PremiumAdjustmentDialogProps {
  employee: Employee;
  onAdjustmentAdded: () => void;
}

export const PremiumAdjustmentDialog: React.FC<PremiumAdjustmentDialogProps> = ({ employee, onAdjustmentAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isPositive, setIsPositive] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }

    if (!reason.trim()) {
      toast.error('Bitte geben Sie einen Grund für die Anpassung an');
      return;
    }

    setLoading(true);
    
    try {
      const finalAmount = isPositive ? numericAmount : -numericAmount;
      
      const { error } = await supabase
        .from('premium_adjustments')
        .insert([{
          employee_id: employee.id,
          amount: finalAmount,
          reason: reason.trim(),
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) {
        console.error('Error creating premium adjustment:', error);
        toast.error('Fehler beim Erstellen der Prämien-Anpassung');
        return;
      }

      toast.success(`Prämien-Anpassung von €${Math.abs(finalAmount).toFixed(2)} ${isPositive ? 'hinzugefügt' : 'abgezogen'}`);
      onAdjustmentAdded();
      setIsOpen(false);
      setAmount('');
      setReason('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DollarSign className="h-4 w-4 mr-2" />
          Prämien anpassen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Prämien-Anpassung für {employee.first_name} {employee.last_name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Art der Anpassung</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isPositive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPositive(true)}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Hinzufügen
              </Button>
              <Button
                type="button"
                variant={!isPositive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPositive(false)}
                className="flex-1"
              >
                <Minus className="h-4 w-4 mr-1" />
                Abziehen
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Betrag (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Grund für die Anpassung</Label>
            <Textarea
              id="reason"
              placeholder="z.B. Bonus für außergewöhnliche Leistung, Korrektur eines Fehlers..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          {amount && reason && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Vorschau:</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isPositive ? "default" : "destructive"}>
                  {isPositive ? '+' : '-'}€{parseFloat(amount || '0').toFixed(2)}
                </Badge>
                <span className="text-sm text-muted-foreground">{reason}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Speichert...' : 'Anpassung speichern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

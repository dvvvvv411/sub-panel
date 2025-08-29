
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CreateEmployeeDialogProps {
  onEmployeeCreated: () => void;
}

export const CreateEmployeeDialog: React.FC<CreateEmployeeDialogProps> = ({
  onEmployeeCreated
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [skipAV, setSkipAV] = useState(false);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setPostalCode('');
    setCity('');
    setEmploymentType('');
    setSkipAV(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !email) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    if (skipAV && (!address || !postalCode || !city)) {
      toast.error('Bei übersprungenen AV sind Adresse, PLZ und Stadt erforderlich');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || null,
          address: skipAV ? address : null,
          postal_code: skipAV ? postalCode : null,
          city: skipAV ? city : null,
          employment_type: employmentType || null,
          status: skipAV ? 'active' : 'imported'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating employee:', error);
        toast.error('Fehler beim Erstellen des Mitarbeiters');
        return;
      }

      console.log('Employee created:', data);
      toast.success(`Mitarbeiter ${firstName} ${lastName} wurde erfolgreich erstellt`);
      
      onEmployeeCreated();
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Mitarbeiter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Neuen Mitarbeiter erstellen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Vorname *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nachname *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">E-Mail *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="employmentType">Art der Beschäftigung</Label>
            <Select value={employmentType} onValueChange={setEmploymentType}>
              <SelectTrigger>
                <SelectValue placeholder="Bitte wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vollzeit">Vollzeit</SelectItem>
                <SelectItem value="teilzeit">Teilzeit</SelectItem>
                <SelectItem value="minijob">Minijob</SelectItem>
                <SelectItem value="werkstudent">Werkstudent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="skipAV"
              checked={skipAV}
              onCheckedChange={setSkipAV}
            />
            <Label htmlFor="skipAV">AV überspringen (Mitarbeiter direkt aktiv setzen)</Label>
          </div>

          {skipAV && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <Label htmlFor="address">Adresse + Hausnummer *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="z.B. Musterstraße 15"
                  required={skipAV}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">PLZ *</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="12345"
                    required={skipAV}
                  />
                </div>
                <div>
                  <Label htmlFor="city">Stadt *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Musterstadt"
                    required={skipAV}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstellen...
                </>
              ) : (
                'Erstellen'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

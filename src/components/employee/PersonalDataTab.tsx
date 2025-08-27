import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PersonalDataTabProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    status: string;
  };
  onUpdate: () => Promise<void>;
}

export const PersonalDataTab: React.FC<PersonalDataTabProps> = ({ employee, onUpdate }) => {
  const [firstName, setFirstName] = useState(employee.first_name);
  const [lastName, setLastName] = useState(employee.last_name);
  const [email, setEmail] = useState(employee.email);
  const [phone, setPhone] = useState(employee.phone || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    setFirstName(employee.first_name);
    setLastName(employee.last_name);
    setEmail(employee.email);
    setPhone(employee.phone || '');
  }, [employee]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setUpdateSuccess(null);

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone === '' ? null : phone,
        })
        .eq('id', employee.id);

      if (error) {
        console.error('Error updating employee data:', error);
        toast.error('Fehler beim Aktualisieren der Daten');
        setUpdateSuccess(false);
      } else {
        toast.success('Daten erfolgreich aktualisiert');
        setUpdateSuccess(true);
        await onUpdate(); // Refresh data in parent component
      }
    } catch (error) {
      console.error('Error updating employee data:', error);
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
      setUpdateSuccess(false);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Persönliche Daten bearbeiten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled // Email is not editable
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefonnummer</Label>
            <Input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleUpdate} disabled={isUpdating}>
        {isUpdating ? 'Aktualisiert...' : 'Daten aktualisieren'}
      </Button>

      {updateSuccess === true && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          Daten erfolgreich aktualisiert!
        </div>
      )}

      {updateSuccess === false && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <XCircle className="h-4 w-4" />
          Fehler beim Aktualisieren der Daten. Bitte versuchen Sie es erneut.
        </div>
      )}

      {updateSuccess === null && isUpdating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 animate-pulse" />
          Aktualisiere Daten...
        </div>
      )}
    </div>
  );
};

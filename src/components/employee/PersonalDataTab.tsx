
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BankCardPreview } from './BankCardPreview';
import { PasswordChangeDialog } from './PasswordChangeDialog';

interface PersonalDataTabProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    status: string;
  };
  onUpdate: () => Promise<void>;
}

export const PersonalDataTab: React.FC<PersonalDataTabProps> = ({ employee, onUpdate }) => {
  const [firstName, setFirstName] = useState(employee.first_name);
  const [lastName, setLastName] = useState(employee.last_name);
  const [email, setEmail] = useState(employee.email);
  const [phone, setPhone] = useState(employee.phone || '');
  const [address, setAddress] = useState(employee.address || '');
  const [postalCode, setPostalCode] = useState(employee.postal_code || '');
  const [city, setCity] = useState(employee.city || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);
  
  // Bank details state
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [isBankUpdating, setIsBankUpdating] = useState(false);
  const [bankUpdateSuccess, setBankUpdateSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    setFirstName(employee.first_name);
    setLastName(employee.last_name);
    setEmail(employee.email);
    setPhone(employee.phone || '');
    setAddress(employee.address || '');
    setPostalCode(employee.postal_code || '');
    setCity(employee.city || '');
    fetchBankDetails();
  }, [employee]);

  const fetchBankDetails = async () => {
    try {
      // First try to get existing bank details
      const { data: bankDetails, error: bankError } = await supabase
        .from('employee_bank_details')
        .select('*')
        .eq('employee_id', employee.id)
        .maybeSingle();

      if (bankError && bankError.code !== 'PGRST116') {
        console.error('Error fetching bank details:', bankError);
        return;
      }

      if (bankDetails) {
        setBankName(bankDetails.bank_name || '');
        setAccountHolder(bankDetails.account_holder || '');
        setIban(bankDetails.iban || '');
        setBic(bankDetails.bic || '');
      } else {
        // If no bank details exist, try to get them from contract submission
        const { data: contractData, error: contractError } = await supabase
          .from('employment_contract_submissions')
          .select('bank_name, iban, bic, first_name, last_name')
          .eq('employee_id', employee.id)
          .maybeSingle();

        if (contractError && contractError.code !== 'PGRST116') {
          console.error('Error fetching contract data:', contractError);
          return;
        }

        if (contractData) {
          setBankName(contractData.bank_name || '');
          setAccountHolder(`${contractData.first_name} ${contractData.last_name}`);
          setIban(contractData.iban || '');
          setBic(contractData.bic || '');
        }
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
    }
  };

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
          address: address === '' ? null : address,
          postal_code: postalCode === '' ? null : postalCode,
          city: city === '' ? null : city,
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

  const handleBankUpdate = async () => {
    setIsBankUpdating(true);
    setBankUpdateSuccess(null);

    try {
      // Check if bank details already exist
      const { data: existingDetails } = await supabase
        .from('employee_bank_details')
        .select('id')
        .eq('employee_id', employee.id)
        .maybeSingle();

      const bankData = {
        employee_id: employee.id,
        bank_name: bankName === '' ? null : bankName,
        account_holder: accountHolder === '' ? null : accountHolder,
        iban: iban === '' ? null : iban,
        bic: bic === '' ? null : bic,
      };

      let error;
      if (existingDetails) {
        // Update existing record
        const result = await supabase
          .from('employee_bank_details')
          .update(bankData)
          .eq('employee_id', employee.id);
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from('employee_bank_details')
          .insert(bankData);
        error = result.error;
      }

      if (error) {
        console.error('Error updating bank details:', error);
        toast.error('Fehler beim Aktualisieren der Bankdaten');
        setBankUpdateSuccess(false);
      } else {
        toast.success('Bankdaten erfolgreich aktualisiert');
        setBankUpdateSuccess(true);
      }
    } catch (error) {
      console.error('Error updating bank details:', error);
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
      setBankUpdateSuccess(false);
    } finally {
      setIsBankUpdating(false);
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
          
          <div>
            <Label htmlFor="address">Adresse + Hausnummer</Label>
            <Input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="z.B. Musterstraße 15"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postalCode">Postleitzahl</Label>
              <Input
                type="text"
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="12345"
              />
            </div>
            <div>
              <Label htmlFor="city">Stadt</Label>
              <Input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Musterstadt"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleUpdate} disabled={isUpdating} className="flex-1">
          {isUpdating ? 'Aktualisiert...' : 'Daten aktualisieren'}
        </Button>
        <PasswordChangeDialog userEmail={email} />
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Bankverbindung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <BankCardPreview
            bankName={bankName}
            accountHolder={accountHolder}
            iban={iban}
          />
          
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankName">Bank</Label>
                <Input
                  type="text"
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="z.B. Deutsche Bank"
                />
              </div>
              <div>
                <Label htmlFor="accountHolder">Kontoinhaber</Label>
                <Input
                  type="text"
                  id="accountHolder"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Vollständiger Name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                type="text"
                id="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
                placeholder="DE89 3704 0044 0532 0130 00"
              />
            </div>
            <div>
              <Label htmlFor="bic">BIC</Label>
              <Input
                type="text"
                id="bic"
                value={bic}
                onChange={(e) => setBic(e.target.value.toUpperCase())}
                placeholder="COBADEFFXXX"
              />
            </div>
          </div>

          <Button onClick={handleBankUpdate} disabled={isBankUpdating} className="w-full">
            {isBankUpdating ? 'Aktualisiert...' : 'Bankdaten aktualisieren'}
          </Button>

          {bankUpdateSuccess === true && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Bankdaten erfolgreich aktualisiert!
            </div>
          )}

          {bankUpdateSuccess === false && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              Fehler beim Aktualisieren der Bankdaten. Bitte versuchen Sie es erneut.
            </div>
          )}

          {bankUpdateSuccess === null && isBankUpdating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 animate-pulse" />
              Aktualisiere Bankdaten...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

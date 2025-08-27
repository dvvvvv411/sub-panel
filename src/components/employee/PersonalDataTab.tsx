import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Mail, Phone, Calendar, Edit3, Save, X, Lock, CreditCard, Eye, EyeOff, Square } from 'lucide-react';

interface PersonalDataTabProps {
  user: any;
}

export const PersonalDataTab: React.FC<PersonalDataTabProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    position: user?.position || 'Mitarbeiter'
  });

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Bank information state
  const [bankEditing, setBankEditing] = useState(false);
  const [bankData, setBankData] = useState({
    iban: '',
    bic: '',
    bankName: '',
    accountHolder: user?.name || ''
  });
  const [bankLoading, setBankLoading] = useState(true);

  // Load bank data from employment_contract_submissions
  useEffect(() => {
    fetchBankData();
  }, [user?.email]);

  const fetchBankData = async () => {
    if (!user?.email) return;

    try {
      setBankLoading(true);
      console.log('Fetching bank data for user:', user.email);
      
      // First find the employee record using the email
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        toast.error('Fehler beim Abrufen der Mitarbeiterdaten: ' + employeeError.message);
        return;
      }

      if (!employeeData) {
        console.log('No employee record found for user');
        setBankData({
          iban: '',
          bic: '',
          bankName: '',
          accountHolder: user?.name || ''
        });
        return;
      }

      console.log('Employee ID:', employeeData.id);

      // Get the LATEST bank data from contract submissions for this employee
      const { data: submissionData, error: submissionError } = await supabase
        .from('employment_contract_submissions')
        .select('iban, bic, bank_name, first_name, last_name')
        .eq('employee_id', employeeData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (submissionError) {
        console.error('Error fetching bank data:', submissionError);
        toast.error('Fehler beim Abrufen der Bankdaten: ' + submissionError.message);
        return;
      }

      console.log('Fetched bank data:', submissionData);

      if (submissionData) {
        setBankData({
          iban: submissionData.iban || '',
          bic: submissionData.bic || '',
          bankName: submissionData.bank_name || '',
          accountHolder: `${submissionData.first_name} ${submissionData.last_name}` || user?.name || ''
        });
        console.log('Updated bank data state');
      } else {
        console.log('No bank submission data found for user');
        setBankData({
          iban: '',
          bic: '',
          bankName: '',
          accountHolder: user?.name || ''
        });
      }
    } catch (error) {
      console.error('Error fetching bank data:', error);
      toast.error('Fehler beim Laden der Bankdaten');
    } finally {
      setBankLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Here you would save to database - for now just console log
      console.log('Saving user data:', editedData);
      toast.success('Profil erfolgreich aktualisiert');
      setIsEditing(false);
    } catch (error) {
      toast.error('Fehler beim Speichern der Daten');
    }
  };

  const handleBankSave = async () => {
    try {
      console.log('Saving bank data:', bankData);
      
      // First find the employee record using the email
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (employeeError || !employeeData) {
        console.error('Error fetching employee data:', employeeError);
        toast.error('Fehler beim Abrufen der Mitarbeiterdaten');
        return;
      }

      // Update employment_contract_submissions
      const { error: updateError } = await supabase
        .from('employment_contract_submissions')
        .update({
          iban: bankData.iban,
          bic: bankData.bic,
          bank_name: bankData.bankName
        })
        .eq('employee_id', employeeData.id);

      if (updateError) {
        console.error('Error updating bank data:', updateError);
        toast.error('Fehler beim Speichern der Bankdaten: ' + updateError.message);
        return;
      }

      toast.success('Bankdaten erfolgreich aktualisiert');
      setBankEditing(false);
      // Refresh the data to show the changes
      fetchBankData();
    } catch (error) {
      console.error('Error saving bank data:', error);
      toast.error('Fehler beim Speichern der Bankdaten');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Die neuen Passwörter stimmen nicht überein');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Das neue Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        toast.error('Fehler beim Ändern des Passworts: ' + error.message);
        return;
      }

      toast.success('Passwort erfolgreich geändert');
      setPasswordDialogOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error('Fehler beim Ändern des Passworts');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      position: user?.position || 'Mitarbeiter'
    });
    setIsEditing(false);
  };

  const handleBankCancel = () => {
    fetchBankData(); // Reload original data
    setBankEditing(false);
  };

  const formatIban = (iban: string) => {
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  const maskIban = (iban: string) => {
    if (!iban) return '';
    const cleaned = iban.replace(/\s/g, '');
    if (cleaned.length <= 8) return formatIban(cleaned);
    return formatIban(cleaned.substring(0, 4) + '••••••••••••' + cleaned.substring(cleaned.length - 4));
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.avatar_url} alt={user?.name} />
              <AvatarFallback className="text-lg">
                {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user?.name || 'Mitarbeiter'}</h1>
              <p className="text-muted-foreground">{editedData.position}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                {user?.role === 'admin' && (
                  <Badge className="bg-blue-100 text-blue-800">Administrator</Badge>
                )}
              </div>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              {isEditing ? 'Abbrechen' : 'Bearbeiten'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Persönliche Informationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={editedData.name}
                  onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{editedData.name || 'Nicht angegeben'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={editedData.email}
                  onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{editedData.email || 'Nicht angegeben'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={editedData.phone}
                  onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{editedData.phone || 'Nicht angegeben'}</span>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Account-Informationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Mitglied seit</p>
                <p className="font-medium">Januar 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Letzte Anmeldung</p>
                <p className="font-medium">Heute</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">
                  <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Bankverbindung
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Bank Card Visualization */}
          <div className="mb-6">
            <div className="relative w-full max-w-sm mx-auto">
              <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-6 text-white shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-10 h-6 bg-white/20 rounded flex items-center justify-center">
                    <Square className="h-4 w-4 text-white fill-white" />
                  </div>
                  <div className="text-xs opacity-75">DEBIT</div>
                </div>
                
                <div className="space-y-4">
                  <div className="text-lg font-mono tracking-wider">
                    {bankData.iban ? maskIban(bankData.iban) : '•••• •••• •••• ••••'}
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs opacity-75">KONTOINHABER</div>
                      <div className="font-medium text-sm">
                        {bankData.accountHolder || 'NAME'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-75">BANK</div>
                      <div className="font-medium text-sm">
                        {bankData.bankName || 'BANK NAME'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Information Form */}
          {bankLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                {bankEditing ? (
                  <Input
                    id="iban"
                    value={bankData.iban}
                    onChange={(e) => setBankData({ ...bankData, iban: e.target.value.toUpperCase() })}
                    placeholder="DE89 3704 0044 0532 0130 00"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{bankData.iban ? formatIban(bankData.iban) : 'Nicht angegeben'}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bic">BIC</Label>
                  {bankEditing ? (
                    <Input
                      id="bic"
                      value={bankData.bic}
                      onChange={(e) => setBankData({ ...bankData, bic: e.target.value.toUpperCase() })}
                      placeholder="COBADEFFXXX"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                      <span className="font-mono">{bankData.bic || 'Nicht angegeben'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  {bankEditing ? (
                    <Input
                      id="bankName"
                      value={bankData.bankName}
                      onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                      placeholder="Commerzbank AG"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                      <span>{bankData.bankName || 'Nicht angegeben'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolder">Kontoinhaber</Label>
                {bankEditing ? (
                  <Input
                    id="accountHolder"
                    value={bankData.accountHolder}
                    onChange={(e) => setBankData({ ...bankData, accountHolder: e.target.value })}
                    placeholder="Max Mustermann"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{bankData.accountHolder || 'Nicht angegeben'}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                {bankEditing ? (
                  <>
                    <Button onClick={handleBankSave} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Speichern
                    </Button>
                    <Button variant="outline" onClick={handleBankCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setBankEditing(true)} variant="outline" className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Bankdaten bearbeiten
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Sicherheitseinstellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Passwort ändern</h3>
              <p className="text-sm text-muted-foreground">
                Aktualisiere dein Passwort für bessere Sicherheit
              </p>
            </div>
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Lock className="h-4 w-4 mr-2" />
                  Passwort ändern
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Passwort ändern</DialogTitle>
                  <DialogDescription>
                    Gib dein neues Passwort ein. Es sollte mindestens 6 Zeichen lang sein.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Neues Passwort</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Neues Passwort eingeben"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Neues Passwort bestätigen"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handlePasswordChange} 
                      disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="flex-1"
                    >
                      {passwordLoading ? 'Speichere...' : 'Passwort ändern'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPasswordDialogOpen(false)}
                      disabled={passwordLoading}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

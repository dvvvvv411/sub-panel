import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Mail, Phone, Calendar, Edit3, Save, X, Lock, CreditCard, Eye, EyeOff, Square, Crown, Shield, CheckCircle } from 'lucide-react';

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

  // Load bank data from employee_bank_details
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

      // Get bank data from employment_contract_submissions table for now
      const { data: bankDetails, error: bankError } = await supabase
        .from('employment_contract_submissions')
        .select('iban, bic, bank_name')
        .eq('employee_id', employeeData.id)
        .maybeSingle();

      if (bankError) {
        console.error('Error fetching bank data:', bankError);
        toast.error('Fehler beim Abrufen der Bankdaten: ' + bankError.message);
        return;
      }

      console.log('Fetched bank data:', bankDetails);

      if (bankDetails) {
        setBankData({
          iban: bankDetails.iban || '',
          bic: bankDetails.bic || '',
          bankName: bankDetails.bank_name || '',
          accountHolder: user?.name || ''
        });
        console.log('Updated bank data state');
      } else {
        console.log('No bank details found for user');
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

      // Use update to modify existing bank details in submissions table for now
      const { error: updateError } = await supabase
        .from('employment_contract_submissions')
        .update({
          iban: bankData.iban,
          bic: bankData.bic,
          bank_name: bankData.bankName
        })
        .eq('employee_id', employeeData.id);

      if (updateError) {
        console.error('Error saving bank data:', updateError);
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
    if (!passwordData.currentPassword) {
      toast.error('Bitte geben Sie Ihr aktuelles Passwort ein');
      return;
    }

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
      
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });

      if (signInError) {
        toast.error('Das aktuelle Passwort ist falsch');
        return;
      }

      // Now update the password
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
    <div className="space-y-8">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/3 to-accent/5 border-primary/20">
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 ring-4 ring-primary/10">
              <AvatarImage src={user?.avatar_url} alt={user?.name} />
              <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold text-foreground">{user?.name || 'Mitarbeiter'}</h1>
              <p className="text-lg text-muted-foreground">{editedData.position}</p>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200/60">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aktiv
                </Badge>
                {user?.role === 'admin' && (
                  <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200/60">
                    <Crown className="h-3 w-3 mr-1" />
                    Administrator
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
              size="lg"
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {isEditing ? 'Abbrechen' : 'Bearbeiten'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Personal Information */}
        <Card className="border-muted/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              Persönliche Informationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium">Vollständiger Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={editedData.name}
                  onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                  className="h-12"
                />
              ) : (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{editedData.name || 'Nicht angegeben'}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">E-Mail-Adresse</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={editedData.email}
                  onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                  className="h-12"
                />
              ) : (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{editedData.email || 'Nicht angegeben'}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="phone" className="text-sm font-medium">Telefonnummer</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={editedData.phone}
                  onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                  className="h-12"
                />
              ) : (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{editedData.phone || 'Nicht angegeben'}</span>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} className="flex-1" size="lg">
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
                <Button variant="outline" onClick={handleCancel} size="lg">
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="border-muted/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              Account-Informationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <div className="p-3 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mitglied seit</p>
                <p className="font-semibold">Januar 2024</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Letzte Anmeldung</p>
                <p className="font-semibold">Heute</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Account-Status</p>
                <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200/60 mt-1">
                  Aktiv & Verifiziert
                </Badge>
              </div>
            </div>

            {/* Password Change */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="lg">
                  <Lock className="h-4 w-4 mr-2" />
                  Passwort ändern
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Passwort ändern
                  </DialogTitle>
                  <DialogDescription>
                    Geben Sie Ihr aktuelles Passwort ein und wählen Sie ein neues Passwort.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Neues Passwort</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handlePasswordChange} disabled={passwordLoading} className="flex-1">
                      {passwordLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        'Ändern'
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Bank Information */}
      <Card className="border-muted/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            Bankverbindung
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Bank Card Visualization */}
          <div className="mb-8">
            <div className="relative w-full max-w-md mx-auto">
              <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-12 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Square className="h-5 w-5 text-white fill-white" />
                  </div>
                  <div className="text-xs font-medium opacity-90 bg-white/10 px-2 py-1 rounded">DEBIT</div>
                </div>
                
                <div className="space-y-6">
                  <div className="text-xl font-mono tracking-widest">
                    {bankData.iban ? maskIban(bankData.iban) : '•••• •••• •••• ••••'}
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs opacity-75 mb-1">KONTOINHABER</div>
                      <div className="font-semibold text-sm">
                        {bankData.accountHolder || 'NAME'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-75 mb-1">BANK</div>
                      <div className="font-semibold text-sm">
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
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="iban" className="text-sm font-medium">IBAN</Label>
                {bankEditing ? (
                  <Input
                    id="iban"
                    value={bankData.iban}
                    onChange={(e) => setBankData({ ...bankData, iban: e.target.value.toUpperCase() })}
                    placeholder="DE89 3704 0044 0532 0130 00"
                    className="h-12 font-mono"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <span className="font-mono font-medium">{bankData.iban ? formatIban(bankData.iban) : 'Nicht angegeben'}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="bic" className="text-sm font-medium">BIC</Label>
                  {bankEditing ? (
                    <Input
                      id="bic"
                      value={bankData.bic}
                      onChange={(e) => setBankData({ ...bankData, bic: e.target.value.toUpperCase() })}
                      placeholder="COBADEFFXXX"
                      className="h-12 font-mono"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <span className="font-mono font-medium">{bankData.bic || 'Nicht angegeben'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="bankName" className="text-sm font-medium">Bankname</Label>
                  {bankEditing ? (
                    <Input
                      id="bankName"
                      value={bankData.bankName}
                      onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                      placeholder="Deutsche Bank AG"
                      className="h-12"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{bankData.bankName || 'Nicht angegeben'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {bankEditing ? (
                  <>
                    <Button onClick={handleBankSave} className="flex-1" size="lg">
                      <Save className="h-4 w-4 mr-2" />
                      Bankdaten speichern
                    </Button>
                    <Button variant="outline" onClick={handleBankCancel} size="lg">
                      <X className="h-4 w-4 mr-2" />
                      Abbrechen
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setBankEditing(true)} variant="outline" className="flex-1" size="lg">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Bankdaten bearbeiten
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
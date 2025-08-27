import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Copy, Eye, EyeOff, RefreshCw, UserCheck, Edit3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status: string; // Changed to string to match database
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

interface CreateEmployeeDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (employeeId: string) => void;
}

const generatePassword = (): string => {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

export const CreateEmployeeDialog: React.FC<CreateEmployeeDialogProps> = ({
  employee,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [useCustomPassword, setUseCustomPassword] = useState(false);

  React.useEffect(() => {
    if (isOpen && employee) {
      if (!useCustomPassword) {
        setPassword(generatePassword());
      }
      setShowPassword(true);
      setUseCustomPassword(false);
    }
  }, [isOpen, employee]);

  const handleRegeneratePassword = () => {
    setPassword(generatePassword());
  };

  const handleToggleCustomPassword = (checked: boolean) => {
    setUseCustomPassword(checked);
    if (!checked) {
      setPassword(generatePassword());
    } else {
      setPassword('');
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Passwort in Zwischenablage kopiert');
    } catch (error) {
      toast.error('Fehler beim Kopieren des Passworts');
    }
  };

  const handleCreateAccount = async () => {
    if (!employee || !password) return;
    
    setIsCreating(true);
    
    try {
      console.log('Creating account for:', employee.email);
      
      // Use Edge Function to create user without affecting current session
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: employee.email,
          password: password,
          employeeId: employee.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(`Fehler beim Erstellen des Accounts: ${error.message}`);
        return;
      }

      if (data.error) {
        console.error('Server error:', data.error);
        toast.error(`Fehler beim Erstellen des Accounts: ${data.error}`);
        return;
      }

      console.log('User created successfully via Edge Function:', data.userId);

      toast.success(`Account für ${employee.first_name} ${employee.last_name} erfolgreich erstellt!`);
      onSuccess(employee.id);
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Fehler beim Erstellen des Accounts');
    } finally {
      setIsCreating(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Account erstellen
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie einen Account für {employee.first_name} {employee.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">E-Mail</Label>
                  <p className="font-medium">{employee.email}</p>
                </div>
                {employee.phone && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Telefon</Label>
                    <p className="font-medium">{employee.phone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Password Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="custom-password">Individuelles Passwort</Label>
                <p className="text-xs text-muted-foreground">
                  Eigenes Passwort eingeben statt automatisch generieren
                </p>
              </div>
              <Switch
                id="custom-password"
                checked={useCustomPassword}
                onCheckedChange={handleToggleCustomPassword}
                disabled={isCreating}
              />
            </div>

            {/* Password Section */}
            <div className="space-y-2">
              <Label htmlFor="password">
                {useCustomPassword ? 'Individuelles Passwort' : 'Generiertes Passwort'}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={useCustomPassword ? (e) => setPassword(e.target.value) : undefined}
                    readOnly={!useCustomPassword}
                    className="pr-20"
                    placeholder={useCustomPassword ? "Passwort eingeben..." : ""}
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={handleCopyPassword}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {!useCustomPassword && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRegeneratePassword}
                    disabled={isCreating}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {useCustomPassword 
                  ? "Geben Sie ein sicheres Passwort ein (nur Buchstaben und Zahlen empfohlen)."
                  : "Notieren Sie sich das Passwort, bevor Sie den Account erstellen."
                }
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Abbrechen
          </Button>
          <Button onClick={handleCreateAccount} disabled={isCreating}>
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Erstelle Account...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Account erstellen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
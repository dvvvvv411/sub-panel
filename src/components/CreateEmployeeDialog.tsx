import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Eye, EyeOff, RefreshCw, UserCheck } from 'lucide-react';
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
  onSuccess: () => void;
}

const generatePassword = (): string => {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
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

  React.useEffect(() => {
    if (isOpen && employee) {
      setPassword(generatePassword());
      setShowPassword(true);
    }
  }, [isOpen, employee]);

  const handleRegeneratePassword = () => {
    setPassword(generatePassword());
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
      // Create user account via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: employee.email,
        password: password,
        options: {
          data: {
            full_name: `${employee.first_name} ${employee.last_name}`,
            phone: employee.phone
          },
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (authError) {
        console.error('Error creating user account:', authError);
        toast.error(`Fehler beim Erstellen des Accounts: ${authError.message}`);
        return;
      }

      // Update employee status to 'created'
      const { error: updateError } = await supabase
        .from('employees')
        .update({ status: 'created' })
        .eq('id', employee.id);

      if (updateError) {
        console.error('Error updating employee status:', updateError);
        toast.error('Account erstellt, aber Status konnte nicht aktualisiert werden');
      } else {
        toast.success(`Account für ${employee.first_name} ${employee.last_name} erfolgreich erstellt!`);
      }

      onSuccess();
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

          {/* Password Section */}
          <div className="space-y-2">
            <Label htmlFor="password">Generiertes Passwort</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  readOnly
                  className="pr-20"
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegeneratePassword}
                disabled={isCreating}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Notieren Sie sich das Passwort, bevor Sie den Account erstellen.
            </p>
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
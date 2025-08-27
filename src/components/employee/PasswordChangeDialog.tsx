import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PasswordChangeDialogProps {
  userEmail: string;
}

export const PasswordChangeDialog: React.FC<PasswordChangeDialogProps> = ({ userEmail }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Bitte füllen Sie alle Felder aus');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Die neuen Passwörter stimmen nicht überein');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Das neue Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setIsChanging(true);

    try {
      // Verify old password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: oldPassword,
      });

      if (signInError) {
        toast.error('Das alte Passwort ist nicht korrekt');
        setIsChanging(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('Error updating password:', updateError);
        toast.error('Fehler beim Ändern des Passworts');
      } else {
        toast.success('Passwort erfolgreich geändert');
        resetForm();
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Lock className="h-4 w-4 mr-2" />
          Passwort ändern
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Passwort ändern</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oldPassword">Aktuelles Passwort</Label>
            <div className="relative">
              <Input
                id="oldPassword"
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Aktuelles Passwort eingeben"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowOldPassword(!showOldPassword)}
              >
                {showOldPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">Neues Passwort</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort eingeben"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Neues Passwort bestätigen"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
              disabled={isChanging}
            >
              Abbrechen
            </Button>
            <Button onClick={handlePasswordChange} disabled={isChanging}>
              {isChanging ? 'Wird geändert...' : 'Passwort ändern'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
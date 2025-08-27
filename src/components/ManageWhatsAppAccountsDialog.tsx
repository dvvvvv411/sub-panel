
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Edit2, Trash2, Save, MessageSquare, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePreventUnload } from '@/hooks/use-prevent-unload';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface WhatsAppAccount {
  id: string;
  name: string;
  account_info: string | null;
  chat_link: string | null;
  is_default: boolean;
}

interface ManageWhatsAppAccountsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAccountsUpdated: () => void;
}

export function ManageWhatsAppAccountsDialog({ 
  open, 
  onOpenChange, 
  onAccountsUpdated 
}: ManageWhatsAppAccountsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Account management state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingAccountName, setEditingAccountName] = useState('');
  const [editingAccountInfo, setEditingAccountInfo] = useState('');
  const [editingAccountLink, setEditingAccountLink] = useState('');
  const [editingAccountDefault, setEditingAccountDefault] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountInfo, setNewAccountInfo] = useState('');
  const [newAccountLink, setNewAccountLink] = useState('');
  const [newAccountDefault, setNewAccountDefault] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  usePreventUnload(isOpen);

  useEffect(() => {
    if (isOpen) {
      fetchWhatsAppAccounts();
    }
  }, [isOpen]);

  const fetchWhatsAppAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error fetching WhatsApp accounts:', error);
        toast.error('Fehler beim Laden der WhatsApp-Konten');
        return;
      }

      setWhatsappAccounts(data || []);
    } catch (error) {
      console.error('Error fetching WhatsApp accounts:', error);
      toast.error('Fehler beim Laden der WhatsApp-Konten');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWhatsAppAccount = async () => {
    if (!newAccountName.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .insert({
          name: newAccountName.trim(),
          account_info: newAccountInfo.trim() || null,
          chat_link: newAccountLink.trim() || null,
          is_default: newAccountDefault
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding WhatsApp account:', error);
        toast.error('Fehler beim Hinzufügen des WhatsApp-Kontos');
        return;
      }

      await fetchWhatsAppAccounts(); // Refresh to get updated order
      setNewAccountName('');
      setNewAccountInfo('');
      setNewAccountLink('');
      setNewAccountDefault(false);
      setShowAddAccount(false);
      toast.success('WhatsApp-Konto erfolgreich hinzugefügt');
      onAccountsUpdated();
    } catch (error) {
      console.error('Error adding WhatsApp account:', error);
      toast.error('Fehler beim Hinzufügen des WhatsApp-Kontos');
    }
  };

  const handleEditWhatsAppAccount = async (accountId: string) => {
    if (!editingAccountName.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    try {
      const { error } = await supabase
        .from('whatsapp_accounts')
        .update({
          name: editingAccountName.trim(),
          account_info: editingAccountInfo.trim() || null,
          chat_link: editingAccountLink.trim() || null,
          is_default: editingAccountDefault
        })
        .eq('id', accountId);

      if (error) {
        console.error('Error updating WhatsApp account:', error);
        toast.error('Fehler beim Bearbeiten des WhatsApp-Kontos');
        return;
      }

      await fetchWhatsAppAccounts(); // Refresh to get updated order
      setEditingAccountId(null);
      setEditingAccountName('');
      setEditingAccountInfo('');
      setEditingAccountLink('');
      setEditingAccountDefault(false);
      toast.success('WhatsApp-Konto erfolgreich bearbeitet');
      onAccountsUpdated();
    } catch (error) {
      console.error('Error updating WhatsApp account:', error);
      toast.error('Fehler beim Bearbeiten des WhatsApp-Kontos');
    }
  };

  const handleDeleteWhatsAppAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting WhatsApp account:', error);
        toast.error('Fehler beim Löschen des WhatsApp-Kontos');
        return;
      }

      setWhatsappAccounts(whatsappAccounts.filter(account => account.id !== accountId));
      toast.success('WhatsApp-Konto erfolgreich gelöscht');
      onAccountsUpdated();
    } catch (error) {
      console.error('Error deleting WhatsApp account:', error);
      toast.error('Fehler beim Löschen des WhatsApp-Kontos');
    }
  };

  const handleToggleDefault = async (accountId: string, newDefaultState: boolean) => {
    try {
      const { error } = await supabase
        .from('whatsapp_accounts')
        .update({ is_default: newDefaultState })
        .eq('id', accountId);

      if (error) {
        console.error('Error updating default status:', error);
        toast.error('Fehler beim Ändern des Standard-Status');
        return;
      }

      await fetchWhatsAppAccounts(); // Refresh to get updated order
      toast.success(newDefaultState ? 'Als Standard-Konto gesetzt' : 'Standard-Status entfernt');
      onAccountsUpdated();
    } catch (error) {
      console.error('Error updating default status:', error);
      toast.error('Fehler beim Ändern des Standard-Status');
    }
  };

  const startEditingAccount = (account: WhatsAppAccount) => {
    setEditingAccountId(account.id);
    setEditingAccountName(account.name);
    setEditingAccountInfo(account.account_info || '');
    setEditingAccountLink(account.chat_link || '');
    setEditingAccountDefault(account.is_default);
  };

  const cancelEditingAccount = () => {
    setEditingAccountId(null);
    setEditingAccountName('');
    setEditingAccountInfo('');
    setEditingAccountLink('');
    setEditingAccountDefault(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setShowAddAccount(false);
      setNewAccountName('');
      setNewAccountInfo('');
      setNewAccountLink('');
      setNewAccountDefault(false);
      cancelEditingAccount();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {open === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" type="button">
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp-Konten verwalten
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            WhatsApp-Konten verwalten
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">WhatsApp-Konten</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAccount(!showAddAccount)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neues Konto
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Lädt...</p>
                </div>
              ) : (
                <>
                  {/* Add new account form */}
                  {showAddAccount && (
                    <div className="border rounded-lg p-3 bg-muted/50">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Name des Kontos"
                            value={newAccountName}
                            onChange={(e) => setNewAccountName(e.target.value)}
                          />
                          <Input
                            placeholder="Telefonnummer/Info (optional)"
                            value={newAccountInfo}
                            onChange={(e) => setNewAccountInfo(e.target.value)}
                          />
                        </div>
                        <Input
                          placeholder="WhatsApp Chat-Link (z.B. https://wa.me/491784171510)"
                          value={newAccountLink}
                          onChange={(e) => setNewAccountLink(e.target.value)}
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="new-default"
                            checked={newAccountDefault}
                            onCheckedChange={setNewAccountDefault}
                          />
                          <Label htmlFor="new-default" className="flex items-center gap-1">
                            <Star className="h-4 w-4" />
                            Als Standard-Konto setzen
                          </Label>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddWhatsAppAccount}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Speichern
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowAddAccount(false);
                              setNewAccountName('');
                              setNewAccountInfo('');
                              setNewAccountLink('');
                              setNewAccountDefault(false);
                            }}
                          >
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Existing accounts list */}
                  <div className="space-y-2">
                    {whatsappAccounts.map((account) => (
                      <div key={account.id} className="flex items-center gap-2 p-2 border rounded">
                        {editingAccountId === account.id ? (
                          <>
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  value={editingAccountName}
                                  onChange={(e) => setEditingAccountName(e.target.value)}
                                  placeholder="Name des Kontos"
                                />
                                <Input
                                  value={editingAccountInfo}
                                  onChange={(e) => setEditingAccountInfo(e.target.value)}
                                  placeholder="Telefonnummer/Info (optional)"
                                />
                              </div>
                              <Input
                                value={editingAccountLink}
                                onChange={(e) => setEditingAccountLink(e.target.value)}
                                placeholder="WhatsApp Chat-Link (z.B. https://wa.me/491784171510)"
                              />
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`edit-default-${account.id}`}
                                  checked={editingAccountDefault}
                                  onCheckedChange={setEditingAccountDefault}
                                />
                                <Label htmlFor={`edit-default-${account.id}`} className="flex items-center gap-1">
                                  <Star className="h-4 w-4" />
                                  Als Standard-Konto setzen
                                </Label>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleEditWhatsAppAccount(account.id)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={cancelEditingAccount}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{account.name}</span>
                                {account.is_default && (
                                  <div className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                    <Star className="h-3 w-3" />
                                    Standard
                                  </div>
                                )}
                                {account.account_info && (
                                  <span className="text-sm text-muted-foreground">
                                    ({account.account_info})
                                  </span>
                                )}
                              </div>
                              {account.chat_link && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Link: {account.chat_link}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleDefault(account.id, !account.is_default)}
                              title={account.is_default ? "Standard entfernen" : "Als Standard setzen"}
                            >
                              <Star className={`h-4 w-4 ${account.is_default ? 'fill-current text-yellow-500' : ''}`} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => startEditingAccount(account)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteWhatsAppAccount(account.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                    {whatsappAccounts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Noch keine WhatsApp-Konten vorhanden
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

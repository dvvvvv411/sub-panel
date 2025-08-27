import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Briefcase, Edit2, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WhatsAppAccount {
  id: string;
  name: string;
  account_info: string | null;
}

interface CreateOrderDialogProps {
  onOrderCreated: () => void;
}

export function CreateOrderDialog({ onOrderCreated }: CreateOrderDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  // Form data
  const [title, setTitle] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [provider, setProvider] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  const [premium, setPremium] = useState('');
  const [whatsappAccountId, setWhatsappAccountId] = useState('');
  const [evaluationQuestions, setEvaluationQuestions] = useState<string[]>(['']);
  
  // WhatsApp account management state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingAccountName, setEditingAccountName] = useState('');
  const [editingAccountInfo, setEditingAccountInfo] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountInfo, setNewAccountInfo] = useState('');
  const [showAddAccount, setShowAddAccount] = useState(false);

  const resetForm = () => {
    setTitle('');
    setOrderNumber('');
    setProvider('');
    setProjectGoal('');
    setPremium('');
    setWhatsappAccountId('');
    setEvaluationQuestions(['']);
  };

  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      await fetchWhatsAppAccounts();
    } else {
      resetForm();
    }
  };

  const fetchWhatsAppAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('*')
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
      setLoadingAccounts(false);
    }
  };

  const addEvaluationQuestion = () => {
    setEvaluationQuestions([...evaluationQuestions, '']);
  };

  const removeEvaluationQuestion = (index: number) => {
    if (evaluationQuestions.length > 1) {
      setEvaluationQuestions(evaluationQuestions.filter((_, i) => i !== index));
    }
  };

  const updateEvaluationQuestion = (index: number, value: string) => {
    const updated = [...evaluationQuestions];
    updated[index] = value;
    setEvaluationQuestions(updated);
  };

  // WhatsApp account management functions
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
          account_info: newAccountInfo.trim() || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding WhatsApp account:', error);
        toast.error('Fehler beim Hinzufügen des WhatsApp-Kontos');
        return;
      }

      setWhatsappAccounts([...whatsappAccounts, data]);
      setNewAccountName('');
      setNewAccountInfo('');
      setShowAddAccount(false);
      toast.success('WhatsApp-Konto erfolgreich hinzugefügt');
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
          account_info: editingAccountInfo.trim() || null
        })
        .eq('id', accountId);

      if (error) {
        console.error('Error updating WhatsApp account:', error);
        toast.error('Fehler beim Bearbeiten des WhatsApp-Kontos');
        return;
      }

      setWhatsappAccounts(whatsappAccounts.map(account =>
        account.id === accountId
          ? { ...account, name: editingAccountName.trim(), account_info: editingAccountInfo.trim() || null }
          : account
      ));
      setEditingAccountId(null);
      setEditingAccountName('');
      setEditingAccountInfo('');
      toast.success('WhatsApp-Konto erfolgreich bearbeitet');
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
      if (whatsappAccountId === accountId) {
        setWhatsappAccountId('');
      }
      toast.success('WhatsApp-Konto erfolgreich gelöscht');
    } catch (error) {
      console.error('Error deleting WhatsApp account:', error);
      toast.error('Fehler beim Löschen des WhatsApp-Kontos');
    }
  };

  const startEditingAccount = (account: WhatsAppAccount) => {
    setEditingAccountId(account.id);
    setEditingAccountName(account.name);
    setEditingAccountInfo(account.account_info || '');
  };

  const cancelEditingAccount = () => {
    setEditingAccountId(null);
    setEditingAccountName('');
    setEditingAccountInfo('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Sie müssen angemeldet sein');
      return;
    }

    setLoading(true);
    
    try {
      // Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          title,
          order_number: orderNumber,
          provider,
          project_goal: projectGoal,
          premium: parseFloat(premium),
          whatsapp_account_id: whatsappAccountId || null,
          created_by: user.id
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        toast.error('Fehler beim Erstellen des Auftrags');
        return;
      }

      // Add evaluation questions
      const validQuestions = evaluationQuestions.filter(q => q.trim() !== '');
      if (validQuestions.length > 0) {
        const questionsData = validQuestions.map(question => ({
          order_id: orderData.id,
          question: question.trim()
        }));

        const { error: questionsError } = await supabase
          .from('order_evaluation_questions')
          .insert(questionsData);

        if (questionsError) {
          console.error('Error creating evaluation questions:', questionsError);
          toast.error('Auftrag erstellt, aber Fehler bei den Bewertungsfragen');
        }
      }

      toast.success('Auftrag erfolgreich erstellt');
      setOpen(false);
      resetForm();
      onOrderCreated();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Fehler beim Erstellen des Auftrags');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Auftrag hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Neuen Auftrag erstellen
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Auftragstitel eingeben"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Auftragsnummer *</Label>
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
                placeholder="z.B. A-2024-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Anbieter *</Label>
            <Input
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              required
              placeholder="Name des Anbieters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectGoal">Projektziel *</Label>
            <Textarea
              id="projectGoal"
              value={projectGoal}
              onChange={(e) => setProjectGoal(e.target.value)}
              required
              placeholder="Beschreibung des Projektziels"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="premium">Prämie (€) *</Label>
              <Input
                id="premium"
                type="number"
                step="0.01"
                min="0"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappAccount">WhatsApp-Account</Label>
              <Select value={whatsappAccountId} onValueChange={setWhatsappAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingAccounts ? "Lädt..." : "WhatsApp-Account auswählen"} />
                </SelectTrigger>
                <SelectContent>
                  {!loadingAccounts && whatsappAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} {account.account_info && `(${account.account_info})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* WhatsApp Account Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">WhatsApp-Konten verwalten</CardTitle>
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
                        <div className="grid grid-cols-2 gap-2 flex-1">
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
                          <span className="font-medium">{account.name}</span>
                          {account.account_info && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({account.account_info})
                            </span>
                          )}
                        </div>
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
                {whatsappAccounts.length === 0 && !loadingAccounts && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Noch keine WhatsApp-Konten vorhanden
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bewertungsfragen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {evaluationQuestions.map((question, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={question}
                    onChange={(e) => updateEvaluationQuestion(index, e.target.value)}
                    placeholder={`Bewertungsfrage ${index + 1}`}
                    className="flex-1"
                  />
                  {evaluationQuestions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeEvaluationQuestion(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEvaluationQuestion}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Weitere Frage hinzufügen
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Erstellt...' : 'Auftrag erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
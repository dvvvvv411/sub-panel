import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Briefcase, Download, FileText, Star, Users, Clock, Target, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ManageTeamsAccountsDialog } from './ManageTeamsAccountsDialog';
import { usePreventUnload } from '@/hooks/use-prevent-unload';

interface TeamsAccount {
  id: string;
  name: string;
  account_info: string | null;
}

interface CreateOrderDialogProps {
  onOrderCreated: () => void;
}

interface Instruction {
  title: string;
  icon: string;
  content: string;
}

export function CreateOrderDialog({ onOrderCreated }: CreateOrderDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  usePreventUnload(open);
  // Form data
  const [title, setTitle] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [provider, setProvider] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  const [premium, setPremium] = useState('');
  const [evaluationQuestions, setEvaluationQuestions] = useState<string[]>(['']);
  
  // Placeholder order specific fields
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [showDownloadLinks, setShowDownloadLinks] = useState(false);
  const [appStoreLink, setAppStoreLink] = useState('');
  const [googlePlayLink, setGooglePlayLink] = useState('');
  const [instructions, setInstructions] = useState<Instruction[]>([
    { title: '', icon: 'FileText', content: '' }
  ]);

  const resetForm = () => {
    setTitle('');
    setOrderNumber('');
    setProvider('');
    setProjectGoal('');
    setPremium('');
    setEvaluationQuestions(['']);
    setIsPlaceholder(false);
    setShowDownloadLinks(false);
    setAppStoreLink('');
    setGooglePlayLink('');
    setInstructions([{ title: '', icon: 'FileText', content: '' }]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
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

  const addInstruction = () => {
    setInstructions([...instructions, { title: '', icon: 'FileText', content: '' }]);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const updateInstruction = (index: number, field: keyof Instruction, value: string) => {
    const updated = [...instructions];
    updated[index] = { ...updated[index], [field]: value };
    setInstructions(updated);
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
          is_placeholder: isPlaceholder,
          download_links: isPlaceholder && showDownloadLinks ? [appStoreLink, googlePlayLink].filter(link => link.trim() !== '') : null,
          instructions: isPlaceholder ? instructions.filter(inst => inst.title.trim() !== '') as any : null,
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

          {/* Placeholder Order Toggle */}
          <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
            <Switch
              id="placeholder-mode"
              checked={isPlaceholder}
              onCheckedChange={setIsPlaceholder}
            />
            <div className="space-y-1">
              <Label htmlFor="placeholder-mode" className="text-sm font-medium cursor-pointer">
                Platzhalterauftrag
              </Label>
              <p className="text-xs text-muted-foreground">
                Auftrag wird direkt auf der Plattform durchgeführt (kein WhatsApp erforderlich)
              </p>
            </div>
          </div>

          {/* Placeholder Order Fields */}
          {isPlaceholder && (
            <div className="space-y-6 border-t pt-6">
              {/* Download Links Toggle */}
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
                <Switch
                  id="download-links-toggle"
                  checked={showDownloadLinks}
                  onCheckedChange={setShowDownloadLinks}
                />
                <div className="space-y-1">
                  <Label htmlFor="download-links-toggle" className="text-sm font-medium cursor-pointer">
                    Download Links anzeigen
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    App Store und Google Play Links für mobile Apps
                  </p>
                </div>
              </div>

              {/* Download Links */}
              {showDownloadLinks && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="app-store-link">App Store Link</Label>
                        <Input
                          id="app-store-link"
                          value={appStoreLink}
                          onChange={(e) => setAppStoreLink(e.target.value)}
                          placeholder="https://apps.apple.com/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="google-play-link">Google Play Link</Label>
                        <Input
                          id="google-play-link"
                          value={googlePlayLink}
                          onChange={(e) => setGooglePlayLink(e.target.value)}
                          placeholder="https://play.google.com/..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Anweisungen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {instructions.map((instruction, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-sm">Titel</Label>
                          <Input
                            value={instruction.title}
                            onChange={(e) => updateInstruction(index, 'title', e.target.value)}
                            placeholder="Anweisungstitel"
                          />
                        </div>
                        <div className="w-40">
                          <Label className="text-sm">Icon</Label>
                          <Select 
                            value={instruction.icon} 
                            onValueChange={(value) => updateInstruction(index, 'icon', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FileText">📄 Dokument</SelectItem>
                              <SelectItem value="Download">⬇️ Download</SelectItem>
                              <SelectItem value="Users">👥 Benutzer</SelectItem>
                              <SelectItem value="Settings">⚙️ Einstellungen</SelectItem>
                              <SelectItem value="Clock">🕐 Zeit</SelectItem>
                              <SelectItem value="Target">🎯 Ziel</SelectItem>
                              <SelectItem value="Star">⭐ Wichtig</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {instructions.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeInstruction(index)}
                            className="mt-6"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm">Inhalt</Label>
                        <Textarea
                          value={instruction.content}
                          onChange={(e) => updateInstruction(index, 'content', e.target.value)}
                          placeholder="Detaillierte Anweisungen..."
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addInstruction}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Weitere Anweisung hinzufügen
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

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
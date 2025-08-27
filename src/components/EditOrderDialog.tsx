import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Edit, Download, FileText, Star, Users, Clock, Target, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePreventUnload } from '@/hooks/use-prevent-unload';

interface Instruction {
  title: string;
  icon: string;
  content: string;
}

interface Order {
  id: string;
  title: string;
  order_number: string;
  provider: string;
  project_goal: string;
  premium: number;
  is_placeholder: boolean;
  download_links: any;
  instructions: any;
  order_evaluation_questions: Array<{
    id: string;
    question: string;
  }>;
}

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onOrderUpdated: () => void;
}

export function EditOrderDialog({ 
  open, 
  onOpenChange, 
  order, 
  onOrderUpdated 
}: EditOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  
  // Prevent accidental reload while editing
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

  useEffect(() => {
    if (open && order) {
      setTitle(order.title);
      setOrderNumber(order.order_number);
      setProvider(order.provider);
      setProjectGoal(order.project_goal);
      setPremium(order.premium.toString());
      setEvaluationQuestions(
        order.order_evaluation_questions.length > 0 
          ? order.order_evaluation_questions.map(q => q.question)
          : ['']
      );
      
      // Initialize placeholder fields
      setIsPlaceholder(order.is_placeholder);
      setShowDownloadLinks(Array.isArray(order.download_links) && order.download_links.length > 0);
      setAppStoreLink(order.download_links?.[0] || '');
      setGooglePlayLink(order.download_links?.[1] || '');
      setInstructions(
        Array.isArray(order.instructions) && order.instructions.length > 0
          ? order.instructions
          : [{ title: '', icon: 'FileText', content: '' }]
      );
    }
  }, [open, order]);

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

  const iconOptions = [
    { value: 'FileText', label: 'Dokument' },
    { value: 'Download', label: 'Download' },
    { value: 'Users', label: 'Benutzer' },
    { value: 'Settings', label: 'Einstellungen' },
    { value: 'Clock', label: 'Zeit' },
    { value: 'Target', label: 'Ziel' },
    { value: 'Star', label: 'Stern' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order) return;

    setLoading(true);
    
    try {
      // Update the order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          title,
          order_number: orderNumber,
          provider,
          project_goal: projectGoal,
          premium: parseFloat(premium),
          is_placeholder: isPlaceholder,
          download_links: isPlaceholder && showDownloadLinks 
            ? [appStoreLink, googlePlayLink].filter(link => link.trim() !== '') 
            : null,
          instructions: isPlaceholder 
            ? instructions.filter(inst => inst.title.trim() !== '') as any
            : null
        })
        .eq('id', order.id);

      if (orderError) {
        console.error('Error updating order:', orderError);
        toast.error('Fehler beim Aktualisieren des Auftrags');
        return;
      }

      // Delete existing evaluation questions
      const { error: deleteError } = await supabase
        .from('order_evaluation_questions')
        .delete()
        .eq('order_id', order.id);

      if (deleteError) {
        console.error('Error deleting old questions:', deleteError);
        toast.error('Fehler beim Aktualisieren der Bewertungsfragen');
        return;
      }

      // Add new evaluation questions
      const validQuestions = evaluationQuestions.filter(q => q.trim() !== '');
      if (validQuestions.length > 0) {
        const questionsData = validQuestions.map(question => ({
          order_id: order.id,
          question: question.trim()
        }));

        const { error: questionsError } = await supabase
          .from('order_evaluation_questions')
          .insert(questionsData);

        if (questionsError) {
          console.error('Error creating evaluation questions:', questionsError);
          toast.error('Auftrag aktualisiert, aber Fehler bei den Bewertungsfragen');
        }
      }

      toast.success('Auftrag erfolgreich aktualisiert');
      onOpenChange(false);
      resetForm();
      onOrderUpdated();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Fehler beim Aktualisieren des Auftrags');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Auftrag bearbeiten
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

          {/* Placeholder Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="placeholder"
              checked={isPlaceholder}
              onCheckedChange={setIsPlaceholder}
            />
            <Label htmlFor="placeholder">Platzhalterauftrag</Label>
          </div>

          {/* Download Links Section */}
          {isPlaceholder && (
            <>
              <div className="flex items-center space-x-2">
                <Switch
                  id="downloadLinks"
                  checked={showDownloadLinks}
                  onCheckedChange={setShowDownloadLinks}
                />
                <Label htmlFor="downloadLinks">Download Links anzeigen</Label>
              </div>

              {showDownloadLinks && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appStoreLink">App Store Link</Label>
                    <Input
                      id="appStoreLink"
                      value={appStoreLink}
                      onChange={(e) => setAppStoreLink(e.target.value)}
                      placeholder="https://apps.apple.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="googlePlayLink">Google Play Link</Label>
                    <Input
                      id="googlePlayLink"
                      value={googlePlayLink}
                      onChange={(e) => setGooglePlayLink(e.target.value)}
                      placeholder="https://play.google.com/..."
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Instructions Section */}
          {isPlaceholder && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Anweisungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {instructions.map((instruction, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label>Titel</Label>
                        <Input
                          value={instruction.title}
                          onChange={(e) => updateInstruction(index, 'title', e.target.value)}
                          placeholder="Anweisungstitel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <Select
                          value={instruction.icon}
                          onValueChange={(value) => updateInstruction(index, 'icon', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {iconOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
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
                    <div className="space-y-2">
                      <Label>Inhalt</Label>
                      <Textarea
                        value={instruction.content}
                        onChange={(e) => updateInstruction(index, 'content', e.target.value)}
                        placeholder="Detaillierte Anweisungen hier eingeben..."
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Aktualisiert...' : 'Auftrag aktualisieren'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
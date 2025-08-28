import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit, MessageCircle, Send } from "lucide-react";

interface TelegramSubscriber {
  id: string;
  chat_id: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  last_notified_at: string | null;
}

const ManageTelegramSubscribersTab = () => {
  const [subscribers, setSubscribers] = useState<TelegramSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<TelegramSubscriber | null>(null);
  const [newChatId, setNewChatId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from("telegram_subscribers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast({
        title: "Fehler",
        description: "Konnte Telegram-Abonnenten nicht laden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscriber = async () => {
    if (!newChatId.trim()) {
      toast({
        title: "Fehler",
        description: "Chat ID ist erforderlich.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("telegram_subscribers")
        .insert({
          chat_id: newChatId.trim(),
          label: newLabel.trim() || null,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Telegram-Abonnent hinzugefügt.",
      });

      setNewChatId("");
      setNewLabel("");
      setIsAddDialogOpen(false);
      fetchSubscribers();
    } catch (error: any) {
      console.error("Error adding subscriber:", error);
      toast({
        title: "Fehler",
        description: error.message.includes("duplicate") 
          ? "Diese Chat ID existiert bereits." 
          : "Konnte Abonnent nicht hinzufügen.",
        variant: "destructive",
      });
    }
  };

  const handleEditSubscriber = async () => {
    if (!editingSubscriber) return;

    try {
      const { error } = await supabase
        .from("telegram_subscribers")
        .update({
          label: newLabel.trim() || null,
        })
        .eq("id", editingSubscriber.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Abonnent aktualisiert.",
      });

      setIsEditDialogOpen(false);
      setEditingSubscriber(null);
      setNewLabel("");
      fetchSubscribers();
    } catch (error) {
      console.error("Error updating subscriber:", error);
      toast({
        title: "Fehler",
        description: "Konnte Abonnent nicht aktualisieren.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (subscriber: TelegramSubscriber) => {
    try {
      const { error } = await supabase
        .from("telegram_subscribers")
        .update({ is_active: !subscriber.is_active })
        .eq("id", subscriber.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: `Abonnent ${!subscriber.is_active ? "aktiviert" : "deaktiviert"}.`,
      });

      fetchSubscribers();
    } catch (error) {
      console.error("Error toggling subscriber:", error);
      toast({
        title: "Fehler",
        description: "Konnte Status nicht ändern.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubscriber = async (subscriber: TelegramSubscriber) => {
    if (!confirm(`Möchten Sie den Abonnenten "${subscriber.label || subscriber.chat_id}" wirklich löschen?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("telegram_subscribers")
        .delete()
        .eq("id", subscriber.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Abonnent gelöscht.",
      });

      fetchSubscribers();
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      toast({
        title: "Fehler",
        description: "Konnte Abonnent nicht löschen.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (subscriber: TelegramSubscriber) => {
    setEditingSubscriber(subscriber);
    setNewLabel(subscriber.label || "");
    setIsEditDialogOpen(true);
  };

  const sendTestMessage = async () => {
    if (subscribers.filter(s => s.is_active).length === 0) {
      toast({
        title: "Keine aktiven Abonnenten",
        description: "Es sind keine aktiven Telegram-Abonnenten vorhanden.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingTest(true);

      const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
        body: {
          type: 'test',
          payload: {
            timestamp: new Date().toLocaleString('de-DE')
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Test erfolgreich",
        description: `Testnachricht an ${data.sent} von ${data.total} Abonnenten gesendet.`,
      });

      // Refresh subscribers to update last_notified_at
      fetchSubscribers();
    } catch (error: any) {
      console.error('Error sending test message:', error);
      toast({
        title: "Fehler",
        description: "Testnachricht konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Lade...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Telegram Benachrichtigungen
          </CardTitle>
          <CardDescription>
            Verwalten Sie Telegram-Chat-IDs für automatische Benachrichtigungen. 
            Alle aktiven Abonnenten erhalten Nachrichten bei Terminen, Arbeitsverträgen und Bewertungen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              <strong>Aktive Abonnenten:</strong> {subscribers.filter(s => s.is_active).length} von {subscribers.length}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={sendTestMessage} 
                disabled={sendingTest || subscribers.filter(s => s.is_active).length === 0}
                variant="outline" 
                className="flex items-center gap-2"
              >
                {sendingTest ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Test senden
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Abonnent hinzufügen
              </Button>
            </div>
          </div>

          {subscribers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Telegram-Abonnenten vorhanden.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Letzte Benachrichtigung</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-mono text-sm">{subscriber.chat_id}</TableCell>
                    <TableCell>{subscriber.label || <span className="text-muted-foreground">Kein Label</span>}</TableCell>
                    <TableCell>
                      <Badge variant={subscriber.is_active ? "default" : "secondary"}>
                        {subscriber.is_active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {subscriber.last_notified_at 
                        ? new Date(subscriber.last_notified_at).toLocaleString("de-DE")
                        : "Nie"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={subscriber.is_active}
                          onCheckedChange={() => handleToggleActive(subscriber)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(subscriber)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSubscriber(subscriber)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chat ID ermitteln</CardTitle>
          <CardDescription>
            So finden Sie Ihre Telegram Chat ID:
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>1. Starten Sie einen Chat mit Ihrem Bot</p>
          <p>2. Senden Sie eine beliebige Nachricht an den Bot</p>
          <p>3. Öffnen Sie: <code className="bg-muted px-1 rounded">https://api.telegram.org/bot&lt;BOT_TOKEN&gt;/getUpdates</code></p>
          <p>4. Kopieren Sie die "chat.id" aus der Antwort</p>
        </CardContent>
      </Card>

      {/* Add Subscriber Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Abonnent hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie eine neue Telegram Chat ID hinzu, um Benachrichtigungen zu erhalten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="chatId">Chat ID *</Label>
              <Input
                id="chatId"
                value={newChatId}
                onChange={(e) => setNewChatId(e.target.value)}
                placeholder="z.B. 123456789"
              />
            </div>
            <div>
              <Label htmlFor="label">Label (optional)</Label>
              <Input
                id="label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="z.B. Admin Chat"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddSubscriber}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscriber Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abonnent bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie das Label für diesen Abonnenten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Chat ID</Label>
              <Input 
                value={editingSubscriber?.chat_id || ""} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="editLabel">Label</Label>
              <Input
                id="editLabel"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="z.B. Admin Chat"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleEditSubscriber}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageTelegramSubscribersTab;
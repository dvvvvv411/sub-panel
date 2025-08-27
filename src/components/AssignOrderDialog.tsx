import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserPlus, MessageSquare, Settings, Check, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ManageWhatsAppAccountsDialog } from './ManageWhatsAppAccountsDialog';
import { cn } from '@/lib/utils';
import { usePreventUnload } from '@/hooks/use-prevent-unload';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface WhatsAppAccount {
  id: string;
  name: string;
  account_info: string | null;
  is_default: boolean;
}

interface Order {
  id: string;
  title: string;
  order_number: string;
  provider: string;
  project_goal: string;
  premium: number;
  is_placeholder: boolean;
  whatsapp_account_id: string | null;
}

interface AssignOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  availableEmployees: Employee[];
  onAssignmentComplete: () => void;
}

export function AssignOrderDialog({ 
  open, 
  onOpenChange, 
  order, 
  availableEmployees, 
  onAssignmentComplete 
}: AssignOrderDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedWhatsAppId, setSelectedWhatsAppId] = useState('');
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [manageWhatsAppOpen, setManageWhatsAppOpen] = useState(false);

  usePreventUnload(open);

  useEffect(() => {
    if (open) {
      fetchWhatsAppAccounts();
      setSelectedEmployeeId('');
      setSelectedWhatsAppId('');
      setEmployeeSearchOpen(false);
    }
  }, [open]);

  const fetchWhatsAppAccounts = async () => {
    try {
      setLoadingAccounts(true);
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
      
      // Pre-select default WhatsApp account if available and order is not a placeholder
      if (data && order && !order.is_placeholder) {
        const defaultAccount = data.find(account => account.is_default);
        if (defaultAccount) {
          setSelectedWhatsAppId(defaultAccount.id);
        }
      }
    } catch (error) {
      console.error('Error fetching WhatsApp accounts:', error);
      toast.error('Fehler beim Laden der WhatsApp-Konten');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleWhatsAppAccountsUpdated = () => {
    fetchWhatsAppAccounts();
  };

  const selectedEmployee = availableEmployees.find(emp => emp.id === selectedEmployeeId);

  const handleAssign = async () => {
    // For placeholder orders, WhatsApp account is not required
    if (!order || !selectedEmployeeId || (!order.is_placeholder && !selectedWhatsAppId)) {
      const missingFields = [];
      if (!selectedEmployeeId) missingFields.push('Mitarbeiter');
      if (!order.is_placeholder && !selectedWhatsAppId) missingFields.push('WhatsApp-Konto');
      
      toast.error(`Bitte wählen Sie ${missingFields.join(' und ')} aus`);
      return;
    }

    try {
      setLoading(true);

      // Create assignment
      const { error: assignmentError } = await supabase
        .from('order_assignments')
        .insert({
          order_id: order.id,
          employee_id: selectedEmployeeId,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
        toast.error('Fehler beim Zuweisen des Mitarbeiters');
        return;
      }

      // Update order with WhatsApp account (only for non-placeholder orders)
      if (!order.is_placeholder && selectedWhatsAppId) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ whatsapp_account_id: selectedWhatsAppId })
          .eq('id', order.id);

        if (updateError) {
          console.error('Error updating order with WhatsApp account:', updateError);
          toast.error('Mitarbeiter zugewiesen, aber Fehler beim WhatsApp-Konto');
        }
      }

      toast.success('Auftrag erfolgreich zugewiesen');

      onOpenChange(false);
      onAssignmentComplete();
    } catch (error) {
      console.error('Error assigning order:', error);
      toast.error('Fehler beim Zuweisen des Auftrags');
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Auftrag zuweisen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Auftragsinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nummer:</span>
                <span className="font-medium">{order.order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Titel:</span>
                <span className="font-medium">{order.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Anbieter:</span>
                <span className="font-medium">{order.provider}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Typ:</span>
                <Badge variant={order.is_placeholder ? "secondary" : "default"}>
                  {order.is_placeholder ? "Platzhalterauftrag" : "Standard-Auftrag"}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prämie:</span>
                <Badge variant="secondary">{order.premium.toFixed(2)}€</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Employee Selection with Search */}
          <div className="space-y-2">
            <Label htmlFor="employee">Mitarbeiter auswählen *</Label>
            <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeeSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedEmployee
                    ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                    : "Mitarbeiter auswählen..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-popover border">
                <Command className="w-full">
                  <CommandInput placeholder="Mitarbeiter suchen..." />
                  <CommandList>
                    <CommandEmpty>Kein Mitarbeiter gefunden.</CommandEmpty>
                    <CommandGroup>
                      {availableEmployees.map((employee) => (
                        <CommandItem
                          key={employee.id}
                          value={`${employee.first_name} ${employee.last_name} ${employee.email}`}
                          onSelect={() => {
                            setSelectedEmployeeId(employee.id);
                            setEmployeeSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedEmployeeId === employee.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{employee.first_name} {employee.last_name}</span>
                            <span className="text-sm text-muted-foreground">{employee.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* WhatsApp Account Selection - Only for non-placeholder orders */}
          {!order.is_placeholder && (
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                WhatsApp-Konto auswählen *
              </Label>
              <Select 
                value={selectedWhatsAppId} 
                onValueChange={setSelectedWhatsAppId}
                disabled={loadingAccounts}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={loadingAccounts ? "Lädt..." : "WhatsApp-Konto auswählen"} />
                </SelectTrigger>
                <SelectContent className="bg-popover border">
                  {whatsappAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        {account.name} {account.account_info && `(${account.account_info})`}
                        {account.is_default && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                            Standard
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManageWhatsAppOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  WhatsApp-Konten verwalten
                </Button>
              </div>
            </div>
          )}

          {/* Info for placeholder orders */}
          {order.is_placeholder && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Platzhalterauftrag:</strong> Dieser Auftrag wird direkt auf der Plattform durchgeführt. 
                Eine WhatsApp-Zuweisung ist nicht erforderlich.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={loading || !selectedEmployeeId || (!order.is_placeholder && !selectedWhatsAppId)}
            >
              {loading ? 'Zuweisen...' : 'Zuweisen'}
            </Button>
          </div>
        </div>

        {/* WhatsApp Management Dialog */}
        <ManageWhatsAppAccountsDialog 
          open={manageWhatsAppOpen}
          onOpenChange={setManageWhatsAppOpen}
          onAccountsUpdated={handleWhatsAppAccountsUpdated}
        />
      </DialogContent>
    </Dialog>
  );
}

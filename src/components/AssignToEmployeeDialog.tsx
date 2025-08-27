import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
}

interface Order {
  id: string;
  title: string;
  order_number: string;
  provider: string;
  premium: number;
  is_placeholder: boolean;
  whatsapp_account_id: string | null;
}

interface AssignToEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onAssignmentComplete: () => void;
}

export function AssignToEmployeeDialog({ 
  open, 
  onOpenChange, 
  employee, 
  onAssignmentComplete 
}: AssignToEmployeeDialogProps) {
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedWhatsAppId, setSelectedWhatsAppId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);
  const [manageWhatsAppOpen, setManageWhatsAppOpen] = useState(false);

  usePreventUnload(open);

  useEffect(() => {
    if (open && employee) {
      fetchOrders();
      fetchWhatsAppAccounts();
      setSelectedOrderId('');
      setSelectedWhatsAppId('');
      setOrderSearchOpen(false);
    }
  }, [open, employee]);

  const fetchOrders = async () => {
    if (!employee) return;
    
    try {
      setLoadingOrders(true);
      
      // Get already assigned order IDs for this employee
      const { data: assignedOrders, error: assignedError } = await supabase
        .from('order_assignments')
        .select('order_id')
        .eq('employee_id', employee.id);

      if (assignedError) {
        console.error('Error fetching assigned orders:', assignedError);
        toast.error('Fehler beim Laden der zugewiesenen Aufträge');
        return;
      }

      const assignedOrderIds = assignedOrders?.map(a => a.order_id) || [];

      // Get all orders excluding already assigned ones
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, title, provider, premium, is_placeholder, whatsapp_account_id')
        .not('id', 'in', `(${assignedOrderIds.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        toast.error('Fehler beim Laden der Aufträge');
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Fehler beim Laden der Aufträge');
    } finally {
      setLoadingOrders(false);
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

  const handleWhatsAppAccountsUpdated = () => {
    fetchWhatsAppAccounts();
  };

  const selectedOrder = orders.find(order => order.id === selectedOrderId);

  const handleAssign = async () => {
    if (!employee || !selectedOrderId || (!selectedOrder?.is_placeholder && !selectedWhatsAppId)) {
      const missingFields = [];
      if (!selectedOrderId) missingFields.push('Auftrag');
      if (!selectedOrder?.is_placeholder && !selectedWhatsAppId) missingFields.push('WhatsApp-Konto');
      
      toast.error(`Bitte wählen Sie ${missingFields.join(' und ')} aus`);
      return;
    }

    try {
      setLoading(true);

      // Create assignment
      const { error: assignmentError } = await supabase
        .from('order_assignments')
        .insert({
          order_id: selectedOrderId,
          employee_id: employee.id,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
        toast.error('Fehler beim Zuweisen des Auftrags');
        return;
      }

      // Update order with WhatsApp account (only for non-placeholder orders)
      if (!selectedOrder?.is_placeholder && selectedWhatsAppId) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ whatsapp_account_id: selectedWhatsAppId })
          .eq('id', selectedOrderId);

        if (updateError) {
          console.error('Error updating order with WhatsApp account:', updateError);
          toast.error('Auftrag zugewiesen, aber Fehler beim WhatsApp-Konto');
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

  if (!employee) return null;

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
          {/* Employee Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mitarbeiterinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{employee.first_name} {employee.last_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">E-Mail:</span>
                <span className="font-medium">{employee.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Order Selection with Search */}
          <div className="space-y-2">
            <Label htmlFor="order">Auftrag auswählen *</Label>
            <Popover open={orderSearchOpen} onOpenChange={setOrderSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={orderSearchOpen}
                  className="w-full justify-between"
                  disabled={loadingOrders}
                >
                  {selectedOrder
                    ? `${selectedOrder.order_number} - ${selectedOrder.title}`
                    : loadingOrders ? "Lädt..." : "Auftrag auswählen..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-popover border">
                <Command className="w-full">
                  <CommandInput placeholder="Auftrag suchen..." />
                  <CommandList>
                    <CommandEmpty>Kein Auftrag gefunden.</CommandEmpty>
                    <CommandGroup>
                      {orders.map((order) => (
                        <CommandItem
                          key={order.id}
                          value={`${order.order_number} ${order.title} ${order.provider}`}
                          onSelect={() => {
                            setSelectedOrderId(order.id);
                            setOrderSearchOpen(false);
                            // Reset WhatsApp selection when order changes
                            setSelectedWhatsAppId('');
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedOrderId === order.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{order.order_number}</span>
                              <Badge variant={order.is_placeholder ? "secondary" : "default"} className="text-xs">
                                {order.is_placeholder ? "Platzhalter" : "Standard"}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">{order.title}</span>
                            <span className="text-xs text-muted-foreground">{order.provider} • {order.premium.toFixed(2)}€</span>
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
          {selectedOrder && !selectedOrder.is_placeholder && (
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
                      {account.name} {account.account_info && `(${account.account_info})`}
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
          {selectedOrder && selectedOrder.is_placeholder && (
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
              disabled={loading || !selectedOrderId || (!selectedOrder?.is_placeholder && !selectedWhatsAppId)}
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

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
import { ManageTeamsAccountsDialog } from './ManageTeamsAccountsDialog';
import { cn } from '@/lib/utils';
import { usePreventUnload } from '@/hooks/use-prevent-unload';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface TeamsAccount {
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
  const [selectedTeamsId, setSelectedTeamsId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [teamsAccounts, setTeamsAccounts] = useState<TeamsAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);
  const [manageTeamsOpen, setManageTeamsOpen] = useState(false);

  usePreventUnload(open);

  useEffect(() => {
    if (open && employee) {
      fetchOrdersAndAccounts();
      setSelectedOrderId('');
      setSelectedTeamsId('');
      setOrderSearchOpen(false);
    }
  }, [open, employee]);

  // Reset Teams selection when order changes
  useEffect(() => {
    if (selectedOrderId) {
      const selectedOrder = orders.find(order => order.id === selectedOrderId);
      if (selectedOrder && !selectedOrder.is_placeholder) {
        // Pre-select default Teams account for non-placeholder orders
        const defaultAccount = teamsAccounts.find(account => account.is_default);
        if (defaultAccount) {
          setSelectedTeamsId(defaultAccount.id);
        } else {
          setSelectedTeamsId('');
        }
      } else {
        setSelectedTeamsId('');
      }
    } else {
      setSelectedTeamsId('');
    }
  }, [selectedOrderId, orders, teamsAccounts]);

  const fetchOrdersAndAccounts = async () => {
    if (!employee) return;

    try {
      setLoadingOrders(true);
      setLoadingAccounts(true);

      // Fetch all orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, title, provider, project_goal, premium, is_placeholder, whatsapp_account_id, created_at')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        toast.error('Fehler beim Laden der Aufträge');
        return;
      }

      // Fetch assignments for this employee
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('order_assignments')
        .select('order_id')
        .eq('employee_id', employee.id);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        toast.error('Fehler beim Laden der Zuweisungen');
        return;
      }

      // Filter out already assigned orders
      const assignedOrderIds = new Set(assignmentsData.map(assignment => assignment.order_id));
      const availableOrders = ordersData.filter(order => !assignedOrderIds.has(order.id));
      
      setOrders(availableOrders);
      setLoadingOrders(false);

      // Fetch Teams accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (accountsError) {
        console.error('Error fetching Teams accounts:', accountsError);
        toast.error('Fehler beim Laden der Teams-Konten');
        return;
      }

      setTeamsAccounts(accountsData || []);
      setLoadingAccounts(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Fehler beim Laden der Daten');
      setLoadingOrders(false);
      setLoadingAccounts(false);
    }
  };

  const handleTeamsAccountsUpdated = () => {
    fetchTeamsAccounts();
  };

  const fetchTeamsAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error fetching Teams accounts:', error);
        toast.error('Fehler beim Laden der Teams-Konten');
        return;
      }

      setTeamsAccounts(data || []);
    } catch (error) {
      console.error('Error fetching Teams accounts:', error);
      toast.error('Fehler beim Laden der Teams-Konten');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const selectedOrder = orders.find(order => order.id === selectedOrderId);

  const handleAssign = async () => {
    if (!employee || !selectedOrderId || (!selectedOrder?.is_placeholder && !selectedTeamsId)) {
      const missingFields = [];
      if (!selectedOrderId) missingFields.push('Auftrag');
      if (!selectedOrder?.is_placeholder && !selectedTeamsId) missingFields.push('Teams-Konto');
      
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

      // Update order with Teams account (only for non-placeholder orders)
      if (!selectedOrder?.is_placeholder && selectedTeamsId) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ whatsapp_account_id: selectedTeamsId })
          .eq('id', selectedOrderId);

        if (updateError) {
          console.error('Error updating order with Teams account:', updateError);
          toast.error('Auftrag zugewiesen, aber Fehler beim Teams-Konto');
        }
      }

      toast.success('Auftrag erfolgreich zugewiesen');

      // Send assignment notification email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-employee-email', {
          body: {
            employee_email: employee.email,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            type: 'assignment',
            order_data: {
              title: selectedOrder.title,
              order_number: selectedOrder.order_number,
              provider: selectedOrder.provider,
            },
          },
        });

        if (emailError) {
          console.error('Error sending assignment notification email:', emailError);
          // Don't show error to user, just log it
        }
      } catch (emailError) {
        console.error('Error sending assignment notification email:', emailError);
        // Don't show error to user, just log it
      }

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
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedOrderId === order.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                              <span>{order.order_number} - {order.title}</span>
                              <Badge variant={order.is_placeholder ? "secondary" : "default"} className="text-xs">
                                {order.is_placeholder ? "Platzhalter" : "Standard"}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">{order.provider} • {order.premium.toFixed(2)}€</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Teams Account Selection - Only for non-placeholder orders */}
          {selectedOrder && !selectedOrder.is_placeholder && (
            <div className="space-y-2">
              <Label htmlFor="teams" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Teams-Konto auswählen *
              </Label>
              <Select 
                value={selectedTeamsId} 
                onValueChange={setSelectedTeamsId}
                disabled={loadingAccounts}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={loadingAccounts ? "Lädt..." : "Teams-Konto auswählen"} />
                </SelectTrigger>
                <SelectContent className="bg-popover border">
                  {teamsAccounts.map((account) => (
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
                  onClick={() => setManageTeamsOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Teams-Konten verwalten
                </Button>
              </div>
            </div>
          )}

          {/* Info for placeholder orders */}
          {selectedOrder && selectedOrder.is_placeholder && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Platzhalterauftrag:</strong> Dieser Auftrag wird direkt auf der Plattform durchgeführt. 
                Eine Teams-Zuweisung ist nicht erforderlich.
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
              disabled={loading || !selectedOrderId || (!selectedOrder?.is_placeholder && !selectedTeamsId)}
            >
              {loading ? 'Zuweisen...' : 'Zuweisen'}
            </Button>
          </div>
        </div>

        {/* Teams Management Dialog */}
        <ManageTeamsAccountsDialog 
          open={manageTeamsOpen}
          onOpenChange={setManageTeamsOpen}
          onAccountsUpdated={handleTeamsAccountsUpdated}
        />
      </DialogContent>
    </Dialog>
  );
}

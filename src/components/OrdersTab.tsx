import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateOrderDialog } from './CreateOrderDialog';
import { AssignOrderDialog } from './AssignOrderDialog';
import { AssignedEmployeesDialog } from './AssignedEmployeesDialog';
import { EditOrderDialog } from './EditOrderDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn, formatCurrencyEUR } from '@/lib/utils';
import { Briefcase, Users, Euro, UserPlus, Edit, Eye } from 'lucide-react';

interface WhatsAppAccount {
  id: string;
  name: string;
  account_info: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
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
  whatsapp_account_id: string | null;
  created_at: string;
  updated_at: string;
  whatsapp_accounts: WhatsAppAccount | null;
  order_evaluation_questions: Array<{
    id: string;
    question: string;
  }>;
  order_assignments: Array<{
    id: string;
    employee_id: string;
    status: string;
    assigned_at: string;
    employees: Employee;
  }>;
}

export function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assignedEmployeesDialogOpen, setAssignedEmployeesDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchEmployees();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          whatsapp_accounts (
            id,
            name,
            account_info
          ),
          order_evaluation_questions (
            id,
            question
          ),
          order_assignments (
            id,
            employee_id,
            status,
            assigned_at,
            employees (
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
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
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .in('status', ['created', 'imported', 'contract_received'])
        .order('first_name');

      if (error) {
        console.error('Error fetching employees:', error);
        toast.error('Fehler beim Laden der Mitarbeiter');
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Fehler beim Laden der Mitarbeiter');
    }
  };

  const handleOpenAssignDialog = (order: Order) => {
    setSelectedOrder(order);
    setAssignDialogOpen(true);
  };

  const handleOpenAssignedEmployeesDialog = (order: Order) => {
    setSelectedOrder(order);
    setAssignedEmployeesDialogOpen(true);
  };

  const handleOpenEditDialog = (order: Order) => {
    setSelectedOrder(order);
    setEditDialogOpen(true);
  };

  const handleAssignmentComplete = () => {
    fetchOrders(); // Refresh to show the assignment
  };

  const getAssignedEmployees = (order: Order) => {
    return order.order_assignments.map(assignment => ({
      ...assignment.employees,
      assignment_status: assignment.status,
      assigned_at: assignment.assigned_at
    }));
  };

  const getAvailableEmployees = (order: Order) => {
    const assignedEmployeeIds = order.order_assignments.map(a => a.employee_id);
    return employees.filter(emp => !assignedEmployeeIds.includes(emp.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt Aufträge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-semibold text-foreground">Aufträge</h3>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Aufträge und weisen Sie diese Mitarbeitern zu
          </p>
        </div>
        <CreateOrderDialog onOrderCreated={fetchOrders} />
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gesamt Aufträge</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Briefcase className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{orders.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Alle Aufträge</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zugewiesene Aufträge</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {orders.filter(order => order.order_assignments.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              von {orders.length} Aufträgen
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gesamt Prämien</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Euro className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrencyEUR(orders.reduce((sum, order) => sum + order.premium, 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gesamtwert</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Alle Aufträge</CardTitle>
          <CardDescription>
            Übersicht aller Aufträge mit Zuweisungsmöglichkeiten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-foreground mb-2">Noch keine Aufträge vorhanden</h4>
              <p className="text-sm text-muted-foreground">
                Erstellen Sie Ihren ersten Auftrag mit dem Button oben
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auftragsnummer</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Anbieter</TableHead>
                  <TableHead>Prämie</TableHead>
                  <TableHead>Platzhalter</TableHead>
                  <TableHead>Zugewiesene Mitarbeiter</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const assignedEmployees = getAssignedEmployees(order);
                  const availableEmployees = getAvailableEmployees(order);
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.title}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {order.project_goal}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{order.provider}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">
                          {formatCurrencyEUR(order.premium)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <span 
                            className={cn(
                              "inline-block h-2.5 w-2.5 rounded-full",
                              order.is_placeholder ? "bg-blue-500" : "bg-green-500"
                            )}
                            title={order.is_placeholder ? "Platzhalterauftrag" : "Kein Platzhalterauftrag"}
                          />
                          <span className="sr-only">
                            {order.is_placeholder ? "Platzhalterauftrag" : "Kein Platzhalterauftrag"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignedEmployees.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAssignedEmployeesDialog(order)}
                            className="flex items-center gap-2"
                          >
                            <Users className="h-4 w-4" />
                            {assignedEmployees.length} Mitarbeiter
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">Nicht zugewiesen</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAssignDialog(order)}
                            className="flex items-center gap-2"
                          >
                            <UserPlus className="h-4 w-4" />
                            {availableEmployees.length > 0 ? 'Zuweisen' : 'Mitarbeiter'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditDialog(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <AssignOrderDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        order={selectedOrder}
        availableEmployees={selectedOrder ? getAvailableEmployees(selectedOrder) : []}
        onAssignmentComplete={handleAssignmentComplete}
      />

      {/* Assigned Employees Dialog */}
      <AssignedEmployeesDialog
        open={assignedEmployeesDialogOpen}
        onOpenChange={setAssignedEmployeesDialogOpen}
        order={selectedOrder}
        assignedEmployees={selectedOrder ? getAssignedEmployees(selectedOrder) : []}
      />

      {/* Edit Order Dialog */}
      <EditOrderDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        order={selectedOrder}
        onOrderUpdated={fetchOrders}
      />
    </div>
  );
}
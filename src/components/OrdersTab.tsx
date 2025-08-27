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
    return order.order_assignments.map(assignment => assignment.employees);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Aufträge</h3>
          <p className="text-muted-foreground">
            Verwalten Sie Aufträge und weisen Sie diese Mitarbeitern zu
          </p>
        </div>
        <CreateOrderDialog onOrderCreated={fetchOrders} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Aufträge</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zugewiesene Aufträge</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(order => order.order_assignments.length > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Prämien</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.reduce((sum, order) => sum + order.premium, 0).toFixed(2)}€
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Aufträge</CardTitle>
          <CardDescription>
            Übersicht aller Aufträge mit Zuweisungsmöglichkeiten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Noch keine Aufträge vorhanden</p>
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
                  <TableHead>Bewertungsfragen</TableHead>
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
                        <Badge variant="secondary">
                          {order.premium.toFixed(2)}€
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.order_evaluation_questions.length} Fragen
                        </Badge>
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
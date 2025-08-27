import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';
import { usePreventUnload } from '@/hooks/use-prevent-unload';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  assignment_status?: string;
  assigned_at?: string;
}

interface Order {
  id: string;
  title: string;
  order_number: string;
  is_placeholder: boolean;
}

interface AssignedEmployeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  assignedEmployees: Employee[];
}

export function AssignedEmployeesDialog({ 
  open, 
  onOpenChange, 
  order, 
  assignedEmployees 
}: AssignedEmployeesDialogProps) {
  if (!order) return null;

  usePreventUnload(open);

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">Zugewiesen</Badge>;
    
    switch (status) {
      case 'assigned':
        return <Badge variant="secondary">Zugewiesen</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Bearbeitung</Badge>;
      case 'evaluated':
        return <Badge variant="outline">Bewertet</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Abgeschlossen</Badge>;
      default:
        return <Badge variant="secondary">Zugewiesen</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Zugewiesene Mitarbeiter - {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <strong>Auftrag:</strong> {order.title}
          </div>

          {assignedEmployees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Keine Mitarbeiter zugewiesen</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      {getStatusBadge(employee.assignment_status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
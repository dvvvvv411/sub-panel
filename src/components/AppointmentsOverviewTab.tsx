
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AppointmentWithDetails {
  id: string;
  scheduled_at: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  orders: {
    id: string;
    title: string;
    order_number: string;
    premium: number;
    provider: string;
  };
  employees: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const AppointmentsOverviewTab = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAppointments();
    
    // Listen for real-time updates
    const channel = supabase
      .channel('appointments-overview')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_appointments'
        },
        () => {
          console.log('Appointments updated, refetching...');
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('order_appointments')
        .select(`
          *,
          orders (
            id,
            title,
            order_number,
            premium,
            provider
          ),
          employees (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Fehler beim Laden der Termine');
        return;
      }

      setAppointments(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const approveAppointment = async (appointmentId: string, orderId: string, employeeId: string) => {
    try {
      // Update appointment status
      const { error: appointmentError } = await supabase
        .from('order_appointments')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile?.user_id
        })
        .eq('id', appointmentId);

      if (appointmentError) {
        console.error('Error approving appointment:', appointmentError);
        toast.error('Fehler beim Genehmigen des Termins');
        return;
      }

      // Ensure order assignment exists
      const { data: existingAssignment } = await supabase
        .from('order_assignments')
        .select('id')
        .eq('order_id', orderId)
        .eq('employee_id', employeeId)
        .single();

      if (!existingAssignment) {
        const { error: assignmentError } = await supabase
          .from('order_assignments')
          .insert({
            order_id: orderId,
            employee_id: employeeId,
            assigned_by: profile?.user_id,
            status: 'assigned'
          });

        if (assignmentError) {
          console.error('Error creating assignment:', assignmentError);
          toast.error('Fehler beim Erstellen der Auftragszuweisung');
          return;
        }
      }

      toast.success('Termin erfolgreich genehmigt');
      fetchAppointments();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    }
  };

  const rejectAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('order_appointments')
        .update({
          status: 'rejected',
          approved_by: profile?.user_id
        })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error rejecting appointment:', error);
        toast.error('Fehler beim Ablehnen des Termins');
        return;
      }

      toast.success('Termin abgelehnt');
      fetchAppointments();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (statusFilter === 'all') return true;
    return appointment.status === statusFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Genehmigt</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Abgelehnt</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt Termine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Termine</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Genehmigt</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'approved').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abgelehnt</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Terminübersicht</CardTitle>
              <CardDescription>
                Verwalten Sie alle gebuchten Termine
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Genehmigt</SelectItem>
                <SelectItem value="rejected">Abgelehnt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mitarbeiter</TableHead>
                <TableHead>Auftrag</TableHead>
                <TableHead>Termin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {appointment.employees.first_name} {appointment.employees.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.employees.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{appointment.orders.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.orders.order_number} • {appointment.orders.premium}€
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {format(new Date(appointment.scheduled_at), 'dd.MM.yyyy', { locale: de })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(appointment.scheduled_at), 'HH:mm', { locale: de })} Uhr
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(appointment.status)}
                      {getStatusBadge(appointment.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(appointment.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </TableCell>
                  <TableCell>
                    {appointment.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveAppointment(
                            appointment.id,
                            appointment.orders.id,
                            appointment.employees.id
                          )}
                        >
                          Genehmigen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectAppointment(appointment.id)}
                        >
                          Ablehnen
                        </Button>
                      </div>
                    )}
                    {appointment.status === 'approved' && (
                      <Badge variant="outline" className="text-green-700">
                        Genehmigt
                      </Badge>
                    )}
                    {appointment.status === 'rejected' && (
                      <Badge variant="outline" className="text-red-700">
                        Abgelehnt
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAppointments.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {statusFilter === 'all' ? 'Keine Termine gefunden' : `Keine Termine mit Status "${statusFilter}" gefunden`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

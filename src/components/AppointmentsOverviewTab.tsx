
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, User, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  approved_at: string | null;
  feedback_requested: boolean;
  created_at: string;
  orders: {
    id: string;
    title: string;
    order_number: string;
    premium: number;
  };
  employees: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const AppointmentsOverviewTab = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [requestingFeedback, setRequestingFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
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
            premium
          ),
          employees (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('scheduled_at', { ascending: false });

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

  const requestFeedback = async (appointmentId: string) => {
    try {
      setRequestingFeedback(appointmentId);
      
      const { error } = await supabase
        .from('order_appointments')
        .update({ feedback_requested: true })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error requesting feedback:', error);
        toast.error('Fehler beim Anfordern des Feedbacks');
        return;
      }

      toast.success('Feedback erfolgreich angefordert');
      fetchAppointments();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setRequestingFeedback(null);
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (statusFilter === 'all') return true;
    return appointment.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Bestätigt</Badge>;
      case 'pending':
        return <Badge variant="secondary">Ausstehend</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Abgelehnt</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Terminübersicht
          </CardTitle>
          <CardDescription>
            Alle gebuchten Termine der Mitarbeiter im Überblick
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status filtern:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="approved">Bestätigt</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead>Auftrag</TableHead>
                  <TableHead>Datum & Zeit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {statusFilter === 'all' 
                        ? 'Keine Termine gefunden' 
                        : `Keine ${statusFilter === 'approved' ? 'bestätigten' : statusFilter === 'pending' ? 'ausstehenden' : 'abgelehnten'} Termine gefunden`
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {appointment.employees.first_name} {appointment.employees.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {appointment.employees.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <p className="font-medium">{appointment.orders.title}</p>
                          <p className="text-xs text-muted-foreground">
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
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(appointment.scheduled_at), 'HH:mm', { locale: de })} Uhr
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(appointment.status)}
                      </TableCell>
                      
                      <TableCell>
                        {appointment.feedback_requested ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Angefordert
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Nicht angefordert
                          </Badge>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {appointment.status === 'approved' && !appointment.feedback_requested ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => requestFeedback(appointment.id)}
                            disabled={requestingFeedback === appointment.id}
                            className="flex items-center gap-2"
                          >
                            <MessageCircle className="h-3 w-3" />
                            {requestingFeedback === appointment.id ? 'Wird angefordert...' : 'Feedback'}
                          </Button>
                        ) : appointment.feedback_requested ? (
                          <span className="text-sm text-muted-foreground">Feedback angefordert</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {appointment.status === 'pending' ? 'Ausstehend' : 'Nicht verfügbar'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

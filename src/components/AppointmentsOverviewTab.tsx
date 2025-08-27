
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, User, MessageCircle, History } from 'lucide-react';
import { format, startOfDay, isAfter, isSameDay } from 'date-fns';
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

interface OrderEvaluation {
  id: string;
  order_id: string;
  employee_id: string;
  status: string;
  created_at: string;
}

export const AppointmentsOverviewTab = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [evaluations, setEvaluations] = useState<OrderEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [requestingFeedback, setRequestingFeedback] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetchAppointments();
    
    // Real-time subscription for evaluations
    const evaluationsChannel = supabase
      .channel('order_evaluations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_evaluations'
        },
        () => {
          fetchAppointments(); // Refresh data when evaluations change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(evaluationsChannel);
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
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
        .order('scheduled_at', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        toast.error('Fehler beim Laden der Termine');
        return;
      }

      // Fetch evaluations
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('order_evaluations')
        .select('id, order_id, employee_id, status, created_at')
        .order('created_at', { ascending: false });

      if (evaluationsError) {
        console.error('Error fetching evaluations:', evaluationsError);
        toast.error('Fehler beim Laden der Bewertungen');
        return;
      }

      setAppointments(appointmentsData || []);
      setEvaluations(evaluationsData || []);
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

  // Get display status that prioritizes evaluation status over appointment status
  const getDisplayStatus = (appointment: Appointment): string => {
    // Find the latest evaluation for this order and employee
    const evaluation = evaluations.find(evaluation => 
      evaluation.order_id === appointment.orders.id && 
      evaluation.employee_id === appointment.employees.id
    );

    if (evaluation) {
      return evaluation.status; // 'pending', 'approved', or 'rejected' from evaluation
    }

    return appointment.status; // Original appointment status
  };

  const filteredAppointments = appointments
    .filter(appointment => {
      // Status filter using display status instead of appointment status
      const displayStatus = getDisplayStatus(appointment);
      if (statusFilter !== 'all' && displayStatus !== statusFilter) {
        return false;
      }
      
      // Past appointments filter
      const appointmentDate = new Date(appointment.scheduled_at);
      const today = startOfDay(new Date());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // If not showing past, hide appointments from yesterday and before
      if (!showPast && appointmentDate < yesterday) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduled_at);
      const dateB = new Date(b.scheduled_at);
      const now = new Date();
      
      // First sort by whether they're future or past
      const aIsFuture = dateA >= now;
      const bIsFuture = dateB >= now;
      
      if (aIsFuture && !bIsFuture) return -1;
      if (!aIsFuture && bIsFuture) return 1;
      
      // For future appointments: ascending (earliest first)
      // For past appointments: descending (latest first)
      if (aIsFuture && bIsFuture) {
        return dateA.getTime() - dateB.getTime(); // ascending
      } else {
        return dateB.getTime() - dateA.getTime(); // descending
      }
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Abgeschlossen</Badge>;
      case 'pending':
        return <Badge variant="secondary">In Überprüfung</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Abgelehnt</Badge>;
      default:
        return <Badge variant="outline">{status === 'approved' ? 'Bestätigt' : status}</Badge>;
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
                  <SelectItem value="approved">Abgeschlossen</SelectItem>
                  <SelectItem value="pending">In Überprüfung</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPast(!showPast)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              {showPast ? 'Vergangene ausblenden' : 'Vergangene anzeigen'}
            </Button>
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
                        : `Keine ${statusFilter === 'approved' ? 'abgeschlossenen' : statusFilter === 'pending' ? 'in Überprüfung befindlichen' : 'abgelehnten'} Termine gefunden`
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
                        {getStatusBadge(getDisplayStatus(appointment))}
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

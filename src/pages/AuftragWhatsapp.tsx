
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, MessageCircle, CheckCircle2, ArrowLeft, ChevronLeft, Star } from 'lucide-react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';

interface OrderWithWhatsApp {
  id: string;
  title: string;
  order_number: string;
  premium: number;
  provider: string;
  whatsapp_accounts: {
    id: string;
    name: string;
    chat_link: string | null;
  } | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Appointment {
  id: string;
  scheduled_at: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  feedback_requested: boolean;
}

interface EvaluationQuestion {
  id: string;
  question: string;
}

interface OrderEvaluation {
  id: string;
  rating: number;
  overall_comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  premium_awarded: number;
}

const AuftragWhatsapp = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<OrderWithWhatsApp | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState<'date' | 'time'>('date');
  
  // Evaluation states
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [evaluation, setEvaluation] = useState<OrderEvaluation | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [overallComment, setOverallComment] = useState<string>('');
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);

  // Generate time slots from 08:00 to 18:00 in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute of [0, 30]) {
        if (hour === 18 && minute === 30) break; // Stop at 18:00
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const isTimeSlotDisabled = (timeStr: string) => {
    if (!selectedDate || !isToday(selectedDate)) return false;
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    
    return isBefore(slotTime, new Date());
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setSelectedTime('');
      setBookingStep('time');
    }
  };

  const handleBackToDateSelection = () => {
    setBookingStep('date');
    setSelectedTime('');
  };

  useEffect(() => {
    if (!orderId || !user) return;
    
    fetchOrderAndEmployee();
  }, [orderId, user]);

  useEffect(() => {
    if (!appointment) return;

    // Listen for feedback requests
    const channel = supabase
      .channel('appointment-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_appointments',
          filter: `id=eq.${appointment.id}`
        },
        (payload) => {
          console.log('Appointment updated:', payload);
          const newAppointment = payload.new as Appointment;
          setAppointment(newAppointment);
          
          if (newAppointment.feedback_requested && !appointment.feedback_requested) {
            toast.success('Feedback wurde angefordert! Bitte füllen Sie den Bewertungsbogen aus.');
            fetchEvaluationQuestions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointment]);

  const fetchOrderAndEmployee = async () => {
    try {
      setLoading(true);

      // Get employee by email
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user?.email)
        .single();

      if (employeeError) {
        console.error('Error fetching employee:', employeeError);
        toast.error('Fehler beim Laden der Mitarbeiterdaten');
        return;
      }

      setEmployee(employeeData);

      // Check if employee is assigned to this order
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('order_assignments')
        .select('*')
        .eq('order_id', orderId)
        .eq('employee_id', employeeData.id)
        .single();

      if (assignmentError) {
        console.error('Error checking assignment:', assignmentError);
        toast.error('Sie sind diesem Auftrag nicht zugewiesen');
        navigate('/mitarbeiter');
        return;
      }

      // Get order with WhatsApp account
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          whatsapp_accounts (
            id,
            name,
            chat_link
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        toast.error('Fehler beim Laden des Auftrags');
        return;
      }

      if (!orderData.whatsapp_account_id) {
        toast.error('Dieser Auftrag hat kein WhatsApp-Konto verknüpft');
        navigate(`/auftrag/${orderId}`);
        return;
      }

      setOrder(orderData);

      // Check if employee already has an appointment for this order
      const { data: existingAppointment } = await supabase
        .from('order_appointments')
        .select('*')
        .eq('order_id', orderId)
        .eq('employee_id', employeeData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingAppointment) {
        setAppointment(existingAppointment as Appointment);
        const appointmentDate = new Date(existingAppointment.scheduled_at);
        setSelectedDate(appointmentDate);
        setSelectedTime(format(appointmentDate, 'HH:mm'));

        // If feedback is requested, load evaluation questions
        if (existingAppointment.feedback_requested) {
          fetchEvaluationQuestions();
          fetchExistingEvaluation(existingAppointment.id, employeeData.id, orderId);
        }
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluationQuestions = async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from('order_evaluation_questions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching questions:', error);
        return;
      }

      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchExistingEvaluation = async (appointmentId: string, employeeId: string, orderId: string) => {
    try {
      const { data } = await supabase
        .from('order_evaluations')
        .select('*')
        .eq('order_id', orderId)
        .eq('employee_id', employeeId)
        .single();

      if (data) {
        setEvaluation(data as OrderEvaluation);
        setRating(data.rating);
        setOverallComment(data.overall_comment || '');
      }
    } catch (error) {
      console.error('Error fetching existing evaluation:', error);
    }
  };

  const bookAppointment = async () => {
    if (!selectedDate || !selectedTime || !employee || !order) return;

    try {
      setBooking(true);

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const { data, error } = await supabase
        .from('order_appointments')
        .insert({
          order_id: order.id,
          employee_id: employee.id,
          scheduled_at: scheduledAt.toISOString(),
          status: 'approved',
          approved_at: new Date().toISOString(),
          feedback_requested: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error booking appointment:', error);
        toast.error('Fehler beim Buchen des Termins');
        return;
      }

      setAppointment(data as Appointment);
      toast.success('Termin erfolgreich gebucht und bestätigt!');

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setBooking(false);
    }
  };

  const submitEvaluation = async () => {
    if (!appointment || !employee || !order || rating === 0) return;

    try {
      setSubmittingEvaluation(true);

      const evaluationData = {
        order_id: order.id,
        employee_id: employee.id,
        assignment_id: appointment.id,
        rating,
        overall_comment: overallComment || null,
        status: 'pending' as const
      };

      let result;
      if (evaluation) {
        // Update existing evaluation
        result = await supabase
          .from('order_evaluations')
          .update(evaluationData)
          .eq('id', evaluation.id)
          .select()
          .single();
      } else {
        // Create new evaluation
        result = await supabase
          .from('order_evaluations')
          .insert(evaluationData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error submitting evaluation:', result.error);
        toast.error('Fehler beim Einreichen der Bewertung');
        return;
      }

      toast.success('Bewertung erfolgreich eingereicht!');
      setTimeout(() => {
        navigate('/mitarbeiter');
      }, 1500);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setSubmittingEvaluation(false);
    }
  };

  const openWhatsAppChat = () => {
    if (!order?.whatsapp_accounts?.chat_link) {
      toast.error('WhatsApp-Link ist nicht verfügbar');
      return;
    }
    window.open(order.whatsapp_accounts.chat_link, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!order || !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Auftrag nicht gefunden oder keine Berechtigung.</p>
            <Button onClick={() => navigate('/mitarbeiter')} className="mt-4">
              Zurück zur Übersicht
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDateDisabled = (date: Date) => {
    return isBefore(startOfDay(date), startOfDay(new Date()));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/mitarbeiter')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">WhatsApp Auftrag</h1>
            <p className="text-muted-foreground">
              {order.title} - {order.order_number}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Auftragsinformationen */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                Auftragsinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Titel</p>
                <p className="font-medium">{order.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auftragsnummer</p>
                <p className="font-medium">{order.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Anbieter</p>
                <p className="font-medium">{order.provider}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prämie</p>
                <p className="font-medium">{order.premium}€</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp-Konto</p>
                <p className="font-medium">{order.whatsapp_accounts?.name}</p>
              </div>
            </CardContent>
          </Card>

          {/* Terminbuchung oder Status */}
          {!appointment ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Termin buchen
                </CardTitle>
                <CardDescription>
                  {bookingStep === 'date' 
                    ? 'Schritt 1/2 – Wählen Sie ein Datum'
                    : 'Schritt 2/2 – Wählen Sie eine Uhrzeit'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {bookingStep === 'date' ? (
                  <div>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={isDateDisabled}
                      locale={de}
                      className="rounded-md border p-3 pointer-events-auto"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Gewähltes Datum</p>
                        <p className="font-medium">
                          {selectedDate && format(selectedDate, 'dd. MMMM yyyy', { locale: de })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToDateSelection}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Zurück
                      </Button>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-3">Verfügbare Zeiten</p>
                      <div className="grid grid-cols-3 gap-2">
                        {timeSlots.map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? "default" : "outline"}
                            size="sm"
                            disabled={isTimeSlotDisabled(time)}
                            onClick={() => setSelectedTime(time)}
                            className="text-xs"
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={bookAppointment}
                      disabled={!selectedDate || !selectedTime || booking}
                      className="w-full mt-4"
                    >
                      {booking ? 'Buche Termin...' : 'Termin buchen'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Ihr Termin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {format(new Date(appointment.scheduled_at), 'dd. MMMM yyyy', { locale: de })}
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {format(new Date(appointment.scheduled_at), 'HH:mm')} Uhr
                  </div>
                </div>

                <div className="flex justify-center">
                  <Badge variant="default">
                    Bestätigt
                  </Badge>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">Termin bestätigt!</p>
                      <p className="text-sm text-green-700 mt-1">
                        Sie werden den Auftrag am {format(new Date(appointment.scheduled_at), 'dd.MM.yyyy um HH:mm', { locale: de })} Uhr über WhatsApp durchführen.
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={openWhatsAppChat}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700"
                    disabled={!order.whatsapp_accounts?.chat_link}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Zum WhatsApp Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bewertungsformular - nur anzeigen wenn feedback_requested */}
        {appointment?.feedback_requested && (
          <Card>
            <CardHeader>
              <CardTitle>Bewertung erforderlich</CardTitle>
              <CardDescription>
                Bitte bewerten Sie Ihre Erfahrung mit diesem Auftrag.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bewertung mit Sternen */}
              <div>
                <label className="text-sm font-medium">Gesamtbewertung *</label>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">
                    {rating > 0 ? `${rating} von 5 Sternen` : 'Keine Bewertung'}
                  </span>
                </div>
              </div>

              {/* Gesamtkommentar */}
              <div>
                <label className="text-sm font-medium">
                  Gesamtkommentar
                </label>
                <Textarea
                  value={overallComment}
                  onChange={(e) => setOverallComment(e.target.value)}
                  placeholder="Teilen Sie Ihre Erfahrungen mit diesem Auftrag..."
                  className="mt-2"
                  rows={4}
                />
              </div>

              {/* Fragen */}
              {questions.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Zusätzliche Fragen</label>
                  <div className="space-y-3 mt-2">
                    {questions.map((question) => (
                      <div key={question.id} className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{question.question}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          (Diese Fragen werden in einem zukünftigen Update bearbeitbar sein)
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={submitEvaluation}
                  disabled={rating === 0 || submittingEvaluation}
                  className="flex-1"
                >
                  {submittingEvaluation ? 'Wird eingereicht...' : 'Bewertung einreichen'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AuftragWhatsapp;

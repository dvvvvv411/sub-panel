
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, MessageCircle, CheckCircle2, ArrowLeft, ChevronLeft, Star, AlertCircle } from 'lucide-react';
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
  email: string;
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
  details: Record<string, any> | null;
}

const AuftragWhatsapp = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Refs to control initialization and reload behavior
  const hasInitializedRef = useRef(false);
  const hasReloadedOnFeedbackRef = useRef(false);
  
  const [order, setOrder] = useState<OrderWithWhatsApp | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState<'date' | 'time'>('date');
  
  // Evaluation states
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [evaluation, setEvaluation] = useState<OrderEvaluation | null>(null);
  const [questionResponses, setQuestionResponses] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);

  // Generate time slots: 11:00-14:00 and 19:00-21:00 in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    
    // First block: 11:00 - 14:00
    for (let hour = 11; hour <= 14; hour++) {
      for (let minute of [0, 30]) {
        if (hour === 14 && minute === 30) break; // Stop at 14:00
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    
    // Second block: 19:00 - 21:00
    for (let hour = 19; hour <= 21; hour++) {
      for (let minute of [0, 30]) {
        if (hour === 21 && minute === 30) break; // Stop at 21:00
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
    if (!orderId || !user || hasInitializedRef.current) return;
    
    hasInitializedRef.current = true;
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
            
            // Trigger single reload when feedback is requested (admin action)
            if (!hasReloadedOnFeedbackRef.current) {
              hasReloadedOnFeedbackRef.current = true;
              window.location.reload();
              return;
            }
            
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
      // Only show loading overlay on initial load, not on tab switches
      if (!hasInitializedRef.current) {
        setLoading(true);
      }

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

      // Store assignment ID for evaluation
      setAssignmentId(assignmentData.id);

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
          fetchExistingEvaluation(employeeData.id, orderId, assignmentData.id);
        }
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      // Only update loading state if it was actually loading
      if (loading) {
        setLoading(false);
      }
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

      // Initialize question responses
      const initialResponses: Record<string, { rating: number; comment: string }> = {};
      data?.forEach(q => {
        initialResponses[q.id] = { rating: 0, comment: '' };
      });
      setQuestionResponses(initialResponses);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchExistingEvaluation = async (employeeId: string, orderId: string, assignmentId: string) => {
    try {
      const { data } = await supabase
        .from('order_evaluations')
        .select('*')
        .eq('assignment_id', assignmentId)
        .maybeSingle();

      if (data) {
        setEvaluation(data as OrderEvaluation);
        
        // Prefill question responses from existing evaluation details
        if (data.details && questions.length > 0) {
          const updatedResponses: Record<string, { rating: number; comment: string }> = {};
          questions.forEach(q => {
            const detail = data.details[q.id];
            updatedResponses[q.id] = {
              rating: detail?.rating || 0,
              comment: detail?.comment || ''
            };
          });
          setQuestionResponses(updatedResponses);
        }
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

      // Send appointment confirmation email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-employee-email', {
          body: {
            employee_email: employee.email,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            type: 'appointment_confirmation',
            appointment_data: {
              scheduled_at: scheduledAt.toISOString(),
            },
          },
        });

        if (emailError) {
          console.error('Error sending appointment confirmation email:', emailError);
          // Don't show error to user, just log it
        }
      } catch (emailError) {
        console.error('Error sending appointment confirmation email:', emailError);
        // Don't show error to user, just log it
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setBooking(false);
    }
  };

  const submitEvaluation = async () => {
    if (!assignmentId || !employee || !order) return;

    // Validate question ratings
    for (const question of questions) {
      if (questionResponses[question.id]?.rating === 0) {
        toast.error(`Bitte bewerten Sie: ${question.question}`);
        return;
      }
    }

    try {
      setSubmittingEvaluation(true);

      // Prepare evaluation details
      const evaluationDetails = questions.reduce((acc, question) => {
        acc[question.id] = {
          question: question.question,
          rating: questionResponses[question.id].rating,
          comment: questionResponses[question.id].comment
        };
        return acc;
      }, {} as Record<string, any>);

      // Calculate derived rating from question averages
      const derivedRating = questions.length > 0 
        ? Math.round(questions.reduce((sum, q) => sum + questionResponses[q.id].rating, 0) / questions.length)
        : 5;

      const evaluationData = {
        order_id: order.id,
        employee_id: employee.id,
        assignment_id: assignmentId,
        rating: derivedRating,
        overall_comment: null,
        details: evaluationDetails,
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

      // The trigger will automatically update assignment status to 'evaluated'
      toast.success('Bewertung erfolgreich eingereicht!');
      navigate('/mitarbeiter');

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

  // Add useEffect to prefill existing evaluation when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && evaluation && evaluation.details) {
      const updatedResponses: Record<string, { rating: number; comment: string }> = {};
      questions.forEach(q => {
        const detail = evaluation.details[q.id];
        updatedResponses[q.id] = {
          rating: detail?.rating || 0,
          comment: detail?.comment || ''
        };
      });
      setQuestionResponses(updatedResponses);
    }
  }, [questions, evaluation]);

  const StarRating = ({ rating, onRatingChange, disabled = false }: { 
    rating: number; 
    onRatingChange: (rating: number) => void;
    disabled?: boolean;
  }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !disabled && onRatingChange(star)}
            disabled={disabled}
            className={`p-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'} transition-transform`}
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const updateQuestionResponse = (questionId: string, field: 'rating' | 'comment', value: number | string) => {
    setQuestionResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
  };

  const getEvaluationStatusBanner = () => {
    if (!evaluation) return null;

    switch (evaluation.status) {
      case 'pending':
        return (
          <Card className="border-yellow-200 bg-yellow-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Bewertung eingereicht</h4>
                  <p className="text-sm text-yellow-700">
                    Ihre Bewertung wurde erfolgreich eingereicht und wird geprüft. Sie können die Bewertung nicht mehr bearbeiten.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'approved':
        return (
          <Card className="border-green-200 bg-green-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-900">Bewertung genehmigt</h4>
                  <p className="text-sm text-green-700">
                    Ihre Bewertung wurde genehmigt. Der Auftrag ist abgeschlossen.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'rejected':
        return (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h4 className="font-semibold text-red-900">Bewertung abgelehnt</h4>
                  <p className="text-sm text-red-700">
                    Ihre Bewertung wurde abgelehnt. Bitte überarbeiten Sie Ihre Bewertung und reichen Sie sie erneut ein.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  const isFormDisabled = evaluation && ['pending', 'approved'].includes(evaluation.status);
  const isFormEditable = !evaluation || evaluation.status === 'rejected';

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

        {/* Status Banner */}
        {getEvaluationStatusBanner()}

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
                        Sie werden den Auftrag am {format(new Date(appointment.scheduled_at), 'dd.MM.yyyy \'um\' HH:mm', { locale: de })} Uhr über WhatsApp durchführen.
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={openWhatsAppChat}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700"
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
                {isFormDisabled ? 'Ihre eingereichte Bewertung:' : 'Bitte bewerten Sie Ihre Erfahrung mit diesem Auftrag.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Bewertungsfragen */}
              {questions.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Bewertungsfragen</label>
                  <div className="space-y-6 mt-4">
                    {questions.map((question) => (
                      <div key={question.id} className="border-b border-border pb-6 last:border-b-0">
                        <p className="font-medium mb-3">{question.question}</p>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium mb-2">Bewertung</p>
                            <StarRating
                              rating={questionResponses[question.id]?.rating || 0}
                              onRatingChange={(rating) => updateQuestionResponse(question.id, 'rating', rating)}
                              disabled={isFormDisabled}
                            />
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium mb-2">Kommentar (optional)</p>
                            <Textarea
                              value={questionResponses[question.id]?.comment || ''}
                              onChange={(e) => updateQuestionResponse(question.id, 'comment', e.target.value)}
                              placeholder="Erläutern Sie Ihre Bewertung..."
                              rows={2}
                              disabled={isFormDisabled}
                              className={isFormDisabled ? 'bg-muted' : ''}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isFormEditable && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={submitEvaluation}
                    disabled={submittingEvaluation || questions.some(q => questionResponses[q.id]?.rating === 0)}
                    className="flex-1"
                  >
                    {submittingEvaluation ? 'Wird eingereicht...' : 
                     evaluation?.status === 'rejected' ? 'Erneut einreichen' : 'Bewertung einreichen'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AuftragWhatsapp;

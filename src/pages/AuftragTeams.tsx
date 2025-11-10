import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Star, ArrowLeft, Calendar, Clock, AlertCircle, CheckCircle2, MessageCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import teamsLogo from '@/assets/microsoft-teams.svg';

interface OrderWithTeams {
  id: string;
  title: string;
  order_number: string;
  premium: number;
  provider: string;
  project_goal: string;
  instructions: any;
  is_placeholder: boolean;
  teams_accounts: {
    id: string;
    name: string;
    account_info: string | null;
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
  status: string;
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
  details: Record<string, any> | null;
}

const AuftragTeams = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderWithTeams | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluationQuestions, setEvaluationQuestions] = useState<EvaluationQuestion[]>([]);
  const [existingEvaluation, setExistingEvaluation] = useState<OrderEvaluation | null>(null);
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);

  // Appointment booking state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingAppointment, setBookingAppointment] = useState(false);
  const [showTimeSelection, setShowTimeSelection] = useState(false);

  // Evaluation state
  const [questionResponses, setQuestionResponses] = useState<Record<string, { rating: number; comment: string }>>({});

  useEffect(() => {
    if (!orderId || !user) return;
    fetchOrderAndEmployee();
  }, [orderId, user]);

  useEffect(() => {
    if (!orderId || !employee?.id) return;

    const channel = supabase
      .channel(`order_appointments_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_appointments',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Appointment updated:', payload);
          if (payload.new) {
            setAppointment(payload.new as Appointment);
            if ((payload.new as Appointment).feedback_requested) {
              toast.info('Der Admin hat um Feedback gebeten. Bitte bewerten Sie den Auftrag.');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, employee?.id]);

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const isTimeSlotDisabled = (timeSlot: string) => {
    if (!selectedDate) return false;

    const now = new Date();
    const selectedDateTime = new Date(selectedDate);
    const [hours, minutes] = timeSlot.split(':').map(Number);
    selectedDateTime.setHours(hours, minutes, 0, 0);

    return selectedDateTime < now;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime('');
    setShowTimeSelection(true);
  };

  const handleBackToDateSelection = () => {
    setShowTimeSelection(false);
    setSelectedTime('');
  };

  const fetchOrderAndEmployee = async () => {
    try {
      setLoading(true);

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

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          teams_accounts:whatsapp_accounts(id, name, account_info, chat_link)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        toast.error('Fehler beim Laden des Auftrags');
        return;
      }

      if (!orderData.whatsapp_account_id) {
        toast.error('Dieser Auftrag hat kein Teams-Konto verknüpft');
        navigate('/mitarbeiter');
        return;
      }

      setOrder(orderData as OrderWithTeams);

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

      setAssignmentId(assignmentData.id);

      const { data: appointmentData } = await supabase
        .from('order_appointments')
        .select('*')
        .eq('order_id', orderId)
        .eq('employee_id', employeeData.id)
        .maybeSingle();

      if (appointmentData) {
        setAppointment(appointmentData);
      }

      await fetchEvaluationQuestions();
      await fetchExistingEvaluation(assignmentData.id);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluationQuestions = async () => {
    try {
      const { data: questionsData, error: questionsError } = await supabase
        .from('order_evaluation_questions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (questionsError) {
        console.error('Error fetching evaluation questions:', questionsError);
        return;
      }

      setEvaluationQuestions(questionsData || []);
    } catch (error) {
      console.error('Error fetching evaluation questions:', error);
    }
  };

  const fetchExistingEvaluation = async (assignmentId: string) => {
    try {
      const { data: evaluationData } = await supabase
        .from('order_evaluations')
        .select('*')
        .eq('assignment_id', assignmentId)
        .maybeSingle();

      if (evaluationData) {
        setExistingEvaluation(evaluationData as OrderEvaluation);

        const initialResponses: Record<string, { rating: number; comment: string }> = {};
        evaluationQuestions.forEach(q => {
          if (evaluationData.details && evaluationData.details[q.id]) {
            initialResponses[q.id] = {
              rating: evaluationData.details[q.id].rating || 0,
              comment: evaluationData.details[q.id].comment || ''
            };
          } else {
            initialResponses[q.id] = { rating: 0, comment: '' };
          }
        });
        setQuestionResponses(initialResponses);
      } else {
        const initialResponses: Record<string, { rating: number; comment: string }> = {};
        evaluationQuestions.forEach(q => {
          initialResponses[q.id] = { rating: 0, comment: '' };
        });
        setQuestionResponses(initialResponses);
      }
    } catch (error) {
      console.error('Error fetching evaluation:', error);
    }
  };

  const bookAppointment = async () => {
    if (!selectedDate || !selectedTime || !employee || !orderId) {
      toast.error('Bitte wählen Sie Datum und Uhrzeit aus');
      return;
    }

    try {
      setBookingAppointment(true);

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      const { data, error } = await supabase
        .from('order_appointments')
        .insert({
          order_id: orderId,
          employee_id: employee.id,
          scheduled_at: scheduledDateTime.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error booking appointment:', error);
        toast.error('Fehler beim Buchen des Termins');
        return;
      }

      setAppointment(data);
      toast.success('Termin erfolgreich gebucht!');

      try {
        await supabase.functions.invoke('send-employee-email', {
          body: {
            employee_email: employee.email,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            type: 'appointment_booked',
            appointment_data: {
              order_title: order?.title,
              order_number: order?.order_number,
              scheduled_at: scheduledDateTime.toISOString(),
            },
          },
        });

        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            type: 'appointment_booked',
            payload: {
              employee_name: `${employee.first_name} ${employee.last_name}`,
              order_title: order?.title,
              order_number: order?.order_number,
              scheduled_at: scheduledDateTime.toISOString(),
            }
          }
        });
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
      }

      setSelectedDate(null);
      setSelectedTime('');
      setShowTimeSelection(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setBookingAppointment(false);
    }
  };

  const submitEvaluation = async () => {
    if (!order || !employee || !assignmentId) return;

    for (const question of evaluationQuestions) {
      if (questionResponses[question.id]?.rating === 0) {
        toast.error(`Bitte bewerten Sie: ${question.question}`);
        return;
      }
    }

    try {
      setSubmittingEvaluation(true);

      const totalRating = evaluationQuestions.reduce((sum, question) => {
        return sum + (questionResponses[question.id]?.rating || 0);
      }, 0);
      const overallRating = Math.round(totalRating / evaluationQuestions.length);

      const evaluationDetails = evaluationQuestions.reduce((acc, question) => {
        acc[question.id] = {
          question: question.question,
          rating: questionResponses[question.id].rating,
          comment: questionResponses[question.id].comment
        };
        return acc;
      }, {} as Record<string, any>);

      const evaluationData = {
        assignment_id: assignmentId,
        order_id: order.id,
        employee_id: employee.id,
        rating: overallRating,
        overall_comment: '',
        details: evaluationDetails,
        status: 'pending'
      };

      let result;
      if (existingEvaluation) {
        result = await supabase
          .from('order_evaluations')
          .update(evaluationData)
          .eq('id', existingEvaluation.id)
          .select()
          .single();
      } else {
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

      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            type: 'evaluation_submitted',
            payload: {
              employee_name: `${employee.first_name} ${employee.last_name}`,
              order_title: order.title,
              order_number: order.order_number,
              rating: overallRating
            }
          }
        });
      } catch (telegramError) {
        console.error('Error sending Telegram notification:', telegramError);
      }

      navigate('/mitarbeiter');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setSubmittingEvaluation(false);
    }
  };

  const openTeamsChat = () => {
    if (order?.teams_accounts?.chat_link) {
      window.open(order.teams_accounts.chat_link, '_blank');
    } else {
      toast.error('Teams-Link ist nicht verfügbar');
    }
  };

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
              className={`h-6 w-6 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
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
    if (!existingEvaluation) return null;

    switch (existingEvaluation.status) {
      case 'pending':
        return (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Bewertung eingereicht</h4>
                  <p className="text-sm text-yellow-700">
                    Ihre Bewertung wurde erfolgreich eingereicht und wird geprüft.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'approved':
        return (
          <Card className="border-green-200 bg-green-50">
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
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h4 className="font-semibold text-red-900">Bewertung abgelehnt</h4>
                  <p className="text-sm text-red-700">
                    Ihre Bewertung wurde abgelehnt. Bitte überarbeiten Sie Ihre Bewertung.
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

  const isFormDisabled = existingEvaluation && ['pending', 'approved'].includes(existingEvaluation.status);
  const isFormEditable = !existingEvaluation || existingEvaluation.status === 'rejected';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/mitarbeiter')}
            className="shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Teams Auftrag</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihren Auftrag über Microsoft Teams
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {getEvaluationStatusBanner()}

          {/* Teams Branding Card */}
          <Card className="bg-gradient-to-br from-purple-50 via-violet-50 to-blue-50 border-purple-200/60 shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 bg-white rounded-lg p-3 shadow-md">
                  <img 
                    src={teamsLogo} 
                    alt="Microsoft Teams" 
                    className="h-12 w-12" 
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-900 to-blue-900 bg-clip-text text-transparent">
                    Microsoft Teams Auftrag
                  </h2>
                  <p className="text-sm text-purple-700 mt-1">
                    Führen Sie diesen Auftrag über Microsoft Teams durch
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Information */}
          <Card className="border-purple-200/40 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Auftragsinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Auftragsnummer</p>
                  <p className="font-medium">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Anbieter</p>
                  <p className="font-medium">{order.provider}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Titel</p>
                <p className="font-medium">{order.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projektziel</p>
                <p className="font-medium">{order.project_goal}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Prämie</p>
                  <Badge variant="secondary" className="text-base">{order.premium}€</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teams-Konto</p>
                  <p className="font-medium">{order.teams_accounts?.name || 'Nicht zugewiesen'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Booking / Status */}
          <Card className="border-purple-200/40 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#7B83EB]" />
                Terminbuchung
              </CardTitle>
              <CardDescription>
                Buchen Sie einen Termin für die Durchführung des Auftrags
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointment ? (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="h-5 w-5 text-[#7B83EB]" />
                      <div>
                        <p className="font-semibold text-purple-900">
                          Termin gebucht: {format(parseISO(appointment.scheduled_at), 'PPP', { locale: de })}
                        </p>
                        <p className="text-sm text-purple-700">
                          Uhrzeit: {format(parseISO(appointment.scheduled_at), 'HH:mm', { locale: de })} Uhr
                        </p>
                      </div>
                    </div>
                    <Badge variant={appointment.status === 'approved' ? 'default' : 'secondary'}>
                      {appointment.status === 'approved' ? 'Bestätigt' : 'Ausstehend'}
                    </Badge>
                  </div>

                  {appointment.status === 'approved' && (
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <CheckCircle2 className="h-5 w-5 text-[#7B83EB] mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-purple-900 mb-1">
                            Termin bestätigt!
                          </p>
                          <p className="text-sm text-purple-700 mb-3">
                            Sie werden den Auftrag über Microsoft Teams durchführen. Bitte klicken Sie auf den Button unten, um den Teams-Chat zu öffnen.
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={openTeamsChat}
                        className="w-full bg-[#7B83EB] hover:bg-[#5059C9] shadow-lg hover:shadow-xl transition-all"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Zum Teams Chat
                      </Button>
                    </div>
                  )}

                  {appointment.feedback_requested && evaluationQuestions.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-blue-900">Feedback angefordert</p>
                          <p className="text-sm text-blue-700">
                            Der Admin hat um Ihre Bewertung gebeten. Bitte scrollen Sie nach unten, um den Auftrag zu bewerten.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {!showTimeSelection ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">Wählen Sie ein Datum für Ihren Termin:</p>
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 14 }, (_, i) => {
                          const date = new Date();
                          date.setDate(date.getDate() + i);
                          return (
                            <Button
                              key={i}
                              variant={selectedDate?.toDateString() === date.toDateString() ? "default" : "outline"}
                              className="flex flex-col h-auto py-2"
                              onClick={() => handleDateSelect(date)}
                            >
                              <span className="text-xs">{format(date, 'EEE', { locale: de })}</span>
                              <span className="text-lg font-bold">{format(date, 'd')}</span>
                              <span className="text-xs">{format(date, 'MMM', { locale: de })}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {selectedDate && format(selectedDate, 'PPP', { locale: de })}
                        </p>
                        <Button variant="outline" size="sm" onClick={handleBackToDateSelection}>
                          Anderes Datum
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">Wählen Sie eine Uhrzeit:</p>
                      <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                        {generateTimeSlots().map((timeSlot) => (
                          <Button
                            key={timeSlot}
                            variant={selectedTime === timeSlot ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(timeSlot)}
                            disabled={isTimeSlotDisabled(timeSlot)}
                            className="w-full"
                          >
                            {timeSlot}
                          </Button>
                        ))}
                      </div>
                      <Button
                        onClick={bookAppointment}
                        disabled={!selectedTime || bookingAppointment}
                        className="w-full bg-[#7B83EB] hover:bg-[#5059C9] shadow-lg hover:shadow-xl transition-all"
                      >
                        {bookingAppointment ? 'Wird gebucht...' : 'Termin buchen'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evaluation Section */}
          {appointment?.feedback_requested && evaluationQuestions.length > 0 && (
            <Card className="border-purple-200/40 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Auftragsbewertung</CardTitle>
                <CardDescription>
                  {isFormDisabled ? 'Ihre eingereichte Bewertung:' : 'Bitte bewerten Sie jeden Aspekt des Auftrags'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {evaluationQuestions.map((question) => (
                  <div key={question.id} className="border-b border-border pb-6 last:border-b-0">
                    <p className="font-medium mb-3">{question.question}</p>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Bewertung:</p>
                        <StarRating
                          rating={questionResponses[question.id]?.rating || 0}
                          onRatingChange={(rating) => updateQuestionResponse(question.id, 'rating', rating)}
                          disabled={isFormDisabled}
                        />
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Kommentar (optional):</p>
                        <Textarea
                          value={questionResponses[question.id]?.comment || ''}
                          onChange={(e) => updateQuestionResponse(question.id, 'comment', e.target.value)}
                          placeholder="Fügen Sie hier Ihren Kommentar hinzu..."
                          rows={3}
                          disabled={isFormDisabled}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {isFormEditable && (
                  <Button
                    onClick={submitEvaluation}
                    disabled={submittingEvaluation}
                    className="w-full bg-[#7B83EB] hover:bg-[#5059C9] shadow-lg hover:shadow-xl transition-all"
                  >
                    {submittingEvaluation ? 'Wird eingereicht...' : 'Bewertung einreichen'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuftragTeams;

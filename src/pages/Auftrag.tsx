import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Star, ArrowLeft, Send, FileText, Download, Users, Settings, Clock, Target } from 'lucide-react';

interface Order {
  id: string;
  title: string;
  order_number: string;
  premium: number;
  provider: string;
  project_goal: string;
  instructions: any;
  whatsapp_account_id: string | null;
  is_placeholder: boolean;
}

interface EvaluationQuestion {
  id: string;
  question: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Assignment {
  id: string;
  status: string;
}

const Auftrag = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Icon mapping for instructions
  const iconsMap = { FileText, Download, Users, Settings, Clock, Target, Star };
  
  const [order, setOrder] = useState<Order | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Rating state
  const [questionResponses, setQuestionResponses] = useState<Record<string, { rating: number; comment: string }>>({});

  useEffect(() => {
    if (!orderId || !user) return;
    
    fetchOrderData();
  }, [orderId, user]);

  const fetchOrderData = async () => {
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

      // Get order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        toast.error('Fehler beim Laden des Auftrags');
        return;
      }

      // If this is a WhatsApp order, redirect to WhatsApp flow
      if (orderData.whatsapp_account_id) {
        navigate(`/auftrag-whatsapp/${orderId}`);
        return;
      }

      setOrder(orderData);

      // Check assignment
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

      setAssignment(assignmentData);

      // Get evaluation questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('order_evaluation_questions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        toast.error('Fehler beim Laden der Bewertungsfragen');
        return;
      }

      setQuestions(questionsData || []);

      // Initialize question responses
      const initialResponses: Record<string, { rating: number; comment: string }> = {};
      questionsData?.forEach(q => {
        initialResponses[q.id] = { rating: 0, comment: '' };
      });
      setQuestionResponses(initialResponses);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
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

  const submitEvaluation = async () => {
    if (!order || !employee || !assignment) return;

    // Validate question ratings
    for (const question of questions) {
      if (questionResponses[question.id]?.rating === 0) {
        toast.error(`Bitte bewerten Sie: ${question.question}`);
        return;
      }
    }

    try {
      setSubmitting(true);

      // Calculate overall rating as average of question ratings
      const totalRating = questions.reduce((sum, question) => {
        return sum + (questionResponses[question.id]?.rating || 0);
      }, 0);
      const overallRating = Math.round(totalRating / questions.length);

      // Prepare evaluation details
      const evaluationDetails = questions.reduce((acc, question) => {
        acc[question.id] = {
          question: question.question,
          rating: questionResponses[question.id].rating,
          comment: questionResponses[question.id].comment
        };
        return acc;
      }, {} as Record<string, any>);

      // Check if evaluation already exists
      const { data: existingEvaluation } = await supabase
        .from('order_evaluations')
        .select('id')
        .eq('assignment_id', assignment.id)
        .maybeSingle();

      const evaluationData = {
        assignment_id: assignment.id,
        order_id: order.id,
        employee_id: employee.id,
        rating: overallRating,
        overall_comment: '',
        details: evaluationDetails,
        status: 'pending'
      };

      let result;
      if (existingEvaluation) {
        // Update existing evaluation
        result = await supabase
          .from('order_evaluations')
          .update(evaluationData)
          .eq('id', existingEvaluation.id)
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

      // Update assignment status to 'evaluated'
      const { error: assignmentError } = await supabase
        .from('order_assignments')
        .update({ status: 'evaluated' })
        .eq('id', assignment.id);

      if (assignmentError) {
        console.error('Error updating assignment status:', assignmentError);
        // Don't return, evaluation was successful
      }

      toast.success('Bewertung erfolgreich eingereicht!');
      navigate('/mitarbeiter');

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/mitarbeiter')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Auftrag bewerten</h1>
            <p className="text-muted-foreground">
              {order.title} - {order.order_number}
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle>Auftragsinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <p className="text-sm text-muted-foreground">Projektziel</p>
                <p className="font-medium">{order.project_goal}</p>
              </div>
            </CardContent>
          </Card>

          {/* Instructions Card - Only for placeholder orders */}
          {order.is_placeholder && Array.isArray(order.instructions) && order.instructions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Anweisungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.instructions.map((instruction: any, index: number) => {
                  const IconComponent = iconsMap[instruction.icon as keyof typeof iconsMap] || FileText;
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <IconComponent className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{instruction.title}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{instruction.content}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Evaluation Questions */}
          {questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bewertungsfragen</CardTitle>
                <CardDescription>
                  Bitte bewerten Sie jeden Aspekt des Auftrags
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id} className="border-b border-border pb-6 last:border-b-0">
                    <p className="font-medium mb-3">{question.question}</p>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Bewertung</p>
                        <StarRating
                          rating={questionResponses[question.id]?.rating || 0}
                          onRatingChange={(rating) => updateQuestionResponse(question.id, 'rating', rating)}
                        />
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">Kommentar (optional)</p>
                        <Textarea
                          value={questionResponses[question.id]?.comment || ''}
                          onChange={(e) => updateQuestionResponse(question.id, 'comment', e.target.value)}
                          placeholder="Erläutern Sie Ihre Bewertung..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={submitEvaluation}
            disabled={submitting || questions.some(q => (questionResponses[q.id]?.rating || 0) === 0)}
            size="lg"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Wird eingereicht...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Bewertung einreichen
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auftrag;

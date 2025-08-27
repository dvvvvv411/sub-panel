import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Star, Send, Download, FileText, Users } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface OrderDetails {
  id: string;
  title: string;
  order_number: string;
  provider: string;
  project_goal: string;
  premium: number;
  download_links: string[] | null;
  instructions: Array<{
    icon: string;
    title: string;
    content: string;
  }> | null;
  whatsapp_accounts: {
    id: string;
    name: string;
    account_info: string;
  } | null;
  order_evaluation_questions: Array<{
    id: string;
    question: string;
  }>;
}

interface StarRatingProps {
  rating: number;
  onChange: (rating: number) => void;
  questionId: string;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onChange, questionId }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="hover:scale-110 transition-transform"
        >
          <Star
            className={`h-6 w-6 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300 hover:text-yellow-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const Auftrag = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignmentStatus, setAssignmentStatus] = useState<string>('');
  const [evaluations, setEvaluations] = useState<Record<string, { rating: number; comment: string }>>({});

  useEffect(() => {
    if (!orderId || !user?.email) {
      navigate('/mitarbeiter');
      return;
    }
    fetchOrderDetails();
  }, [orderId, user?.email]);

  const fetchOrderDetails = async () => {
    if (!orderId || !user?.email) return;

    try {
      setLoading(true);

      // Get employee ID first
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (employeeError || !employeeData) {
        toast.error('Mitarbeiterdaten nicht gefunden');
        navigate('/mitarbeiter');
        return;
      }

      // Check if order is assigned to this employee
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('order_assignments')
        .select('status')
        .eq('order_id', orderId)
        .eq('employee_id', employeeData.id)
        .maybeSingle();

      if (assignmentError || !assignmentData) {
        toast.error('Auftrag nicht gefunden oder nicht zugewiesen');
        navigate('/mitarbeiter');
        return;
      }

      // Update assignment status to 'in_progress' if it's 'assigned'
      if (assignmentData.status === 'assigned') {
        await supabase
          .from('order_assignments')
          .update({ status: 'in_progress' })
          .eq('order_id', orderId)
          .eq('employee_id', employeeData.id);
      }

      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          title,
          order_number,
          provider,
          project_goal,
          premium,
          download_links,
          instructions,
          whatsapp_accounts (
            id,
            name,
            account_info
          ),
          order_evaluation_questions (
            id,
            question
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        toast.error('Auftrag konnte nicht geladen werden');
        navigate('/mitarbeiter');
        return;
      }

      setOrder(orderData as OrderDetails);
      setAssignmentStatus(assignmentData.status);
      
      // Initialize evaluations object
      const initialEvaluations: Record<string, { rating: number; comment: string }> = {};
      orderData.order_evaluation_questions?.forEach((q: any) => {
        initialEvaluations[q.id] = { rating: 0, comment: '' };
      });
      setEvaluations(initialEvaluations);

    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Fehler beim Laden des Auftrags');
      navigate('/mitarbeiter');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (questionId: string, rating: number) => {
    setEvaluations(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], rating }
    }));
  };

  const handleCommentChange = (questionId: string, comment: string) => {
    setEvaluations(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], comment }
    }));
  };

  const handleSubmitEvaluation = async () => {
    if (!order || !user?.email) return;

    // Check if all questions have ratings
    const incompleteQuestions = Object.entries(evaluations).filter(([_, evaluation]) => evaluation.rating === 0);
    if (incompleteQuestions.length > 0) {
      toast.error('Bitte bewerten Sie alle Fragen mit mindestens einem Stern');
      return;
    }

    try {
      setSubmitting(true);

      // Get employee ID
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!employeeData) {
        toast.error('Mitarbeiterdaten nicht gefunden');
        return;
      }

      // Update assignment status to completed
      await supabase
        .from('order_assignments')
        .update({ status: 'completed' })
        .eq('order_id', order.id)
        .eq('employee_id', employeeData.id);

      toast.success('Bewertung erfolgreich abgesendet! Der Auftrag ist nun abgeschlossen.');
      navigate('/mitarbeiter');

    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error('Fehler beim Absenden der Bewertung');
    } finally {
      setSubmitting(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    // Map common icon names to actual components
    const iconMap: Record<string, any> = {
      FileText,
      Users,
      Download,
      Send,
      Star,
      ArrowLeft,
      // Add more icons as needed
    };
    
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Auftrag wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Auftrag nicht gefunden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/mitarbeiter')}
            className="flex items-center gap-2 self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Zurück zum Dashboard</span>
            <span className="xs:hidden">Zurück</span>
          </Button>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent break-words">
              {order.title}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base break-words">
              Auftrag #{order.order_number} • {order.provider}
            </p>
          </div>
          
          <Badge className="bg-green-100 text-green-800 px-3 py-1 sm:px-4 sm:py-2 text-sm whitespace-nowrap">
            €{order.premium.toFixed(2)} Prämie
          </Badge>
          
          {assignmentStatus === 'in_progress' && (
            <Badge className="bg-blue-100 text-blue-800 px-3 py-1 sm:px-4 sm:py-2 text-sm whitespace-nowrap">
              In Bearbeitung
            </Badge>
          )}
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-2">
          {/* Left Column - Order Details */}
          <div className="space-y-6">
            {/* Project Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Projektziel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {order.project_goal}
                </p>
              </CardContent>
            </Card>

            {/* Download Links */}
            {order.download_links && order.download_links.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    Download Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.download_links.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Download className="h-4 w-4 text-primary" />
                      <span className="text-sm text-primary hover:underline break-all">
                        {link}
                      </span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            {order.instructions && order.instructions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Anweisungen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
                        {getIconComponent(instruction.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium mb-2">{instruction.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {instruction.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* WhatsApp Account Info */}
            {order.whatsapp_accounts && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    WhatsApp Account
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">{order.whatsapp_accounts.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {order.whatsapp_accounts.account_info}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Evaluation Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Bewertungsbogen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {order.order_evaluation_questions.map((question) => (
                  <div key={question.id} className="space-y-3 p-3 sm:p-4 rounded-lg border bg-card">
                    <Label className="text-sm font-medium leading-relaxed block">
                      {question.question}
                    </Label>
                    
                    <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Bewertung:</span>
                      <div className="flex items-center gap-2 xs:gap-3 flex-wrap">
                        <StarRating
                          rating={evaluations[question.id]?.rating || 0}
                          onChange={(rating) => handleRatingChange(question.id, rating)}
                          questionId={question.id}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          ({evaluations[question.id]?.rating || 0}/5)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`comment-${question.id}`} className="text-sm">
                        Kommentar (optional)
                      </Label>
                      <Textarea
                        id={`comment-${question.id}`}
                        placeholder="Zusätzliche Bemerkungen zu dieser Frage..."
                        value={evaluations[question.id]?.comment || ''}
                        onChange={(e) => handleCommentChange(question.id, e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                ))}

                <Button
                  onClick={handleSubmitEvaluation}
                  disabled={submitting || Object.values(evaluations).some(evaluation => evaluation.rating === 0)}
                  className="w-full"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Wird abgesendet...' : 'Bewertung absenden'}
                </Button>

                {Object.values(evaluations).some(evaluation => evaluation.rating === 0) && (
                  <p className="text-sm text-amber-600 text-center">
                    Bitte bewerten Sie alle Fragen mit mindestens einem Stern
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auftrag;
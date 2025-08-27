import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, Calendar, MessageSquare, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReviewsTabProps {
  user: any;
}

interface OrderEvaluation {
  id: string;
  assignment_id: string;
  order_id: string;
  employee_id: string;
  rating: number;
  details: any;
  status: string;
  overall_comment: string | null;
  premium_awarded: number;
  reviewed_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  questions?: { [key: string]: string }; // Map of question IDs to question text
  // Relations
  orders: {
    id: string;
    title: string;
    order_number: string;
    premium: number;
  };
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({ user }) => {
  const [evaluations, setEvaluations] = useState<OrderEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<OrderEvaluation | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.email) {
      fetchEvaluations();
    }
  }, [user?.email]);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      
      // First get the employee ID
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (employeeError || !employeeData) {
        console.error('Error fetching employee data:', employeeError);
        setEvaluations([]);
        return;
      }

      // Then get their evaluations
      const { data, error } = await supabase
        .from('order_evaluations')
        .select(`
          *,
          orders (
            id,
            title,
            order_number,
            premium
          )
        `)
        .eq('employee_id', employeeData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching evaluations:', error);
        toast.error('Fehler beim Laden der Bewertungen');
        return;
      }

      // Fetch questions for each evaluation to display question text
      const evaluationsWithQuestions = await Promise.all(
        (data || []).map(async (evaluation: any) => {
          const { data: questionsData, error: questionsError } = await supabase
            .from('order_evaluation_questions')
            .select('id, question')
            .eq('order_id', evaluation.order_id);

          if (!questionsError && questionsData) {
            const questionsMap = questionsData.reduce((acc: any, q: any) => {
              acc[q.id] = q.question;
              return acc;
            }, {});
            evaluation.questions = questionsMap;
          }
          
          return evaluation;
        })
      );

      setEvaluations(evaluationsWithQuestions as any);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      toast.error('Fehler beim Laden der Bewertungen');
    } finally {
      setLoading(false);
    }
  };

  const averageRating = evaluations.length > 0 
    ? evaluations.reduce((sum, evaluation) => sum + evaluation.rating, 0) / evaluations.length 
    : 0;

  const totalEvaluations = evaluations.length;
  const approvedEvaluations = evaluations.filter(e => e.status === 'approved');
  const totalEarnedPremium = approvedEvaluations.reduce((sum, e) => sum + e.premium_awarded, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            In Überprüfung
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Genehmigt
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Abgelehnt
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const handleViewDetails = (evaluation: OrderEvaluation) => {
    setSelectedEvaluation(evaluation);
    setDetailsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt deine Bewertungen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics - moved to top */}
      {evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Bewertungsübersicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = evaluations.filter(r => r.rating === stars).length;
                const percentage = totalEvaluations > 0 ? (count / totalEvaluations) * 100 : 0;
                
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm">{stars}</span>
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Header */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Durchschnittsbewertung</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalEvaluations}</p>
              <p className="text-sm text-muted-foreground">Bewertungen abgegeben</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">€{totalEarnedPremium.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Verdiente Prämien</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Deine Bewertungen
        </h2>
        
        {evaluations.length > 0 ? (
          <div className="space-y-4">
            {evaluations.map((evaluation) => (
              <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{evaluation.orders.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">Auftrag #{evaluation.orders.order_number}</p>
                    </div>
                    {getStatusBadge(evaluation.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {renderStarRating(evaluation.rating)}
                      <span className="text-sm font-medium ml-2">{evaluation.rating}/5</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(evaluation.created_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  
                  {evaluation.overall_comment && (
                    <p className="text-sm text-muted-foreground">
                      {evaluation.overall_comment}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className={`text-sm font-medium ${
                      evaluation.status === 'approved' ? 'text-green-600' : 
                      evaluation.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {evaluation.status === 'approved' ? 'Prämie erhalten: ' : 
                       evaluation.status === 'pending' ? 'Prämie ausstehend: ' : 'Prämie: '}
                      €{evaluation.premium_awarded.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2">
                      {evaluation.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(evaluation)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Noch keine Bewertungen</h3>
              <p className="text-muted-foreground">
                Sobald du Aufträge abschließt und bewertest, werden deine Bewertungen hier angezeigt.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bewertungsdetails</DialogTitle>
            <DialogDescription>
              Detaillierte Ansicht deiner Bewertung
            </DialogDescription>
          </DialogHeader>

          {selectedEvaluation && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Auftrag</h4>
                  <p className="text-sm">{selectedEvaluation.orders.title}</p>
                  <p className="text-xs text-muted-foreground">#{selectedEvaluation.orders.order_number}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  {getStatusBadge(selectedEvaluation.status)}
                </div>
              </div>

              {/* Overall Rating */}
              <div>
                <h4 className="font-medium mb-2">Deine Gesamtbewertung</h4>
                <div className="flex items-center gap-2">
                  {renderStarRating(selectedEvaluation.rating)}
                  <span>({selectedEvaluation.rating}/5)</span>
                </div>
              </div>

              {/* Detailed Ratings */}
              {selectedEvaluation.details && (
                <div>
                  <h4 className="font-medium mb-2">Detaillierte Bewertungen</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedEvaluation.details).map(([questionId, data]: [string, any]) => (
                      <div key={questionId} className="p-3 border rounded-lg">
                        <h5 className="font-medium text-sm mb-2">
                          {selectedEvaluation.questions?.[questionId] || `Frage ${questionId}`}
                        </h5>
                        <div className="flex items-center gap-2 mb-2">
                          {renderStarRating(data.rating)}
                          <span className="text-sm">({data.rating}/5)</span>
                        </div>
                        {data.comment && (
                          <p className="text-sm text-muted-foreground italic">"{data.comment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Comment */}
              {selectedEvaluation.overall_comment && (
                <div>
                  <h4 className="font-medium mb-2">Dein Kommentar</h4>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {selectedEvaluation.overall_comment}
                  </p>
                </div>
              )}

              {/* Premium Info */}
              <div>
                <h4 className="font-medium mb-2">Prämien-Information</h4>
                <div className="p-3 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Original-Prämie:</span>
                    <span className="font-medium">€{selectedEvaluation.orders.premium.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Erhaltene Prämie:</span>
                    <span className="font-medium text-green-600">€{selectedEvaluation.premium_awarded.toFixed(2)}</span>
                  </div>
                  {selectedEvaluation.approved_at && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Genehmigt am:</span>
                      <span>{new Date(selectedEvaluation.approved_at).toLocaleDateString('de-DE')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
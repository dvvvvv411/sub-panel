import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, Calendar, MessageSquare, CheckCircle, Clock, XCircle, Eye, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReviewsTabProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    status: string;
  };
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

export const ReviewsTab: React.FC<ReviewsTabProps> = ({ employee }) => {
  const [evaluations, setEvaluations] = useState<OrderEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<OrderEvaluation | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (employee?.email) {
      fetchEvaluations();
    }
  }, [employee?.email]);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      
      // Get evaluations using the employee ID directly
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
        .eq('employee_id', employee.id)
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
          <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-200/60 hover:bg-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            In Überprüfung
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-500/10 text-green-700 border-green-200/60 hover:bg-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Genehmigt
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/10 text-red-700 border-red-200/60 hover:bg-red-500/20">
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
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
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
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <Skeleton className="h-8 w-16 mx-auto" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Header */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <Star className="h-6 w-6 text-yellow-600 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-bold text-yellow-900">{averageRating.toFixed(1)}</span>
                  <div className="flex">
                    {renderStarRating(Math.round(averageRating))}
                  </div>
                </div>
                <p className="text-sm font-medium text-yellow-700">Durchschnittsbewertung</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{totalEvaluations}</p>
                <p className="text-sm font-medium text-blue-700">Bewertungen abgegeben</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">€{totalEarnedPremium.toFixed(2)}</p>
                <p className="text-sm font-medium text-green-700">Verdiente Prämien</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {evaluations.length > 0 && (
        <Card className="border-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              Bewertungsverteilung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = evaluations.filter(r => r.rating === stars).length;
                const percentage = totalEvaluations > 0 ? (count / totalEvaluations) * 100 : 0;
                
                return (
                  <div key={stars} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-20">
                      <span className="text-sm font-medium">{stars}</span>
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground w-12">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">
            Ihre Bewertungen
            {totalEvaluations > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({totalEvaluations})
              </span>
            )}
          </h2>
        </div>
        
        {evaluations.length > 0 ? (
          <div className="space-y-4">
            {evaluations.map((evaluation) => (
              <Card key={evaluation.id} className="group hover:shadow-lg transition-all duration-300 border-muted/50 hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {evaluation.orders.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Auftrag #{evaluation.orders.order_number}</p>
                    </div>
                    {getStatusBadge(evaluation.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      {renderStarRating(evaluation.rating)}
                      <span className="text-sm font-medium ml-1">{evaluation.rating}/5</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(evaluation.created_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  
                  {evaluation.overall_comment && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground italic">
                        "{evaluation.overall_comment}"
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-muted/50">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-green-600" />
                      <span className={`text-sm font-medium ${
                        evaluation.status === 'approved' ? 'text-green-600' : 
                        evaluation.status === 'pending' ? 'text-yellow-600' : 'text-muted-foreground'
                      }`}>
                        {evaluation.status === 'approved' ? 'Prämie erhalten: ' : 
                         evaluation.status === 'pending' ? 'Prämie ausstehend: ' : 'Prämie: '}
                        €{evaluation.premium_awarded.toFixed(2)}
                      </span>
                    </div>
                    {evaluation.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(evaluation)}
                        className="group/btn hover:border-primary/60 hover:bg-primary/5 hover:scale-105 transition-all"
                      >
                        <Eye className="h-4 w-4 mr-1 group-hover/btn:scale-110 transition-transform" />
                        Details
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-6 p-4 rounded-full bg-muted/50 w-fit">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Noch keine Bewertungen</h3>
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                Sobald Sie Aufträge abschließen und bewerten, werden Ihre Bewertungen hier angezeigt.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Bewertungsdetails
            </DialogTitle>
            <DialogDescription>
              Detaillierte Ansicht Ihrer Bewertung
            </DialogDescription>
          </DialogHeader>

          {selectedEvaluation && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Auftrag
                    </h4>
                    <p className="font-medium">{selectedEvaluation.orders.title}</p>
                    <p className="text-sm text-muted-foreground">#{selectedEvaluation.orders.order_number}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Status
                    </h4>
                    {getStatusBadge(selectedEvaluation.status)}
                  </CardContent>
                </Card>
              </div>

              {/* Overall Rating */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Ihre Gesamtbewertung
                  </h4>
                  <div className="flex items-center gap-3">
                    {renderStarRating(selectedEvaluation.rating)}
                    <span className="font-semibold">({selectedEvaluation.rating}/5)</span>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Ratings */}
              {selectedEvaluation.details && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Detaillierte Bewertungen</h4>
                    <div className="space-y-4">
                      {Object.entries(selectedEvaluation.details).map(([questionId, data]: [string, any]) => (
                        <div key={questionId} className="p-4 border rounded-lg bg-muted/30">
                          <h5 className="font-medium text-sm mb-2">
                            {selectedEvaluation.questions?.[questionId] || `Frage ${questionId}`}
                          </h5>
                          <div className="flex items-center gap-2 mb-2">
                            {renderStarRating(data.rating)}
                            <span className="text-sm font-medium">({data.rating}/5)</span>
                          </div>
                          {data.comment && (
                            <p className="text-sm text-muted-foreground bg-background p-2 rounded border italic">
                              "{data.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Overall Comment */}
              {selectedEvaluation.overall_comment && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Ihr Kommentar</h4>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <p className="text-sm leading-relaxed">{selectedEvaluation.overall_comment}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Premium Info */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Prämien-Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Original-Prämie</div>
                      <div className="text-lg font-bold">€{selectedEvaluation.orders.premium.toFixed(2)}</div>
                    </div>
                    <div className="p-3 border rounded-lg bg-green-50">
                      <div className="text-sm text-green-600">Erhaltene Prämie</div>
                      <div className="text-lg font-bold text-green-700">€{selectedEvaluation.premium_awarded.toFixed(2)}</div>
                    </div>
                  </div>
                  {selectedEvaluation.approved_at && (
                    <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Genehmigt am: {new Date(selectedEvaluation.approved_at).toLocaleDateString('de-DE')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

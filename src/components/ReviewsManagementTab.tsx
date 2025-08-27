import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageSquare, Check, X, Star, Eye } from 'lucide-react';

interface OrderEvaluation {
  id: string;
  assignment_id: string;
  order_id: string;
  employee_id: string;
  rating: number;
  details: any;
  status: string; // Allow any string to match database type
  overall_comment: string | null;
  premium_awarded: number;
  reviewed_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
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

export function ReviewsManagementTab() {
  const [evaluations, setEvaluations] = useState<OrderEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<OrderEvaluation | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [customPremium, setCustomPremium] = useState<number | null>(null);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_evaluations')
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching evaluations:', error);
        toast.error('Fehler beim Laden der Bewertungen');
        return;
      }

      setEvaluations((data || []) as any);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      toast.error('Fehler beim Laden der Bewertungen');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (evaluation: OrderEvaluation, premiumOverride?: number, adminNote?: string) => {
    try {
      const { error } = await supabase
        .from('order_evaluations')
        .update({
          status: 'approved',
          premium_awarded: premiumOverride || undefined,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          overall_comment: adminNote ? `ADMIN: ${adminNote}` : undefined
        })
        .eq('id', evaluation.id);

      if (error) {
        console.error('Error approving evaluation:', error);
        toast.error('Fehler beim Genehmigen der Bewertung');
        return;
      }

      // Mark assignment as completed
      const { error: assignErr } = await supabase
        .from('order_assignments')
        .update({ status: 'completed' })
        .eq('id', evaluation.assignment_id);

      if (assignErr) {
        console.error('Error updating assignment status:', assignErr);
      }

      toast.success('Bewertung erfolgreich genehmigt');
      fetchEvaluations();
    } catch (error) {
      console.error('Error approving evaluation:', error);
      toast.error('Fehler beim Genehmigen der Bewertung');
    }
  };

  const handleReject = async (evaluation: OrderEvaluation, reason?: string) => {
    try {
      const { error } = await supabase
        .from('order_evaluations')
        .update({
          status: 'rejected',
          premium_awarded: 0,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          overall_comment: reason ? `ADMIN: ${reason}` : undefined
        })
        .eq('id', evaluation.id);

      if (error) {
        console.error('Error rejecting evaluation:', error);
        toast.error('Fehler beim Ablehnen der Bewertung');
        return;
      }

      // Move assignment back to in_progress
      const { error: assignErr } = await supabase
        .from('order_assignments')
        .update({ status: 'in_progress' })
        .eq('id', evaluation.assignment_id);

      if (assignErr) {
        console.error('Error updating assignment status:', assignErr);
      }

      toast.success('Bewertung erfolgreich abgelehnt');
      fetchEvaluations();
    } catch (error) {
      console.error('Error rejecting evaluation:', error);
      toast.error('Fehler beim Ablehnen der Bewertung');
    }
  };

  const handleViewDetails = (evaluation: OrderEvaluation) => {
    setSelectedEvaluation(evaluation);
    setCustomPremium(evaluation.premium_awarded || evaluation.orders.premium);
    setAdminComment('');
    setDetailsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Ausstehend</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Genehmigt</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Abgelehnt</Badge>;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt Bewertungen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Bewertungen verwalten</h3>
          <p className="text-muted-foreground">
            Überprüfen und genehmigen Sie Mitarbeiterbewertungen
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausstehende Bewertungen</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {evaluations.filter(e => e.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Genehmigte Bewertungen</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {evaluations.filter(e => e.status === 'approved').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtprämien genehmigt</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{evaluations.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.premium_awarded, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evaluations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Bewertungen</CardTitle>
          <CardDescription>
            Übersicht aller eingereichten Bewertungen mit Genehmigungsmöglichkeiten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evaluations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Noch keine Bewertungen vorhanden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auftrag</TableHead>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead>Bewertung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prämie</TableHead>
                  <TableHead>Eingereicht am</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{evaluation.orders.title}</div>
                        <div className="text-sm text-muted-foreground">
                          #{evaluation.orders.order_number}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {evaluation.employees.first_name} {evaluation.employees.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {evaluation.employees.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderStarRating(evaluation.rating)}
                        <span className="text-sm text-muted-foreground">
                          ({evaluation.rating}/5)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(evaluation.status)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          €{evaluation.premium_awarded.toFixed(2)}
                        </div>
                        {evaluation.premium_awarded !== evaluation.orders.premium && (
                          <div className="text-sm text-muted-foreground">
                            (Original: €{evaluation.orders.premium.toFixed(2)})
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(evaluation.created_at).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(evaluation)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {evaluation.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(evaluation)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(evaluation)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bewertungsdetails</DialogTitle>
            <DialogDescription>
              Detaillierte Ansicht der Mitarbeiterbewertung
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
                  <h4 className="font-medium mb-2">Mitarbeiter</h4>
                  <p className="text-sm">
                    {selectedEvaluation.employees.first_name} {selectedEvaluation.employees.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedEvaluation.employees.email}</p>
                </div>
              </div>

              {/* Overall Rating */}
              <div>
                <h4 className="font-medium mb-2">Gesamtbewertung</h4>
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
                  <h4 className="font-medium mb-2">Gesamtkommentar</h4>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {selectedEvaluation.overall_comment}
                  </p>
                </div>
              )}

              {/* Premium Settings */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-premium">Prämie anpassen</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">€</span>
                    <input
                      id="custom-premium"
                      type="number"
                      step="0.01"
                      min="0"
                      value={customPremium || ''}
                      onChange={(e) => setCustomPremium(parseFloat(e.target.value) || 0)}
                      className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">
                      (Original: €{selectedEvaluation.orders.premium.toFixed(2)})
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="admin-comment">Admin-Kommentar (optional)</Label>
                  <Textarea
                    id="admin-comment"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Zusätzliche Anmerkungen zur Genehmigung/Ablehnung..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              {selectedEvaluation.status === 'pending' && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleReject(selectedEvaluation, adminComment);
                      setDetailsDialogOpen(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Ablehnen
                  </Button>
                  <Button
                    onClick={() => {
                      handleApprove(selectedEvaluation, customPremium || undefined, adminComment);
                      setDetailsDialogOpen(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Genehmigen
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
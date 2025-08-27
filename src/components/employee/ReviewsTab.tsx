import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Calendar, MessageSquare, CheckCircle } from 'lucide-react';

interface ReviewsTabProps {
  assignedOrders: any[];
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({ assignedOrders }) => {
  const completedOrders = assignedOrders.filter(order => order.status === 'completed');
  
  // Mock review data - in real app this would come from a reviews table
  const reviews = completedOrders.map(order => ({
    id: order.id,
    orderTitle: order.title,
    orderNumber: order.order_number,
    rating: Math.floor(Math.random() * 2) + 4, // 4-5 star ratings
    reviewText: `Bewertung für Auftrag ${order.order_number} abgegeben. Der Auftrag wurde erfolgreich bearbeitet.`,
    dateCompleted: new Date().toLocaleDateString('de-DE'),
    premium: order.premium
  }));

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const totalReviews = reviews.length;

  return (
    <div className="space-y-6">
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
              <p className="text-2xl font-bold text-primary">{totalReviews}</p>
              <p className="text-sm text-muted-foreground">Bewertungen abgegeben</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">100%</p>
              <p className="text-sm text-muted-foreground">Abschlussquote</p>
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
        
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{review.orderTitle}</CardTitle>
                      <p className="text-sm text-muted-foreground">Auftrag #{review.orderNumber}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Abgeschlossen
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${
                            i < review.rating 
                              ? 'text-yellow-500 fill-current' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                      <span className="text-sm font-medium ml-2">{review.rating}/5</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {review.dateCompleted}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {review.reviewText}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium text-green-600">
                      Prämie erhalten: €{review.premium?.toFixed(2) || '0.00'}
                    </span>
                    <Badge variant="outline">Bewertung abgegeben</Badge>
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
                Sobald du Aufträge abschließt, werden deine Bewertungen hier angezeigt.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Performance Metrics */}
      {reviews.length > 0 && (
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
                const count = reviews.filter(r => r.rating === stars).length;
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                
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
    </div>
  );
};
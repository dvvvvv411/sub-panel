import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Euro, CheckCircle, AlertCircle, Target } from 'lucide-react';

interface TasksTabProps {
  assignedOrders: any[];
  onStartOrder: (orderId: string) => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({ assignedOrders, onStartOrder }) => {
  const navigate = useNavigate();
  const pendingOrders = assignedOrders.filter(order => order.assignment_status !== 'completed');
  const completedOrders = assignedOrders.filter(order => order.assignment_status === 'completed');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return (
          <Badge className="bg-blue-500/10 text-blue-700 border-blue-200/60 hover:bg-blue-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Zugewiesen
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-orange-500/10 text-orange-700 border-orange-200/60 hover:bg-orange-500/20">
            <Clock className="h-3 w-3 mr-1" />
            In Bearbeitung
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-700 border-green-200/60 hover:bg-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Abgeschlossen
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const OrderCard = ({ order, showStartButton = false }: { order: any; showStartButton?: boolean }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 border-muted/50 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
              {order.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">Auftrag #{order.order_number}</p>
          </div>
          {getStatusBadge(order.assignment_status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Euro className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Prämie</p>
            <p className="text-lg font-bold text-green-600">€{order.premium?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
        
        {order.evaluation_questions && (
          <div className="p-3 bg-blue-500/5 border border-blue-200/40 rounded-lg">
            <p className="font-medium text-sm text-blue-900 mb-1">Bewertungsfragen:</p>
            <p className="text-sm text-blue-700 line-clamp-2">{order.evaluation_questions}</p>
          </div>
        )}

        {showStartButton && order.assignment_status === 'assigned' && (
          <Button 
            onClick={() => navigate(`/auftrag/${order.id}`)} 
            className="w-full group-hover:scale-[1.02] transition-transform"
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            Auftrag starten
          </Button>
        )}
        
        {showStartButton && order.assignment_status === 'in_progress' && (
          <Button 
            onClick={() => navigate(`/auftrag/${order.id}`)} 
            className="w-full group-hover:scale-[1.02] transition-transform"
            size="lg"
            variant="outline"
          >
            <Clock className="h-4 w-4 mr-2" />
            Auftrag fortsetzen
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-900">{pendingOrders.length}</p>
                <p className="text-sm font-medium text-orange-700">Offene Aufträge</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{completedOrders.length}</p>
                <p className="text-sm font-medium text-green-700">Abgeschlossen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <Euro className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-900">
                  €{assignedOrders.reduce((sum, order) => sum + (order.premium || 0), 0).toFixed(2)}
                </p>
                <p className="text-sm font-medium text-yellow-700">Gesamtprämie</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Offene Aufträge
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({pendingOrders.length})
              </span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingOrders.map((order) => (
              <OrderCard key={order.id} order={order} showStartButton={true} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Abgeschlossene Aufträge
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({completedOrders.length})
              </span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {completedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {assignedOrders.length === 0 && (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-6 p-4 rounded-full bg-muted/50 w-fit">
              <Target className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Keine Aufträge vorhanden</h3>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Sie haben derzeit keine zugewiesenen Aufträge. Neue Aufträge werden hier angezeigt, 
              sobald sie von Ihrem Administrator zugewiesen werden.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
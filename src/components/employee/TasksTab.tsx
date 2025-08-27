import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Euro } from 'lucide-react';

interface TasksTabProps {
  assignedOrders: any[];
  onStartOrder: (orderId: string) => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({ assignedOrders, onStartOrder }) => {
  const navigate = useNavigate();
  const pendingOrders = assignedOrders.filter(order => order.status !== 'completed');
  const completedOrders = assignedOrders.filter(order => order.status === 'completed');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="secondary">Zugewiesen</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Bearbeitung</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Abgeschlossen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const OrderCard = ({ order, showStartButton = false }: { order: any; showStartButton?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{order.title}</CardTitle>
            <p className="text-sm text-muted-foreground">Auftrag #{order.order_number}</p>
          </div>
          {getStatusBadge(order.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Euro className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">Prämie: €{order.premium?.toFixed(2) || '0.00'}</span>
        </div>
        
        {order.evaluation_questions && (
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Bewertungsfragen:</p>
            <p className="line-clamp-2">{order.evaluation_questions}</p>
          </div>
        )}

        {showStartButton && (order.assignment_status === 'assigned' || order.status === 'assigned') && (
          <Button 
            onClick={() => navigate(`/auftrag/${order.id}`)} 
            className="w-full"
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            Auftrag starten
          </Button>
        )}
        
        {showStartButton && order.status === 'in_progress' && (
          <Button 
            onClick={() => navigate(`/auftrag/${order.id}`)} 
            className="w-full"
            size="sm"
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
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{pendingOrders.length}</p>
              <p className="text-sm text-muted-foreground">Offene Aufträge</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{completedOrders.length}</p>
              <p className="text-sm text-muted-foreground">Abgeschlossen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                €{assignedOrders.reduce((sum, order) => sum + (order.premium || 0), 0).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Gesamtprämie</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Offene Aufträge
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingOrders.map((order) => (
              <OrderCard key={order.id} order={order} showStartButton={true} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Play className="h-5 w-5 text-green-600" />
            Abgeschlossene Aufträge
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {completedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {assignedOrders.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Keine Aufträge vorhanden</h3>
            <p className="text-muted-foreground">
              Du hast derzeit keine zugewiesenen Aufträge. Neue Aufträge werden hier angezeigt, sobald sie verfügbar sind.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Star, TrendingUp, Award, Zap } from 'lucide-react';

interface OverviewTabProps {
  assignedOrders: any[];
  user: any;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ assignedOrders, user }) => {
  const completedOrders = assignedOrders.filter(order => order.status === 'completed').length;
  const totalPremium = assignedOrders.reduce((sum, order) => sum + (order.premium || 0), 0);
  const completionRate = assignedOrders.length > 0 ? (completedOrders / assignedOrders.length) * 100 : 0;

  const stats = [
    {
      title: 'Zugewiesene Aufträge',
      value: assignedOrders.length,
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Abgeschlossene Aufträge',
      value: completedOrders,
      icon: Trophy,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Gesamtprämie',
      value: `€${totalPremium.toFixed(2)}`,
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Erfolgsrate',
      value: `${completionRate.toFixed(0)}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    }
  ];

  const achievements = [
    { name: 'Erster Auftrag', description: 'Ersten Auftrag abgeschlossen', earned: completedOrders > 0 },
    { name: 'Fleißiger Arbeiter', description: '5 Aufträge abgeschlossen', earned: completedOrders >= 5 },
    { name: 'Top Performer', description: '10 Aufträge abgeschlossen', earned: completedOrders >= 10 }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/20">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Willkommen zurück, {user?.name || 'Mitarbeiter'}!
            </h1>
            <p className="text-muted-foreground">
              Hier ist dein persönliches Dashboard mit deinen aktuellen Aufgaben und Fortschritten.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Fortschritt diesen Monat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Aufträge abgeschlossen</span>
                <span>{completedOrders}/{assignedOrders.length}</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Prämien verdient</span>
                <span>€{totalPremium.toFixed(2)}</span>
              </div>
              <Progress value={Math.min((totalPremium / 1000) * 100, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Errungenschaften
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${achievement.earned ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                  <Award className={`h-4 w-4 ${achievement.earned ? 'text-yellow-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${achievement.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {achievement.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                </div>
                {achievement.earned && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Erhalten
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Letzte Aktivitäten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assignedOrders.slice(0, 3).map((order, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{order.title}</p>
                  <p className="text-sm text-muted-foreground">Auftrag #{order.order_number}</p>
                </div>
                <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                  {order.status === 'completed' ? 'Abgeschlossen' : 'Zugewiesen'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
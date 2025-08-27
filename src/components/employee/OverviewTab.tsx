import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Target, Star, TrendingUp, Award, Zap, Users, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OverviewTabProps {
  assignedOrders: any[];
  user: any;
  employeeProfile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ assignedOrders, user, employeeProfile }) => {
  const [approvedEvaluations, setApprovedEvaluations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [employmentType, setEmploymentType] = React.useState<string>('');
  const [monthlyGoal, setMonthlyGoal] = React.useState<number>(556); // Default: Minijob

  React.useEffect(() => {
    fetchApprovedEvaluations();
  }, [user]);

  const fetchApprovedEvaluations = async () => {
    if (!user?.email) return;

    try {
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (!employeeData) return;

      // Fetch employment type from latest contract submission
      const { data: contractData } = await supabase
        .from('employment_contract_submissions')
        .select('employment_type')
        .eq('employee_id', employeeData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Set employment type and monthly goal
      let employmentTypeNormalized = 'minijob'; // default
      let goal = 556; // default: Minijob
      
      if (contractData?.employment_type) {
        const empType = contractData.employment_type.toLowerCase();
        if (empType.includes('mini')) {
          employmentTypeNormalized = 'minijob';
          goal = 556;
        } else if (empType.includes('teil')) {
          employmentTypeNormalized = 'teilzeit';
          goal = 1600;
        } else if (empType.includes('voll')) {
          employmentTypeNormalized = 'vollzeit';
          goal = 3300;
        }
      }
      
      setEmploymentType(employmentTypeNormalized);
      setMonthlyGoal(goal);

      const { data, error } = await supabase
        .from('order_evaluations')
        .select('premium_awarded')
        .eq('employee_id', employeeData.id)
        .eq('status', 'approved');

      if (error) {
        console.error('Error fetching approved evaluations:', error);
        return;
      }

      setApprovedEvaluations(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'Zugewiesen';
      case 'in_progress':
        return 'In Bearbeitung';
      case 'evaluated':
        return 'Zur Prüfung eingereicht';
      case 'completed':
        return 'Abgeschlossen';
      default:
        return 'Unbekannt';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'evaluated':
        return 'outline';
      case 'in_progress':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const completedOrders = assignedOrders.filter(order => order.assignment_status === 'completed').length;
  const totalPremium = approvedEvaluations.reduce((sum, evaluation) => sum + (evaluation.premium_awarded || 0), 0);
  const completionRate = assignedOrders.length > 0 ? (completedOrders / assignedOrders.length) * 100 : 0;

  const stats = [
    {
      title: 'Zugewiesene Aufträge',
      value: assignedOrders.length,
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'Insgesamt erhalten'
    },
    {
      title: 'Abgeschlossene Aufträge',
      value: completedOrders,
      icon: Trophy,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      description: 'Erfolgreich beendet'
    },
    {
      title: 'Gesamtprämie',
      value: `€${totalPremium.toFixed(2)}`,
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/10',
      description: 'Verdient bis heute'
    },
    {
      title: 'Erfolgsrate',
      value: `${completionRate.toFixed(0)}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      description: 'Completion Rate'
    }
  ];

  const achievements = [
    { name: 'Erster Auftrag', description: 'Ersten Auftrag abgeschlossen', earned: completedOrders > 0, icon: Target },
    { name: 'Fleißiger Arbeiter', description: '5 Aufträge abgeschlossen', earned: completedOrders >= 5, icon: Users },
    { name: 'Top Performer', description: '10 Aufträge abgeschlossen', earned: completedOrders >= 10, icon: Trophy }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/3 to-accent/5 border-primary/20">
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Hallo {employeeProfile?.first_name || 'Mitarbeiter'}! 👋
              </h2>
              <p className="text-muted-foreground text-lg">
                Hier ist Ihr persönliches Dashboard mit aktuellen Aufgaben und Fortschritten.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Letzter Login: Heute
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-muted/50 hover:border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground group-hover:scale-105 transition-transform duration-300">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-all duration-300`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-muted/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              Fortschritt diesen Monat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Aufträge abgeschlossen</span>
                <span className="text-sm font-bold">{completedOrders}/{assignedOrders.length}</span>
              </div>
              <div className="space-y-2">
                <Progress value={completionRate} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {completionRate.toFixed(0)}% aller zugewiesenen Aufträge
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Prämien verdient</span>
                <span className="text-sm font-bold text-green-600">€{totalPremium.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <Progress value={Math.min((totalPremium / monthlyGoal) * 100, 100)} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  Ziel: €{monthlyGoal.toLocaleString('de-DE')} monatlich
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="border-muted/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              Errungenschaften
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg border border-muted/50 hover:border-muted transition-colors">
                <div className={`p-2.5 rounded-lg ${achievement.earned ? 'bg-yellow-500/10' : 'bg-muted'}`}>
                  <achievement.icon className={`h-5 w-5 ${achievement.earned ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className={`font-medium ${achievement.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {achievement.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                </div>
                {achievement.earned && (
                  <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
                    <Trophy className="h-3 w-3 mr-1" />
                    Erreicht
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-muted/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Star className="h-5 w-5 text-blue-600" />
            </div>
            Letzte Aktivitäten
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedOrders.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-medium text-muted-foreground mb-1">Noch keine Aufträge</h3>
              <p className="text-sm text-muted-foreground">
                Ihre zugewiesenen Aufträge werden hier angezeigt.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedOrders.slice(0, 3).map((order, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-muted/20">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-foreground">{order.title}</p>
                    <p className="text-sm text-muted-foreground">Auftrag #{order.order_number}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={getStatusVariant(order.assignment_status)} className="text-xs">
                      {getStatusText(order.assignment_status)}
                    </Badge>
                    <p className="text-xs text-muted-foreground">€{order.premium}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
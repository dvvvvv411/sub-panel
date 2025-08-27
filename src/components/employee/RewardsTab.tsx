import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Trophy, Star, Target, Coins, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RewardsTabProps {
  assignedOrders: any[];
  user: any;
}

export const RewardsTab: React.FC<RewardsTabProps> = ({ assignedOrders, user }) => {
  const [approvedEvaluations, setApprovedEvaluations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

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

      const { data, error } = await supabase
        .from('order_evaluations')
        .select(`
          premium_awarded, 
          created_at, 
          approved_at,
          orders (
            title,
            order_number,
            provider
          )
        `)
        .eq('employee_id', employeeData.id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

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

  const completedOrders = assignedOrders.filter((o: any) => o.assignment_status === 'completed');
  const completedCount = completedOrders.length;
  const totalPremium = approvedEvaluations.reduce((sum: number, evaluation: any) => sum + (evaluation.premium_awarded || 0), 0);

  const achievements = [
    { 
      name: 'Erster Auftrag', 
      description: 'Ersten Auftrag erfolgreich abgeschlossen', 
      earned: completedCount > 0,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      name: 'Fleißiger Arbeiter', 
      description: '5 Aufträge abgeschlossen', 
      earned: completedCount >= 5,
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    { 
      name: 'Top Performer', 
      description: '10 Aufträge abgeschlossen', 
      earned: completedCount >= 10,
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      name: 'Prämien-Sammler', 
      description: '€500 an Prämien verdient', 
      earned: totalPremium >= 500,
      icon: Coins,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    { 
      name: 'Meister', 
      description: '20 Aufträge abgeschlossen', 
      earned: completedCount >= 20,
      icon: Star,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

  const earnedAchievements = achievements.filter(achievement => achievement.earned);

  const monthlyEarningsMap = new Map<string, number>();
  approvedEvaluations.forEach((evaluation: any) => {
    const date = evaluation.approved_at ? new Date(evaluation.approved_at) : null;
    const month = date ? date.toLocaleString('de-DE', { month: 'long', year: 'numeric' }) : 'Unbekannt';
    monthlyEarningsMap.set(month, (monthlyEarningsMap.get(month) || 0) + (evaluation.premium_awarded || 0));
  });
  const monthlyEarnings = Array.from(monthlyEarningsMap, ([month, amount]) => ({ month, amount }));

  return (
    <div className="space-y-6">
      {/* Premium Overview Header */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Coins className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-800">€{totalPremium.toFixed(2)}</h2>
                <p className="text-green-600">Gesamtprämien erhalten</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-600">Aus {approvedEvaluations.length} genehmigten Bewertungen</p>
              <p className="text-xs text-green-500">{completedCount} abgeschlossene Aufträge</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-green-600" />
            Prämien-Verlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedEvaluations.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Noch keine Prämien erhalten</p>
              <p className="text-sm text-muted-foreground">
                Vervollständigen Sie Aufträge und lassen Sie diese vom Admin genehmigen
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedEvaluations.map((evaluation, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-green-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100">
                      <Trophy className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{evaluation.orders?.title || 'Auftrag'}</p>
                      <p className="text-sm text-muted-foreground">
                        #{evaluation.orders?.order_number} • {evaluation.orders?.provider}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Genehmigt am {evaluation.approved_at ? new Date(evaluation.approved_at).toLocaleDateString('de-DE') : 'Unbekannt'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-100 text-green-800 text-base font-semibold">
                      €{evaluation.premium_awarded.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Meilensteine & Errungenschaften
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {achievements.map((achievement, index) => (
            <div key={index} className="flex items-center gap-4 p-4 rounded-lg border">
              <div className={`p-3 rounded-full ${achievement.earned ? achievement.bgColor : 'bg-gray-100'}`}>
                <achievement.icon className={`h-5 w-5 ${achievement.earned ? achievement.color : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-medium ${achievement.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {achievement.name}
                </h3>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
              </div>
              <div>
                {achievement.earned ? (
                  <Badge className="bg-green-100 text-green-800">
                    Erreicht
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Nicht erreicht
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Monthly Earnings Chart */}
      {monthlyEarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Monatliche Prämien-Entwicklung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyEarnings.map((entry, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium">{entry.month}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6">
                    <div 
                      className="bg-green-500 h-6 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                      style={{ width: `${Math.min((entry.amount / Math.max(...monthlyEarnings.map(e => e.amount))) * 100, 100)}%` }}
                    >
                      <span className="text-white text-xs font-medium">
                        €{entry.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
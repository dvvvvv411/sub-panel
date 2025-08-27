import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Trophy, Star, Target, Coins, Award, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
}

interface RewardsTabProps {
  employee: Employee;
}

export const RewardsTab: React.FC<RewardsTabProps> = ({ employee }) => {
  const [approvedEvaluations, setApprovedEvaluations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeSince, setActiveSince] = React.useState<string>('');
  const [assignedOrders, setAssignedOrders] = React.useState<any[]>([]);
  const [premiumAdjustments, setPremiumAdjustments] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetchData();
  }, [employee]);

  const fetchData = async () => {
    if (!employee?.id) return;

    try {
      // Get assigned orders
      const { data: assignmentsData } = await supabase
        .from('order_assignments')
        .select('status')
        .eq('employee_id', employee.id);

      setAssignedOrders(assignmentsData || []);

      // Set active since date
      const { data: employeeData } = await supabase
        .from('employees')
        .select('created_at')
        .eq('id', employee.id)
        .single();

      if (employeeData?.created_at) {
        const createdDate = new Date(employeeData.created_at);
        const formattedDate = createdDate.toLocaleDateString('de-DE', { 
          month: 'long', 
          year: 'numeric' 
        });
        setActiveSince(formattedDate);
      }

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
        .eq('employee_id', employee.id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

      if (error) {
        console.error('Error fetching approved evaluations:', error);
        return;
      }

      setApprovedEvaluations(data || []);
      
      // Fetch premium adjustments
      const { data: adjustmentsData } = await supabase
        .from('premium_adjustments')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      setPremiumAdjustments(adjustmentsData || []);

      // Fallback: if no created_at, use earliest approved evaluation date
      if (!employeeData?.created_at && data && data.length > 0) {
        const earliestApproval = data.reduce((earliest, evaluation) => {
          const evalDate = new Date(evaluation.approved_at);
          const earliestDate = new Date(earliest.approved_at);
          return evalDate < earliestDate ? evaluation : earliest;
        });
        
        if (earliestApproval.approved_at) {
          const approvalDate = new Date(earliestApproval.approved_at);
          const formattedDate = approvalDate.toLocaleDateString('de-DE', { 
            month: 'long', 
            year: 'numeric' 
          });
          setActiveSince(formattedDate);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedOrders = assignedOrders.filter((o: any) => o.status === 'completed');
  const completedCount = completedOrders.length;
  const totalPremium = approvedEvaluations.reduce((sum: number, evaluation: any) => sum + (evaluation.premium_awarded || 0), 0);
  const manualAdjustmentsTotal = premiumAdjustments.reduce((sum, adj) => sum + adj.amount, 0);
  const totalPremiumIncludingAdjustments = totalPremium + manualAdjustmentsTotal;

  const achievements = [
    { 
      name: 'Erster Auftrag', 
      description: 'Ersten Auftrag erfolgreich abgeschlossen', 
      earned: completedCount > 0,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10'
    },
    { 
      name: 'Fleißiger Arbeiter', 
      description: '5 Aufträge abgeschlossen', 
      earned: completedCount >= 5,
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/10'
    },
    { 
      name: 'Top Performer', 
      description: '10 Aufträge abgeschlossen', 
      earned: completedCount >= 10,
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10'
    },
    { 
      name: 'Prämien-Sammler', 
      description: '€500 an Prämien verdient', 
      earned: totalPremium >= 500,
      icon: Coins,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10'
    },
    { 
      name: 'Meister', 
      description: '20 Aufträge abgeschlossen', 
      earned: completedCount >= 20,
      icon: Star,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-500/10'
    }
  ];

  const earnedAchievements = achievements.filter(achievement => achievement.earned);

  const monthlyEarningsMap = new Map<string, number>();
  approvedEvaluations.forEach((evaluation: any) => {
    const date = evaluation.approved_at ? new Date(evaluation.approved_at) : null;
    const month = date ? date.toLocaleString('de-DE', { month: 'long', year: 'numeric' }) : 'Unbekannt';
    monthlyEarningsMap.set(month, (monthlyEarningsMap.get(month) || 0) + (evaluation.premium_awarded || 0));
  });

  premiumAdjustments.forEach((adjustment) => {
    const date = new Date(adjustment.created_at);
    const month = date.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    monthlyEarningsMap.set(month, (monthlyEarningsMap.get(month) || 0) + adjustment.amount);
  });

  const monthlyEarnings = Array.from(monthlyEarningsMap, ([month, amount]) => ({ month, amount }));

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
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
      {/* Premium Overview Header */}
      <Card className="bg-gradient-to-br from-green-50 via-green-50/80 to-emerald-50/60 border-green-200/60">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-green-500/10 border border-green-200/60">
                <Coins className="h-10 w-10 text-green-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-bold text-green-800">€{totalPremiumIncludingAdjustments.toFixed(2)}</h2>
                <p className="text-green-600 font-medium">Gesamtprämien erhalten</p>
                <div className="flex items-center gap-4 text-sm text-green-600">
                  <span>Aus {approvedEvaluations.length} genehmigten Bewertungen</span>
                  <span>•</span>
                  <span>{completedCount} abgeschlossene Aufträge</span>
                  {manualAdjustmentsTotal !== 0 && (
                    <>
                      <span>•</span>
                      <span>€{manualAdjustmentsTotal.toFixed(2)} manuelle Anpassungen</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Aktiv seit {activeSince || 'Januar 2024'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Premium Adjustments */}
      {premiumAdjustments.length > 0 && (
        <Card className="border-muted/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              Manuelle Prämien-Anpassungen
              <Badge variant={manualAdjustmentsTotal >= 0 ? "default" : "destructive"} className="ml-2">
                Gesamt: {manualAdjustmentsTotal >= 0 ? '+' : ''}€{manualAdjustmentsTotal.toFixed(2)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {premiumAdjustments.map((adjustment, index) => (
                <div key={index} className="group flex items-center justify-between p-4 rounded-lg border border-muted/50 bg-blue-50/30 hover:bg-blue-50/50 hover:border-blue-200/60 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${adjustment.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {adjustment.amount > 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-red-600 rotate-180" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground group-hover:text-blue-800 transition-colors">
                        {adjustment.reason || 'Manuelle Anpassung'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(adjustment.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`${adjustment.amount > 0 ? 'bg-green-500/10 text-green-800 hover:bg-green-500/20' : 'bg-red-500/10 text-red-800 hover:bg-red-500/20'} text-base font-bold px-3 py-1.5 transition-colors`}>
                      {adjustment.amount > 0 ? '+' : ''}€{adjustment.amount.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium History */}
      <Card className="border-muted/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Coins className="h-5 w-5 text-green-600" />
            </div>
            Prämien-Verlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedEvaluations.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-6 p-4 rounded-full bg-muted/50 w-fit">
                <Coins className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Noch keine Prämien erhalten</h3>
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                Vervollständigen Sie Aufträge und lassen Sie diese vom Administrator genehmigen, um Ihre ersten Prämien zu erhalten.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedEvaluations.map((evaluation, index) => (
                <div key={index} className="group flex items-center justify-between p-4 rounded-lg border border-muted/50 bg-green-50/30 hover:bg-green-50/50 hover:border-green-200/60 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-green-500/10">
                      <Trophy className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground group-hover:text-green-800 transition-colors">
                        {evaluation.orders?.title || 'Auftrag'}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>#{evaluation.orders?.order_number}</span>
                        <span>•</span>
                        <span>{evaluation.orders?.provider}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Genehmigt am {evaluation.approved_at ? new Date(evaluation.approved_at).toLocaleDateString('de-DE') : 'Unbekannt'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-500/10 text-green-800 text-base font-bold px-3 py-1.5 hover:bg-green-500/20 transition-colors">
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
      <Card className="border-muted/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
            Meilensteine & Errungenschaften
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {achievements.map((achievement, index) => (
            <div key={index} className="group flex items-center gap-4 p-4 rounded-lg border border-muted/50 hover:border-muted transition-colors">
              <div className={`p-3 rounded-xl ${achievement.earned ? achievement.bgColor : 'bg-muted/50'} group-hover:scale-105 transition-transform duration-300`}>
                <achievement.icon className={`h-6 w-6 ${achievement.earned ? achievement.color : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className={`font-semibold ${achievement.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {achievement.name}
                </h3>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
              </div>
              <div>
                {achievement.earned ? (
                  <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200/60">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Erreicht
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground border-muted/60">
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
        <Card className="border-muted/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              Monatliche Prämien-Entwicklung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyEarnings.map((entry, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium text-muted-foreground">{entry.month}</div>
                  <div className="flex-1 bg-muted/60 rounded-full h-8 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-500 h-full transition-all duration-500 flex items-center justify-end pr-3 relative"
                      style={{ width: `${Math.min((entry.amount / Math.max(...monthlyEarnings.map(e => e.amount))) * 100, 100)}%` }}
                    >
                      <span className="text-white text-sm font-semibold drop-shadow-sm">
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

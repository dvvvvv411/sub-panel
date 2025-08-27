import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Home, Settings, User, BarChart3, Gift, MessageSquare, Target, TrendingUp, Star, Crown, Briefcase } from 'lucide-react';
import { OverviewTab } from '@/components/employee/OverviewTab';
import { TasksTab } from '@/components/employee/TasksTab';
import { ReviewsTab } from '@/components/employee/ReviewsTab';
import { RewardsTab } from '@/components/employee/RewardsTab';
import { PersonalDataTab } from '@/components/employee/PersonalDataTab';

interface AssignedOrder {
  id: string;
  title: string;
  order_number: string;
  provider: string;
  project_goal: string;
  premium: number;
  created_at: string;
  assignment_status: 'assigned' | 'in_progress' | 'completed';
  whatsapp_accounts: {
    id: string;
    name: string;
    account_info: string | null;
  } | null;
  order_evaluation_questions: Array<{
    id: string;
    question: string;
  }>;
}

const Mitarbeiter = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [employeeProfile, setEmployeeProfile] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchAssignedOrders();
    }
  }, [user, loading, navigate]);

  const fetchAssignedOrders = async () => {
    if (!user?.email) return;

    try {
      setLoadingOrders(true);
      
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, phone')
        .eq('email', user.email)
        .maybeSingle();

      if (employeeError) {
        console.error('Error fetching employee record:', employeeError);
      }

      if (!employeeData) {
        console.log('No employee record found for user');
        setEmployeeProfile(null);
        setAssignedOrders([]);
        return;
      }

      setEmployeeProfile(employeeData);

      const { data, error } = await supabase
        .from('order_assignments')
        .select(`
        status,
        orders (
          id,
          title,
          order_number,
          provider,
          project_goal,
          premium,
          created_at,
          whatsapp_accounts (
            id,
            name,
            account_info
          ),
          order_evaluation_questions (
            id,
            question
          )
        )
      `)
        .eq('employee_id', employeeData.id);

      if (error) {
        console.error('Error fetching assigned orders:', error);
        toast.error('Fehler beim Laden der zugewiesenen Aufträge');
        setAssignedOrders([]);
        return;
      }

      const orders = (data || [])
        .map((assignment: any) => {
          const order = assignment.orders;
          if (!order) return null;
          return { ...order, assignment_status: assignment.status };
        })
        .filter(Boolean);

      setAssignedOrders(orders as AssignedOrder[]);
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
      toast.error('Fehler beim Laden der zugewiesenen Aufträge');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!employeeProfile?.id) return;

    const channel = supabase
      .channel('order_assignments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_assignments', filter: `employee_id=eq.${employeeProfile.id}` },
        () => {
          fetchAssignedOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeProfile?.id]);

  const handleStartOrder = async (orderId: string) => {
    if (!user) return;

    try {
      // Update assignment status to 'in_progress'
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!employeeData) return;

      const { error } = await supabase
        .from('order_assignments')
        .update({ status: 'in_progress' })
        .eq('order_id', orderId)
        .eq('employee_id', employeeData.id);

      if (error) {
        console.error('Error starting order:', error);
        toast.error('Fehler beim Starten des Auftrags');
        return;
      }

      toast.success('Auftrag wurde gestartet');
      fetchAssignedOrders(); // Refresh the list
    } catch (error) {
      console.error('Error starting order:', error);
      toast.error('Fehler beim Starten des Auftrags');
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/auth');
    }
  };

  const handleHomeNavigation = () => {
    navigate('/');
  };

  const handleAdminNavigation = () => {
    if (profile?.role === 'admin') {
      navigate('/admin');
    }
  };

  // Calculate KPIs
  const pendingOrders = assignedOrders.filter(order => order.assignment_status !== 'completed').length;
  const completedOrders = assignedOrders.filter(order => order.assignment_status === 'completed').length;
  const totalPremium = assignedOrders.reduce((sum, order) => sum + (order.premium || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-inter">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Lädt Ihr Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Profile Section */}
            <div className="flex items-center gap-6 animate-fade-in">
              <Avatar className="h-16 w-16 ring-4 ring-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {employeeProfile ? `${employeeProfile.first_name?.[0]}${employeeProfile.last_name?.[0]}` : 'M'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Willkommen zurück, {employeeProfile?.first_name || 'Mitarbeiter'}!
                </h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Mitarbeiter Dashboard
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                    Aktiv
                  </Badge>
                  {profile?.role === 'admin' && (
                    <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">
                      <Crown className="h-3 w-3 mr-1" />
                      Administrator
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHomeNavigation}
                className="text-muted-foreground hover:text-foreground"
              >
                <Home className="h-4 w-4 mr-2" />
                Startseite
              </Button>
              
              {profile?.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAdminNavigation}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          {loadingOrders ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({length: 4}).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
              <div className="text-center space-y-1">
                <div className="text-2xl md:text-3xl font-bold text-primary">{assignedOrders.length}</div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">Zugewiesene Aufträge</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl md:text-3xl font-bold text-orange-600">{pendingOrders}</div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">Offene Aufträge</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl md:text-3xl font-bold text-green-600">{completedOrders}</div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">Abgeschlossen</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl md:text-3xl font-bold text-yellow-600">€{totalPremium.toFixed(0)}</div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">Gesamtprämie</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Modern Tabbed Interface */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b pb-4">
            <TabsList className="grid w-full grid-cols-5 h-12 bg-muted/50 rounded-lg p-1">
              <TabsTrigger value="overview" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Übersicht</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Aufgaben</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Bewertungen</span>
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Gift className="h-4 w-4" />
                <span className="hidden sm:inline">Prämien</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="animate-enter space-y-6 mt-6">
            <OverviewTab assignedOrders={assignedOrders} user={profile} employeeProfile={employeeProfile} />
          </TabsContent>

          <TabsContent value="tasks" className="animate-enter space-y-6 mt-6">
            <TasksTab assignedOrders={assignedOrders} onStartOrder={handleStartOrder} />
          </TabsContent>

          <TabsContent value="reviews" className="animate-enter space-y-6 mt-6">
            <ReviewsTab user={user} />
          </TabsContent>

          <TabsContent value="rewards" className="animate-enter space-y-6 mt-6">
            <RewardsTab assignedOrders={assignedOrders} user={profile} />
          </TabsContent>

          <TabsContent value="profile" className="animate-enter space-y-6 mt-6">
            <PersonalDataTab
              user={{
                name: employeeProfile ? `${employeeProfile.first_name} ${employeeProfile.last_name}` : (profile?.full_name || ''),
                email: employeeProfile?.email || profile?.email || '',
                phone: employeeProfile?.phone || '',
                position: 'Mitarbeiter'
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Admin Notice */}
        {profile?.role === 'admin' && (
          <Card className="mt-8 border-blue-200/60 bg-gradient-to-r from-blue-50/80 to-blue-100/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Crown className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Administrator-Privilegien</p>
                  <p className="text-sm text-blue-700">
                    Sie haben erweiterte Administratorrechte für zusätzliche Systemfunktionen.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Mitarbeiter;
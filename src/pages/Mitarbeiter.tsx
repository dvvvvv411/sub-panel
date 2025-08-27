import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Home, Settings, User, BarChart3, Gift, MessageSquare, Target } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Modern Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-muted-foreground">
                Verwalten Sie Ihre Aufträge und verfolgen Sie Ihren Fortschritt
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleHomeNavigation}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Startseite
            </Button>
            
            {profile?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdminNavigation}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Admin
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>

        {/* Modern Tabbed Interface */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-fit lg:grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Übersicht</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Aufgaben</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Bewertungen</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Prämien</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab assignedOrders={assignedOrders} user={profile} />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <TasksTab assignedOrders={assignedOrders} onStartOrder={handleStartOrder} />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <ReviewsTab assignedOrders={assignedOrders} />
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <RewardsTab assignedOrders={assignedOrders} user={profile} />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
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
          <Card className="mt-6 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-blue-600" />
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
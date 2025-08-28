import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Users, 
  User, 
  Award, 
  ClipboardList, 
  BarChart3, 
  LogOut, 
  Briefcase,
  Star,
  Euro,
  CheckCircle,
  Loader2,
  Menu
} from 'lucide-react';
import { OverviewTab } from '@/components/employee/OverviewTab';
import { TasksTab } from '@/components/employee/TasksTab';
import { PersonalDataTab } from '@/components/employee/PersonalDataTab';
import { ReviewsTab } from '@/components/employee/ReviewsTab';
import { RewardsTab } from '@/components/employee/RewardsTab';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
}

interface AssignedOrder {
  id: string;
  title: string;
  order_number: string;
  premium: number;
  provider: string;
  project_goal: string;
  assignment_status: 'assigned' | 'in_progress' | 'evaluated' | 'completed';
  assignment_id: string;
  assigned_at: string;
  evaluation_questions?: string;
}

interface Stats {
  totalAssignments: number;
  completedAssignments: number;
  totalEarnings: number;
  averageRating: number;
}

const Mitarbeiter = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalAssignments: 0,
    completedAssignments: 0,
    totalEarnings: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasInitialized = useRef(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Redirect admins to admin panel
    if (profile && profile.role === 'admin') {
      navigate('/admin');
      return;
    }
    
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchEmployeeData();
      
      // Set up real-time subscription for order assignments - only once
      const channel = supabase
        .channel('order-assignments-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_assignments'
          },
          () => {
            console.log('Order assignments changed, refetching data...');
            // Only refetch if already initialized to avoid initial load conflicts
            if (hasInitialized.current) {
              fetchEmployeeData();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, profile, navigate]);

  const fetchEmployeeData = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      // Get employee by email
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .single();

      if (employeeError) {
        console.error('Error fetching employee:', employeeError);
        toast.error('Fehler beim Laden der Mitarbeiterdaten');
        return;
      }

      setEmployee(employeeData);

      // Get assigned orders with assignment details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('order_assignments')
        .select(`
          id,
          status,
          assigned_at,
          orders (
            id,
            title,
            order_number,
            premium,
            provider,
            project_goal
          )
        `)
        .eq('employee_id', employeeData.id)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        toast.error('Fehler beim Laden der Aufträge');
        return;
      }

      // Transform the data to match our interface
      const transformedOrders: AssignedOrder[] = assignmentsData.map((assignment: any) => ({
        id: assignment.orders.id,
        title: assignment.orders.title,
        order_number: assignment.orders.order_number,
        premium: assignment.orders.premium,
        provider: assignment.orders.provider,
        project_goal: assignment.orders.project_goal,
        assignment_status: assignment.status,
        assignment_id: assignment.id,
        assigned_at: assignment.assigned_at
      }));

      setAssignedOrders(transformedOrders);

      // Calculate stats
      const completedCount = transformedOrders.filter(order => order.assignment_status === 'completed').length;

      // Get approved evaluations with premium awarded
      const { data: evaluationsData } = await supabase
        .from('order_evaluations')
        .select('rating, premium_awarded')
        .eq('employee_id', employeeData.id)
        .eq('status', 'approved');

      // Get premium adjustments
      const { data: premiumAdjustments } = await supabase
        .from('premium_adjustments')
        .select('amount')
        .eq('employee_id', employeeData.id);

      // Calculate total earnings from approved evaluations and premium adjustments
      const evaluationEarnings = evaluationsData?.reduce((sum, evaluation) => sum + (evaluation.premium_awarded || 0), 0) || 0;
      const adjustmentEarnings = premiumAdjustments?.reduce((sum, adjustment) => sum + (adjustment.amount || 0), 0) || 0;
      const totalEarnings = evaluationEarnings + adjustmentEarnings;

      const averageRating = evaluationsData && evaluationsData.length > 0 
        ? evaluationsData.reduce((sum, evaluation) => sum + evaluation.rating, 0) / evaluationsData.length
        : 0;

      setStats({
        totalAssignments: transformedOrders.length,
        completedAssignments: completedCount,
        totalEarnings,
        averageRating
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
      setHasInitialLoad(true);
    }
  };

  const handleStartOrder = (orderId: string) => {
    // Navigation is handled in TasksTab component
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Erfolgreich abgemeldet');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Always navigate to auth page regardless of error
      navigate('/auth');
    }
  };

  if (loading && !hasInitialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Lädt Ihre Daten...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Mitarbeiterdaten konnten nicht geladen werden.
            </p>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Abmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Willkommen, {employee.first_name}!
                </h1>
                <p className="text-muted-foreground">
                  Mitarbeiter-Dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {isMobile && (
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                    <nav className="flex flex-col space-y-4 mt-6">
                      <Button 
                        variant={activeTab === 'overview' ? 'default' : 'ghost'} 
                        className="w-full justify-start"
                        onClick={() => {setActiveTab('overview'); setIsMobileMenuOpen(false);}}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Übersicht
                      </Button>
                      <Button 
                        variant={activeTab === 'tasks' ? 'default' : 'ghost'} 
                        className="w-full justify-start"
                        onClick={() => {setActiveTab('tasks'); setIsMobileMenuOpen(false);}}
                      >
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Aufträge
                      </Button>
                      <Button 
                        variant={activeTab === 'reviews' ? 'default' : 'ghost'} 
                        className="w-full justify-start"
                        onClick={() => {setActiveTab('reviews'); setIsMobileMenuOpen(false);}}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Bewertungen
                      </Button>
                      <Button 
                        variant={activeTab === 'rewards' ? 'default' : 'ghost'} 
                        className="w-full justify-start"
                        onClick={() => {setActiveTab('rewards'); setIsMobileMenuOpen(false);}}
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Belohnungen
                      </Button>
                      <Button 
                        variant={activeTab === 'personal' ? 'default' : 'ghost'} 
                        className="w-full justify-start"
                        onClick={() => {setActiveTab('personal'); setIsMobileMenuOpen(false);}}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Persönlich
                      </Button>
                    </nav>
                  </SheetContent>
                </Sheet>
              )}
              
              <Badge variant="secondary" className="px-3 py-1">
                <User className="h-3 w-3 mr-1" />
                {employee.status === 'active' ? 'Aktiv' : 'Inaktiv'}
              </Badge>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview - Hidden on Mobile */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!isMobile && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{stats.totalAssignments}</p>
                    <p className="text-sm font-medium text-blue-700">Gesamt Aufträge</p>
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
                    <p className="text-2xl font-bold text-green-900">{stats.completedAssignments}</p>
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
                    <p className="text-2xl font-bold text-yellow-900">€{stats.totalEarnings.toFixed(2)}</p>
                    <p className="text-sm font-medium text-yellow-700">Verdienst</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/60">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/10">
                    <Star className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-900">
                      {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                    </p>
                    <p className="text-sm font-medium text-purple-700">Ø Bewertung</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs - Hidden on Mobile */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-5 bg-white/60 backdrop-blur-sm">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Übersicht</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Aufträge</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Bewertungen</span>
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span className="hidden sm:inline">Belohnungen</span>
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Persönlich</span>
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab 
              stats={stats} 
              assignedOrders={assignedOrders} 
              employee={employee}
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <TasksTab 
              assignedOrders={assignedOrders} 
              onStartOrder={handleStartOrder}
            />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <ReviewsTab employee={employee} />
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <RewardsTab employee={employee} />
          </TabsContent>

          <TabsContent value="personal" className="space-y-6">
            <PersonalDataTab employee={employee} onUpdate={fetchEmployeeData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Mitarbeiter;

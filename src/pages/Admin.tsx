import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Users, LogOut, Crown, UserPlus, Briefcase, MessageSquare, Calendar, TrendingUp, Home } from 'lucide-react';
import { VicsTab } from '@/components/VicsTab';
import { OrdersTab } from '@/components/OrdersTab';
import { ReviewsManagementTab } from '@/components/ReviewsManagementTab';
import { AppointmentsOverviewTab } from '@/components/AppointmentsOverviewTab';
import { AdminOverviewTab } from '@/components/AdminOverviewTab';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

const Admin = () => {
  const { user, profile, signOut, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get active tab from URL, default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
      return;
    }

    if (isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin, loading, navigate]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Fehler beim Laden der Benutzer');
        return;
      }

      setUsers((data || []) as UserProfile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setLoadingUsers(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        toast.error('Fehler beim Aktualisieren der Benutzerrolle');
        return;
      }

      toast.success('Benutzerrolle erfolgreich aktualisiert');
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Fehler beim Aktualisieren der Benutzerrolle');
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

  if (loading || loadingUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-inter">
      {/* Modern Hero Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Innovatech Admin</h1>
                  <p className="text-sm text-muted-foreground">Verwaltungsbereich</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                    {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profile?.full_name || profile?.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleHomeNavigation} className="text-muted-foreground hover:text-foreground">
                  <Home className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Startseite</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Abmelden</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sticky Tabs Navigation */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="h-12 bg-card/50 border border-border/50 rounded-lg p-1 grid w-full grid-cols-5 gap-1">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 h-10 px-4 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border transition-all duration-200"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Übersicht</span>
              </TabsTrigger>
              <TabsTrigger 
                value="vics" 
                className="flex items-center gap-2 h-10 px-4 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border transition-all duration-200"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Vics</span>
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="flex items-center gap-2 h-10 px-4 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border transition-all duration-200"
              >
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Aufträge</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reviews" 
                className="flex items-center gap-2 h-10 px-4 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border transition-all duration-200"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Bewertungen</span>
              </TabsTrigger>
              <TabsTrigger 
                value="appointments" 
                className="flex items-center gap-2 h-10 px-4 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border transition-all duration-200"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Termine</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content with animations */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value="overview" className="animate-fade-in">
            <AdminOverviewTab />
          </TabsContent>

          <TabsContent value="vics" className="animate-fade-in">
            <VicsTab />
          </TabsContent>

          <TabsContent value="orders" className="animate-fade-in">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="reviews" className="animate-fade-in">
            <ReviewsManagementTab />
          </TabsContent>

          <TabsContent value="appointments" className="animate-fade-in">
            <AppointmentsOverviewTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;

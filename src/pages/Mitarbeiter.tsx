import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, LogOut, Briefcase, Calendar, Euro, Play, MessageSquare } from 'lucide-react';

interface AssignedOrder {
  id: string;
  title: string;
  order_number: string;
  provider: string;
  project_goal: string;
  premium: number;
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchAssignedOrders();
    }
  }, [user, loading, navigate]);

  const fetchAssignedOrders = async () => {
    if (!user) return;

    try {
      setLoadingOrders(true);
      
      // Find employee record for this user
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .single();

      if (employeeError || !employeeData) {
        console.log('No employee record found for user');
        setAssignedOrders([]);
        return;
      }

      // Get assigned orders for this employee
      const { data, error } = await supabase
        .from('order_assignments')
        .select(`
          orders (
            id,
            title,
            order_number,
            provider,
            project_goal,
            premium,
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
        .eq('employee_id', employeeData.id)
        .eq('status', 'assigned');

      if (error) {
        console.error('Error fetching assigned orders:', error);
        toast.error('Fehler beim Laden der zugewiesenen Aufträge');
        return;
      }

      const orders = data?.map(assignment => assignment.orders).filter(Boolean) || [];
      setAssignedOrders(orders as AssignedOrder[]);
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
      toast.error('Fehler beim Laden der zugewiesenen Aufträge');
    } finally {
      setLoadingOrders(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-primary">Innovatech Mitarbeiter</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <User className="h-3 w-3 mr-1" />
                {profile?.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {profile?.full_name || profile?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleHomeNavigation}>
                Zur Startseite
              </Button>
              {profile?.role === 'admin' && (
                <Button variant="outline" size="sm" onClick={handleAdminNavigation}>
                  Admin Panel
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Willkommen, {profile?.full_name || 'Mitarbeiter'}!
          </h2>
          <p className="text-muted-foreground">
            Ihr persönlicher Arbeitsbereich für Projekte und Aufgaben
          </p>
        </div>

        {/* Profile Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm">{profile?.full_name || 'Nicht angegeben'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">E-Mail</label>
                <p className="text-sm">{profile?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rolle</label>
                <p className="text-sm">
                  <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'}>
                    {profile?.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mitglied seit</label>
                <p className="text-sm">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('de-DE')
                    : 'Unbekannt'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Zugewiesene Aufträge</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignedOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {assignedOrders.length === 0 ? 'Noch keine Aufträge zugewiesen' : 'Bereit zum Bearbeiten'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamtprämie</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assignedOrders.reduce((sum, order) => sum + order.premium, 0).toFixed(2)}€
                </div>
                <p className="text-xs text-muted-foreground">
                  Aus {assignedOrders.length} Aufträgen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Termine heute</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Keine Termine für heute
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Benachrichtigungen</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">🔔</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Keine neuen Benachrichtigungen
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Assigned Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Meine zugewiesenen Aufträge
            </CardTitle>
            <CardDescription>
              Aufträge, die Ihnen zugewiesen wurden und bereit zur Bearbeitung sind
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Lädt Aufträge...</p>
                </div>
              </div>
            ) : assignedOrders.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine Aufträge zugewiesen</p>
                <p className="text-sm text-muted-foreground">
                  Aufträge werden hier erscheinen, sobald sie Ihnen zugewiesen werden
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auftragsnummer</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Anbieter</TableHead>
                    <TableHead>Prämie</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Fragen</TableHead>
                    <TableHead>Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.title}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {order.project_goal}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{order.provider}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {order.premium.toFixed(2)}€
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.whatsapp_accounts ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {order.whatsapp_accounts.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.order_evaluation_questions.length} Fragen
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleStartOrder(order.id)}
                          className="flex items-center gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Beginnen
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Welcome Message */}
        {profile?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Administrator-Hinweis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-primary font-medium">
                  💡 Als Administrator haben Sie zusätzlichen Zugriff auf das Admin Panel, 
                  wo Sie Benutzer verwalten und Systemeinstellungen konfigurieren können.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Mitarbeiter;
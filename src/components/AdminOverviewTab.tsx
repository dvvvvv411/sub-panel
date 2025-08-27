import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Briefcase, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Star
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface OverviewStats {
  // Vics Stats
  totalEmployees: number;
  importedEmployees: number;
  contractSubmissions: number;
  createdEmployees: number;
  
  // Orders Stats
  totalOrders: number;
  assignedOrders: number;
  totalPremiums: number;
  
  // Reviews Stats
  pendingReviews: number;
  approvedReviews: number;
  totalReviewPremiums: number;
  
  // Appointments Stats
  pendingAppointments: number;
  upcomingAppointments: number;
  approvedAppointments: number;
}

interface RecentActivity {
  employees: any[];
  orders: any[];
  reviews: any[];
  appointments: any[];
}

export const AdminOverviewTab = () => {
  const [stats, setStats] = useState<OverviewStats>({
    totalEmployees: 0,
    importedEmployees: 0,
    contractSubmissions: 0,
    createdEmployees: 0,
    totalOrders: 0,
    assignedOrders: 0,
    totalPremiums: 0,
    pendingReviews: 0,
    approvedReviews: 0,
    totalReviewPremiums: 0,
    pendingAppointments: 0,
    upcomingAppointments: 0,
    approvedAppointments: 0,
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    employees: [],
    orders: [],
    reviews: [],
    appointments: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [, setSearchParams] = useSearchParams();

  const navigateToTab = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);

      // Fetch employees data
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch contract submissions
      const { data: contractSubmissions } = await supabase
        .from('employment_contract_submissions')
        .select('*');

      // Fetch orders data
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          *,
          order_assignments(*)
        `)
        .order('created_at', { ascending: false });

      // Fetch reviews data
      const { data: reviews } = await supabase
        .from('order_evaluations')
        .select(`
          *,
          employees(first_name, last_name),
          orders(order_number, title)
        `)
        .order('created_at', { ascending: false });

      // Fetch appointments data
      const { data: appointments } = await supabase
        .from('order_appointments')
        .select(`
          *,
          employees(first_name, last_name),
          orders(order_number, title)
        `)
        .order('scheduled_at', { ascending: true });

      // Calculate stats
      const totalEmployees = employees?.length || 0;
      const importedEmployees = employees?.filter(e => e.status === 'imported').length || 0;
      const createdEmployees = employees?.filter(e => e.status === 'created').length || 0;
      
      const totalOrders = orders?.length || 0;
      const assignedOrders = orders?.filter(o => o.order_assignments?.length > 0).length || 0;
      const totalPremiums = orders?.reduce((sum, order) => sum + (Number(order.premium) || 0), 0) || 0;
      
      const pendingReviews = reviews?.filter(r => r.status === 'pending').length || 0;
      const approvedReviews = reviews?.filter(r => r.status === 'approved').length || 0;
      const totalReviewPremiums = reviews?.filter(r => r.status === 'approved')
        .reduce((sum, review) => sum + (Number(review.premium_awarded) || 0), 0) || 0;
      
      const now = new Date();
      const pendingAppointments = appointments?.filter(a => a.status === 'pending').length || 0;
      const upcomingAppointments = appointments?.filter(a => 
        a.status === 'approved' && new Date(a.scheduled_at) > now
      ).length || 0;
      const approvedAppointments = appointments?.filter(a => a.status === 'approved').length || 0;

      setStats({
        totalEmployees,
        importedEmployees,
        contractSubmissions: contractSubmissions?.length || 0,
        createdEmployees,
        totalOrders,
        assignedOrders,
        totalPremiums,
        pendingReviews,
        approvedReviews,
        totalReviewPremiums,
        pendingAppointments,
        upcomingAppointments,
        approvedAppointments,
      });

      setRecentActivity({
        employees: employees?.slice(0, 5) || [],
        orders: orders?.slice(0, 5) || [],
        reviews: reviews?.slice(0, 5) || [],
        appointments: appointments?.slice(0, 5) || [],
      });

    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Vics Section */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToTab('vics')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mitarbeiter Gesamt</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {stats.importedEmployees} importiert, {stats.createdEmployees} erstellt
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToTab('vics')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arbeitsverträge</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contractSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              Eingereichte Verträge
            </p>
          </CardContent>
        </Card>

        {/* Orders Section */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToTab('orders')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aufträge Gesamt</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.assignedOrders} zugewiesen
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToTab('orders')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Prämien</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalPremiums.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Aus allen Aufträgen
            </p>
          </CardContent>
        </Card>

        {/* Reviews Section */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToTab('reviews')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bewertungen</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReviews}</div>
            <p className="text-xs text-muted-foreground">
              Ausstehend ({stats.approvedReviews} genehmigt)
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToTab('reviews')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausgezahlte Prämien</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalReviewPremiums.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Aus Bewertungen
            </p>
          </CardContent>
        </Card>

        {/* Appointments Section */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToTab('appointments')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Termine</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAppointments}</div>
            <p className="text-xs text-muted-foreground">
              Ausstehend ({stats.upcomingAppointments} anstehend)
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToTab('appointments')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Genehmigte Termine</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedAppointments}</div>
            <p className="text-xs text-muted-foreground">
              Insgesamt genehmigt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Employees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Neueste Mitarbeiter</CardTitle>
                <CardDescription>Zuletzt hinzugefügte Mitarbeiter</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateToTab('vics')}>
                Alle anzeigen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.status === 'created' ? 'default' : 'secondary'}>
                        {employee.status === 'created' ? 'Erstellt' : 'Importiert'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(employee.created_at).toLocaleDateString('de-DE')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Neueste Aufträge</CardTitle>
                <CardDescription>Zuletzt erstellte Aufträge</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateToTab('orders')}>
                Alle anzeigen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auftragsnummer</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Prämie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{order.title}</TableCell>
                    <TableCell>€{parseFloat(order.premium).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Neueste Bewertungen</CardTitle>
                <CardDescription>Zuletzt eingereichte Bewertungen</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateToTab('reviews')}>
                Alle anzeigen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead>Bewertung</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">
                      {review.employees?.first_name} {review.employees?.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        {review.rating}/5
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        review.status === 'approved' ? 'default' : 
                        review.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {review.status === 'approved' ? 'Genehmigt' : 
                         review.status === 'pending' ? 'Ausstehend' : 'Abgelehnt'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Anstehende Termine</CardTitle>
                <CardDescription>Nächste geplante Termine</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateToTab('appointments')}>
                Alle anzeigen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      {appointment.employees?.first_name} {appointment.employees?.last_name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(appointment.scheduled_at).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        appointment.status === 'approved' ? 'default' : 
                        appointment.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {appointment.status === 'approved' ? 'Genehmigt' : 
                         appointment.status === 'pending' ? 'Ausstehend' : 'Abgelehnt'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
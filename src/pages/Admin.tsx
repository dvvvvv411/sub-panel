import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Users, LogOut, Crown, UserPlus } from 'lucide-react';
import { VicsTab } from '@/components/VicsTab';

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
  
  // Get active tab from URL, default to 'users'
  const activeTab = searchParams.get('tab') || 'users';
  
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-primary">Innovatech Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Shield className="h-3 w-3 mr-1" />
                Administrator
              </Badge>
              <span className="text-sm text-muted-foreground">
                {profile?.full_name || profile?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleHomeNavigation}>
                Zur Startseite
              </Button>
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
          <h2 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Verwalten Sie Benutzer und deren Rollen im System
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamt Benutzer</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administratoren</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'admin').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Standard Benutzer</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'user').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Benutzerverwaltung
            </TabsTrigger>
            <TabsTrigger value="vics" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Vics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Benutzerverwaltung</CardTitle>
                <CardDescription>
                  Verwalten Sie Benutzerrollen und -berechtigungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || 'Kein Name'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('de-DE')}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value: 'user' | 'admin') => 
                              updateUserRole(user.user_id, value)
                            }
                            disabled={user.user_id === profile?.user_id} // Prevent self role change
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Benutzer</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vics">
            <VicsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
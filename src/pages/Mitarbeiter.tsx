import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Briefcase, Calendar, Clock } from 'lucide-react';

const Mitarbeiter = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
                <CardTitle className="text-sm font-medium">Aktive Projekte</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Noch keine Projekte zugewiesen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offene Aufgaben</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Keine offenen Aufgaben
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

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle>Willkommen bei Innovatech</CardTitle>
            <CardDescription>
              Ihr zentraler Hub für Innovation und Projektmanagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-muted-foreground mb-4">
                Herzlich willkommen in Ihrem persönlichen Arbeitsbereich! Hier können Sie:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Projekte verwalten und den Fortschritt verfolgen</li>
                <li>Mit Ihrem Team kommunizieren und zusammenarbeiten</li>
                <li>Aufgaben organisieren und Deadlines einhalten</li>
                <li>Berichte erstellen und Analysen durchführen</li>
              </ul>
              
              {profile?.role === 'admin' && (
                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-primary font-medium">
                    💡 Als Administrator haben Sie zusätzlichen Zugriff auf das Admin Panel, 
                    wo Sie Benutzer verwalten und Systemeinstellungen konfigurieren können.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Mitarbeiter;
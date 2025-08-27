import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, User, Shield, LogOut, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Index = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect authenticated users based on role
  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/mitarbeiter');
      }
    }
  }, [user, profile, loading, navigate]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/auth');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-primary">Innovatech</h1>
            </div>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {profile?.role === 'admin' ? (
                    <>
                      <Shield className="h-3 w-3 mr-1" />
                      Administrator
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3 mr-1" />
                      Mitarbeiter
                    </>
                  )}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {profile?.full_name || profile?.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Abmelden
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button>
                  Anmelden
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {user ? (
          // Authenticated user view
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Willkommen zurück!
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Wählen Sie Ihren Arbeitsbereich und starten Sie produktiv in den Tag.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                <Link to="/mitarbeiter" className="block">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4 mx-auto group-hover:bg-primary/20 transition-colors">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Mitarbeiter Dashboard</CardTitle>
                    <CardDescription>
                      Zugriff auf Ihre Projekte, Aufgaben und den persönlichen Arbeitsbereich
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Dashboard öffnen
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Link>
              </Card>

              {profile?.role === 'admin' && (
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <Link to="/admin" className="block">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4 mx-auto group-hover:bg-primary/20 transition-colors">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">Admin Panel</CardTitle>
                      <CardDescription>
                        Benutzerverwaltung, Systemeinstellungen und administrative Funktionen
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        Admin Panel öffnen
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Link>
                </Card>
              )}
            </div>
          </div>
        ) : (
          // Public landing page
          <div className="text-center">
            <div className="flex items-center justify-center mb-8">
              <Zap className="h-16 w-16 text-primary mr-4" />
              <h1 className="text-6xl md:text-8xl font-bold text-foreground tracking-tight">
                Innovatech
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
              Die moderne Plattform für Innovation, Projektmanagement und Teamkollaboration. 
              Bringen Sie Ihre Ideen zum Leben und arbeiten Sie effizienter als je zuvor.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-5xl mx-auto">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="w-6 h-6 bg-primary rounded-full"></div>
                  </div>
                  <CardTitle>Projektmanagement</CardTitle>
                  <CardDescription>
                    Verwalten Sie Projekte von der Idee bis zur Umsetzung mit modernen Tools
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="w-6 h-6 bg-primary rounded-full"></div>
                  </div>
                  <CardTitle>Team Kollaboration</CardTitle>
                  <CardDescription>
                    Arbeiten Sie nahtlos mit Ihrem Team zusammen und bleiben Sie immer verbunden
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="w-6 h-6 bg-primary rounded-full"></div>
                  </div>
                  <CardTitle>Innovation Hub</CardTitle>
                  <CardDescription>
                    Zentrale Anlaufstelle für alle Innovationsprozesse in Ihrem Unternehmen
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 py-6">
                Jetzt starten
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

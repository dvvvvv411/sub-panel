
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const Mitarbeiter = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Innovatech</h1>
            <p className="text-sm text-muted-foreground">Mitarbeiter-Portal</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Abmelden
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Willkommen im Mitarbeiter-Portal
            </h2>
            <p className="text-muted-foreground text-lg">
              Hier finden Sie alle wichtigen Informationen und Tools für Ihre tägliche Arbeit.
            </p>
            {user && (
              <p className="text-sm text-muted-foreground mt-2">
                Angemeldet als: {user.email}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                Meine Aufgaben
              </h3>
              <p className="text-muted-foreground mb-4">
                Übersicht über Ihre aktuellen Aufgaben und Projekte
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Aufgaben anzeigen
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                Zeiterfassung
              </h3>
              <p className="text-muted-foreground mb-4">
                Arbeitszeiten erfassen und verwalten
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Zeit erfassen
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                Dokumente
              </h3>
              <p className="text-muted-foreground mb-4">
                Wichtige Dokumente und Ressourcen
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Dokumente öffnen
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                Profil
              </h3>
              <p className="text-muted-foreground mb-4">
                Persönliche Einstellungen und Informationen
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Profil bearbeiten
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Mitarbeiter;

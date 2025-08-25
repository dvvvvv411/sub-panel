
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast({
          title: 'Zugriff verweigert',
          description: 'Sie haben keine Admin-Berechtigung',
          variant: 'destructive',
        });
        navigate('/mitarbeiter');
        return;
      }

      setHasAccess(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
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
          <p>Überprüfe Berechtigung...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Innovatech</h1>
            <p className="text-sm text-muted-foreground">Admin-Dashboard</p>
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
              Willkommen im Admin-Bereich
            </h2>
            <p className="text-muted-foreground text-lg">
              Hier können Sie das System verwalten und administrative Aufgaben durchführen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                Benutzerverwaltung
              </h3>
              <p className="text-muted-foreground mb-4">
                Benutzer und deren Rollen verwalten
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Benutzer verwalten
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                Systemeinstellungen
              </h3>
              <p className="text-muted-foreground mb-4">
                Globale Einstellungen konfigurieren
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Einstellungen
              </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                Berichte
              </h3>
              <p className="text-muted-foreground mb-4">
                Systemberichte und Statistiken
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Berichte anzeigen
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;

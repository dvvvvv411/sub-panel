import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap } from 'lucide-react';

const Auth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  const { profile } = useAuth();
  useEffect(() => {
    if (user && profile) {
      // Redirect based on user role
      if (profile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/mitarbeiter');
      }
    }
  }, [user, profile, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.');
      } else {
        toast.error('Anmeldung fehlgeschlagen: ' + error.message);
      }
    } else {
      toast.success('Erfolgreich angemeldet!');
      // Redirect will be handled by useEffect when profile loads
    }

    setIsLoading(false);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl border-0 overflow-hidden">
        <div className="grid md:grid-cols-2 min-h-[600px]">
          {/* Left side - Visual */}
          <div className="bg-auth-gradient p-12 flex flex-col justify-center items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary-glow/5"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-8">
                <Zap className="h-12 w-12 text-primary mr-3" />
                <h1 className="text-4xl font-bold text-primary">Innovatech</h1>
              </div>
              
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-foreground">
                  Willkommen bei der Zukunft der Innovation
                </h2>
                <p className="text-lg text-muted-foreground max-w-md">
                  Verwalten Sie Ihre Projekte, Teams und Innovationen an einem zentralen Ort. 
                  Moderne Lösungen für moderne Unternehmen.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                    </div>
                    <p className="text-sm font-medium">Projektmanagement</p>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                    </div>
                    <p className="text-sm font-medium">Team Kollaboration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Auth Form */}
          <div className="p-12 flex flex-col justify-center">
            <div className="w-full max-w-sm mx-auto">
              <CardHeader className="px-0 text-center mb-8">
                <CardTitle className="text-2xl font-bold">Anmeldung</CardTitle>
                <CardDescription>
                  Melden Sie sich mit Ihren Zugangsdaten an
                </CardDescription>
              </CardHeader>

              <CardContent className="px-0">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">E-Mail</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="ihre.email@beispiel.de"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Passwort</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Ihr Passwort"
                        required
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Anmelden...' : 'Anmelden'}
                  </Button>
                </form>
              </CardContent>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
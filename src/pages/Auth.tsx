
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';

type AuthFormData = {
  email: string;
  password: string;
  confirmPassword?: string;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>();

  const password = watch('password');

  const getUserRole = async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    if (!data) return null;
    return data.role || null;
  };

  const assignDefaultRole = async (userId: string) => {
    const { error } = await (supabase as any)
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'mitarbeiter'
      });

    if (error) {
      console.error('Error assigning default role:', error);
    }
  };

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) throw error;

        if (authData.user) {
          const role = await getUserRole(authData.user.id);
          
          if (!role) {
            await assignDefaultRole(authData.user.id);
            navigate('/mitarbeiter');
          } else if (role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/mitarbeiter');
          }

          toast({
            title: 'Erfolgreich angemeldet',
            description: 'Willkommen zurück!',
          });
        }
      } else {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;

        if (authData.user) {
          await assignDefaultRole(authData.user.id);
          navigate('/mitarbeiter');
          
          toast({
            title: 'Erfolgreich registriert',
            description: 'Willkommen bei Innovatech!',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Ein Fehler ist aufgetreten',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    reset();
  };

  return (
    <div className="min-h-screen flex">
      {/* Linke Seite - Visualisierung */}
      <div className="hidden lg:flex lg:w-1/2 bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent"></div>
        
        {/* Abstrakte Shapes */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-32 right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/15 rounded-lg rotate-45 blur-lg"></div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-6 tracking-tight">
              Innovatech
            </h1>
            <p className="text-xl text-blue-100 max-w-md leading-relaxed">
              Innovative Lösungen für die Zukunft. Melden Sie sich an und entdecken Sie neue Möglichkeiten.
            </p>
          </div>
        </div>
      </div>

      {/* Rechte Seite - Formular */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="lg:hidden mb-8">
              <h1 className="text-4xl font-bold text-primary mb-2">Innovatech</h1>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {isLogin ? 'Anmelden' : 'Registrieren'}
            </h2>
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Melden Sie sich bei Ihrem Konto an' 
                : 'Erstellen Sie Ihr neues Konto'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre.email@beispiel.de"
                  {...register('email', {
                    required: 'E-Mail ist erforderlich',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Ungültige E-Mail-Adresse',
                    },
                  })}
                  className="mt-1"
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Passwort ist erforderlich',
                    minLength: {
                      value: 6,
                      message: 'Passwort muss mindestens 6 Zeichen lang sein',
                    },
                  })}
                  className="mt-1"
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...register('confirmPassword', {
                      required: 'Passwort-Bestätigung ist erforderlich',
                      validate: value =>
                        value === password || 'Passwörter stimmen nicht überein',
                    })}
                    className="mt-1"
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading 
                ? (isLogin ? 'Wird angemeldet...' : 'Wird registriert...') 
                : (isLogin ? 'Anmelden' : 'Registrieren')
              }
            </Button>
          </form>

          <div className="text-center">
            <p className="text-muted-foreground">
              {isLogin ? 'Noch kein Konto?' : 'Bereits ein Konto?'}
            </p>
            <Button
              variant="ghost"
              onClick={switchMode}
              className="text-primary hover:bg-primary/10"
            >
              {isLogin ? 'Registrieren' : 'Anmelden'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

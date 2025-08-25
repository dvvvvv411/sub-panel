
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-6xl bg-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex min-h-[600px]">
          {/* Linke Seite - Dominantes Blau mit Vektor-Shapes */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 relative overflow-hidden">
            {/* Abstrakte Vektor-Shapes */}
            <div className="absolute top-12 left-12 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="absolute top-32 right-16 w-16 h-16 bg-white/15 rounded-lg rotate-45"></div>
            <div className="absolute bottom-24 left-16 w-32 h-32 bg-white/5 rounded-full"></div>
            <div className="absolute bottom-12 right-12 w-20 h-20 bg-white/10 rounded-lg rotate-12"></div>
            <div className="absolute top-1/2 left-1/4 w-6 h-6 bg-white/20 rounded-full"></div>
            <div className="absolute top-1/3 right-1/3 w-8 h-8 bg-white/15 rounded-full"></div>
            
            {/* Zusätzliche geometrische Formen */}
            <div className="absolute top-20 right-24 w-12 h-12 border-2 border-white/20 rounded-full"></div>
            <div className="absolute bottom-32 left-32 w-16 h-1 bg-white/10 rounded-full rotate-45"></div>
            <div className="absolute top-1/2 right-8 w-1 h-16 bg-white/10 rounded-full rotate-12"></div>

            <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm-2-6V9a4 4 0 118 0v2" />
                  </svg>
                </div>
                <h1 className="text-4xl font-bold mb-4 tracking-tight">
                  Willkommen zurück
                </h1>
                <p className="text-lg text-blue-100 leading-relaxed max-w-sm">
                  Melden Sie sich an, um auf Ihr Innovatech Dashboard zuzugreifen
                </p>
                <div className="pt-4">
                  <p className="text-sm text-blue-200">
                    Sicherer Zugang zu Ihrem Verwaltungsbereich
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rechte Seite - Formular */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
            <div className="w-full max-w-md space-y-8">
              <div className="text-center">
                <div className="lg:hidden mb-8">
                  <h1 className="text-3xl font-bold text-primary mb-2">Innovatech</h1>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {isLogin ? 'Anmelden' : 'Registrieren'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {isLogin 
                    ? 'Melden Sie sich bei Ihrem Konto an' 
                    : 'Erstellen Sie Ihr neues Konto'
                  }
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">E-Mail</Label>
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
                      className="mt-2 h-11"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-medium">Passwort</Label>
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
                      className="mt-2 h-11"
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  {!isLogin && (
                    <div>
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">Passwort bestätigen</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...register('confirmPassword', {
                          required: 'Passwort-Bestätigung ist erforderlich',
                          validate: value =>
                            value === password || 'Passwörter stimmen nicht überein',
                        })}
                        className="mt-2 h-11"
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
                  className="w-full h-11 text-base font-medium"
                  disabled={isLoading}
                >
                  {isLoading 
                    ? (isLogin ? 'Wird angemeldet...' : 'Wird registriert...') 
                    : (isLogin ? 'Anmelden' : 'Registrieren')
                  }
                </Button>
              </form>

              <div className="text-center border-t pt-6">
                <p className="text-muted-foreground text-sm mb-3">
                  {isLogin ? 'Noch kein Konto?' : 'Bereits ein Konto?'}
                </p>
                <Button
                  variant="ghost"
                  onClick={switchMode}
                  className="text-primary hover:bg-primary/10 h-10 px-6"
                >
                  {isLogin ? 'Registrieren' : 'Anmelden'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

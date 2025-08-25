
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-hero-gradient">
      <div className="text-center space-y-8 max-w-2xl px-4">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-primary tracking-tight">
            Innovatech
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Willkommen bei Innovatech - Ihrer Plattform für innovative Lösungen und moderne Technologien.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            Melden Sie sich an, um Zugang zu Ihrem personalisierten Dashboard zu erhalten.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              size="lg"
              className="px-8 py-3 text-lg"
            >
              <Link to="/auth">
                Anmelden / Registrieren
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="outline" 
              size="lg"
              className="border-primary text-primary hover:bg-primary/10 px-8 py-3 text-lg"
            >
              <Link to="/auth">
                Mehr erfahren
              </Link>
            </Button>
          </div>
        </div>

        <div className="pt-8 text-sm text-muted-foreground">
          © 2024 Innovatech. Alle Rechte vorbehalten.
        </div>
      </div>
    </div>
  );
};

export default Index;


import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="text-center space-y-8 max-w-2xl px-4">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-blue-600 tracking-tight">
            Innovatech
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Willkommen bei Innovatech - Ihrer Plattform für innovative Lösungen und moderne Technologien.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-gray-500">
            Melden Sie sich an, um Zugang zu Ihrem personalisierten Dashboard zu erhalten.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              <Link to="/auth">
                Anmelden / Registrieren
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="outline" 
              size="lg"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg"
            >
              <Link to="/auth">
                Mehr erfahren
              </Link>
            </Button>
          </div>
        </div>

        <div className="pt-8 text-sm text-gray-400">
          © 2024 Innovatech. Alle Rechte vorbehalten.
        </div>
      </div>
    </div>
  );
};

export default Index;

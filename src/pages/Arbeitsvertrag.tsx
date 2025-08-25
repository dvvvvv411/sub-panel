import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Upload, CheckCircle, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface ContractRequest {
  requestId: string;
  employee: Employee;
  expiresAt: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  desiredStartDate: string;
  maritalStatus: string;
  socialSecurityNumber: string;
  taxNumber: string;
  healthInsurance: string;
  iban: string;
  bic: string;
  bankName: string;
}

const Arbeitsvertrag = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contractRequest, setContractRequest] = useState<ContractRequest | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    desiredStartDate: '',
    maritalStatus: '',
    socialSecurityNumber: '',
    taxNumber: '',
    healthInsurance: '',
    iban: '',
    bic: '',
    bankName: ''
  });

  const token = searchParams.get('token');

  const steps = [
    { number: 1, title: 'Persönliche\nDaten', shortTitle: 'Persönliche Daten' },
    { number: 2, title: 'Steuer &\nVersicherung', shortTitle: 'Steuer & Versicherung' },
    { number: 3, title: 'Bankverbindung', shortTitle: 'Bankverbindung' },
    { number: 4, title: 'Personalausweis', shortTitle: 'Personalausweis' }
  ];

  useEffect(() => {
    if (!token) {
      toast.error('Ungültiger Link');
      navigate('/');
      return;
    }
    
    fetchContractRequest();
  }, [token]);

  const fetchContractRequest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://yvzgszkliqkzfaulpvju.supabase.co/functions/v1/get-contract-request?token=${token}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2emdzemtsaXFremZhdWxwdmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjkwMDMsImV4cCI6MjA3MTcwNTAwM30.cz09qE_Pem9ViV44Q9W75nNWIUOzx8o3n0_yYL9j9FY`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data?.error || 'Fehler beim Laden der Anfrage');
        navigate('/');
        return;
      }

      if (data.submitted) {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      setContractRequest(data);
      
      // Pre-fill form with employee data
      setFormData(prev => ({
        ...prev,
        firstName: data.employee.first_name || '',
        lastName: data.employee.last_name || '',
        email: data.employee.email || '',
        phone: data.employee.phone || ''
      }));
      
    } catch (error) {
      console.error('Error fetching contract request:', error);
      toast.error('Fehler beim Laden der Anfrage');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type: 'front' | 'back', file: File | null) => {
    if (type === 'front') {
      setIdFrontFile(file);
    } else {
      setIdBackFile(file);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email);
      case 2:
        return true; // Optional fields
      case 3:
        return true; // Optional fields
      case 4:
        return !!(idFrontFile && idBackFile);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast.error('Bitte laden Sie beide Seiten Ihres Personalausweises hoch');
      return;
    }

    try {
      setSubmitting(true);
      
      const submitFormData = new FormData();
      submitFormData.append('token', token!);
      submitFormData.append('contractData', JSON.stringify(formData));
      
      if (idFrontFile) {
        submitFormData.append('idFront', idFrontFile);
      }
      if (idBackFile) {
        submitFormData.append('idBack', idBackFile);
      }

      const { data, error } = await supabase.functions.invoke('submit-contract', {
        body: submitFormData
      });

      if (error || data.error) {
        toast.error(data?.error || 'Fehler beim Einreichen der Daten');
        return;
      }

      toast.success('Ihre Arbeitsvertrag-Informationen wurden erfolgreich eingereicht!');
      setSubmitted(true);
      
    } catch (error) {
      console.error('Error submitting contract:', error);
      toast.error('Fehler beim Einreichen der Daten');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">Erfolgreich eingereicht!</CardTitle>
            <CardDescription>
              Ihre Arbeitsvertrag-Informationen wurden erfolgreich übermittelt. 
              Sie werden in Kürze von uns kontaktiert.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Logo/Header placeholder */}
        <div className="text-center mb-12">
          <div className="w-48 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg mx-auto mb-8 flex items-center justify-center">
            <span className="text-white font-bold text-xl">Company Logo</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {/* Step Circle */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold z-10 ${
                    currentStep > step.number 
                      ? 'bg-green-500 text-white' 
                      : currentStep === step.number
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {currentStep > step.number ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      step.number
                    )}
                  </div>
                  
                  {/* Connecting Line */}
                  {index < steps.length - 1 && (
                    <div className={`h-1 flex-1 mx-4 ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
                
                {/* Step Title */}
                <span className="text-sm text-center mt-3 max-w-20 leading-tight font-medium text-foreground whitespace-pre-line">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Button */}
        <div className="text-center mb-8">
          <Button variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50">
            <File className="h-4 w-4 mr-2" />
            Arbeitsvertrag Vorschau
          </Button>
        </div>

        {/* Main Form Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <File className="h-6 w-6 text-orange-500" />
              Arbeitsvertrag - {steps[currentStep - 1].shortTitle}
            </CardTitle>
            <CardDescription className="text-lg">
              Schritt {currentStep} von 4
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefonnummer</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Gewünschtes Startdatum</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.desiredStartDate}
                    onChange={(e) => handleInputChange('desiredStartDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maritalStatus">Familienstand</Label>
                  <Select value={formData.maritalStatus} onValueChange={(value) => handleInputChange('maritalStatus', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Bitte wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Ledig</SelectItem>
                      <SelectItem value="married">Verheiratet</SelectItem>
                      <SelectItem value="divorced">Geschieden</SelectItem>
                      <SelectItem value="widowed">Verwitwet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="socialSecurity">Sozialversicherungsnummer</Label>
                  <Input
                    id="socialSecurity"
                    value={formData.socialSecurityNumber}
                    onChange={(e) => handleInputChange('socialSecurityNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="taxNumber">Steuernummer</Label>
                  <Input
                    id="taxNumber"
                    value={formData.taxNumber}
                    onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="healthInsurance">Krankenkasse</Label>
                  <Input
                    id="healthInsurance"
                    value={formData.healthInsurance}
                    onChange={(e) => handleInputChange('healthInsurance', e.target.value)}
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) => handleInputChange('iban', e.target.value)}
                    placeholder="DE89 3704 0044 0532 0130 00"
                  />
                </div>
                <div>
                  <Label htmlFor="bic">BIC</Label>
                  <Input
                    id="bic"
                    value={formData.bic}
                    onChange={(e) => handleInputChange('bic', e.target.value)}
                    placeholder="COBADEFFXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="bankName">Name der Bank</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    placeholder="Deutsche Bank AG"
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Personalausweis</h3>
                  <p className="text-muted-foreground">
                    Bitte laden Sie beide Seiten Ihres Personalausweises hoch (optional)
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Vorderseite</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                      {idFrontFile ? (
                        <div>
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-green-700 font-medium">{idFrontFile.name}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => handleFileChange('front', null)}
                          >
                            Entfernen
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-3">Vorderseite hochladen</p>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange('front', e.target.files?.[0] || null)}
                            className="cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Rückseite</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                      {idBackFile ? (
                        <div>
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-green-700 font-medium">{idBackFile.name}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => handleFileChange('back', null)}
                          >
                            Entfernen
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-3">Rückseite hochladen</p>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange('back', e.target.files?.[0] || null)}
                            className="cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>

              {currentStep < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                >
                  Weiter
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? 'Wird eingereicht...' : 'Einreichen'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Arbeitsvertrag;
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  Upload, 
  FileText, 
  User, 
  Calendar, 
  Heart, 
  CreditCard, 
  Camera, 
  Shield,
  Mail,
  Phone,
  Building,
  Hash,
  UserCheck,
  Banknote,
  Eye
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ContractRequest {
  id: string;
  employee_id: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  desiredStartDate: string;
  employmentType: string;
  maritalStatus: string;
  socialSecurityNumber: string;
  taxNumber: string;
  healthInsurance: string;
  iban: string;
  bic: string;
  bankName: string;
}

export default function Arbeitsvertrag() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractRequest, setContractRequest] = useState<ContractRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    desiredStartDate: '',
    employmentType: '',
    maritalStatus: '',
    socialSecurityNumber: '',
    taxNumber: '',
    healthInsurance: '',
    iban: '',
    bic: '',
    bankName: ''
  });
  const [idPhotos, setIdPhotos] = useState<{
    front: File | null;
    back: File | null;
  }>({
    front: null,
    back: null
  });

  useEffect(() => {
    const fetchContractRequest = async () => {
      if (!token) {
        toast.error('Ungültiger Token');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-contract-request', {
          body: { token }
        });

        if (error) {
          console.error('Error fetching contract request:', error);
          toast.error('Fehler beim Abrufen der Vertragsanfrage');
          setLoading(false);
          return;
        }

        if (data?.submitted) {
          toast.error('Diese Anfrage wurde bereits eingereicht');
          setLoading(false);
          return;
        }

        if (data?.error) {
          toast.error(data.error);
          setLoading(false);
          return;
        }

        if (data?.requestId) {
          // Create contract request object for compatibility
          const contractRequestData: ContractRequest = {
            id: data.requestId,
            employee_id: data.employee?.id || '',
            token: token,
            status: 'pending',
            created_at: '',
            expires_at: data.expiresAt || ''
          };
          
          setContractRequest(contractRequestData);
          
          // Pre-fill form with employee data if available
          if (data.employee) {
            setFormData(prev => ({
              ...prev,
              firstName: data.employee.first_name || '',
              lastName: data.employee.last_name || '',
              email: data.employee.email || '',
              phone: data.employee.phone || ''
            }));
          }
        } else {
          toast.error('Ungültige oder abgelaufene Anfrage');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error fetching contract request:', error);
        toast.error('Unerwarteter Fehler beim Abrufen der Anfrage');
      } finally {
        setLoading(false);
      }
    };

    fetchContractRequest();
  }, [token]);

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email && formData.desiredStartDate && formData.employmentType);
      case 2:
        return true;
      case 3:
        return !!formData.iban;
      case 4:
        return !!(idPhotos.front && idPhotos.back);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.error('Bitte füllen Sie alle erforderlichen Felder aus');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      setIdPhotos(prev => ({ ...prev, [side]: file }));
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      toast.error('Ungültiger Token');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('token', token);
      formDataToSubmit.append('contractData', JSON.stringify(formData));
      
      if (idPhotos.front) {
        formDataToSubmit.append('idFront', idPhotos.front);
      }
      if (idPhotos.back) {
        formDataToSubmit.append('idBack', idPhotos.back);
      }

      const response = await fetch('https://yvzgszkliqkzfaulpvju.supabase.co/functions/v1/submit-contract', {
        method: 'POST',
        body: formDataToSubmit
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Übertragen der Daten');
      }

      toast.success('Arbeitsvertrag erfolgreich eingereicht!');
      navigate('/');
      
    } catch (error) {
      console.error('Error submitting contract:', error);
      toast.error(error instanceof Error ? error.message : 'Unbekannter Fehler aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPhotoPreviewUrl = (file: File | null) => {
    return file ? URL.createObjectURL(file) : null;
  };

  const stepTitles = [
    'Persönliche Daten',
    'Steuer & Soziales', 
    'Bankverbindung',
    'Personalausweis'
  ];

  if (loading) {
    return (
      <div className="min-h-screen professional-bg flex items-center justify-center p-4">
        <div className="text-center glass-card p-12 rounded-2xl shadow-2xl max-w-md w-full animate-fade-in">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 animate-pulse"></div>
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Arbeitsvertrag wird geladen</h3>
          <p className="text-slate-600">Bitte haben Sie einen Moment Geduld...</p>
        </div>
      </div>
    );
  }

  if (!contractRequest) {
    return (
      <div className="min-h-screen professional-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-lg glass-card rounded-2xl shadow-2xl border-0 animate-scale-in">
          <CardHeader className="text-center pb-6 pt-8">
            <div className="mx-auto mb-4 w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="h-10 w-10 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-600 mb-2">Ungültiger Link</CardTitle>
            <CardDescription className="text-slate-600 text-base leading-relaxed">
              Dieser Link ist ungültig oder abgelaufen. Bitte wenden Sie sich an Ihren Arbeitgeber 
              für einen neuen Zugangslink.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-8">
            <Button 
              onClick={() => navigate('/')} 
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all duration-200"
            >
              Zurück zur Startseite
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen professional-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Professional Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 bg-white/80 rounded-full shadow-sm border border-slate-200/50">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-slate-600">Sichere Datenübertragung</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
            Arbeitsvertrag
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Vervollständigen Sie Ihre Arbeitsvertragsunterlagen in wenigen einfachen Schritten
          </p>
        </div>

        {/* Enhanced Progress Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 -z-10"></div>
            <div 
              className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 -z-10"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            ></div>
            
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center group">
                <div className={`
                  step-indicator w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-3 border-2
                  ${currentStep > step ? 'completed bg-green-500 border-green-500 text-white' 
                    : currentStep === step ? 'active bg-primary border-primary text-white' 
                    : 'inactive bg-white border-slate-300 text-slate-500'}
                `}>
                  {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
                </div>
                <span className={`text-sm font-medium text-center max-w-[100px] leading-tight
                  ${currentStep >= step ? 'text-slate-700' : 'text-slate-400'}
                `}>
                  {stepTitles[step - 1]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Card className="glass-card rounded-2xl shadow-2xl border-0 overflow-hidden animate-scale-in">
          <CardContent className="p-0">
            {/* Step Content */}
            <div className="p-8 lg:p-12">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="form-section">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Persönliche Informationen</h2>
                      <p className="text-slate-600">Grundlegende Informationen für Ihren Arbeitsvertrag</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="input-with-icon">
                      <Label htmlFor="firstName" className="text-sm font-semibold text-slate-700 mb-2 block">
                        Vorname *
                      </Label>
                      <div className="field">
                        <User className="h-5 w-5" />
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          placeholder="Max"
                          className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20"
                          required
                        />
                      </div>
                    </div>
                    <div className="input-with-icon">
                      <Label htmlFor="lastName" className="text-sm font-semibold text-slate-700 mb-2 block">
                        Nachname *
                      </Label>
                      <div className="field">
                        <User className="h-5 w-5" />
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          placeholder="Mustermann"
                          className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="input-with-icon">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-700 mb-2 block">
                      E-Mail-Adresse *
                    </Label>
                    <div className="field">
                      <Mail className="h-5 w-5" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="max@example.com"
                        className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20"
                        required
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Für wichtige Mitteilungen und Vertragsunterlagen</p>
                  </div>

                  <div className="input-with-icon">
                    <Label htmlFor="phone" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Telefonnummer
                    </Label>
                    <div className="field">
                      <Phone className="h-5 w-5" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+49 123 456789"
                        className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="input-with-icon">
                    <Label htmlFor="desiredStartDate" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Gewünschtes Startdatum *
                    </Label>
                    <div className="field">
                      <Calendar className="h-5 w-5" />
                      <Input
                        id="desiredStartDate"
                        type="date"
                        value={formData.desiredStartDate}
                        onChange={(e) => setFormData({...formData, desiredStartDate: e.target.value})}
                        className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="employmentType" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Anstellungsart *
                    </Label>
                    <Select 
                      value={formData.employmentType} 
                      onValueChange={(value) => setFormData({...formData, employmentType: value})}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20 bg-white">
                        <SelectValue placeholder="Bitte wählen..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl z-50">
                        <SelectItem value="minijob">Minijob</SelectItem>
                        <SelectItem value="teilzeit">Teilzeit</SelectItem>
                        <SelectItem value="vollzeit">Vollzeit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="maritalStatus" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Familienstand
                    </Label>
                    <Select 
                      value={formData.maritalStatus} 
                      onValueChange={(value) => setFormData({...formData, maritalStatus: value})}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20 bg-white">
                        <SelectValue placeholder="Bitte wählen..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl z-50">
                        <SelectItem value="single">Ledig</SelectItem>
                        <SelectItem value="married">Verheiratet</SelectItem>
                        <SelectItem value="divorced">Geschieden</SelectItem>
                        <SelectItem value="widowed">Verwitwet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 2: Tax and Social Security */}
              {currentStep === 2 && (
                <div className="form-section">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Steuer- und Sozialversicherungsdaten</h2>
                      <p className="text-slate-600">Informationen für die Lohnabrechnung (optional)</p>
                    </div>
                  </div>

                  <div className="input-with-icon">
                    <Label htmlFor="socialSecurityNumber" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Sozialversicherungsnummer
                    </Label>
                    <div className="field">
                      <Hash className="h-5 w-5" />
                      <Input
                        id="socialSecurityNumber"
                        value={formData.socialSecurityNumber}
                        onChange={(e) => setFormData({...formData, socialSecurityNumber: e.target.value})}
                        placeholder="12 345678 A 123"
                        className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Falls vorhanden - finden Sie auf Ihrem Sozialversicherungsausweis</p>
                  </div>

                  <div className="input-with-icon">
                    <Label htmlFor="taxNumber" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Steuernummer
                    </Label>
                    <div className="field">
                      <Hash className="h-5 w-5" />
                      <Input
                        id="taxNumber"
                        value={formData.taxNumber}
                        onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                        placeholder="123/456/78901"
                        className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Falls bekannt - finden Sie auf Ihrem letzten Steuerbescheid</p>
                  </div>

                  <div className="input-with-icon">
                    <Label htmlFor="healthInsurance" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Krankenkasse
                    </Label>
                    <div className="field">
                      <Heart className="h-5 w-5" />
                      <Input
                        id="healthInsurance"
                        value={formData.healthInsurance}
                        onChange={(e) => setFormData({...formData, healthInsurance: e.target.value})}
                        placeholder="AOK, Barmer, Techniker Krankenkasse..."
                        className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Name Ihrer aktuellen Krankenkasse</p>
                  </div>
                </div>
              )}

              {/* Step 3: Bank Information */}
              {currentStep === 3 && (
                <div className="form-section">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Bankverbindung</h2>
                      <p className="text-slate-600">Für die Überweisung Ihres Gehalts</p>
                    </div>
                  </div>

                  <div className="input-with-icon">
                    <Label htmlFor="iban" className="text-sm font-semibold text-slate-700 mb-2 block">
                      IBAN * 
                    </Label>
                    <div className="field">
                      <Banknote className="h-5 w-5" />
                      <Input
                        id="iban"
                        value={formData.iban}
                        onChange={(e) => setFormData({...formData, iban: e.target.value.toUpperCase()})}
                        placeholder="DE89 3704 0044 0532 0130 00"
                        className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20 font-mono"
                        required
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">22-stellige internationale Bankkontonummer</p>
                  </div>

                  <div className="input-with-icon">
                    <Label htmlFor="bic" className="text-sm font-semibold text-slate-700 mb-2 block">
                      BIC (optional)
                    </Label>
                    <div className="field">
                      <Hash className="h-5 w-5" />
                      <Input
                        id="bic"
                        value={formData.bic}
                        onChange={(e) => setFormData({...formData, bic: e.target.value.toUpperCase()})}
                        placeholder="COBADEFFXXX"
                        className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20 font-mono"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Bank Identifier Code - meist automatisch erkannt</p>
                  </div>

                  <div className="input-with-icon">
                    <Label htmlFor="bankName" className="text-sm font-semibold text-slate-700 mb-2 block">
                      Bank (optional)
                    </Label>
                    <div className="field">
                      <Building className="h-5 w-5" />
                      <Input
                        id="bankName"
                        value={formData.bankName}
                        onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                        placeholder="Sparkasse, Volksbank, Deutsche Bank..."
                        className="h-12 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: ID Photos */}
              {currentStep === 4 && (
                <div className="form-section">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Camera className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Personalausweis Fotos</h2>
                      <p className="text-slate-600">Für die Identitätsprüfung und Dokumentation</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
                    <div className="flex items-start gap-3">
                      <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-1">Foto-Hinweise</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Fotos sollten gut beleuchtet und scharf sein</li>
                          <li>• Alle Texte müssen klar lesbar sein</li>
                          <li>• Keine Schatten oder Reflexionen</li>
                          <li>• Akzeptierte Formate: JPG, PNG (max. 10MB)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Front ID */}
                    <div>
                      <Label className="text-sm font-semibold text-slate-700 mb-3 block">
                        Vorderseite *
                      </Label>
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, 'front')}
                          className="hidden"
                          id="id-front"
                        />
                        <label
                          htmlFor="id-front"
                          className={`upload-zone ${idPhotos.front ? 'has-file' : ''} flex flex-col items-center justify-center h-48 p-6`}
                        >
                          {idPhotos.front ? (
                            <div className="text-center space-y-3">
                              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                              <div>
                                <p className="font-medium text-green-700">{idPhotos.front.name}</p>
                                <p className="text-sm text-green-600">Datei erfolgreich ausgewählt</p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center space-y-3">
                              <Upload className="h-12 w-12 text-slate-400 mx-auto" />
                              <div>
                                <p className="font-medium text-slate-600">Vorderseite hochladen</p>
                                <p className="text-sm text-slate-500">Klicken oder Datei hierher ziehen</p>
                              </div>
                            </div>
                          )}
                        </label>
                        
                        {idPhotos.front && getPhotoPreviewUrl(idPhotos.front) && (
                          <div className="relative">
                            <img 
                              src={getPhotoPreviewUrl(idPhotos.front)!} 
                              alt="Personalausweis Vorderseite"
                              className="w-full h-32 object-cover rounded-lg border border-slate-200"
                            />
                            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Back ID */}
                    <div>
                      <Label className="text-sm font-semibold text-slate-700 mb-3 block">
                        Rückseite *
                      </Label>
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, 'back')}
                          className="hidden"
                          id="id-back"
                        />
                        <label
                          htmlFor="id-back"
                          className={`upload-zone ${idPhotos.back ? 'has-file' : ''} flex flex-col items-center justify-center h-48 p-6`}
                        >
                          {idPhotos.back ? (
                            <div className="text-center space-y-3">
                              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                              <div>
                                <p className="font-medium text-green-700">{idPhotos.back.name}</p>
                                <p className="text-sm text-green-600">Datei erfolgreich ausgewählt</p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center space-y-3">
                              <Upload className="h-12 w-12 text-slate-400 mx-auto" />
                              <div>
                                <p className="font-medium text-slate-600">Rückseite hochladen</p>
                                <p className="text-sm text-slate-500">Klicken oder Datei hierher ziehen</p>
                              </div>
                            </div>
                          )}
                        </label>
                        
                        {idPhotos.back && getPhotoPreviewUrl(idPhotos.back) && (
                          <div className="relative">
                            <img 
                              src={getPhotoPreviewUrl(idPhotos.back)!} 
                              alt="Personalausweis Rückseite"
                              className="w-full h-32 object-cover rounded-lg border border-slate-200"
                            />
                            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Navigation Footer */}
            <div className="sticky-nav p-6 lg:p-8">
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="px-8 py-3 h-auto rounded-xl border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Zurück
                </Button>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>Schritt {currentStep} von 4</span>
                </div>

                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!validateCurrentStep()}
                    className="px-8 py-3 h-auto rounded-xl bg-primary hover:bg-primary/90 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200"
                  >
                    Weiter
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !validateCurrentStep()}
                    className="px-8 py-3 h-auto rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                        Wird eingereicht...
                      </div>
                    ) : (
                      'Arbeitsvertrag einreichen'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
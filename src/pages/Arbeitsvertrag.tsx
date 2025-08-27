import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CheckCircle, Upload, FileText, User, Calendar, Heart, CreditCard, Camera } from 'lucide-react';
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
        const { data, error } = await supabase
          .from('employment_contract_requests')
          .select('*')
          .eq('token', token)
          .eq('status', 'pending')
          .single();

        if (error) {
          console.error('Error fetching contract request:', error);
          toast.error('Fehler beim Abrufen der Vertragsanfrage');
          setLoading(false);
          return;
        }

        if (!data) {
          toast.error('Ungültige oder abgelaufene Anfrage');
          setLoading(false);
          return;
        }

        setContractRequest(data);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Arbeitsvertrag...</p>
        </div>
      </div>
    );
  }

  if (!contractRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Ungültiger Link</CardTitle>
            <CardDescription>
              Dieser Link ist ungültig oder abgelaufen. Bitte wenden Sie sich an Ihren Arbeitgeber.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Arbeitsvertrag Informationen</h1>
          <p className="text-gray-600">Bitte füllen Sie alle erforderlichen Informationen aus</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
                </div>
                {step < 4 && (
                  <div className={`
                    h-1 w-full mx-2
                    ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Persönliche Daten</span>
            <span>Steuer & Soziales</span>
            <span>Bankverbindung</span>
            <span>Personalausweis</span>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">Persönliche Informationen</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      placeholder="Max"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      placeholder="Mustermann"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">E-Mail-Adresse *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="max@example.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefonnummer</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+49 123 456789"
                  />
                </div>

                <div>
                  <Label htmlFor="desiredStartDate">Gewünschtes Startdatum *</Label>
                  <Input
                    id="desiredStartDate"
                    type="date"
                    value={formData.desiredStartDate}
                    onChange={(e) => setFormData({...formData, desiredStartDate: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="employmentType">Anstellungsart *</Label>
                  <Select 
                    value={formData.employmentType} 
                    onValueChange={(value) => setFormData({...formData, employmentType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bitte wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minijob">Minijob</SelectItem>
                      <SelectItem value="teilzeit">Teilzeit</SelectItem>
                      <SelectItem value="vollzeit">Vollzeit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maritalStatus">Familienstand</Label>
                  <Select 
                    value={formData.maritalStatus} 
                    onValueChange={(value) => setFormData({...formData, maritalStatus: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bitte wählen..." />
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

            {/* Step 2: Tax and Social Security */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">Steuer- und Sozialversicherungsdaten</h2>
                </div>

                <div>
                  <Label htmlFor="socialSecurityNumber">Sozialversicherungsnummer</Label>
                  <Input
                    id="socialSecurityNumber"
                    value={formData.socialSecurityNumber}
                    onChange={(e) => setFormData({...formData, socialSecurityNumber: e.target.value})}
                    placeholder="12 345678 A 123"
                  />
                </div>

                <div>
                  <Label htmlFor="taxNumber">Steuernummer</Label>
                  <Input
                    id="taxNumber"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                    placeholder="123/456/78901"
                  />
                </div>

                <div>
                  <Label htmlFor="healthInsurance">Krankenkasse</Label>
                  <Input
                    id="healthInsurance"
                    value={formData.healthInsurance}
                    onChange={(e) => setFormData({...formData, healthInsurance: e.target.value})}
                    placeholder="AOK, Barmer, TK..."
                  />
                </div>
              </div>
            )}

            {/* Step 3: Bank Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">Bankverbindung</h2>
                </div>

                <div>
                  <Label htmlFor="iban">IBAN *</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) => setFormData({...formData, iban: e.target.value.toUpperCase()})}
                    placeholder="DE89 3704 0044 0532 0130 00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="bic">BIC</Label>
                  <Input
                    id="bic"
                    value={formData.bic}
                    onChange={(e) => setFormData({...formData, bic: e.target.value.toUpperCase()})}
                    placeholder="COBADEFFXXX"
                  />
                </div>

                <div>
                  <Label htmlFor="bankName">Bank</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                    placeholder="Commerzbank AG"
                  />
                </div>
              </div>
            )}

            {/* Step 4: ID Photos */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">Personalausweis Fotos</h2>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Bitte laden Sie Fotos von Vorder- und Rückseite Ihres Personalausweises hoch. 
                  Die Bilder sollten klar und gut lesbar sein.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Front ID */}
                  <div>
                    <Label className="text-sm font-medium">Vorderseite</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'front')}
                        className="hidden"
                        id="id-front"
                      />
                      <label
                        htmlFor="id-front"
                        className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        {idPhotos.front ? (
                          <div className="text-center">
                            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">{idPhotos.front.name}</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Vorderseite hochladen</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Back ID */}
                  <div>
                    <Label className="text-sm font-medium">Rückseite</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'back')}
                        className="hidden"
                        id="id-back"
                      />
                      <label
                        htmlFor="id-back"
                        className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        {idPhotos.back ? (
                          <div className="text-center">
                            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">{idPhotos.back.name}</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Rückseite hochladen</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator className="my-6" />

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Zurück
              </Button>

              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!validateCurrentStep()}
                >
                  Weiter
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !validateCurrentStep()}
                >
                  {isSubmitting ? 'Wird eingereicht...' : 'Arbeitsvertrag einreichen'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

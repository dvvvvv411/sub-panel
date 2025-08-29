import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, User, CreditCard, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Arbeitsvertrag = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);

  // Step 1: Personal Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [desiredStartDate, setDesiredStartDate] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');

  // Step 2: Official Information  
  const [socialSecurityNumber, setSocialSecurityNumber] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [healthInsurance, setHealthInsurance] = useState('');

  // Step 3: Banking Information
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [bankName, setBankName] = useState('');

  // Step 4: Documents
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  useEffect(() => {
    if (!token) {
      toast.error('Ungültiger oder fehlender Token');
      navigate('/');
      return;
    }
    fetchRequestData();
  }, [token, navigate]);

  const fetchRequestData = async () => {
    try {
      const response = await supabase.functions.invoke('get-contract-request', {
        body: { token }
      });

      if (response.error) {
        console.error('Error fetching request:', response.error);
        toast.error('Fehler beim Laden der Anfrage');
        navigate('/');
        return;
      }

      setRequestData(response.data);
      // Pre-fill known data
      setFirstName(response.data.first_name || '');
      setLastName(response.data.last_name || '');
      setEmail(response.data.email || '');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!firstName || !lastName || !email || !phone || !address || !postalCode || !city || !desiredStartDate || !employmentType || !maritalStatus) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }
    } else if (currentStep === 2) {
      if (!socialSecurityNumber || !taxNumber || !healthInsurance) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }
    } else if (currentStep === 3) {
      if (!iban || !bic || !bankName) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }
    }
    
    setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!idFront || !idBack) {
      toast.error('Bitte laden Sie beide Ausweisseiten hoch');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('token', token!);
      formData.append('contractData', JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        address,
        postalCode,
        city,
        desiredStartDate,
        employmentType,
        maritalStatus,
        socialSecurityNumber,
        taxNumber,
        healthInsurance,
        iban,
        bic,
        bankName
      }));
      formData.append('idFront', idFront);
      formData.append('idBack', idBack);

      const response = await supabase.functions.invoke('submit-contract', {
        body: formData
      });

      if (response.error) {
        console.error('Error submitting contract:', response.error);
        toast.error('Fehler beim Einreichen des Vertrags');
        return;
      }

      toast.success('Arbeitsvertrag erfolgreich eingereicht!');
      setCurrentStep(5); // Success step
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Lädt Ihre Anfrage...</p>
        </div>
      </div>
    );
  }

  if (!requestData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Anfrage nicht gefunden oder bereits bearbeitet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Schritt 1: Persönliche Daten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">E-Mail-Adresse *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Telefonnummer *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Adresse + Hausnummer *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="z.B. Musterstraße 15"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">Postleitzahl *</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="12345"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">Stadt *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Musterstadt"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="desiredStartDate">Gewünschtes Startdatum *</Label>
                <Input
                  id="desiredStartDate"
                  type="date"
                  value={desiredStartDate}
                  onChange={(e) => setDesiredStartDate(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="employmentType">Art der Beschäftigung *</Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bitte wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vollzeit">Vollzeit</SelectItem>
                    <SelectItem value="teilzeit">Teilzeit</SelectItem>
                    <SelectItem value="minijob">Minijob</SelectItem>
                    <SelectItem value="werkstudent">Werkstudent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="maritalStatus">Familienstand *</Label>
                <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bitte wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ledig">Ledig</SelectItem>
                    <SelectItem value="verheiratet">Verheiratet</SelectItem>
                    <SelectItem value="geschieden">Geschieden</SelectItem>
                    <SelectItem value="verwitwet">Verwitwet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Schritt 2: Steuerliche und sozialversicherungsrechtliche Angaben
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="socialSecurityNumber">Sozialversicherungsnummer *</Label>
                <Input
                  id="socialSecurityNumber"
                  value={socialSecurityNumber}
                  onChange={(e) => setSocialSecurityNumber(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="taxNumber">Steuerliche Identifikationsnummer *</Label>
                <Input
                  id="taxNumber"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="healthInsurance">Krankenversicherung *</Label>
                <Input
                  id="healthInsurance"
                  value={healthInsurance}
                  onChange={(e) => setHealthInsurance(e.target.value)}
                  placeholder="z.B. TK, AOK, Barmer..."
                  required
                />
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Schritt 3: Bankverbindung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="iban">IBAN *</Label>
                <Input
                  id="iban"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  placeholder="DE89 3704 0044 0532 0130 00"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="bic">BIC *</Label>
                <Input
                  id="bic"
                  value={bic}
                  onChange={(e) => setBic(e.target.value.toUpperCase())}
                  placeholder="COBADEFFXXX"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="bankName">Name der Bank *</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="z.B. Deutsche Bank"
                  required
                />
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Schritt 4: Ausweisdokumente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="idFront">Ausweis Vorderseite *</Label>
                <Input
                  id="idFront"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setIdFront(e.target.files?.[0] || null)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="idBack">Ausweis Rückseite *</Label>
                <Input
                  id="idBack"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setIdBack(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <div className="mt-6">
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Wird eingereicht...
                    </>
                  ) : (
                    'Arbeitsvertrag einreichen'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Erfolgreich eingereicht!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Ihr Arbeitsvertrag wurde erfolgreich eingereicht. Sie erhalten in Kürze eine Bestätigung per E-Mail.
              </p>
              <Badge variant="secondary" className="mt-4">
                Status: Eingereicht
              </Badge>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Arbeitsvertrag ausfüllen
            </h1>
            <p className="text-muted-foreground">
              Bitte füllen Sie alle erforderlichen Informationen aus
            </p>
          </div>

          {/* Progress indicator */}
          {currentStep < 5 && (
            <div className="mb-8">
              <div className="flex justify-between items-center">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      step <= currentStep
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step}
                  </div>
                ))}
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>
            </div>
          )}

          {renderStep()}

          {/* Navigation buttons */}
          {currentStep < 4 && (
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Zurück
              </Button>
              <Button onClick={handleNext}>
                Weiter
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Arbeitsvertrag;

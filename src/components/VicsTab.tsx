
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Upload, UserCheck, Clock, Trash2, Link, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateEmployeeDialog } from '@/components/CreateEmployeeDialog';
import { FileUploadComponent } from '@/components/FileUploadComponent';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

interface ContractSubmission {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  desired_start_date?: string;
  marital_status?: string;
  social_security_number?: string;
  tax_number?: string;
  health_insurance?: string;
  iban?: string;
  bic?: string;
  bank_name?: string;
  id_front_path?: string;
  id_back_path?: string;
  created_at: string;
  employees?: Employee;
}

export const VicsTab = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contractSubmissions, setContractSubmissions] = useState<ContractSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<ContractSubmission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('imported');

  useEffect(() => {
    fetchEmployees();
    fetchContractSubmissions();
  }, []);

  // Refresh employees after contract submissions are loaded to update status
  useEffect(() => {
    if (contractSubmissions.length > 0) {
      fetchEmployees();
    }
  }, [contractSubmissions]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        toast.error('Fehler beim Laden der Mitarbeiter');
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Fehler beim Laden der Mitarbeiter');
    } finally {
      setLoading(false);
    }
  };

  const fetchContractSubmissions = async () => {
    try {
      // Use any type to bypass TypeScript issues with new tables
      const { data, error } = await (supabase as any)
        .from('employment_contract_submissions')
        .select(`
          *,
          employees (
            id,
            first_name,
            last_name,
            email,
            phone,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contract submissions:', error);
        toast.error('Fehler beim Laden der Arbeitsverträge');
        return;
      }

      setContractSubmissions(data || []);

      // Update employee status to 'contract_received' for submitted contracts
      if (data && data.length > 0) {
        const employeeIds = data.map((submission: any) => submission.employee_id);
        
        const { error: updateError } = await supabase
          .from('employees')
          .update({ status: 'contract_received' })
          .in('id', employeeIds)
          .eq('status', 'contract_requested');

        if (updateError) {
          console.error('Error updating employee status:', updateError);
        }
      }
    } catch (error) {
      console.error('Error fetching contract submissions:', error);
      toast.error('Fehler beim Laden der Arbeitsverträge');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      const { error } = await supabase
        .from('employees')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          status: 'imported'
        });

      if (error) {
        console.error('Error adding employee:', error);
        toast.error('Fehler beim Hinzufügen des Mitarbeiters');
        return;
      }

      toast.success('Mitarbeiter erfolgreich hinzugefügt');
      setFormData({ firstName: '', lastName: '', email: '', phone: '' });
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('Fehler beim Hinzufügen des Mitarbeiters');
    }
  };

  const handleRequestContractInfo = async (employee: Employee) => {
    try {
      // Generate unique token
      const token = crypto.randomUUID();
      
      // Create contract request using any type to bypass TypeScript issues
      const { error } = await (supabase as any)
        .from('employment_contract_requests')
        .insert({
          employee_id: employee.id,
          token: token,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating contract request:', error);
        toast.error('Fehler beim Erstellen der Anfrage');
        return;
      }

      // Update employee status to 'contract_requested'
      const { error: updateError } = await supabase
        .from('employees')
        .update({ status: 'contract_requested' })
        .eq('id', employee.id);

      if (updateError) {
        console.error('Error updating employee status:', updateError);
        toast.error('Fehler beim Aktualisieren des Status');
        return;
      }

      // Create the link
      const contractLink = `${window.location.origin}/arbeitsvertrag?token=${token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(contractLink);
      
      toast.success(`Link für ${employee.first_name} ${employee.last_name} wurde in die Zwischenablage kopiert!`);
      
      // Switch to contracts tab and refresh data
      setActiveTab('contracts');
      fetchEmployees();
      
    } catch (error) {
      console.error('Error creating contract request:', error);
      toast.error('Fehler beim Erstellen der Anfrage');
    }
  };

  const handleCreateAccount = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleAccountCreated = (employeeId: string) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, status: 'created' }
          : emp
      )
    );
    
    setActiveTab('created');
    setIsDialogOpen(false);
    setSelectedEmployee(null);
    fetchEmployees();
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        console.error('Error deleting employee:', error);
        toast.error('Fehler beim Löschen des Mitarbeiters');
        return;
      }

      toast.success('Mitarbeiter erfolgreich gelöscht');
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Fehler beim Löschen des Mitarbeiters');
    }
  };

  const handleViewDetails = (submission: ContractSubmission) => {
    setSelectedSubmission(submission);
    setIsDetailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'imported':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Importiert</Badge>;
      case 'contract_requested':
        return <Badge variant="outline" className="border-blue-500 text-blue-700"><Link className="h-3 w-3 mr-1" />AV Infos angefragt</Badge>;
      case 'contract_received':
        return <Badge variant="outline" className="border-green-500 text-green-700"><UserCheck className="h-3 w-3 mr-1" />AV Infos erhalten</Badge>;
      case 'created':
        return <Badge variant="default"><UserCheck className="h-3 w-3 mr-1" />Erstellt</Badge>;
      case 'verified':
        return <Badge variant="outline" className="border-green-500 text-green-700"><UserCheck className="h-3 w-3 mr-1" />Verifiziert</Badge>;
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  const importedEmployees = employees.filter(emp => emp.status === 'imported');
  const contractRequestedEmployees = employees.filter(emp => emp.status === 'contract_requested' || emp.status === 'contract_received');
  const createdEmployees = employees.filter(emp => emp.status === 'created' || emp.status === 'verified');

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Mitarbeiter verwalten
            </CardTitle>
            <CardDescription>
              Erstellen Sie Mitarbeiter-Accounts einzeln oder per Datei-Upload
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Add Employee Form and File Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Add Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">
              <Plus className="h-4 w-4 inline mr-2" />
              Manuell hinzufügen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Max"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Mustermann"
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="max@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefonnummer</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+49 123 456789"
                />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Mitarbeiter hinzufügen
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">
              <Upload className="h-4 w-4 inline mr-2" />
              TXT-Import
            </CardTitle>
            <CardDescription>
              Laden Sie eine TXT-Datei mit Mitarbeiterdaten hoch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadComponent onUploadComplete={fetchEmployees} />
          </CardContent>
        </Card>
      </div>

      {/* Employee Lists */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="imported">
            Importierte Mitarbeiter ({importedEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="contracts">
            Arbeitsverträge ({contractRequestedEmployees.length + contractSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="created">
            Erstellte Mitarbeiter ({createdEmployees.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="imported">
          <Card>
            <CardHeader>
              <CardTitle>Importierte Mitarbeiter</CardTitle>
              <CardDescription>
                Diese Mitarbeiter wurden hinzugefügt, bitten Sie sie um Arbeitsvertrag-Informationen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Lädt...</p>
                </div>
              ) : importedEmployees.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Keine importierten Mitarbeiter vorhanden
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.phone || '-'}</TableCell>
                        <TableCell>{getStatusBadge(employee.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleRequestContractInfo(employee)}
                            >
                              <Link className="h-4 w-4 mr-1" />
                              AV Infos anfragen
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteEmployee(employee.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>Arbeitsverträge</CardTitle>
              <CardDescription>
                Übersicht über angeforderte und eingereichte Arbeitsvertrag-Informationen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contractRequestedEmployees.length === 0 && contractSubmissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Noch keine Arbeitsvertrag-Anfragen gestellt
                </p>
              ) : (
                <div className="space-y-6">
                  {/* Contract Requested Employees */}
                  {contractRequestedEmployees.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Angeforderte Verträge</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>E-Mail</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contractRequestedEmployees.map((employee) => (
                            <TableRow key={employee.id}>
                              <TableCell className="font-medium">
                                {employee.first_name} {employee.last_name}
                              </TableCell>
                              <TableCell>{employee.email}</TableCell>
                              <TableCell>{getStatusBadge(employee.status)}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline"
                                  size="sm" 
                                  onClick={() => handleRequestContractInfo(employee)}
                                >
                                  <Link className="h-4 w-4 mr-1" />
                                  Link kopieren
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Contract Submissions */}
                  {contractSubmissions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Eingereichte Verträge</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>E-Mail</TableHead>
                            <TableHead>Eingereicht am</TableHead>
                            <TableHead>Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contractSubmissions.map((submission) => (
                            <TableRow key={submission.id}>
                              <TableCell className="font-medium">
                                {submission.first_name} {submission.last_name}
                              </TableCell>
                              <TableCell>{submission.email}</TableCell>
                              <TableCell>
                                {new Date(submission.created_at).toLocaleDateString('de-DE')}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline"
                                    size="sm" 
                                    onClick={() => handleViewDetails(submission)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Details
                                  </Button>
                                  {submission.employees && (
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleCreateAccount(submission.employees!)}
                                    >
                                      <UserCheck className="h-4 w-4 mr-1" />
                                      Account erstellen
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="created">
          <Card>
            <CardHeader>
              <CardTitle>Erstellte Mitarbeiter</CardTitle>
              <CardDescription>
                Diese Mitarbeiter haben bereits einen Account im System
              </CardDescription>
            </CardHeader>
            <CardContent>
              {createdEmployees.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Noch keine Accounts erstellt
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt am</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {createdEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.phone || '-'}</TableCell>
                        <TableCell>{getStatusBadge(employee.status)}</TableCell>
                        <TableCell>
                          {new Date(employee.created_at).toLocaleDateString('de-DE')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Account Dialog */}
      <CreateEmployeeDialog
        employee={selectedEmployee}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleAccountCreated}
      />

      {/* Contract Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Arbeitsvertrag-Details: {selectedSubmission?.first_name} {selectedSubmission?.last_name}</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Data */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Persönliche Daten</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedSubmission.first_name} {selectedSubmission.last_name}</div>
                    <div><strong>E-Mail:</strong> {selectedSubmission.email}</div>
                    <div><strong>Telefon:</strong> {selectedSubmission.phone || '-'}</div>
                    <div><strong>Startdatum:</strong> {selectedSubmission.desired_start_date ? new Date(selectedSubmission.desired_start_date).toLocaleDateString('de-DE') : '-'}</div>
                    <div><strong>Familienstand:</strong> {selectedSubmission.marital_status || '-'}</div>
                  </CardContent>
                </Card>

                {/* Tax & Insurance Data */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Steuer- und Versicherungsdaten</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Sozialversicherungsnr.:</strong> {selectedSubmission.social_security_number || '-'}</div>
                    <div><strong>Steuernummer:</strong> {selectedSubmission.tax_number || '-'}</div>
                    <div><strong>Krankenkasse:</strong> {selectedSubmission.health_insurance || '-'}</div>
                  </CardContent>
                </Card>

                {/* Bank Data */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Bankverbindung</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>IBAN:</strong> {selectedSubmission.iban || '-'}</div>
                    <div><strong>BIC:</strong> {selectedSubmission.bic || '-'}</div>
                    <div><strong>Bank:</strong> {selectedSubmission.bank_name || '-'}</div>
                  </CardContent>
                </Card>

                {/* ID Photos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Personalausweis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Vorderseite:</strong> {selectedSubmission.id_front_path ? 'Hochgeladen' : 'Nicht verfügbar'}</div>
                    <div><strong>Rückseite:</strong> {selectedSubmission.id_back_path ? 'Hochgeladen' : 'Nicht verfügbar'}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

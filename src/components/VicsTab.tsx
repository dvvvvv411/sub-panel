import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, UserCheck, Clock, Trash2 } from 'lucide-react';
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
  status: string; // Changed from union type to string to match database
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

export const VicsTab = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

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

  const handleCreateAccount = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleAccountCreated = () => {
    fetchEmployees();
    setIsDialogOpen(false);
    setSelectedEmployee(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'imported':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Importiert</Badge>;
      case 'created':
        return <Badge variant="default"><UserCheck className="h-3 w-3 mr-1" />Erstellt</Badge>;
      case 'verified':
        return <Badge variant="outline" className="border-green-500 text-green-700"><UserCheck className="h-3 w-3 mr-1" />Verifiziert</Badge>;
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  const importedEmployees = employees.filter(emp => emp.status === 'imported');
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
      <Tabs defaultValue="imported" className="space-y-4">
        <TabsList>
          <TabsTrigger value="imported">
            Importierte Mitarbeiter ({importedEmployees.length})
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
                Diese Mitarbeiter wurden hinzugefügt, haben aber noch keinen Account
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
                              onClick={() => handleCreateAccount(employee)}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Account erstellen
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
    </div>
  );
};
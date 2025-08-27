import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Users, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Trash2, 
  Eye,
  Loader2,
  Search,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { PremiumAdjustmentDialog } from '@/components/admin/PremiumAdjustmentDialog';
import { PremiumAdjustmentsHistory } from '@/components/admin/PremiumAdjustmentsHistory';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
}

interface ContractRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  rejection_reason: string | null;
}

const VicsTab = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contractRequests, setContractRequests] = useState<ContractRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ContractRequest | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        toast.error('Fehler beim Laden der Mitarbeiter');
      } else {
        setEmployees(employeesData || []);
      }

      // Disable legacy "contract_requests" fetch (table does not exist in current schema)
      // We keep the UI structure intact by setting an empty list.
      setContractRequests([]);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Mitarbeiter löschen möchten?')) {
      return;
    }

    setDeletingEmployeeId(employeeId);
    
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
      setEmployees(employees.filter(emp => emp.id !== employeeId));
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  // Legacy handlers disabled because the "contract_requests" table is not part of the current schema.
  const handleApproveRequest = async (_requestId: string) => {
    console.warn('Approve request is disabled - no contract_requests table in schema');
    toast.info('Diese Funktion ist derzeit nicht verfügbar.');
  };

  const handleRejectRequest = async (_requestId: string, _reason: string) => {
    console.warn('Reject request is disabled - no contract_requests table in schema');
    toast.info('Diese Funktion ist derzeit nicht verfügbar.');
  };

  const filteredEmployees = employees.filter(employee =>
    employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequests = contractRequests.filter(request => request.status === 'pending');
  const processedRequests = contractRequests.filter(request => request.status !== 'pending');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{employees.length}</p>
                <p className="text-sm font-medium text-blue-700">Aktive Mitarbeiter</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-900">{pendingRequests.length}</p>
                <p className="text-sm font-medium text-yellow-700">Offene Anfragen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{processedRequests.length}</p>
                <p className="text-sm font-medium text-green-700">Bearbeitete Anfragen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Offene Vertragsanfragen ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50/50">
                  <div className="space-y-1">
                    <p className="font-semibold">{request.first_name} {request.last_name}</p>
                    <p className="text-sm text-muted-foreground">{request.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Eingereicht am {new Date(request.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Vertragsanfrage Details</DialogTitle>
                        </DialogHeader>
                        {selectedRequest && (
                          <div className="space-y-4">
                            <div className="grid gap-4">
                              <div>
                                <label className="text-sm font-medium">Name</label>
                                <p className="text-sm text-muted-foreground">
                                  {selectedRequest.first_name} {selectedRequest.last_name}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">E-Mail</label>
                                <p className="text-sm text-muted-foreground">{selectedRequest.email}</p>
                              </div>
                              {selectedRequest.phone && (
                                <div>
                                  <label className="text-sm font-medium">Telefon</label>
                                  <p className="text-sm text-muted-foreground">{selectedRequest.phone}</p>
                                </div>
                              )}
                              {selectedRequest.address && (
                                <div>
                                  <label className="text-sm font-medium">Adresse</label>
                                  <p className="text-sm text-muted-foreground">{selectedRequest.address}</p>
                                </div>
                              )}
                              {selectedRequest.birth_date && (
                                <div>
                                  <label className="text-sm font-medium">Geburtsdatum</label>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(selectedRequest.birth_date).toLocaleDateString('de-DE')}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  const reason = prompt('Grund für die Ablehnung:');
                                  if (reason) {
                                    handleRejectRequest(selectedRequest.id, reason);
                                  }
                                }}
                                disabled={processingRequestId === selectedRequest.id}
                              >
                                {processingRequestId === selectedRequest.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Ablehnen
                              </Button>
                              <Button
                                onClick={() => handleApproveRequest(selectedRequest.id)}
                                disabled={processingRequestId === selectedRequest.id}
                              >
                                {processingRequestId === selectedRequest.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Genehmigen
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mitarbeiter ({employees.length})
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Mitarbeiter suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? 'Keine Mitarbeiter gefunden' : 'Noch keine Mitarbeiter'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Versuchen Sie einen anderen Suchbegriff.' 
                  : 'Genehmigen Sie Vertragsanfragen, um Mitarbeiter hinzuzufügen.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold">{employee.first_name} {employee.last_name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {employee.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Seit {new Date(employee.created_at).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                      {employee.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedEmployee(employee)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold">Mitarbeiter-Informationen</h3>
                              <div className="flex gap-2">
                                {selectedEmployee && (
                                  <PremiumAdjustmentDialog 
                                    employee={selectedEmployee} 
                                    onAdjustmentAdded={() => {
                                      toast.success('Prämien-Anpassung erfolgreich hinzugefügt');
                                    }}
                                  />
                                )}
                                <Button
                                  onClick={() => selectedEmployee && handleDeleteEmployee(selectedEmployee.id)}
                                  variant="destructive"
                                  size="sm"
                                  disabled={deletingEmployeeId === selectedEmployee?.id}
                                >
                                  {deletingEmployeeId === selectedEmployee?.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                  )}
                                  Löschen
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid gap-4 md:grid-cols-2">
                              <Card>
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">Name</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                              
                              <Card>
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">E-Mail</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{selectedEmployee?.email}</p>
                                  </div>
                                </CardContent>
                              </Card>
                              
                              {selectedEmployee?.phone && (
                                <Card>
                                  <CardContent className="p-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">Telefon</span>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{selectedEmployee.phone}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                              
                              <Card>
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">Erstellt am</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedEmployee && new Date(selectedEmployee.created_at).toLocaleDateString('de-DE')}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>

                          {selectedEmployee && (
                            <PremiumAdjustmentsHistory employee={selectedEmployee} />
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VicsTab;

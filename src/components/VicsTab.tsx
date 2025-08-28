import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Upload, UserCheck, Clock, Trash2, Link, Eye, Download, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateEmployeeDialog } from '@/components/CreateEmployeeDialog';
import { AssignToEmployeeDialog } from '@/components/AssignToEmployeeDialog';
import { FileUploadComponent } from '@/components/FileUploadComponent';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status: string;
  employment_type?: string | null;
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

interface EmployeeStats {
  totalAssigned: number;
  completedAssigned: number;
  inProgress: number;
  evaluated: number;
}

interface EmployeeAssignment {
  id: string;
  status: string;
  assigned_at: string;
  orders: {
    id: string;
    title: string;
    order_number: string;
    premium: number;
    provider: string;
    project_goal: string;
  };
}

interface EmployeeEvaluation {
  id: string;
  order_id: string;
  assignment_id: string;
  status: string;
  rating: number;
  premium_awarded: number;
  overall_comment?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  orders: {
    id: string;
    title: string;
    order_number: string;
    premium: number;
  };
}

interface ContractSubmission {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  desired_start_date?: string;
  employment_type?: string;
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

// Component to display ID images
const IDImageDisplay: React.FC<{ path: string; alt: string }> = ({ path, alt }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.storage
          .from('ids')
          .createSignedUrl(path, 60 * 60); // 1 hour expiry

        if (error || !data) {
          console.error('Error getting signed URL:', error);
          setError(true);
          return;
        }

        setImageUrl(data.signedUrl);
      } catch (error) {
        console.error('Error loading image:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [path]);

  if (loading) {
    return (
      <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
        Bild konnte nicht geladen werden
      </div>
    );
  }

  return (
    <div className="w-full">
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-auto max-h-40 object-contain rounded-lg border border-border"
        onError={() => setError(true)}
      />
    </div>
  );
};

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
  const [skipContract, setSkipContract] = useState(false);
  const [employmentType, setEmploymentType] = useState('');
  const [password, setPassword] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<ContractSubmission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('created');

  // New states for employee details
  const [createdStatsByEmployee, setCreatedStatsByEmployee] = useState<Record<string, EmployeeStats>>({});
  const [lastActivityByEmployee, setLastActivityByEmployee] = useState<Record<string, string | null>>({});
  const [averageRatingByEmployee, setAverageRatingByEmployee] = useState<Record<string, number>>({});
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null);
  const [isEmployeeDetailsOpen, setIsEmployeeDetailsOpen] = useState(false);
  const [employeeAssignments, setEmployeeAssignments] = useState<EmployeeAssignment[]>([]);
  const [employeeEvaluations, setEmployeeEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // New states for assign order dialog
  const [selectedEmployeeForAssign, setSelectedEmployeeForAssign] = useState<Employee | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  // New states for deactivate user dialog
  const [selectedEmployeeForDeactivation, setSelectedEmployeeForDeactivation] = useState<Employee | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

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

    if (skipContract) {
      if (!employmentType) {
        toast.error('Bitte wählen Sie eine Anstellungsart aus');
        return;
      }
      if (!password || password.length < 6) {
        toast.error('Passwort muss mindestens 6 Zeichen haben');
        return;
      }
    }

    try {
      // Insert employee with employment_type if skip is active
      const { data: employeeData, error } = await supabase
        .from('employees')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          employment_type: skipContract ? employmentType : null,
          status: 'imported'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding employee:', error);
        toast.error('Fehler beim Hinzufügen des Mitarbeiters');
        return;
      }

      if (skipContract && employeeData) {
        // Call create-user edge function directly
        try {
          const { error: createUserError } = await supabase.functions.invoke('create-user', {
            body: { 
              email: formData.email, 
              password: password,
              employeeId: employeeData.id 
            }
          });

          if (createUserError) {
            // Rollback: delete the employee we just created
            await supabase
              .from('employees')
              .delete()
              .eq('id', employeeData.id);
            
            console.error('Error creating user account:', createUserError);
            toast.error('Fehler beim Erstellen des Benutzerkontos');
            return;
          }

          toast.success('Mitarbeiter erfolgreich erstellt und Account angelegt');
          setActiveTab('created');
        } catch (createError) {
          // Rollback: delete the employee we just created
          await supabase
            .from('employees')
            .delete()
            .eq('id', employeeData.id);
          
          console.error('Error creating user account:', createError);
          toast.error('Fehler beim Erstellen des Benutzerkontos');
          return;
        }
      } else {
        toast.success('Mitarbeiter erfolgreich hinzugefügt');
      }

      // Reset form
      setFormData({ firstName: '', lastName: '', email: '', phone: '' });
      setSkipContract(false);
      setEmploymentType('');
      setPassword('');
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('Fehler beim Hinzufügen des Mitarbeiters');
    }
  };

  const handleDeactivateUser = async () => {
    if (!selectedEmployeeForDeactivation) return;
    
    setIsDeactivating(true);
    try {
      const { error } = await supabase.functions.invoke('deactivate-user', {
        body: { employeeId: selectedEmployeeForDeactivation.id }
      });

      if (error) {
        console.error('Error deactivating user:', error);
        toast.error('Fehler beim Deaktivieren des Benutzers');
        return;
      }

      toast.success(`Benutzer ${selectedEmployeeForDeactivation.first_name} ${selectedEmployeeForDeactivation.last_name} wurde erfolgreich deaktiviert`);
      setIsDeactivateDialogOpen(false);
      setSelectedEmployeeForDeactivation(null);
      fetchEmployees(); // Refresh the list
      fetchCreatedEmployeesStats(); // Refresh statistics
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Fehler beim Deaktivieren des Benutzers');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleCopyExistingLink = async (employee: Employee) => {
    try {
      // Find existing pending request for this employee
      const { data: existingRequests, error } = await (supabase as any)
        .from('employment_contract_requests')
        .select('token')
        .eq('employee_id', employee.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching existing requests:', error);
        toast.error('Fehler beim Abrufen der bestehenden Anfrage');
        return;
      }

      let token;
      if (existingRequests && existingRequests.length > 0) {
        // Use existing token
        token = existingRequests[0].token;
      } else {
        // Create new request
        const newToken = crypto.randomUUID();
        
        const { error: createError } = await (supabase as any)
          .from('employment_contract_requests')
          .insert({
            employee_id: employee.id,
            token: newToken,
            status: 'pending'
          });

        if (createError) {
          console.error('Error creating contract request:', createError);
          toast.error('Fehler beim Erstellen der Anfrage');
          return;
        }

        token = newToken;
      }

      // Create the link with custom base URL
      const baseUrl = 'https://web.innovaatech.de';
      const contractLink = `${baseUrl}/arbeitsvertrag?token=${token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(contractLink);
      
      toast.success(`Link für ${employee.first_name} ${employee.last_name} wurde in die Zwischenablage kopiert!`);
      
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Fehler beim Kopieren des Links');
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

      // Create the link with custom base URL if available
      const baseUrl = 'https://web.innovaatech.de';
      const contractLink = `${baseUrl}/arbeitsvertrag?token=${token}`;
      
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
    
    // Also update contractSubmissions to immediately reflect the status change
    setContractSubmissions(prevSubmissions =>
      prevSubmissions.map(submission =>
        submission.employee_id === employeeId
          ? { ...submission, employees: { ...submission.employees, status: 'created' } }
          : submission
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

  const getImageUrl = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('ids')
        .createSignedUrl(path, 60 * 60); // 1 hour expiry

      if (error || !data) {
        console.error('Error getting signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting image URL:', error);
      return null;
    }
  };

  const downloadImage = async (path: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('ids')
        .download(path);

      if (error || !data) {
        toast.error('Fehler beim Herunterladen des Bildes');
        return;
      }

      // Create blob URL and download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Bild erfolgreich heruntergeladen');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Fehler beim Herunterladen des Bildes');
    }
  };

  const getMaritalStatusLabel = (status: string): string => {
    switch (status) {
      case 'single':
        return 'Ledig';
      case 'married':
        return 'Verheiratet';
      case 'divorced':
        return 'Geschieden';
      case 'widowed':
        return 'Verwitwet';
      default:
        return status || '-';
    }
  };

  const getEmploymentTypeBadge = (employmentType?: string) => {
    if (!employmentType) return null;
    
    switch (employmentType) {
      case 'minijob':
        return <Badge variant="outline" className="border-purple-500 text-purple-700 ml-2">Minijob</Badge>;
      case 'teilzeit':
        return <Badge variant="outline" className="border-orange-500 text-orange-700 ml-2">Teilzeit</Badge>;
      case 'vollzeit':
        return <Badge variant="outline" className="border-emerald-500 text-emerald-700 ml-2">Vollzeit</Badge>;
      default:
        return <Badge variant="secondary" className="ml-2">{employmentType}</Badge>;
    }
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
      case 'blocked':
        return <Badge variant="destructive"><UserCheck className="h-3 w-3 mr-1" />Gesperrt</Badge>;
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  const importedEmployees = employees.filter(emp => emp.status === 'imported');
  const contractRequestedEmployees = employees.filter(emp => emp.status === 'contract_requested' || emp.status === 'contract_received');
  const createdEmployees = employees.filter(emp => 
    emp.status === 'created' || emp.status === 'verified' || emp.status === 'blocked'
  ).sort((a, b) => {
    // Sort blocked employees to the bottom
    if (a.status === 'blocked' && b.status !== 'blocked') return 1;
    if (a.status !== 'blocked' && b.status === 'blocked') return -1;
    return 0;
  });

  // Aggregate data for created employees
  useEffect(() => {
    if (createdEmployees.length > 0) {
      fetchCreatedEmployeesStats();
    }
  }, [createdEmployees.length]);

  const fetchCreatedEmployeesStats = async () => {
    try {
      const createdEmployeeIds = createdEmployees.map(emp => emp.id);
      
      // Fetch all assignments for created employees
      const { data: assignments, error: assignmentsError } = await supabase
        .from('order_assignments')
        .select('employee_id, status, assigned_at')
        .in('employee_id', createdEmployeeIds);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        return;
      }

      // Fetch all evaluations for created employees for last activity and ratings
      const { data: evaluations, error: evaluationsError } = await supabase
        .from('order_evaluations')
        .select('employee_id, updated_at, approved_at, status, rating')
        .in('employee_id', createdEmployeeIds);

      if (evaluationsError) {
        console.error('Error fetching evaluations:', evaluationsError);
        return;
      }

      // Aggregate stats per employee
      const statsMap: Record<string, EmployeeStats> = {};
      const lastActivityMap: Record<string, string | null> = {};
      const averageRatingMap: Record<string, number> = {};

      // Initialize stats for all created employees
      createdEmployeeIds.forEach(empId => {
        statsMap[empId] = {
          totalAssigned: 0,
          completedAssigned: 0,
          inProgress: 0,
          evaluated: 0
        };
        lastActivityMap[empId] = null;
        averageRatingMap[empId] = 0;
      });

      // Process assignments
      assignments?.forEach(assignment => {
        const stats = statsMap[assignment.employee_id];
        if (stats) {
          stats.totalAssigned++;
          
          switch (assignment.status) {
            case 'completed':
              stats.completedAssigned++;
              break;
            case 'in_progress':
              stats.inProgress++;
              break;
            case 'evaluated':
              stats.evaluated++;
              break;
          }

          // Update last activity with assignment date
          const assignedAt = new Date(assignment.assigned_at);
          const currentLastActivity = lastActivityMap[assignment.employee_id];
          if (!currentLastActivity || assignedAt > new Date(currentLastActivity)) {
            lastActivityMap[assignment.employee_id] = assignment.assigned_at;
          }
        }
      });

      // Process evaluations for last activity and average ratings
      const ratingsByEmployee: Record<string, number[]> = {};
      
      evaluations?.forEach(evaluation => {
        const latestDate = evaluation.approved_at || evaluation.updated_at;
        const evaluationDate = new Date(latestDate);
        const currentLastActivity = lastActivityMap[evaluation.employee_id];
        
        if (!currentLastActivity || evaluationDate > new Date(currentLastActivity)) {
          lastActivityMap[evaluation.employee_id] = latestDate;
        }
        
        // Collect ratings for approved evaluations only
        if (evaluation.status === 'approved' && evaluation.rating) {
          if (!ratingsByEmployee[evaluation.employee_id]) {
            ratingsByEmployee[evaluation.employee_id] = [];
          }
          ratingsByEmployee[evaluation.employee_id].push(evaluation.rating);
        }
      });

      // Calculate average ratings
      Object.entries(ratingsByEmployee).forEach(([empId, ratings]) => {
        if (ratings.length > 0) {
          averageRatingMap[empId] = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        }
      });

      setCreatedStatsByEmployee(statsMap);
      setLastActivityByEmployee(lastActivityMap);
      setAverageRatingByEmployee(averageRatingMap);
    } catch (error) {
      console.error('Error fetching created employees stats:', error);
    }
  };

  const handleEmployeeDetails = async (employee: Employee) => {
    setSelectedEmployeeForDetails(employee);
    setIsEmployeeDetailsOpen(true);
    setDetailsLoading(true);

    try {
      // Fetch assignments with order details
      const { data: assignments, error: assignmentsError } = await supabase
        .from('order_assignments')
        .select(`
          id, status, assigned_at,
          orders (id, title, order_number, premium, provider, project_goal)
        `)
        .eq('employee_id', employee.id)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) {
        console.error('Error fetching employee assignments:', assignmentsError);
        toast.error('Fehler beim Laden der Auftragszuweisungen');
        return;
      }

      // Fetch evaluations with order details
      const { data: evaluations, error: evaluationsError } = await supabase
        .from('order_evaluations')
        .select(`
          id, order_id, assignment_id, status, rating, premium_awarded, 
          overall_comment, approved_at, created_at, updated_at,
          orders (id, title, order_number, premium)
        `)
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (evaluationsError) {
        console.error('Error fetching employee evaluations:', evaluationsError);
        toast.error('Fehler beim Laden der Bewertungen');
        return;
      }

      setEmployeeAssignments(assignments || []);
      setEmployeeEvaluations(evaluations || []);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      toast.error('Fehler beim Laden der Mitarbeiter-Details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getAssignmentStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="secondary">Zugewiesen</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="border-blue-500 text-blue-700">In Bearbeitung</Badge>;
      case 'evaluated':
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Bewertet</Badge>;
      case 'completed':
        return <Badge variant="default">Abgeschlossen</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEvaluationStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Ausstehend</Badge>;
      case 'approved':
        return <Badge variant="default">Genehmigt</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Abgelehnt</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row gap-6">
        <Card className="flex-1 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              Mitarbeiter verwalten
            </CardTitle>
            <CardDescription className="mt-1">
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
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipContract"
                  checked={skipContract}
                  onCheckedChange={(checked) => setSkipContract(checked === true)}
                />
                <Label htmlFor="skipContract">Arbeitsvertrag skippen</Label>
              </div>

              {skipContract && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div>
                    <Label htmlFor="employmentType">Anstellungsart *</Label>
                    <Select value={employmentType} onValueChange={setEmploymentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wählen Sie eine Anstellungsart" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minijob">Minijob</SelectItem>
                        <SelectItem value="teilzeit">Teilzeit</SelectItem>
                        <SelectItem value="vollzeit">Vollzeit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="password">Passwort *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mindestens 6 Zeichen"
                      minLength={6}
                    />
                  </div>
                </div>
              )}
              
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {skipContract ? 'Mitarbeiter erstellen' : 'Mitarbeiter hinzufügen'}
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
          <TabsTrigger value="created">
            Erstellte Mitarbeiter ({createdEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="contracts">
            Arbeitsverträge ({contractRequestedEmployees.length + contractSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="imported">
            Importierte Mitarbeiter ({importedEmployees.length})
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
                                   onClick={() => handleCopyExistingLink(employee)}
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
                                <div className="flex items-center">
                                  {submission.first_name} {submission.last_name}
                                  {getEmploymentTypeBadge(submission.employment_type)}
                                </div>
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
                                  {submission.employees && submission.employees.status !== 'created' && submission.employees.status !== 'verified' && (
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
                        <TableHead>Abgeschlossen</TableHead>
                        <TableHead>Ø Bewertung</TableHead>
                        <TableHead>Letzte Aktivität</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {createdEmployees.map((employee) => {
                      const stats = createdStatsByEmployee[employee.id];
                      const lastActivity = lastActivityByEmployee[employee.id];
                      const avgRating = averageRatingByEmployee[employee.id] || 0;
                      
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              {employee.first_name} {employee.last_name}
                              {getEmploymentTypeBadge(employee.employment_type)}
                            </div>
                          </TableCell>
                          <TableCell>{employee.email}</TableCell>
                          <TableCell>{employee.phone || '-'}</TableCell>
                          <TableCell>{getStatusBadge(employee.status)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {stats?.completedAssigned || 0}/{stats?.totalAssigned || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {avgRating > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={`w-3 h-3 rounded-full ${
                                        i < Math.round(avgRating) ? 'bg-rating-star' : 'bg-muted'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{formatLastActivity(lastActivity)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEmployeeDetails(employee)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                              {employee.status !== 'blocked' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEmployeeForAssign(employee);
                                      setIsAssignDialogOpen(true);
                                    }}
                                  >
                                    <UserPlus className="h-4 w-4 mr-1" />
                                    Auftrag zuweisen
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEmployeeForDeactivation(employee);
                                      setIsDeactivateDialogOpen(true);
                                    }}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Ausgeschieden
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                    <div><strong>Anstellungsart:</strong> {selectedSubmission.employment_type ? getEmploymentTypeBadge(selectedSubmission.employment_type) : '-'}</div>
                    <div><strong>Familienstand:</strong> {getMaritalStatusLabel(selectedSubmission.marital_status || '')}</div>
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
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm">Personalausweis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Front ID */}
                      <div className="space-y-2">
                        <div className="font-medium text-sm">Vorderseite</div>
                        {selectedSubmission.id_front_path ? (
                          <>
                            <IDImageDisplay path={selectedSubmission.id_front_path} alt="Personalausweis Vorderseite" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadImage(
                                selectedSubmission.id_front_path!,
                                `${selectedSubmission.first_name}_${selectedSubmission.last_name}_Ausweis_Vorderseite.jpg`
                              )}
                              className="w-full"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Vorderseite herunterladen
                            </Button>
                          </>
                        ) : (
                          <div className="text-muted-foreground text-sm">Nicht verfügbar</div>
                        )}
                      </div>

                      {/* Back ID */}
                      <div className="space-y-2">
                        <div className="font-medium text-sm">Rückseite</div>
                        {selectedSubmission.id_back_path ? (
                          <>
                            <IDImageDisplay path={selectedSubmission.id_back_path} alt="Personalausweis Rückseite" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadImage(
                                selectedSubmission.id_back_path!,
                                `${selectedSubmission.first_name}_${selectedSubmission.last_name}_Ausweis_Rueckseite.jpg`
                              )}
                              className="w-full"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Rückseite herunterladen
                            </Button>
                          </>
                        ) : (
                          <div className="text-muted-foreground text-sm">Nicht verfügbar</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Employee Details Dialog */}
      <Dialog open={isEmployeeDetailsOpen} onOpenChange={setIsEmployeeDetailsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mitarbeiter-Details: {selectedEmployeeForDetails?.first_name} {selectedEmployeeForDetails?.last_name}</DialogTitle>
          </DialogHeader>
          {selectedEmployeeForDetails && (
            <div className="space-y-6">
              {detailsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Lädt Mitarbeiter-Details...</p>
                </div>
              ) : (
                <>
                  {/* Employee Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Kontaktdaten</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div><strong>Name:</strong> {selectedEmployeeForDetails.first_name} {selectedEmployeeForDetails.last_name}</div>
                        <div><strong>E-Mail:</strong> {selectedEmployeeForDetails.email}</div>
                        <div><strong>Telefon:</strong> {selectedEmployeeForDetails.phone || '-'}</div>
                        <div><strong>Status:</strong> {getStatusBadge(selectedEmployeeForDetails.status)}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Auftrag-Statistiken</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(() => {
                          const stats = createdStatsByEmployee[selectedEmployeeForDetails.id];
                          const completionRate = stats?.totalAssigned > 0 ? (stats.completedAssigned / stats.totalAssigned) * 100 : 0;
                          
                          return (
                            <>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>Abgeschlossen:</span>
                                  <span>{stats?.completedAssigned || 0} von {stats?.totalAssigned || 0}</span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${completionRate}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-muted-foreground">{completionRate.toFixed(1)}% abgeschlossen</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">In Bearbeitung:</span>
                                  <div className="font-medium">{stats?.inProgress || 0}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Bewertet:</span>
                                  <div className="font-medium">{stats?.evaluated || 0}</div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Bewertungen</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(() => {
                          const approvedEvaluations = employeeEvaluations.filter(evaluation => evaluation.status === 'approved');
                          const avgRating = approvedEvaluations.length > 0 
                            ? approvedEvaluations.reduce((sum, evaluation) => sum + evaluation.rating, 0) / approvedEvaluations.length 
                            : 0;
                          const totalAwarded = approvedEvaluations.reduce((sum, evaluation) => sum + evaluation.premium_awarded, 0);
                          
                          return (
                            <>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Durchschnittsbewertung:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  {avgRating > 0 ? (
                                    <>
                                      <span className="font-medium text-lg">{avgRating.toFixed(1)}/5</span>
                                      <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                          <div
                                            key={i}
                                            className={`w-4 h-4 rounded-full ${
                                              i < Math.round(avgRating) ? 'bg-rating-star' : 'bg-muted'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="font-medium text-lg">-</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Gesamte Prämien:</span>
                                <div className="font-medium text-lg">
                                  {totalAwarded > 0 ? `€${totalAwarded.toFixed(2)}` : '-'}
                                </div>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Bewertungen:</span>
                                <div className="font-medium">{employeeEvaluations.length}</div>
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Assigned Orders */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Zugewiesene Aufträge</CardTitle>
                      <CardDescription>
                        Alle Aufträge, die diesem Mitarbeiter zugewiesen wurden
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {employeeAssignments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          Noch keine Aufträge zugewiesen
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Auftrag-Nr.</TableHead>
                              <TableHead>Titel</TableHead>
                              <TableHead>Anbieter</TableHead>
                              <TableHead>Prämie</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Zugewiesen am</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {employeeAssignments.map((assignment) => (
                              <TableRow key={assignment.id}>
                                <TableCell className="font-medium">
                                  {assignment.orders.order_number}
                                </TableCell>
                                <TableCell>{assignment.orders.title}</TableCell>
                                <TableCell>{assignment.orders.provider}</TableCell>
                                <TableCell>€{assignment.orders.premium}</TableCell>
                                <TableCell>{getAssignmentStatusBadge(assignment.status)}</TableCell>
                                <TableCell>
                                  {new Date(assignment.assigned_at).toLocaleDateString('de-DE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Evaluations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Bewertungen</CardTitle>
                      <CardDescription>
                        Alle Bewertungen, die der Mitarbeiter eingereicht hat
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {employeeEvaluations.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          Noch keine Bewertungen eingereicht
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Auftrag-Nr.</TableHead>
                              <TableHead>Titel</TableHead>
                              <TableHead>Bewertung</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Prämie</TableHead>
                              <TableHead>Eingereicht am</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {employeeEvaluations.map((evaluation) => (
                              <TableRow key={evaluation.id}>
                                <TableCell className="font-medium">
                                  {evaluation.orders.order_number}
                                </TableCell>
                                <TableCell>{evaluation.orders.title}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{evaluation.rating}/5</span>
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <div
                                          key={i}
                                          className={`w-3 h-3 rounded-full ${
                                            i < evaluation.rating ? 'bg-rating-star' : 'bg-muted'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{getEvaluationStatusBadge(evaluation.status)}</TableCell>
                                <TableCell>
                                  {evaluation.status === 'approved' ? (
                                    <Badge variant="default">€{evaluation.premium_awarded}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {evaluation.approved_at ? 
                                    new Date(evaluation.approved_at).toLocaleDateString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    }) :
                                    new Date(evaluation.created_at).toLocaleDateString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    })
                                  }
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Order to Employee Dialog */}
      <AssignToEmployeeDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        employee={selectedEmployeeForAssign}
        onAssignmentComplete={() => {
          // Refresh statistics for updated employee data
          fetchCreatedEmployeesStats();
          // If employee details dialog is open for the same employee, refresh its data
          if (selectedEmployeeForDetails?.id === selectedEmployeeForAssign?.id) {
            handleEmployeeDetails(selectedEmployeeForDetails);
          }
          setIsAssignDialogOpen(false);
          setSelectedEmployeeForAssign(null);
        }}
      />

      {/* Deactivate User Confirmation Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer deaktivieren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Sind Sie sicher, dass Sie den Benutzer{' '}
              <strong>
                {selectedEmployeeForDeactivation?.first_name} {selectedEmployeeForDeactivation?.last_name}
              </strong>{' '}
              deaktivieren möchten?
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">
                <strong>Warnung:</strong> Diese Aktion wird:
              </p>
              <ul className="text-sm text-destructive mt-2 space-y-1">
                <li>• Den Benutzer aus dem System ausloggen</li>
                <li>• Zukünftige Anmeldungen verhindern</li>
                <li>• Den Benutzer aus Auftragszuweisungen ausschließen</li>
                <li>• Den Status auf "Gesperrt" setzen</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeactivateDialogOpen(false);
                setSelectedEmployeeForDeactivation(null);
              }}
              disabled={isDeactivating}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivateUser}
              disabled={isDeactivating}
            >
              {isDeactivating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deaktiviere...
                </>
              ) : (
                'Benutzer deaktivieren'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

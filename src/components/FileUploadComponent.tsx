import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FileUploadComponentProps {
  onUploadComplete: () => void;
}

interface ParsedEmployee {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  line: number;
}

export const FileUploadComponent: React.FC<FileUploadComponentProps> = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedEmployees, setParsedEmployees] = useState<ParsedEmployee[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
        toast.error('Bitte wählen Sie eine TXT-Datei aus');
        return;
      }
      setSelectedFile(file);
      parseFile(file);
    }
  };

  const parseFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const parsed: ParsedEmployee[] = [];
      const parseErrors: string[] = [];

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        const parts = trimmedLine.split(':');
        
        if (parts.length < 3) {
          parseErrors.push(`Zeile ${index + 1}: Ungültiges Format (mindestens Vorname:Nachname:Email erforderlich)`);
          return;
        }

        const firstName = parts[0]?.trim();
        const lastName = parts[1]?.trim();
        const email = parts[2]?.trim();
        const phone = parts[3]?.trim();

        if (!firstName || !lastName || !email) {
          parseErrors.push(`Zeile ${index + 1}: Fehlende Pflichtfelder`);
          return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          parseErrors.push(`Zeile ${index + 1}: Ungültige E-Mail-Adresse`);
          return;
        }

        parsed.push({
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          line: index + 1
        });
      });

      setParsedEmployees(parsed);
      setErrors(parseErrors);

      if (parseErrors.length > 0) {
        toast.error(`${parseErrors.length} Fehler beim Parsen der Datei gefunden`);
      } else {
        toast.success(`${parsed.length} Mitarbeiter erfolgreich geparst`);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Fehler beim Lesen der Datei');
    }
  };

  const handleUpload = async () => {
    if (!parsedEmployees.length) {
      toast.error('Keine gültigen Mitarbeiter zum Hochladen');
      return;
    }

    setIsUploading(true);
    try {
      const employeesToInsert = parsedEmployees.map(emp => ({
        first_name: emp.firstName,
        last_name: emp.lastName,
        email: emp.email,
        phone: emp.phone || null,
        status: 'imported'
      }));

      const { error } = await supabase
        .from('employees')
        .insert(employeesToInsert);

      if (error) {
        console.error('Error uploading employees:', error);
        toast.error('Fehler beim Hochladen der Mitarbeiter');
        return;
      }

      toast.success(`${parsedEmployees.length} Mitarbeiter erfolgreich importiert`);
      setSelectedFile(null);
      setParsedEmployees([]);
      setErrors([]);
      onUploadComplete();
    } catch (error) {
      console.error('Error uploading employees:', error);
      toast.error('Fehler beim Hochladen der Mitarbeiter');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setParsedEmployees([]);
    setErrors([]);
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div>
        <Label htmlFor="file-upload">TXT-Datei auswählen</Label>
        <Input
          id="file-upload"
          type="file"
          accept=".txt"
          onChange={handleFileSelect}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Format: Vorname:Nachname:Email oder Vorname:Nachname:Email:Telefonnummer
        </p>
      </div>

      {/* File Preview */}
      {selectedFile && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parsing Results */}
      {(parsedEmployees.length > 0 || errors.length > 0) && (
        <div className="space-y-3">
          {/* Success Summary */}
          {parsedEmployees.length > 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {parsedEmployees.length} Mitarbeiter erfolgreich geparst
              </span>
            </div>
          )}

          {/* Error Summary */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {errors.length} Fehler gefunden:
                </span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                {errors.map((error, index) => (
                  <p key={index} className="text-xs text-red-600">{error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedEmployees.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm font-medium mb-2">Vorschau:</div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Zeile</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">E-Mail</th>
                        <th className="text-left p-2">Telefon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedEmployees.slice(0, 10).map((emp, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{emp.line}</td>
                          <td className="p-2">{emp.firstName} {emp.lastName}</td>
                          <td className="p-2">{emp.email}</td>
                          <td className="p-2">{emp.phone || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedEmployees.length > 10 && (
                    <p className="text-xs text-muted-foreground p-2">
                      ... und {parsedEmployees.length - 10} weitere
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Button */}
          {parsedEmployees.length > 0 && (
            <Button 
              onClick={handleUpload} 
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Importiere...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {parsedEmployees.length} Mitarbeiter importieren
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Format Example */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="text-xs">
            <div className="font-medium mb-2">Beispiel-Format:</div>
            <div className="font-mono bg-background p-2 rounded text-xs">
              Max:Mustermann:max@example.com:+49 123 456789<br />
              Anna:Schmidt:anna@example.com<br />
              Peter:Weber:peter@example.com:+49 987 654321
            </div>
            <p className="text-muted-foreground mt-1">
              * Telefonnummer ist optional
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
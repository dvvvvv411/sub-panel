
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { History, Plus, Minus, Calendar, User } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface PremiumAdjustment {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  created_by: string;
  employee_id: string;
  // We skip nested profile lookups to avoid join issues
}

interface PremiumAdjustmentsHistoryProps {
  employee: Employee;
}

export const PremiumAdjustmentsHistory: React.FC<PremiumAdjustmentsHistoryProps> = ({ employee }) => {
  const [adjustments, setAdjustments] = useState<PremiumAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdjustments();
  }, [employee.id]);

  const fetchAdjustments = async () => {
    try {
      const { data, error } = await supabase
        .from('premium_adjustments')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching adjustments:', error);
        return;
      }

      setAdjustments(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAdjustments = adjustments.reduce((sum, adj) => sum + adj.amount, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Prämien-Anpassungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Prämien-Anpassungen
          </div>
          {adjustments.length > 0 && (
            <Badge variant={totalAdjustments >= 0 ? "default" : "destructive"}>
              Gesamt: {totalAdjustments >= 0 ? '+' : ''}€{totalAdjustments.toFixed(2)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {adjustments.length === 0 ? (
          <div className="text-center py-6">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Noch keine manuellen Prämien-Anpassungen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {adjustments.map((adjustment) => (
              <div key={adjustment.id} className="flex justify-between items-start p-3 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    {adjustment.amount > 0 ? (
                      <Plus className="h-4 w-4 text-green-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-red-600" />
                    )}
                    <p className="font-medium">{adjustment.reason}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(adjustment.created_at).toLocaleDateString('de-DE')}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Administrator
                    </div>
                  </div>
                </div>
                <Badge variant={adjustment.amount > 0 ? "default" : "destructive"}>
                  {adjustment.amount > 0 ? '+' : ''}€{adjustment.amount.toFixed(2)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

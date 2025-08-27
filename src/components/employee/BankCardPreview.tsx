import React from 'react';
import { CreditCard } from 'lucide-react';

interface BankCardPreviewProps {
  bankName?: string;
  accountHolder?: string;
  iban?: string;
}

export const BankCardPreview: React.FC<BankCardPreviewProps> = ({
  bankName,
  accountHolder,
  iban,
}) => {
  const formatIban = (iban?: string) => {
    if (!iban) return '•••• •••• •••• ••••';
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="relative h-48 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-xl shadow-lg overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20"></div>
        <div className="absolute top-6 right-6 w-6 h-6 rounded-full bg-white/10"></div>
        
        {/* Card content */}
        <div className="relative h-full p-6 flex flex-col justify-between text-primary-foreground">
          <div className="flex justify-between items-start">
            <div>
              <CreditCard className="h-8 w-8 mb-2 opacity-80" />
              <div className="text-sm opacity-90">Bankverbindung</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="text-xs opacity-75 mb-1">IBAN</div>
              <div className="font-mono text-sm tracking-wider">
                {formatIban(iban)}
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <div className="text-xs opacity-75 mb-1">Kontoinhaber</div>
                <div className="text-sm font-medium">
                  {accountHolder || '••• •••••••'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-75 mb-1">Bank</div>
                <div className="text-sm font-medium">
                  {bankName || '•••••••'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
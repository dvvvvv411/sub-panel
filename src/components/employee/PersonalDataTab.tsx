import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, MapPin, Calendar, Edit3, Save, X } from 'lucide-react';

interface PersonalDataTabProps {
  user: any;
}

export const PersonalDataTab: React.FC<PersonalDataTabProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    position: user?.position || 'Mitarbeiter'
  });

  const handleSave = () => {
    // Here you would typically save to database
    console.log('Saving user data:', editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      position: user?.position || 'Mitarbeiter'
    });
    setIsEditing(false);
  };

  const accountStats = [
    { label: 'Mitglied seit', value: 'Januar 2024', icon: Calendar },
    { label: 'Letzte Anmeldung', value: 'Heute', icon: User },
    { label: 'Status', value: 'Aktiv', icon: User, isStatus: true }
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.avatar_url} alt={user?.name} />
              <AvatarFallback className="text-lg">
                {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user?.name || 'Mitarbeiter'}</h1>
              <p className="text-muted-foreground">{editedData.position}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                {user?.role === 'admin' && (
                  <Badge className="bg-blue-100 text-blue-800">Administrator</Badge>
                )}
              </div>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              {isEditing ? 'Abbrechen' : 'Bearbeiten'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Persönliche Informationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={editedData.name}
                  onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{editedData.name || 'Nicht angegeben'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={editedData.email}
                  onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{editedData.email || 'Nicht angegeben'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={editedData.phone}
                  onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{editedData.phone || 'Nicht angegeben'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              {isEditing ? (
                <Input
                  id="address"
                  value={editedData.address}
                  onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{editedData.address || 'Nicht angegeben'}</span>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Account-Informationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {accountStats.map((stat, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-medium">
                    {stat.isStatus ? (
                      <Badge className="bg-green-100 text-green-800">{stat.value}</Badge>
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sicherheitseinstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Passwort ändern</h3>
              <p className="text-sm text-muted-foreground">
                Aktualisiere dein Passwort für bessere Sicherheit
              </p>
            </div>
            <Button variant="outline">
              Passwort ändern
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Zwei-Faktor-Authentifizierung</h3>
              <p className="text-sm text-muted-foreground">
                Zusätzliche Sicherheitsebene für dein Konto
              </p>
            </div>
            <Badge variant="outline">Nicht aktiviert</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
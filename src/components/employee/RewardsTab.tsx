import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gift, Trophy, Star, Target, Coins, Award } from 'lucide-react';

interface RewardsTabProps {
  assignedOrders: any[];
  user: any;
}

export const RewardsTab: React.FC<RewardsTabProps> = ({ assignedOrders, user }) => {
  const completedOrders = assignedOrders.filter(order => order.status === 'completed').length;
  const totalPremium = assignedOrders.reduce((sum, order) => sum + (order.premium || 0), 0);
  
  // Mock points system
  const points = completedOrders * 100 + Math.floor(totalPremium);
  const nextLevelPoints = Math.ceil(points / 500) * 500;
  const currentLevelProgress = ((points % 500) / 500) * 100;
  
  const level = Math.floor(points / 500) + 1;
  const levelNames = ['Anfänger', 'Fortgeschritten', 'Experte', 'Profi', 'Meister', 'Legende'];
  const currentLevelName = levelNames[Math.min(level - 1, levelNames.length - 1)];

  const rewards = [
    {
      id: 1,
      title: 'Willkommensbonus',
      description: 'Erste Anmeldung abgeschlossen',
      points: 50,
      earned: true,
      icon: Gift,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 2,
      title: 'Erster Auftrag',
      description: 'Ersten Auftrag erfolgreich abgeschlossen',
      points: 100,
      earned: completedOrders > 0,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 3,
      title: 'Fleißiger Arbeiter',
      description: '5 Aufträge abgeschlossen',
      points: 250,
      earned: completedOrders >= 5,
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      id: 4,
      title: 'Top Performer',
      description: '10 Aufträge abgeschlossen',
      points: 500,
      earned: completedOrders >= 10,
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      id: 5,
      title: 'Prämien-Sammler',
      description: '€500 an Prämien verdient',
      points: 300,
      earned: totalPremium >= 500,
      icon: Coins,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ];

  const earnedRewards = rewards.filter(reward => reward.earned);
  const availableRewards = rewards.filter(reward => !reward.earned);

  const monthlyEarnings = [
    { month: 'Januar', amount: 150 },
    { month: 'Februar', amount: 280 },
    { month: 'März', amount: 320 },
    { month: 'April', amount: totalPremium }
  ];

  return (
    <div className="space-y-6">
      {/* Level Progress */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Level {level}</h2>
              <p className="text-lg text-primary font-medium">{currentLevelName}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{points}</p>
              <p className="text-sm text-muted-foreground">Punkte</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Fortschritt zum nächsten Level</span>
              <span>{nextLevelPoints - points} Punkte verbleibend</span>
            </div>
            <Progress value={currentLevelProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Earnings Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Coins className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">€{totalPremium.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Gesamtprämien</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-600">{earnedRewards.length}</p>
              <p className="text-sm text-muted-foreground">Belohnungen erhalten</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Star className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">{points}</p>
              <p className="text-sm text-muted-foreground">Gesammelte Punkte</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earned Rewards */}
      {earnedRewards.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Erhaltene Belohnungen
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {earnedRewards.map((reward) => (
              <Card key={reward.id} className="border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${reward.bgColor}`}>
                      <reward.icon className={`h-5 w-5 ${reward.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{reward.title}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800">
                        +{reward.points} Punkte
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Rewards */}
      {availableRewards.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Verfügbare Belohnungen
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {availableRewards.map((reward) => (
              <Card key={reward.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full bg-gray-100`}>
                      <reward.icon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-muted-foreground">{reward.title}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        +{reward.points} Punkte
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-green-600" />
            Monatliche Prämien-Entwicklung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyEarnings.map((entry, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium">{entry.month}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-green-500 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((entry.amount / 500) * 100, 100)}%` }}
                  />
                </div>
                <div className="w-20 text-right text-sm font-medium">
                  €{entry.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
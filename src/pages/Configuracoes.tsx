import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Users, DollarSign, Calendar, Shield } from 'lucide-react';

const mockUsers = [
  { id: '1', name: 'João Silva', email: 'joao@email.com', role: 'admin' },
  { id: '2', name: 'Maria Santos', email: 'maria@email.com', role: 'diretoria' },
  { id: '3', name: 'Pedro Oliveira', email: 'pedro@email.com', role: 'diretoria' },
  { id: '4', name: 'Ana Costa', email: 'ana@email.com', role: 'visualizador' },
];

const roleLabels = {
  admin: 'Administrador',
  diretoria: 'Diretoria',
  visualizador: 'Visualizador',
};

const roleColors = {
  admin: 'bg-primary',
  diretoria: 'bg-accent',
  visualizador: 'bg-muted',
};

export default function Configuracoes() {
  const { isAdmin } = useAuth();

  return (
    <AppLayout>
      <PageHeader title="Configurações" description="Gerencie as configurações do sistema" />

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Geral
            </CardTitle>
            <CardDescription>Configurações gerais do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-name">Nome da organização</Label>
                <Input id="org-name" defaultValue="IPNC - Diretoria de Jovens" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="church-name">Nome da igreja</Label>
                <Input id="church-name" defaultValue="Igreja Presbiteriana de Nova Carapina" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financeiro
            </CardTitle>
            <CardDescription>Configurações de finanças e contribuições</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="membership-value">Valor padrão da contribuição</Label>
                <Input id="membership-value" type="number" defaultValue="50.00" />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Comprovante obrigatório para saídas</Label>
                <p className="text-sm text-muted-foreground">
                  Exige upload de comprovante para registrar despesas
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Google Calendar Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Integração Google Calendar
            </CardTitle>
            <CardDescription>Sincronize eventos com seu Google Agenda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Conectar Google Calendar</Label>
                <p className="text-sm text-muted-foreground">
                  Sincronize eventos automaticamente
                </p>
              </div>
              <Button variant="outline">Conectar</Button>
            </div>
          </CardContent>
        </Card>

        {/* User Management (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gestão de Usuários
              </CardTitle>
              <CardDescription>Gerencie usuários e permissões</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                          {roleLabels[user.role as keyof typeof roleLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select defaultValue={user.role}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="diretoria">Diretoria</SelectItem>
                            <SelectItem value="visualizador">Visualizador</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

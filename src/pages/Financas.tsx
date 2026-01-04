import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
} from 'lucide-react';

const mockTransactions = [
  { id: '1', description: 'Ofertas do culto', type: 'entrada', amount: 350, date: '2024-01-14', category: 'Ofertas' },
  { id: '2', description: 'Alimentação reunião', type: 'saida', amount: 120, date: '2024-01-12', category: 'Alimentação' },
  { id: '3', description: 'Dízimos', type: 'entrada', amount: 500, date: '2024-01-10', category: 'Dízimos' },
  { id: '4', description: 'Material de escritório', type: 'saida', amount: 80, date: '2024-01-08', category: 'Material' },
  { id: '5', description: 'Mensalidade - João', type: 'entrada', amount: 50, date: '2024-01-05', category: 'Mensalidades' },
];

const mockMembers = [
  { id: '1', name: 'João Silva', status: 'pago', month: 'Janeiro' },
  { id: '2', name: 'Maria Santos', status: 'pago', month: 'Janeiro' },
  { id: '3', name: 'Pedro Oliveira', status: 'pendente', month: 'Janeiro' },
  { id: '4', name: 'Ana Costa', status: 'pendente', month: 'Janeiro' },
  { id: '5', name: 'Lucas Pereira', status: 'pago', month: 'Janeiro' },
];

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  icon: any;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <div className="flex items-center mt-1">
                <span
                  className={`flex items-center text-xs font-medium ${
                    trendUp ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Financas() {
  const [activeTab, setActiveTab] = useState('caixa');

  const totalEntradas = mockTransactions
    .filter((t) => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSaidas = mockTransactions
    .filter((t) => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <AppLayout>
      <PageHeader
        title="Finanças"
        description="Gerencie o caixa e mensalidades"
        action={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Saldo Atual"
          value={`R$ ${saldo.toFixed(2).replace('.', ',')}`}
          icon={DollarSign}
          trend="+12%"
          trendUp={true}
        />
        <StatCard
          title="Entradas (mês)"
          value={`R$ ${totalEntradas.toFixed(2).replace('.', ',')}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Saídas (mês)"
          value={`R$ ${totalSaidas.toFixed(2).replace('.', ',')}`}
          icon={ArrowDownRight}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="caixa">Caixa</TabsTrigger>
          <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* Caixa Tab */}
        <TabsContent value="caixa">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transações</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{tx.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tx.category}</Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === 'entrada' ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {tx.type === 'entrada' ? '+' : '-'}R$ {tx.amount.toFixed(2).replace('.', ',')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mensalidades Tab */}
        <TabsContent value="mensalidades">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Controle de Mensalidades - Janeiro 2024</CardTitle>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Membros
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.month}</TableCell>
                      <TableCell>
                        <Badge
                          variant={member.status === 'pago' ? 'default' : 'destructive'}
                          className={member.status === 'pago' ? 'bg-success' : ''}
                        >
                          {member.status === 'pago' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {member.status === 'pendente' && (
                          <Button variant="outline" size="sm">
                            Registrar Pagamento
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatórios Tab */}
        <TabsContent value="relatorios">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Relatório Mensal</h3>
                  <p className="text-sm text-muted-foreground">Resumo financeiro do mês</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Relatório por Categoria</h3>
                  <p className="text-sm text-muted-foreground">Análise por tipo de despesa</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

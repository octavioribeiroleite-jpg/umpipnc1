import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Cake,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FolderOpen,
  Heart,
  Home,
  MessageSquare,
  Settings,
  Shirt,
  UserCheck,
  Users,
  Vote,
} from 'lucide-react';

export interface AppNavigationItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const primaryNavigationItems: AppNavigationItem[] = [
  { key: 'home', icon: Home, label: 'Home', path: '/' },
  { key: 'reunioes', icon: Users, label: 'Reuniões', path: '/reunioes' },
  { key: 'calendario', icon: Calendar, label: 'Calendário', path: '/calendario' },
  { key: 'tarefas', icon: CheckSquare, label: 'Tarefas', path: '/tarefas' },
];

export const secondaryNavigationItems: AppNavigationItem[] = [
  { key: 'financas', icon: DollarSign, label: 'Finanças', path: '/financas' },
  { key: 'camisas', icon: Shirt, label: 'Camisas', path: '/camisas' },
  { key: 'plenarias', icon: ClipboardCheck, label: 'Plenárias', path: '/plenarias' },
  { key: 'dizimos', icon: Heart, label: 'Dízimos', path: '/dizimos' },
  { key: 'comunicados', icon: MessageSquare, label: 'Comunicados', path: '/comunicados' },
  { key: 'estudos', icon: BookOpen, label: 'Estudos', path: '/estudos' },
  { key: 'secretaria', icon: ClipboardList, label: 'Secretaria EBD', path: '/secretaria' },
  { key: 'aniversariantes', icon: Cake, label: 'Aniversariantes', path: '/aniversariantes' },
  { key: 'arquivos', icon: FolderOpen, label: 'Arquivos', path: '/arquivos' },
  { key: 'configuracoes', icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export const adminNavigationItems: AppNavigationItem[] = [
  { key: 'eleicoes', icon: Vote, label: 'Eleições', path: '/eleicoes', adminOnly: true },
  { key: 'usuarios', icon: UserCheck, label: 'Usuários', path: '/usuarios', adminOnly: true },
  { key: 'sugestoes', icon: MessageSquare, label: 'Sugestões do Pastor', path: '/sugestoes', adminOnly: true },
];

export function getAppNavigationItems(isAdmin: boolean) {
  return [
    ...primaryNavigationItems,
    ...secondaryNavigationItems,
    ...(isAdmin ? adminNavigationItems : []),
  ];
}

export function isNavigationPathActive(currentPath: string, itemPath: string) {
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

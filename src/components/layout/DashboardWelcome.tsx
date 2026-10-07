import type { ReactNode } from 'react';
import dashboardChurch from '@/assets/dashboard-church-v1.webp';
import '@/pages/dashboard.css';

interface Props { id: string; date: string; title: ReactNode; description: string; children?: ReactNode }

export function DashboardWelcome({ id, date, title, description, children }: Props) {
  return <section className="dashboard-welcome" aria-labelledby={id}>
    <img className="dashboard-welcome-image" src={dashboardChurch} alt="" aria-hidden="true" />
    <div className="dashboard-welcome-copy">
      <p className="dashboard-date">{date}</p>
      <h1 id={id}>{title}</h1>
      <p className="dashboard-society">{description}</p>
    </div>
    <blockquote className="dashboard-verse"><p>“Mas tu, ó homem de Deus,<br />avança...”</p><cite>1 Timóteo 6:11</cite></blockquote>
    {children}
  </section>;
}

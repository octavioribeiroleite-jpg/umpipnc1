import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <section className="relative mb-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-700 px-5 py-5 text-white shadow-lg md:mb-6 md:px-6 md:py-6">
      <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute bottom-2 right-5 text-[64px] font-black leading-none text-white/5 md:text-[88px]">IPNC</div>
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-emerald-50/90 md:text-base">{description}</p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0 w-full sm:w-auto [&_button]:w-full [&_button]:border-white/25 [&_button]:bg-white/15 [&_button]:text-white [&_button]:backdrop-blur-sm hover:[&_button]:bg-white/25 sm:[&_button]:w-auto">
            {action}
          </div>
        )}
      </div>
    </section>
  );
}

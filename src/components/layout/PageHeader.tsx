import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, description, action, icon, eyebrow }: PageHeaderProps) {
  return (
    <section className="relative mb-5 min-h-[170px] overflow-hidden rounded-[30px] border border-emerald-300/15 bg-[linear-gradient(135deg,#006a53_0%,#00755b_52%,#158064_100%)] px-6 py-6 text-white shadow-[0_16px_38px_rgba(5,74,57,0.22)] md:mb-6 md:min-h-[190px] md:px-8 md:py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-emerald-200/10 blur-2xl" />
        <div className="absolute right-10 top-4 h-40 w-24 rotate-[28deg] rounded-[100%_0_100%_0] bg-white/8" />
        <div className="absolute right-24 top-12 h-36 w-20 rotate-[-20deg] rounded-[100%_0_100%_0] bg-emerald-200/10" />
        <div className="absolute bottom-0 right-0 h-32 w-48 rounded-tl-[100%] border-l border-t border-white/10 bg-black/5" />
      </div>

      <div className="relative flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {icon && (
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/20 bg-white/12 text-white shadow-lg backdrop-blur-md md:h-20 md:w-20">
              {icon}
            </div>
          )}

          {eyebrow && (
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-50/75">
              {eyebrow}
            </p>
          )}

          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white drop-shadow-sm md:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-emerald-50/90 md:text-lg">
              {description}
            </p>
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

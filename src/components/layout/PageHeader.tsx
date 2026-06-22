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
    <section className="relative mb-3 overflow-hidden rounded-2xl border border-emerald-300/15 bg-[linear-gradient(135deg,#006a53_0%,#00755b_55%,#168166_100%)] px-4 py-3.5 text-white shadow-[0_10px_24px_rgba(5,74,57,0.16)] sm:rounded-[26px] sm:px-5 sm:py-5 md:mb-5 md:px-6 md:py-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-12 -top-16 h-32 w-32 rounded-full bg-emerald-200/10 blur-2xl sm:h-44 sm:w-44" />
        <div className="absolute right-8 top-0 h-20 w-12 rotate-[28deg] rounded-[100%_0_100%_0] bg-white/8 sm:h-28 sm:w-16" />
        <div className="absolute right-20 top-8 h-20 w-12 rotate-[-20deg] rounded-[100%_0_100%_0] bg-emerald-200/10 sm:h-24 sm:w-14" />
        <div className="absolute bottom-0 right-0 h-20 w-28 rounded-tl-[100%] border-l border-t border-white/10 bg-black/5 sm:h-24 sm:w-36" />
      </div>

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          {icon && (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/12 text-white shadow-md backdrop-blur-md sm:h-14 sm:w-14 sm:rounded-[18px] md:h-16 md:w-16">
              {icon}
            </div>
          )}

          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-emerald-50/75 sm:mb-1.5 sm:text-[10px] md:text-xs">
                {eyebrow}
              </p>
            )}

            <h1 className="font-display text-xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm sm:text-3xl md:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 max-w-3xl text-xs font-medium leading-snug text-emerald-50/90 sm:mt-1.5 sm:text-sm sm:leading-relaxed md:text-base">
                {description}
              </p>
            )}
          </div>
        </div>

        {action && (
          <div className="w-full flex-shrink-0 sm:w-auto [&_button]:w-full [&_button]:border-white/25 [&_button]:bg-white/15 [&_button]:text-white [&_button]:backdrop-blur-sm hover:[&_button]:bg-white/25 sm:[&_button]:w-auto">
            {action}
          </div>
        )}
      </div>
    </section>
  );
}

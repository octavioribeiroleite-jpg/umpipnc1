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
    <section className="relative mb-4 overflow-hidden rounded-[26px] border border-emerald-300/15 bg-[linear-gradient(135deg,#006a53_0%,#00755b_55%,#168166_100%)] px-5 py-5 text-white shadow-[0_12px_30px_rgba(5,74,57,0.18)] md:mb-5 md:px-6 md:py-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-emerald-200/10 blur-2xl" />
        <div className="absolute right-8 top-0 h-28 w-16 rotate-[28deg] rounded-[100%_0_100%_0] bg-white/8" />
        <div className="absolute right-20 top-8 h-24 w-14 rotate-[-20deg] rounded-[100%_0_100%_0] bg-emerald-200/10" />
        <div className="absolute bottom-0 right-0 h-24 w-36 rounded-tl-[100%] border-l border-t border-white/10 bg-black/5" />
      </div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {icon && (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[18px] border border-white/20 bg-white/12 text-white shadow-md backdrop-blur-md md:h-16 md:w-16">
              {icon}
            </div>
          )}

          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-emerald-50/75 md:text-xs">
                {eyebrow}
              </p>
            )}

            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm md:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-3xl text-sm font-medium leading-relaxed text-emerald-50/90 md:text-base">
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

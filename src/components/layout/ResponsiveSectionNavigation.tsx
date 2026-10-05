import { useId } from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ResponsiveSectionNavigation({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  const id = useId();
  return <>
    <div className="min-[700px]:hidden space-y-2">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-input bg-card px-3 py-3 text-base">
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
    <TabsList aria-label={label} className="hidden min-[700px]:flex h-auto w-full flex-wrap justify-start gap-2">
      {options.map(option => <TabsTrigger key={option.value} value={option.value} className="min-w-0 whitespace-normal">{option.label}</TabsTrigger>)}
    </TabsList>
  </>;
}

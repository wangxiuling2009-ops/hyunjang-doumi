import { useTranslation } from 'react-i18next';

const STATUS_MAP = {
  pending:    { labelKey: 'status.pending',    color: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  in_progress:{ labelKey: 'status.inProgress', color: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  delayed:    { labelKey: 'status.delayed',    color: 'bg-red-100',   text: 'text-red-800',   dot: 'bg-red-500' },
  completed:  { labelKey: 'status.completed',  color: 'bg-blue-100',  text: 'text-blue-800',  dot: 'bg-blue-500' },
} as const;

interface Props { status: keyof typeof STATUS_MAP; size?: 'sm' | 'md' | 'lg'; }

export default function StatusBadge({ status, size = 'md' }: Props) {
  const { t } = useTranslation();
  const s = STATUS_MAP[status];
  const sizeClass = size === 'lg' ? 'px-4 py-2 text-base' : size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${s.color} ${s.text}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {t(s.labelKey)}
    </span>
  );
}

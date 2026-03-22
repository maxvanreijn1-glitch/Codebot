interface UsageBarProps {
  current: number;
  limit: number;
  tier: string;
}

export default function UsageBar({ current, limit, tier }: UsageBarProps) {
  const percentage = Math.min(Math.round((current / limit) * 100), 100);
  const color = percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-sky-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Usage <span className="capitalize text-gray-300">({tier})</span></span>
        <span className="text-gray-300">{current} / {limit}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-xs text-gray-500">{limit - current} analyses remaining this month</p>
    </div>
  );
}

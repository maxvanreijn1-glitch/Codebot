import { useNavigate } from 'react-router-dom';
import { X, Zap, ArrowRight } from 'lucide-react';

interface UpgradePromptProps {
  type: 'code' | 'circuit';
  tier: 'free' | 'pro' | 'premium';
  onClose: () => void;
}

const UPGRADE_COPY: Record<string, { title: string; description: string; cta: string }> = {
  code_free: {
    title: 'Code generation limit reached',
    description:
      'You\'ve used all 10 free AI code generations this month. Upgrade to Pro for 100 generations or Premium for unlimited.',
    cta: 'Upgrade to Pro — £20/month',
  },
  code_pro: {
    title: 'Code generation limit reached',
    description:
      'You\'ve used all 100 Pro code generations this month. Upgrade to Premium for unlimited generations and priority API access.',
    cta: 'Upgrade to Premium — £100/month',
  },
  circuit_free: {
    title: 'Circuit generation limit reached',
    description:
      'You\'ve used all 5 free circuit generations this month. Upgrade to Pro for 50 generations or Premium for unlimited.',
    cta: 'Upgrade to Pro — £20/month',
  },
  circuit_pro: {
    title: 'Circuit generation limit reached',
    description:
      'You\'ve used all 50 Pro circuit generations this month. Upgrade to Premium for unlimited generations and priority API access.',
    cta: 'Upgrade to Premium — £100/month',
  },
};

export default function UpgradePrompt({ type, tier, onClose }: UpgradePromptProps) {
  const navigate = useNavigate();
  const key = `${type}_${tier}`;
  const copy = UPGRADE_COPY[key] ?? {
    title: 'Limit reached',
    description: 'You\'ve reached the limit for your current plan. Upgrade for more access.',
    cta: 'View Plans',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full mx-4 bg-gray-900 border border-sky-700 rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-sky-900/50 mb-5">
          <Zap className="w-6 h-6 text-sky-400" />
        </div>

        <h2 className="text-xl font-bold text-white mb-3">{copy.title}</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">{copy.description}</p>

        <button
          onClick={() => { onClose(); navigate('/pricing'); }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold transition-colors"
        >
          {copy.cta}
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 py-3 px-4 text-gray-400 hover:text-gray-200 text-sm transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

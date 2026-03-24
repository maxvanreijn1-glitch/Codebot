import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { startCheckout, openBillingPortal } from '../api/client';
import { Plan } from '../types';
import { Check, CreditCard, Loader2, ExternalLink } from 'lucide-react';

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const subscriptionStatus = searchParams.get('subscription');

  useEffect(() => {
    apiClient.get('/payments/plans').then(r => setPlans(r.data)).catch(console.error);
  }, []);

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) { navigate('/login'); return; }
    if (plan.id === 'free') return;
    setError('');
    setLoadingPlan(plan.id);
    try {
      const priceId =
        plan.id === 'pro'
          ? import.meta.env.VITE_STRIPE_PRICE_ID_PRO
          : import.meta.env.VITE_STRIPE_PRICE_ID_PREMIUM;
      await startCheckout(priceId || plan.id);
    } catch (err: unknown) {
      const axiosErr = err as { message?: string };
      setError(axiosErr.message || 'Failed to initiate checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch {
      setError('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  if (subscriptionStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Subscription Active!</h2>
          <p className="text-gray-400 mb-6">Your plan has been upgraded successfully.</p>
          <button onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
        <p className="text-gray-400 text-lg">Upgrade for AI code generation, circuit building, and more</p>
      </div>

      {error && (
        <div className="mb-8 max-w-md mx-auto bg-red-900/30 border border-red-800 rounded-xl p-4 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan) => {
          const isCurrent = user?.tier === plan.id;
          const isPaid = plan.id !== 'free';
          const isLoading = loadingPlan === plan.id;
          return (
            <div key={plan.id} className={`rounded-2xl border p-8 ${plan.id === 'pro' ? 'border-sky-500 bg-sky-900/10' : 'border-gray-800 bg-gray-900'}`}>
              {plan.id === 'pro' && <div className="text-center mb-4"><span className="px-3 py-1 bg-sky-500 text-white text-xs font-bold rounded-full">POPULAR</span></div>}
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">£{plan.price}</span>
                {isPaid && <span className="text-gray-400 ml-1">/month</span>}
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="w-full text-center py-3 rounded-xl bg-gray-700 text-gray-400 font-semibold text-sm">Current Plan</div>
              ) : (
                <button onClick={() => handleSelectPlan(plan)} disabled={isLoading || !isPaid}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${isPaid ? (plan.id === 'pro' ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'border border-gray-700 hover:border-sky-500 text-gray-300 hover:text-white') : 'border border-gray-700 text-gray-400 cursor-default'}`}>
                  {isLoading
                    ? <><Loader2 className="w-5 h-5 animate-spin" />Redirecting...</>
                    : plan.id === 'free'
                      ? 'Free Forever'
                      : <><CreditCard className="w-4 h-4" />Get {plan.name}</>
                  }
                </button>
              )}
            </div>
          );
        })}
      </div>

      {user && user.tier !== 'free' && (
        <div className="text-center">
          <button onClick={handlePortal} disabled={portalLoading}
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm transition-colors">
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Manage subscription & billing
          </button>
        </div>
      )}
    </div>
  );
}

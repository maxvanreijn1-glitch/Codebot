import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import { Plan } from '../types';
import { Check, CreditCard, Loader2 } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({ plan, clientSecret, onSuccess }: { plan: Plan; clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) { setLoading(false); return; }
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });
    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      setLoading(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      try {
        await apiClient.post('/payments/confirm', { paymentIntentId: paymentIntent.id });
        onSuccess();
      } catch {
        setError('Payment succeeded but account upgrade failed. Contact support.');
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <CardElement options={{ style: { base: { color: '#fff', '::placeholder': { color: '#6b7280' } } } }} />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={!stripe || loading}
        className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
        {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Processing...</> : <><CreditCard className="w-5 h-5" />Pay £{plan.price}</>}
      </button>
    </form>
  );
}

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/payments/plans').then(r => setPlans(r.data)).catch(console.error);
  }, []);

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) { navigate('/login'); return; }
    if (plan.id === 'free') return;
    setSelectedPlan(plan);
    setLoadingIntent(true);
    try {
      const res = await apiClient.post('/payments/create-intent', { tier: plan.id });
      setClientSecret(res.data.clientSecret);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      alert(axiosErr.response?.data?.error || 'Failed to initiate payment');
      setSelectedPlan(null);
    } finally {
      setLoadingIntent(false);
    }
  };

  const handleSuccess = async () => {
    await refreshUser();
    setSuccess(true);
    setTimeout(() => navigate('/dashboard'), 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Upgrade Successful!</h2>
          <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
        <p className="text-gray-400 text-lg">Upgrade for more analyses and advanced features</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan) => {
          const isCurrent = user?.tier === plan.id;
          const isPaid = plan.id !== 'free';
          return (
            <div key={plan.id} className={`rounded-2xl border p-8 ${plan.id === 'pro' ? 'border-sky-500 bg-sky-900/10' : 'border-gray-800 bg-gray-900'}`}>
              {plan.id === 'pro' && <div className="text-center mb-4"><span className="px-3 py-1 bg-sky-500 text-white text-xs font-bold rounded-full">POPULAR</span></div>}
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">£{plan.price}</span>
                {plan.id === 'premium' && <span className="text-gray-400 ml-1">/month</span>}
                {plan.id === 'pro' && <span className="text-gray-400 ml-1 text-sm">one-time</span>}
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
                <button onClick={() => handleSelectPlan(plan)} disabled={loadingIntent || !isPaid}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${isPaid ? (plan.id === 'pro' ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'border border-gray-700 hover:border-sky-500 text-gray-300 hover:text-white') : 'border border-gray-700 text-gray-400 cursor-default'}`}>
                  {plan.id === 'free' ? 'Free Forever' : `Get ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selectedPlan && clientSecret && (
        <div className="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-2">Complete Purchase</h2>
          <p className="text-gray-400 text-sm mb-6">Upgrading to {selectedPlan.name} — £{selectedPlan.price}</p>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm plan={selectedPlan} clientSecret={clientSecret} onSuccess={handleSuccess} />
          </Elements>
          <button onClick={() => { setSelectedPlan(null); setClientSecret(''); }}
            className="w-full mt-3 text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

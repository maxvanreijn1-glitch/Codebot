import { Link } from 'react-router-dom';
import { Code2, Zap, GitBranch, Shield, ArrowRight, Check } from 'lucide-react';

const features = [
  { icon: Zap, title: 'AI-Powered Analysis', desc: 'GPT-4 powered code analysis that understands context and provides intelligent suggestions.' },
  { icon: GitBranch, title: 'GitHub-style Diffs', desc: 'View proposed changes with a beautiful diff viewer just like a PR review.' },
  { icon: Code2, title: 'Multi-language Support', desc: 'TypeScript, Python, Go, Java, Ruby, PHP and many more.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your code is encrypted and never shared. Full privacy by design.' },
];

const plans = [
  { name: 'Free', price: '£0', period: '', features: ['5 analyses/month', 'Basic code analysis', 'Community support'], cta: 'Get Started', href: '/register', highlight: false },
  { name: 'Pro', price: '£20', period: 'one-time', features: ['50 analyses/month', 'Advanced AI analysis', 'Diff viewer', 'Priority support'], cta: 'Get Pro', href: '/pricing', highlight: true },
  { name: 'Premium', price: '£100', period: '/month', features: ['1000 analyses/month', 'Unlimited AI suite', 'Team features', '24/7 support', 'API access'], cta: 'Go Premium', href: '/pricing', highlight: false },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/20 via-gray-950 to-purple-900/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm">
              <Zap className="w-3.5 h-3.5" />Powered by GPT-4
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white mb-6">
            AI Code Analysis<br />
            <span className="bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">Built for Developers</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Upload your code, describe what you need, and get intelligent AI-powered suggestions with GitHub-style diffs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-all hover:scale-105">
              Start Analyzing Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-3 rounded-xl font-semibold text-lg transition-all">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-white mb-4">Everything you need</h2>
        <p className="text-gray-400 text-center mb-12">Powerful tools for professional code analysis</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-sky-500/50 transition-colors">
              <f.icon className="w-8 h-8 text-sky-400 mb-4" />
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-white mb-4">Simple Pricing</h2>
          <p className="text-gray-400 text-center mb-12">Start free, upgrade when you need more</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl p-8 border ${plan.highlight ? 'bg-sky-900/20 border-sky-500 shadow-lg shadow-sky-500/10' : 'bg-gray-900 border-gray-800'}`}>
                {plan.highlight && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-sky-500 text-white text-sm font-semibold rounded-full">Most Popular</div>}
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-gray-400 ml-1">{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.href} className={`block text-center py-3 rounded-xl font-semibold transition-all ${plan.highlight ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'border border-gray-700 hover:border-sky-500 text-gray-300 hover:text-white'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-6 h-6 text-sky-400" />
            <span className="text-white font-bold">Codebot</span>
          </div>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Codebot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

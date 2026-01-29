'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Wallet,
  BookOpen,
  ShieldCheck,
  Code2,
  Zap,
  Database,
  Clock,
  Coins,
  Activity,
  Fingerprint,
  Lock,
  Shield,
  Globe,
  Search,
  CheckCircle,
  Building2,
  Lightbulb,
  Users,
  Rocket
} from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { AnimatedBackground } from '@/components/shared/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LandingPage() {
  const { publicKey } = useWallet();
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/elections');
  };

  useEffect(() => {
    // Initialize AOS-like animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.aos-animate').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <AnimatedBackground />

      <Navbar />

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="aos-animate inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full w-fit">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-400">
                Powered by Solana Blockchain
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="aos-animate text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Democracy at the
              <span className="block bg-gradient-to-r from-purple-500 to-green-400 bg-clip-text text-transparent">
                Speed of Light
              </span>
            </h1>

            {/* Subheading */}
            <p className="aos-animate text-xl text-gray-400 leading-relaxed max-w-2xl">
              Experience the future of governance with lightning-fast, transparent,
              and tamper-proof voting on the Solana blockchain.
            </p>

            {/* CTA Buttons */}
            <div className="aos-animate flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/50"
              >
                <Wallet className="w-5 h-5 mr-2" />
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-700 hover:border-purple-500 hover:bg-gray-900"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Documentation
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="aos-animate flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-gray-400">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">Audited</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Code2 className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">Open Source</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Zap className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">400ms Blocks</span>
              </div>
            </div>
          </div>

          {/* Right: Visual Card */}
          <div className="aos-animate relative">
            <Card className="relative bg-gray-900/50 backdrop-blur-xl border-gray-800 p-8 shadow-2xl">
              {/* Glow Effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-green-400 rounded-3xl opacity-20 blur-xl" />

              <div className="relative space-y-8">
                {/* Icon */}
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-green-400 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <Zap className="w-10 h-10 text-white" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-green-400 bg-clip-text text-transparent">
                      10,247
                    </div>
                    <div className="text-sm text-gray-400 mt-1">Total Votes</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-green-400 bg-clip-text text-transparent">
                      99.9%
                    </div>
                    <div className="text-sm text-gray-400 mt-1">Uptime</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800 p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="aos-animate flex items-center gap-4">
              <Database className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold">100%</div>
                <div className="text-sm text-gray-400">On-Chain</div>
              </div>
            </div>
            <div className="aos-animate flex items-center gap-4">
              <Clock className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold">400ms</div>
                <div className="text-sm text-gray-400">Block Time</div>
              </div>
            </div>
            <div className="aos-animate flex items-center gap-4">
              <Coins className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold">$0.00025</div>
                <div className="text-sm text-gray-400">Per Vote</div>
              </div>
            </div>
            <div className="aos-animate flex items-center gap-4">
              <Activity className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold">Zero</div>
                <div className="text-sm text-gray-400">Downtime</div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="aos-animate text-4xl md:text-5xl font-bold mb-4">
            Why Choose SolVote?
          </h2>
          <p className="aos-animate text-xl text-gray-400 max-w-3xl mx-auto">
            Built on Solana's high-performance blockchain for unmatched speed and security
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Fingerprint,
              title: 'Wallet-Based Identity',
              description: 'Your wallet is your identity. No usernames, no passwords. Just connect and vote with complete privacy.',
            },
            {
              icon: Zap,
              title: 'Lightning Fast',
              description: 'Votes are confirmed in under a second. Experience real-time results with Solana\'s 400ms block times.',
            },
            {
              icon: Lock,
              title: 'Immutable Records',
              description: 'Every vote is permanently recorded on-chain. No tampering, no deletion, complete transparency.',
            },
            {
              icon: Shield,
              title: 'Auditable & Secure',
              description: 'Open-source smart contracts audited by top security firms. Trust through transparency.',
            },
            {
              icon: Coins,
              title: 'Minimal Costs',
              description: 'Vote for just $0.00025 per transaction. Say goodbye to expensive governance participation.',
            },
            {
              icon: Globe,
              title: 'Global Access',
              description: 'Participate from anywhere in the world. No geographical restrictions, truly decentralized.',
            },
          ].map((feature, index) => (
            <Card
              key={index}
              className="aos-animate group bg-gray-900/50 backdrop-blur-xl border-gray-800 p-8 hover:border-purple-500 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-2"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-green-400/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                <feature.icon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 bg-gray-900/30 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div className="space-y-8">
              <div>
                <h2 className="aos-animate text-4xl md:text-5xl font-bold mb-4">
                  How It Works
                </h2>
                <p className="aos-animate text-xl text-gray-400">
                  Three simple steps to participate in blockchain-powered governance
                </p>
              </div>

              <Button
                size="lg"
                onClick={handleGetStarted}
                className="aos-animate bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/50"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Start Voting
              </Button>
            </div>

            {/* Right: Steps */}
            <div className="space-y-6">
              {[
                {
                  number: '01',
                  icon: Wallet,
                  title: 'Connect Wallet',
                  description: 'Use Phantom, Solflare, or any Solana wallet. No registration required.',
                },
                {
                  number: '02',
                  icon: Search,
                  title: 'Browse Elections',
                  description: 'View active proposals, candidate details, and live vote counts.',
                },
                {
                  number: '03',
                  icon: CheckCircle,
                  title: 'Cast Your Vote',
                  description: 'Select your choice and approve. Your vote is instantly recorded on-chain.',
                },
              ].map((step, index) => (
                <Card
                  key={index}
                  className="aos-animate group bg-gray-900/50 backdrop-blur-xl border-gray-800 p-6 hover:border-purple-500 transition-all duration-300 hover:translate-x-2"
                >
                  <div className="flex items-center gap-6">
                    <div className="text-6xl font-bold bg-gradient-to-r from-purple-500 to-green-400 bg-clip-text text-transparent">
                      {step.number}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                      <p className="text-gray-400">{step.description}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/10 to-green-400/10 border border-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="aos-animate text-4xl md:text-5xl font-bold mb-4">
            Built for Every Community
          </h2>
          <p className="aos-animate text-xl text-gray-400 max-w-3xl mx-auto">
            From DAOs to enterprises, SolVote powers transparent decision-making
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Building2,
              title: 'DAO Governance',
              description: 'Protocol upgrades, treasury management, and strategic decisions.',
            },
            {
              icon: Lightbulb,
              title: 'Grant Programs',
              description: 'Community-driven funding allocation for builders and projects.',
            },
            {
              icon: Users,
              title: 'Council Elections',
              description: 'Elect representatives for foundations and community boards.',
            },
          ].map((useCase, index) => (
            <Card
              key={index}
              className="aos-animate text-center bg-gray-900/50 backdrop-blur-xl border-gray-800 p-10 hover:border-purple-500 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/50">
                <useCase.icon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{useCase.title}</h3>
              <p className="text-gray-400 leading-relaxed">{useCase.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 bg-gradient-to-r from-purple-500/10 to-green-400/5 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="space-y-8">
            <h2 className="aos-animate text-4xl md:text-5xl font-bold">
              Ready to Shape the Future?
            </h2>
            <p className="aos-animate text-xl text-gray-400 max-w-2xl mx-auto">
              Join thousands of users participating in transparent, on-chain governance
            </p>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="aos-animate bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-2xl shadow-purple-500/50 px-8 py-6 text-lg"
            >
              <Rocket className="w-6 h-6 mr-2" />
              Launch App
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
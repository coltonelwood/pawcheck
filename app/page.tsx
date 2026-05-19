import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Camera,
  ShieldCheck,
  Clock,
  Heart,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-cream-300/40">
        <nav className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-forest-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-ink">
              PawCheck
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-block text-sm font-medium text-ink-soft hover:text-ink transition-colors"
            >
              Sign in
            </Link>
            <Button asChild variant="accent" size="sm">
              <Link href="/signup">Try free</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 -left-32 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-forest-200/30 rounded-full blur-3xl" />
        </div>

        <div className="container relative pt-16 pb-20 md:pt-24 md:pb-32">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left: copy */}
            <div className="lg:col-span-7 stagger-children">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cream-200/80 border border-forest-600/10 text-xs font-medium text-forest-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Trusted by 10,000+ pet parents</span>
              </div>

              <h1 className="mt-6 font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-ink">
                Is your pet
                <br />
                <span className="italic gradient-forest">okay?</span>
                <br />
                Get an answer
                <br />
                <span className="text-amber-400">in 30 seconds.</span>
              </h1>

              <p className="mt-8 text-lg md:text-xl text-ink-soft leading-relaxed max-w-xl">
                Snap a photo. Describe what you're seeing. Get an instant
                AI-powered urgency assessment and clear next steps — before you
                spend $400 at the emergency vet for a false alarm.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button asChild size="lg" variant="accent">
                  <Link href="/signup">
                    Try 3 queries free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <span className="text-sm text-ink-mute">
                  No credit card required
                </span>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-mute">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-forest-500" />
                  <span>Instant response</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-forest-500" />
                  <span>Photo history saved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-forest-500" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Right: visual demo */}
            <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: '300ms' }}>
              <div className="relative">
                {/* Phone frame mockup */}
                <div className="relative mx-auto max-w-sm">
                  <div className="bg-cream-50 rounded-3xl border-2 border-forest-600/10 shadow-[0_24px_48px_-12px_rgba(45,90,78,0.18),0_8px_16px_-4px_rgba(45,90,78,0.1)] overflow-hidden">
                    {/* Mock app header */}
                    <div className="px-5 py-4 bg-forest-600 text-cream-100 flex items-center justify-between">
                      <span className="text-xs font-medium opacity-80">
                        ASSESSMENT
                      </span>
                      <Clock className="w-4 h-4 opacity-60" />
                    </div>
                    
                    {/* Mock photo area */}
                    <div className="aspect-square bg-gradient-to-br from-cream-200 to-cream-300 flex items-center justify-center relative">
                      <div className="absolute inset-4 rounded-2xl bg-amber-100/50 border border-amber-300/40 flex items-center justify-center">
                        <Camera className="w-12 h-12 text-amber-500" strokeWidth={1.5} />
                      </div>
                    </div>
                    
                    {/* Mock urgency result */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-urgency-yellow animate-subtle-pulse" />
                        <span className="font-medium text-sm text-ink">
                          Vet within 24 hours
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-cream-200 rounded-full w-full" />
                        <div className="h-2 bg-cream-200 rounded-full w-4/5" />
                        <div className="h-2 bg-cream-200 rounded-full w-3/5" />
                      </div>
                      <div className="pt-2 flex items-center gap-2 text-xs text-ink-mute">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Confidence: 87%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating annotation */}
                  <div className="absolute -bottom-6 -right-6 bg-card rounded-xl border border-cream-300/60 p-3 shadow-lg max-w-[200px]">
                    <div className="text-xs font-medium text-ink mb-1">
                      ⚡ 1.2s analysis time
                    </div>
                    <div className="text-xs text-ink-mute">
                      Faster than rebooking your vet appointment
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-cream-300/60 bg-cream-100/50 py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-forest-600" />
              <span className="font-medium text-ink">
                Built with veterinary best practices
              </span>
            </div>
            <div className="flex items-center gap-6 text-ink-mute tabular-nums">
              <div>
                <span className="font-bold text-ink">10K+</span> assessments
              </div>
              <div className="w-px h-4 bg-cream-300" />
              <div>
                <span className="font-bold text-ink">4.8★</span> avg rating
              </div>
              <div className="w-px h-4 bg-cream-300" />
              <div>
                <span className="font-bold text-ink">$320</span> saved per
                user/year
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-24 md:py-32">
        <div className="max-w-2xl">
          <span className="text-amber-500 font-medium text-sm uppercase tracking-widest">
            How it works
          </span>
          <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold tracking-tight text-ink leading-[1.1]">
            Peace of mind in
            <br />
            <em className="italic text-forest-600">three simple steps.</em>
          </h2>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6 md:gap-8">
          {[
            {
              number: '01',
              title: 'Photograph the concern',
              description:
                'Upload a clear photo of what worries you — a rash, a wound, a strange behavior, anything that seems off.',
              icon: Camera,
            },
            {
              number: '02',
              title: 'AI analyzes instantly',
              description:
                'Our AI assistant reviews the image against your pet\'s breed, age, and history. Calibrated for caution, not false reassurance.',
              icon: Sparkles,
            },
            {
              number: '03',
              title: 'Get a clear next step',
              description:
                'Color-coded urgency, likely causes, and exactly what to do — monitor at home, call your vet, or seek emergency care.',
              icon: ShieldCheck,
            },
          ].map((step) => (
            <div
              key={step.number}
              className="relative p-8 bg-card rounded-2xl border border-cream-300/60 group hover:border-forest-600/30 transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(45,90,78,0.12)]"
            >
              <div className="font-display text-5xl font-light text-amber-300 mb-4 tabular-nums">
                {step.number}
              </div>
              <step.icon className="w-6 h-6 text-forest-600 mb-4" />
              <h3 className="font-display text-2xl font-semibold text-ink mb-3 leading-tight">
                {step.title}
              </h3>
              <p className="text-ink-soft leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHEN TO USE */}
      <section className="bg-forest-700 text-cream-100 py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-400/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container relative">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            <div>
              <span className="text-amber-400 font-medium text-sm uppercase tracking-widest">
                When PawCheck helps
              </span>
              <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                The 3 AM
                <br />
                <em className="italic text-amber-400">"is this an emergency?"</em>
                <br />
                moment.
              </h2>
              <p className="mt-6 text-cream-100/80 text-lg leading-relaxed">
                Your vet is closed. Your gut says wait, but what if you're
                wrong? Most pet emergencies happen outside business hours —
                exactly when answers are hardest to find.
              </p>
              <div className="mt-8 p-5 bg-forest-600/50 rounded-xl border border-cream-100/10">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-cream-100/90 leading-relaxed">
                    <strong className="text-cream-100">Important:</strong>{' '}
                    PawCheck provides informational guidance, not veterinary
                    diagnosis. For any emergency, always contact a licensed
                    veterinarian or emergency animal hospital.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                'Skin rashes, lumps, or unusual spots',
                'Limping, stiffness, or sudden lameness',
                'Eye discharge, redness, or squinting',
                'Vomiting, diarrhea, or appetite changes',
                'Strange behavior or lethargy',
                'Wounds, cuts, or scrapes',
                'Suspected toxin ingestion (act fast)',
                'Breathing concerns or coughing',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 p-4 bg-forest-600/30 rounded-xl border border-cream-100/5 hover:border-amber-400/30 hover:bg-forest-600/50 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span className="text-cream-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="container py-24 md:py-32">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-amber-500 font-medium text-sm uppercase tracking-widest">
            Pricing
          </span>
          <h2 className="mt-4 font-display text-4xl md:text-5xl font-bold tracking-tight text-ink leading-[1.1]">
            Less than
            <em className="italic text-forest-600"> one emergency vet visit.</em>
          </h2>
          <p className="mt-6 text-ink-soft text-lg">
            One avoided unnecessary ER trip pays for years of PawCheck.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Monthly */}
          <div className="p-8 rounded-2xl bg-card border border-cream-300/60">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-display text-2xl font-semibold text-ink">
                Monthly
              </h3>
            </div>
            <div className="mb-6">
              <span className="font-display text-5xl font-bold text-ink tabular-nums">
                $14.99
              </span>
              <span className="text-ink-mute ml-2">/month</span>
            </div>
            <Button asChild variant="outline" className="w-full mb-6">
              <Link href="/signup?plan=monthly">Start free trial</Link>
            </Button>
            <ul className="space-y-3 text-sm">
              {[
                'Unlimited AI assessments',
                'Photo history & tracking',
                'Multi-pet support',
                'Vet finder',
                'Cancel anytime',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest-500 flex-shrink-0 mt-0.5" />
                  <span className="text-ink-soft">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Yearly - featured */}
          <div className="relative p-8 rounded-2xl bg-forest-600 text-cream-100 border-2 border-amber-400 shadow-[0_24px_48px_-12px_rgba(45,90,78,0.25)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-ink text-xs font-bold px-3 py-1 rounded-full">
              SAVE 56%
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-display text-2xl font-semibold">Yearly</h3>
              <span className="text-xs text-cream-100/60 line-through tabular-nums">
                $179
              </span>
            </div>
            <div className="mb-1">
              <span className="font-display text-5xl font-bold tabular-nums">
                $79
              </span>
              <span className="text-cream-100/70 ml-2">/year</span>
            </div>
            <p className="text-sm text-amber-300 mb-6 tabular-nums">
              That's $6.58/month
            </p>
            <Button asChild variant="accent" className="w-full mb-6">
              <Link href="/signup?plan=yearly">Get best value</Link>
            </Button>
            <ul className="space-y-3 text-sm">
              {[
                'Everything in monthly',
                'Save $100 vs monthly',
                'Priority AI processing',
                '24/7 access',
                'Lock in this price forever',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-cream-100/90">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center mt-8 text-sm text-ink-mute">
          Start with 3 free assessments. No credit card required.
        </p>
      </section>

      {/* FINAL CTA */}
      <section className="container pb-24 md:pb-32">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 to-cream-200 p-12 md:p-20 text-center">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-300/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-forest-200/40 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative max-w-2xl mx-auto">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-ink leading-[1.1]">
              Your pet can't
              <br />
              <em className="italic text-forest-700">tell you</em> what's wrong.
              <br />
              We can help.
            </h2>
            <p className="mt-6 text-lg text-ink-soft">
              Try 3 assessments free. If you don't get value, walk away.
            </p>
            <div className="mt-10">
              <Button asChild size="xl" variant="default">
                <Link href="/signup">
                  Start free — no card required
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-cream-300/60 bg-cream-100/50">
        <div className="container py-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <span className="font-display text-lg font-bold text-ink">
                  PawCheck
                </span>
              </Link>
              <p className="mt-3 text-sm text-ink-mute max-w-xs">
                AI-powered pet health guidance. Not a substitute for veterinary
                care.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-12 text-sm">
              <div>
                <h4 className="font-semibold text-ink mb-3">Product</h4>
                <ul className="space-y-2 text-ink-mute">
                  <li>
                    <Link href="/signup" className="hover:text-ink transition-colors">
                      Sign up
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" className="hover:text-ink transition-colors">
                      Sign in
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-ink mb-3">Legal</h4>
                <ul className="space-y-2 text-ink-mute">
                  <li>
                    <Link href="/privacy" className="hover:text-ink transition-colors">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-ink transition-colors">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link href="/disclaimer" className="hover:text-ink transition-colors">
                      Medical Disclaimer
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-cream-300/60 text-xs text-ink-mute">
            <p className="leading-relaxed">
              © 2026 PawCheck. PawCheck is not a veterinary service and does not
              provide medical diagnosis. Information provided is for educational
              purposes only. Always consult a licensed veterinarian for medical
              advice, diagnosis, or treatment of your pet's health condition.
              In case of emergency, contact your local emergency veterinary
              hospital immediately.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

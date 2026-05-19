import Link from 'next/link'
import { ArrowLeft, Heart } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy — PawCheck',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-forest-600 flex items-center justify-center">
            <Heart className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <span className="font-display text-xl font-bold text-ink">PawCheck</span>
        </Link>
        <Link href="/" className="text-sm text-ink-mute hover:text-ink inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
      </header>

      <main className="container max-w-3xl py-8 lg:py-16">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-ink mb-4">
          Privacy Policy
        </h1>
        <p className="text-ink-mute mb-12">Last updated: May 19, 2026</p>

        <div className="prose prose-stone max-w-none space-y-6 text-ink-soft leading-relaxed">
          <p className="p-4 bg-amber-50 border border-amber-200/60 rounded-xl text-sm">
            <strong className="text-ink">Template Notice:</strong> This privacy
            policy is a starting template. Before launching publicly, have a
            qualified attorney review and customize this document for your
            specific business, jurisdiction (state laws like CCPA, BIPA), and
            data practices.
          </p>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              1. Introduction
            </h2>
            <p>
              PawCheck ("we", "us", "our") respects your privacy. This Privacy
              Policy explains how we collect, use, share, and protect
              information when you use the PawCheck service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              2. Information We Collect
            </h2>
            <p><strong className="text-ink">Account information:</strong> Email address, name, and password (hashed) when you create an account.</p>
            <p><strong className="text-ink">Pet information:</strong> Information you provide about your pets, including name, species, breed, age, weight, sex, medical conditions, and medications.</p>
            <p><strong className="text-ink">Photo and assessment data:</strong> Photos you upload, descriptions of symptoms, and the resulting AI assessments.</p>
            <p><strong className="text-ink">Payment information:</strong> Processed by Stripe. We do not store your full credit card details on our servers.</p>
            <p><strong className="text-ink">Usage data:</strong> How you interact with the service, including pages viewed and features used, collected via privacy-respecting analytics.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide AI assessments based on your photos and pet information</li>
              <li>Maintain your account and process subscription payments</li>
              <li>Send transactional emails (account verification, billing notices)</li>
              <li>Improve our service through aggregated analytics</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              4. Third-Party Services
            </h2>
            <p>We rely on the following service providers, each with their own privacy practices:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-ink">Anthropic:</strong> Processes pet photos and descriptions to generate AI assessments.</li>
              <li><strong className="text-ink">Supabase:</strong> Hosts our database and authentication system.</li>
              <li><strong className="text-ink">Stripe:</strong> Processes subscription payments.</li>
              <li><strong className="text-ink">Resend:</strong> Sends transactional emails.</li>
              <li><strong className="text-ink">PostHog:</strong> Provides product analytics.</li>
              <li><strong className="text-ink">Vercel:</strong> Hosts our web application.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              5. Your Rights
            </h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us at privacy@pawcheck.app.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              6. Data Retention
            </h2>
            <p>
              We retain your account and assessment data for as long as your
              account is active. If you delete your account, we will remove
              your personal data within 30 days, except where retention is
              required for legal compliance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              7. Security
            </h2>
            <p>
              We use industry-standard security measures including encrypted
              data transmission (HTTPS), encrypted data at rest, and access
              controls. However, no system is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              8. Children's Privacy
            </h2>
            <p>
              PawCheck is not intended for users under 18. We do not knowingly
              collect data from children.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              9. Changes
            </h2>
            <p>
              We may update this policy from time to time. Material changes
              will be communicated via email or in-app notice.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              10. Contact
            </h2>
            <p>
              Questions? Email privacy@pawcheck.app.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

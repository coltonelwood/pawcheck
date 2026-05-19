import Link from 'next/link'
import { ArrowLeft, Heart, AlertCircle, Phone } from 'lucide-react'

export const metadata = {
  title: 'Medical Disclaimer — PawCheck',
}

export default function DisclaimerPage() {
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
          Medical Disclaimer
        </h1>
        <p className="text-ink-mute mb-12">Last updated: May 19, 2026</p>

        <div className="p-6 bg-urgency-red/5 border-2 border-urgency-red/30 rounded-2xl mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-urgency-red flex-shrink-0" />
            <div>
              <h2 className="font-display text-xl font-bold text-ink mb-2">
                PawCheck Is Not Veterinary Medical Advice
              </h2>
              <p className="text-ink-soft leading-relaxed">
                PawCheck provides informational guidance only. It does not
                provide veterinary diagnosis, treatment, or medical advice.
                Always consult a licensed veterinarian for the health of your
                pet.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 text-ink-soft leading-relaxed">
          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              No Veterinary-Client-Patient Relationship
            </h2>
            <p>
              Using PawCheck does not create a veterinarian-client-patient
              relationship between you and PawCheck or any veterinarian. A
              proper veterinary diagnosis requires hands-on physical
              examination, which cannot be replaced by photo analysis.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              AI Limitations
            </h2>
            <p>Our AI system has inherent limitations:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Cannot perform physical exams, take vital signs, or run diagnostics</li>
              <li>Cannot smell, palpate, or auscultate</li>
              <li>May miss conditions not visible in a photo</li>
              <li>May misinterpret visual cues</li>
              <li>Provides probabilistic guidance, not definitive diagnoses</li>
            </ul>
          </section>

          <section className="p-5 bg-urgency-red/5 border border-urgency-red/20 rounded-xl">
            <h2 className="font-display text-2xl font-semibold text-ink mb-3 flex items-center gap-2">
              <Phone className="w-6 h-6 text-urgency-red" />
              When to Seek Emergency Care
            </h2>
            <p className="mb-3">
              <strong className="text-ink">Do not rely on PawCheck for emergencies.</strong>{' '}
              Contact an emergency veterinary hospital immediately if your pet
              shows any of these signs:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Difficulty breathing or labored respiration</li>
              <li>Pale, blue, or yellow gums</li>
              <li>Active bleeding that won't stop</li>
              <li>Suspected poisoning or toxin ingestion</li>
              <li>Seizures or loss of consciousness</li>
              <li>Bloated or distended abdomen</li>
              <li>Severe vomiting or diarrhea</li>
              <li>Trauma (hit by vehicle, fall, attack)</li>
              <li>Inability to urinate (especially male cats)</li>
              <li>Heatstroke symptoms</li>
              <li>Eye injuries or prolapsed eye</li>
              <li>Pregnancy or labor complications</li>
            </ul>
            <p className="mt-4 font-medium text-ink">
              ASPCA Animal Poison Control: (888) 426-4435
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              You Assume All Risk
            </h2>
            <p>
              You acknowledge that any decisions you make based on PawCheck's
              information are your responsibility. PawCheck disclaims liability
              for any harm to your pet arising from reliance on the service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-ink mt-8 mb-3">
              Always Consult Your Veterinarian
            </h2>
            <p>
              The most important advice we can give: when in doubt, call your
              vet. PawCheck can help you decide when to be worried — but only
              a licensed veterinarian can diagnose and treat your pet.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

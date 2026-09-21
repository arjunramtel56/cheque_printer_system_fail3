import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Printer,
  FileText,
  Shield,
  Clock,
  CreditCard,
} from "lucide-react";

const features = [
  {
    icon: Printer,
    title: "Precise Print Alignment",
    description: "Templates ensure your cheque details print exactly where they should.",
  },
  {
    icon: FileText,
    title: "Multiple Bank Templates",
    description: "Support for all major Nepalese banks with customizable cheque layouts.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your cheque data is encrypted and isolated. Only you can access your information.",
  },
  {
    icon: Clock,
    title: "Print History",
    description: "Keep track of all your printed cheques with complete history and reprint capability.",
  },
  {
    icon: CreditCard,
    title: "Amount in Words",
    description: "Automatic Nepali/English amount-in-words conversion for Nepalese Rupees.",
  },
];

const steps = [
  {
    step: "1",
    title: "Create Account",
    description: "Sign up for a free 14-day trial. No credit card required.",
  },
  {
    step: "2",
    title: "Select Bank",
    description: "Choose your bank and cheque template from our pre-configured options.",
  },
  {
    step: "3",
    title: "Fill Details",
    description: "Enter payee name, amount, and date. Amount in words converts automatically.",
  },
  {
    step: "4",
    title: "Print",
    description: "Preview your cheque and print with precise alignment.",
  },
];

const plans = [
  {
    name: "Trial",
    price: "Free",
    duration: "14 days",
    features: ["10 cheque prints", "Basic bank templates", "Print history"],
  },
  {
    name: "Standard",
    price: "NPR 500",
    duration: "/month",
    features: ["100 cheque prints", "All bank templates", "Export to PDF", "Email support"],
    popular: true,
  },
  {
    name: "Business",
    price: "NPR 1,500",
    duration: "/month",
    features: ["Unlimited prints", "All bank templates", "Bulk printing", "Priority support", "Custom templates"],
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Cheque Printing
            <span className="text-primary"> Made Simple</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Prepare and print Nepalese bank cheques with precise alignment.
            Perfect for businesses of all sizes.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/en/register">
              <Button size="lg" className="text-base">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/en/features">
              <Button variant="outline" size="lg" className="text-base">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">Everything You Need</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            A complete cheque printing solution for Nepalese businesses
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <feature.icon className="h-10 w-10 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-card py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">How It Works</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  {step.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold">Simple Pricing</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Start free, upgrade when you need more
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.popular ? "border-primary shadow-md" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Popular
                  </div>
                )}
                <CardContent className="pt-6">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.duration}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <span className="text-primary">&#10003;</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/en/register" className="mt-6 block">
                    <Button
                      variant={plan.popular ? "default" : "outline"}
                      className="w-full"
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mt-4 text-lg opacity-90">
            Join businesses across Nepal who trust RCPS for their cheque printing needs.
          </p>
          <Link href="/en/register">
            <Button size="lg" variant="secondary" className="mt-8 text-base">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

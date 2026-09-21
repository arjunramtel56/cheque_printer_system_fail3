import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Printer,
  ShieldCheck,
  Users,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Easy Cheque Creation",
    description:
      "Payee, amount, date र bank details भरेर सजिलै cheque तयार गर्नुहोस्।",
  },
  {
    icon: Printer,
    title: "Accurate Printing",
    description:
      "Cheque print गर्नु अघि preview र alignment मिलाएर print गर्नुहोस्।",
  },
  {
    icon: ShieldCheck,
    title: "Secure System",
    description:
      "तपाईंको cheque records सुरक्षित र व्यवस्थित रूपमा manage गर्नुहोस्।",
  },
  {
    icon: Users,
    title: "User & Admin Panel",
    description:
      "User र admin का लागि फरक dashboard सहित पूर्ण management system।",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
              R
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Reactify
              </h1>
              <p className="text-xs text-slate-500">
                Cheque Printing System
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm text-slate-600 hover:text-blue-600"
            >
              Features
            </Link>

            <Link
              href="#about"
              className="text-sm text-slate-600 hover:text-blue-600"
            >
              About
            </Link>

            <Link
              href="/auth/login"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-600 hover:text-blue-600"
            >
              Login
            </Link>

            <Link
              href="/auth/register"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-24 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
              <CheckCircle size={17} />
              Smart cheque management platform
            </div>

            <h2 className="max-w-3xl text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
              Cheque printing अब अझै सरल र व्यवस्थित।
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Reactify Cheque Printing System प्रयोग गरेर cheque create,
              preview, manage र print सबै एउटै modern dashboard बाट गर्नुहोस्।
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white hover:bg-blue-700"
              >
                सुरु गर्नुहोस्
                <ArrowRight size={18} />
              </Link>

              <Link
                href="#features"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-600"
              >
                Features हेर्नुहोस्
              </Link>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-blue-100">
            <div className="rounded-2xl bg-slate-950 p-5">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Reactify Dashboard</p>
                  <h3 className="mt-1 text-xl font-bold text-white">
                    Cheque Overview
                  </h3>
                </div>

                <Printer className="text-blue-400" size={25} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="mt-1 text-2xl font-bold text-white">248</p>
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-slate-400">Printed</p>
                  <p className="mt-1 text-2xl font-bold text-green-400">186</p>
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-slate-400">Drafts</p>
                  <p className="mt-1 text-2xl font-bold text-yellow-400">62</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-white p-5">
                <div className="flex justify-between border-b border-slate-200 pb-4">
                  <span className="text-sm font-semibold text-slate-800">
                    Cheque Preview
                  </span>

                  <span className="text-xs font-medium text-green-600">
                    Ready to print
                  </span>
                </div>

                <div className="mt-6 border-2 border-dashed border-slate-300 p-5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Reactify Bank Ltd.</span>
                    <span>DATE: 2026-09-21</span>
                  </div>

                  <p className="mt-8 text-sm text-slate-600">
                    Pay to the order of:{" "}
                    <span className="font-semibold text-slate-900">
                      Your Payee
                    </span>
                  </p>

                  <div className="mt-6 flex justify-between gap-4">
                    <span className="text-sm text-slate-600">
                      Rupees: One Hundred Thousand Only
                    </span>

                    <span className="whitespace-nowrap font-bold text-slate-900">
                      NPR 100,000
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-semibold text-blue-600">Main Features</p>

            <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">
              Cheque management का complete solution
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              सानो business देखि ठूलो organization सम्म प्रयोग गर्न मिल्ने
              professional cheque printing system।
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Icon size={24} />
                  </div>

                  <h3 className="mt-5 font-bold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About CTA */}
      <section id="about" className="bg-slate-950 py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold">
              Ready to simplify cheque printing?
            </h2>

            <p className="mt-3 text-slate-400">
              आफ्नो cheque workflow आजै digital बनाउनुहोस्।
            </p>
          </div>

          <Link
            href="/auth/register"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold hover:bg-blue-700"
          >
            Create Account
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-sm text-slate-500">
        © 2026 Reactify Cheque Printing System. All rights reserved.
      </footer>
    </main>
  );
}

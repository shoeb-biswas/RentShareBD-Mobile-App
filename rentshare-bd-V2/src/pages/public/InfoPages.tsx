import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/Layouts';

export function AboutPage() {
  return (
    <PublicLayout>
      <div className="max-w-[960px] mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
            About RentShare BD
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            RentShare BD was designed for university students and young working professionals across
            Dhaka, Savar, and Gazipur who face fragmented house hunting, hidden utility charges,
            incompatible roommates, and messy shared expense spreadsheets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Transparent Cost & Safety First
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Every listing highlights total monthly living cost—combining rent, DESCO electricity,
              Titas gas, Dhaka WASA, internet, and service charges—alongside automated suspicious
              listing checks and landlord Trust Scores.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Complete Shared Living Workspace
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Once a rental is approved, flatmates collaborate inside a private group workspace with
              Socket.IO real-time chat, equal/custom/percentage bill splitting, weekly meal planning,
              grocery tracking, maintenance tickets, and Gemini AI financial coaching.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function HowItWorksPage() {
  const steps = [
    {
      num: '01.',
      title: 'Search Verified Flats with True Monthly Cost',
      body: 'Filter Dhaka neighborhoods by budget, room type, facilities, and commute distance to universities or workplaces using interactive OpenStreetMap pins.',
    },
    {
      num: '02.',
      title: 'Match with Compatible Roommates',
      body: 'Set your sleeping schedule, cleanliness, smoking, noise, and guest preferences. Our weighted algorithm scores candidates out of 100 and explains exact matches and differences.',
    },
    {
      num: '03.',
      title: 'Sign Digital Consent & Auto-Create Your Group',
      body: 'When a landlord accepts your application, review your rental terms, record your digital consent, download the PDF agreement, and enter your Flat Group workspace.',
    },
    {
      num: '04.',
      title: 'Manage Expenses, Meals, Utilities & Chat Together',
      body: 'Log shared rent and groceries, split bills fairly, track bKash/Nagad/manual utility payments, plan Saturday-to-Friday meals, and chat in real time.',
    },
  ];

  return (
    <PublicLayout>
      <div className="max-w-[960px] mx-auto px-6 py-12">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
          How RentShare BD Works
        </h1>
        <p className="mt-2 text-base text-slate-600">
          From finding a verified room in Dhaka to managing daily flatmate life in one platform.
        </p>

        <div className="mt-8 space-y-4">
          {steps.map((s) => (
            <div key={s.num} className="bg-white rounded-xl border border-slate-200 p-6 flex gap-5">
              <span className="font-mono text-lg font-bold text-[#4F46E5] shrink-0">{s.num}</span>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">{s.title}</h2>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            to="/properties"
            className="px-5 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Browse Properties
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Create Account
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}

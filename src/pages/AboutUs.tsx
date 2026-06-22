import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-white p-6 md:p-16">
      <div className="max-w-3xl mx-auto">
        <Link to="/landing">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Landing
          </Button>
        </Link>
        <h1 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">About Us</h1>
        <p className="text-lg text-slate-600 mb-6">
          Welcome to our Inventory Management System. This application is designed to streamline inventory processes, helping you manage stock, requisitions, and daily reports effortlessly across multiple projects.
        </p>
        <p className="text-lg text-slate-600">
          Our mission is to provide an intuitive and powerful tool to keep your projects on track and your inventory in check.
        </p>
      </div>
    </div>
  );
}

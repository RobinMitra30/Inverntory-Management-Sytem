import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

export function DemoRequestForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    phoneNumber: '',
    companySize: '1-50 employees'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.companyName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'demoRequests'), {
        ...formData,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      
      // Audit log
      try {
        await addDoc(collection(db, 'auditLogs'), {
          action: 'CREATE_DEMO_REQUEST',
          entityId: docRef.id,
          entityType: 'demoRequests',
          details: `Demo request created by ${formData.email}`,
          performedBy: user?.uid || 'guest',
          performedAt: new Date().toISOString()
        });
      } catch (logErr) {
        console.error('Failed to write audit log', logErr);
        // We don't fail the user submission if audit log fails
      }

      toast.success('Your demo request has been submitted successfully!');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        companyName: '',
        phoneNumber: '',
        companySize: '1-50 employees'
      });
    } catch (err) {
      console.error('Error submitting demo request:', err);
      toast.error('Failed to submit demo request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-1">First Name *</label>
          <input 
            type="text" 
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" 
            placeholder="John" 
            required
          />
        </div>
        <div>
          <label className="text-sm font-bold text-slate-700 block mb-1">Last Name *</label>
          <input 
            type="text" 
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" 
            placeholder="Doe" 
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 block mb-1">Work Email *</label>
        <input 
          type="email" 
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" 
          placeholder="john@company.com" 
          required
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 block mb-1">Company Name *</label>
        <input 
          type="text" 
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" 
          placeholder="Acme Corp" 
          required
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 block mb-1">Phone Number</label>
        <input 
          type="tel" 
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" 
          placeholder="+1 (555) 000-0000" 
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 block mb-1">Company Size</label>
        <select 
          name="companySize"
          value={formData.companySize}
          onChange={handleChange}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
        >
          <option value="1-50 employees">1-50 employees</option>
          <option value="51-200 employees">51-200 employees</option>
          <option value="201+ employees">201+ employees</option>
        </select>
      </div>
      <Button 
        type="submit" 
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 text-white rounded-xl py-6 text-lg font-bold mt-4 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Get Started'}
      </Button>
    </form>
  );
}

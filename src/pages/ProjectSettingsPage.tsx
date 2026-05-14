import React, { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, ShieldCheck, Tag, ArrowLeft, Edit2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProjectService } from '@/services/store';
import { Project } from '@/types';

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!id) return;
    const unsub = ProjectService.subscribe((projects) => {
      setProject(projects.find(p => p.id === id) || null);
    });
    return unsub;
  }, [id]);

  const menuItems = [
    { id: 'profile', label: 'Project Profile', icon: LayoutDashboard },
    { id: 'members', label: 'Project Members', icon: Users },
    { id: 'po', label: 'PO Settings', icon: FileText },
    { id: 'custom', label: 'Custom fields', icon: Settings },
    { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
    { id: 'tags', label: 'Tags', icon: Tag },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2 -ml-2" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
          Back to {project?.name || 'Project'}
        </Button>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-1 min-w-max pb-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === item.id 
                    ? "border-blue-600 text-blue-700" 
                    : "border-transparent text-slate-500 hover:text-slate-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4">
        {activeTab === 'profile' && project && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Project Profile</h1>
              <Button variant="outline" className="gap-2">
                <Edit2 className="w-4 h-4" /> Edit
              </Button>
            </div>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-mono text-slate-400">Project Name</p>
                    <p className="font-bold text-slate-900">{project.name}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono text-slate-400">Description</p>
                  <p className="text-slate-600">{project.location || 'Testing the construction site'}</p>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-mono text-slate-400">Project Start Date</p>
                    <p className="font-bold text-slate-900">{project.startDate || '11 May 2026'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-mono text-slate-400">Project End Date</p>
                    <p className="font-bold text-slate-900">{project.endDate || '16 May 2026'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <p className="font-bold text-slate-700">Project Custom Fields</p>
              </CardContent>
            </Card>

            <div className="pt-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">OTHER SETTINGS</h3>
              <Card className="border-slate-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                      <LayoutDashboard className="w-5 h-5"/>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">S-Curve</p>
                      <p className="text-xs text-slate-500">Enable and manage S-Curve for this project</p>
                    </div>
                  </div>
                  <div className="w-10 h-6 bg-slate-200 rounded-full cursor-pointer relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Shield, 
  Mail, 
  Calendar, 
  MoreVertical, 
  CheckCircle2, 
  XCircle,
  Search,
  Filter,
  UserCheck,
  Building2,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { UserService, ProjectService } from '@/services/store';
import { UserProfile, UserRole, Project } from '@/types';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

export default function UsersPage() {
  const { profile: currentUserProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // For User Creation Dialog
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // For Reset Password
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedUserForReset, setSelectedUserForReset] = useState<string | null>(null);

  const [newUserInfo, setNewUserInfo] = useState({
    name: '',
    username: '',
    password: '',
    role: UserRole.SITE_SUPERVISOR,
    assignedProject: 'none',
    status: 'active'
  });

  useEffect(() => {
    const unsubUsers = UserService.subscribe(data => {
      setUsers(data);
      setIsLoading(false);
    });
    const unsubProjects = ProjectService.subscribe(setProjects);
    return () => {
      unsubUsers();
      unsubProjects();
    };
  }, []);

  const handleUpdateRole = async (uid: string, newRole: UserRole) => {
    try {
      await UserService.updateRole(uid, newRole);
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserInfo.name || !newUserInfo.username || !newUserInfo.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const assignedProjects = newUserInfo.assignedProject === 'none' ? [] : [newUserInfo.assignedProject];
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newUserInfo.name,
          username: newUserInfo.username,
          password: newUserInfo.password,
          role: newUserInfo.role,
          projects: assignedProjects,
          status: newUserInfo.status
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create user");
      }

      toast.success("User created successfully!");
      setIsAddUserOpen(false);
      setNewUserInfo({
        name: '',
        username: '',
        password: '',
        role: UserRole.SITE_SUPERVISOR,
        assignedProject: 'none',
        status: 'active'
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!selectedUserForReset || !newPassword) return;
    
    setIsCreating(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUserForReset}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }
      
      toast.success("Password reset successfully (mocked for demo).");
      setIsResetPasswordOpen(false);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-purple-100 text-purple-700 border-purple-200';
      case UserRole.PROJECT_MANAGER: return 'bg-blue-100 text-blue-700 border-blue-200';
      case UserRole.SITE_SUPERVISOR: return 'bg-green-100 text-green-700 border-green-200';
      case UserRole.QUALITY_ENGINEER: return 'bg-amber-100 text-amber-700 border-amber-200';
      case UserRole.STORE_KEEPER: return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage project team roles and access rights.</p>
        </div>
        
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 shadow-md" />}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Manually create a user and provide them with these credentials.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-bold">Full Name</label>
                <Input 
                  placeholder="e.g. John Doe" 
                  value={newUserInfo.name}
                  onChange={e => setNewUserInfo({ ...newUserInfo, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold">Username</label>
                <Input 
                  placeholder="e.g. supervisor01" 
                  value={newUserInfo.username}
                  onChange={e => setNewUserInfo({ ...newUserInfo, username: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold">Password</label>
                <Input 
                  placeholder="e.g. Sup@123" 
                  type="text"
                  value={newUserInfo.password}
                  onChange={e => setNewUserInfo({ ...newUserInfo, password: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold">Role</label>
                <Select 
                  value={newUserInfo.role} 
                  onValueChange={(val: UserRole) => setNewUserInfo({ ...newUserInfo, role: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UserRole).map(role => (
                      <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold">Assign Project</label>
                <Select 
                  value={newUserInfo.assignedProject} 
                  onValueChange={(val: string) => setNewUserInfo({ ...newUserInfo, assignedProject: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific project (All / Based on Role)</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 mt-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold block">Status</label>
                    <span className="text-xs text-slate-500">Active users can login</span>
                  </div>
                  <Switch 
                    checked={newUserInfo.status === 'active'}
                    onCheckedChange={(checked) => setNewUserInfo({...newUserInfo, status: checked ? 'active' : 'inactive'})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)} disabled={isCreating}>Cancel</Button>
              <Button onClick={handleCreateUser} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search users by name or username..." 
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 hidden md:block" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  {Object.values(UserRole).map(role => (
                    <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/20">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Team Member</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Projects</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-8 h-16 bg-slate-50/10"></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                      No team members found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              {user.name}
                              {user.uid === currentUserProfile?.uid && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 bg-blue-50 text-blue-600 border-blue-100">You</Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              @{(user as any).username || (user.email && user.email.split('@')[0]) || 'unknown'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={cn("px-2 py-0.5 rounded-md font-medium text-[11px]", getRoleBadgeColor(user.role))}>
                          {user.role.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Building2 className="w-3 h-3" />
                          <span>{user.assignedProjects?.length || 0} Project(s)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn("flex items-center gap-1.5 text-xs font-medium", (user as any).status === 'inactive' ? 'text-red-500' : 'text-emerald-600')}>
                          {(user as any).status === 'inactive' ? <XCircle className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {(user as any).status === 'inactive' ? 'Inactive' : 'Active'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-full" />}>
                              <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem className="text-xs font-bold text-slate-400 uppercase tracking-widest pointer-events-none px-3 py-2">
                              Assign Role
                            </DropdownMenuItem>
                            {Object.values(UserRole).map((role) => (
                              <DropdownMenuItem 
                                key={role} 
                                onClick={() => handleUpdateRole(user.uid, role)}
                                className={cn("text-sm", user.role === role && "bg-blue-50 text-blue-600 font-medium")}
                              >
                                {user.role === role ? (
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                ) : (
                                  <Shield className="w-4 h-4 mr-2 text-slate-400" />
                                )}
                                {role.replace(/_/g, ' ')}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-blue-600 focus:text-blue-600"
                              onClick={() => {
                                setSelectedUserForReset(user.uid);
                                setIsResetPasswordOpen(true);
                              }}
                            >
                              <Lock className="w-4 h-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                              <XCircle className="w-4 h-4 mr-2" />
                              {(user as any).status === 'inactive' ? 'Activate User' : 'Disable User'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Enter a new password for the selected user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-bold">New Password</label>
              <Input 
                placeholder="e.g. NewPass@123" 
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={handleResetPasswordSubmit}
              disabled={!newPassword || isCreating}
            >
              {isCreating ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-none text-white shadow-xl">
          <CardHeader>
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-2">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <CardTitle className="text-lg">Role Information</CardTitle>
            <CardDescription className="text-slate-400">
              Understand the impact of assigning roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="border-l-2 border-blue-500 pl-4 py-1">
              <p className="font-bold text-blue-400">ADMIN</p>
              <p className="text-slate-400 text-xs mt-1">Full system access, manage users, finances, and all project settings.</p>
            </div>
            <div className="border-l-2 border-emerald-500 pl-4 py-1">
              <p className="font-bold text-emerald-400">PROJECT MANAGER</p>
              <p className="text-slate-400 text-xs mt-1">Manage project timelines, budgets, requisitions, and approvals.</p>
            </div>
            <div className="border-l-2 border-amber-500 pl-4 py-1">
              <p className="font-bold text-amber-400">SITE SUPERVISOR</p>
              <p className="text-slate-400 text-xs mt-1">Submit daily progress reports, manage on-site labor and tasks.</p>
            </div>
          </CardContent>
        </Card>
        
        <div className="md:col-span-2">
          <Card className="h-full border-dashed border-2 bg-slate-50/30">
            <CardContent className="flex flex-col items-center justify-center h-full py-12 text-center px-8">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                <UsersIcon className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Manual User Control</h3>
              <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
                Create new logins securely and securely hand over passwords. No email required. 
                They will only access projects you explicitly assign them to.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

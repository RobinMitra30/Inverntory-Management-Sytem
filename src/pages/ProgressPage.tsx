import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Image as ImageIcon, 
  MessageSquare, 
  Calendar as CalendarIcon,
  ChevronRight,
  Sun,
  Cloud,
  CloudRain,
  Camera,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const MOCK_REPORTS = [
  { 
    id: '1', 
    date: '2024-05-10', 
    activities: 'Completed waterproofing of subterranean basement. Began slab reinforcement for Ground Floor sector A.', 
    issues: 'Delayed concrete delivery due to traffic on Outer Ring Road.',
    weather: 'Sunny',
    photos: ['https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=400'],
    submittedBy: 'Amit Singh',
    time: '06:15 PM'
  },
  { 
    id: '2', 
    date: '2024-05-09', 
    activities: 'Completed excavation for Block B. Mobilized additional labor for plumbing works.', 
    issues: 'None',
    weather: 'Cloudy',
    photos: ['https://images.unsplash.com/photo-1503387762-592df58ef49c?auto=format&fit=crop&q=80&w=400'],
    submittedBy: 'Vikram Rathore',
    time: '05:45 PM'
  }
];

export default function ProgressPage() {
  const [reports] = useState(MOCK_REPORTS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Progress Reports (DPR)</h1>
          <p className="text-slate-500 text-sm">Official site logs and chronological progress tracking.</p>
        </div>
        <Dialog>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" />
              Submit DPR
            </Button>
          } />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Daily Progress Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                 </div>
                 <div className="space-y-2">
                    <Label>Weather Condition</Label>
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="Select weather" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sunny">Sunny</SelectItem>
                            <SelectItem value="cloudy">Cloudy</SelectItem>
                            <SelectItem value="rainy">Rainy</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="space-y-2">
                 <Label>Work Activities Conducted</Label>
                 <Textarea placeholder="Detail the work done today..." className="h-24 resize-none" />
              </div>

              <div className="space-y-2">
                 <Label>Site Issues / Blockers</Label>
                 <Textarea placeholder="Any obstacles encountered?" className="h-16 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {/* Photo upload features disabled as requested
                 <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer group transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                        <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-slate-500">Capture Site Photo</span>
                 </div>
                 <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer group transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                        <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-slate-500">Upload Media</span>
                 </div>
                 */}
              </div>
            </div>
            <DialogFooter>
               <Button variant="outline">Save Draft</Button>
               <Button className="bg-blue-600">Post Report</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative">
             <div className="absolute left-6 top-4 bottom-0 w-px bg-slate-200 -z-10" />
             <div className="space-y-12">
                {reports.map((report) => (
                   <div key={report.id} className="relative pl-16">
                      <div className="absolute left-4 top-1 w-4 h-4 rounded-full border-4 border-white bg-blue-600 shadow-sm" />
                      
                      <Card className="border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                         <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                               <CalendarIcon className="w-4 h-4 text-slate-400" />
                               <span className="font-bold text-slate-900">{new Date(report.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                               <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">{report.weather}</Badge>
                            </div>
                            <span className="text-xs text-slate-400 font-mono italic">{report.time}</span>
                         </div>
                         <CardContent className="p-5 space-y-4">
                            <div className="space-y-4">
                               <div className="space-y-1">
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activities</h4>
                                  <p className="text-sm text-slate-700 leading-relaxed font-medium italic">"{report.activities}"</p>
                               </div>
                               
                               {report.issues !== 'None' && (
                                  <div className="space-y-1">
                                     <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Blockers</h4>
                                     <p className="text-sm text-red-700 leading-relaxed font-medium italic">"{report.issues}"</p>
                                  </div>
                               )}
                            </div>

                            {/* Photos disabled 
                            {report.photos.length > 0 && (
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                                  {report.photos.map((photo, i) => (
                                     <img 
                                        key={i} 
                                        src={photo} 
                                        alt="Site progress" 
                                        className="rounded-lg w-full h-48 object-cover border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity" 
                                        referrerPolicy="no-referrer"
                                     />
                                  ))}
                               </div>
                            )}
                            */}
                         </CardContent>
                         <CardFooter className="p-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                                  {report.submittedBy.charAt(0)}
                               </div>
                               <span className="text-xs font-medium text-slate-600">Submitted by {report.submittedBy}</span>
                            </div>
                            <div className="flex items-center gap-3">
                               <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-500">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span className="text-xs">Comment</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-500">
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  <span className="text-xs">Export PDF</span>
                                </Button>
                            </div>
                         </CardFooter>
                      </Card>
                   </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                 <CardTitle className="text-sm flex items-center gap-2">
                    <Sun className="w-4 h-4 text-orange-500" />
                    Site Condition - Site A
                 </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 italic">Temperature</span>
                    <span className="font-bold text-slate-900">32°C</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 italic">Humidity</span>
                    <span className="font-bold text-slate-900">45%</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 italic">Workability</span>
                    <Badge className="bg-green-100 text-green-700">OPTIMAL</Badge>
                 </div>
              </CardContent>
           </Card>

           <Card className="border-slate-200 shadow-sm border-l-4 border-l-blue-600">
              <CardHeader className="pb-2">
                 <CardTitle className="text-sm">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2">
                 <Button variant="ghost" className="w-full justify-between text-xs h-9 text-slate-600">
                    Monthly Compilation
                    <ChevronRight className="w-3 h-3" />
                 </Button>
                 {/*
                 <Button variant="ghost" className="w-full justify-between text-xs h-9 text-slate-600">
                    Photo Archive
                    <ChevronRight className="w-3 h-3" />
                 </Button>
                 */}
                 <Button variant="ghost" className="w-full justify-between text-xs h-9 text-slate-600">
                    Material Log Sync
                    <ChevronRight className="w-3 h-3" />
                 </Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

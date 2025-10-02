import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Pin, 
  Clock, 
  SkipForward, 
  AlertCircle, 
  TrendingDown, 
  BarChart3, 
  UserPlus,
  Cake,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  MessageCircle,
  PlusCircle,
  CheckCircle,
  User,
  Users,
  ArrowUpRight,
  ChevronDown,
  Info,
  RefreshCw
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { generatePriorityQueue, getPriorityLevelInfo, QueueItem } from '@/utils/contactQueueAlgorithm';
import { AlumniHeader } from '@/components/AlumniHeader';
import InlineNoteForm from '@/components/InlineNoteForm';
import QueueAlumniDetail from '@/pages/QueueAlumniDetail';
import { InteractionCard } from '@/components/InteractionCard';
import { apiRequest } from '@/lib/queryClient';

type SortOption = 'smart-priority' | 'cohort-name' | 'name' | 'last-contact' | 'support-needs' | 'track-status';

export function ContactQueue() {
  const [selectedAlumniId, setSelectedAlumniId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'my-queue' | 'team' | 'waiting'>('my-queue');
  const [myQueueSize, setMyQueueSize] = useState<number>(5);
  // attemptedToday is now managed via React Query cache instead of local state
  const [sortBy, setSortBy] = useState<SortOption>('smart-priority');
  const queryClient = useQueryClient();

  // Force refresh function
  const forceRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/alumni'] });
    queryClient.removeQueries({ queryKey: ['/api/alumni'] });
  };

  // Fetch contact queue data - use regular alumni endpoint as fallback
  const { data: alumniData, isLoading, error } = useQuery({
    queryKey: ['/api/alumni'],
    staleTime: 60000, // 60 seconds - longer stale time for better performance
    select: (data) => {
      // Augment alumni data with empty follow-up data for queue compatibility
      if (!data || !Array.isArray(data)) return [];
      return data.map((alumni: any) => ({
        ...alumni,
        latestFollowUpPriority: null,
        latestFollowUpDate: null,
        previousTrackingStatus: null,
        lastTrackingStatusChange: null,
        attemptedToday: alumni.attemptedToday || false // Initialize attemptedToday field
      }));
    }
  });

  // Generate priority queue from alumni data
  const basePriorityQueue: QueueItem[] = alumniData && Array.isArray(alumniData) ? generatePriorityQueue(alumniData) : [];
  
  // Apply sorting based on selected option
  const priorityQueue = [...basePriorityQueue].sort((a, b) => {
    switch (sortBy) {
      case 'smart-priority':
        return a.priority - b.priority; // Default smart algorithm
      
      case 'cohort-name':
        const cohortA = a.alumni.cohortYear || 0;
        const cohortB = b.alumni.cohortYear || 0;
        if (cohortA !== cohortB) return cohortB - cohortA; // Newest cohorts first
        return `${a.alumni.firstName} ${a.alumni.lastName}`.localeCompare(`${b.alumni.firstName} ${b.alumni.lastName}`);
      
      case 'name':
        return `${a.alumni.firstName} ${a.alumni.lastName}`.localeCompare(`${b.alumni.firstName} ${b.alumni.lastName}`);
      
      case 'last-contact':
        // Oldest contact first (higher daysSinceLastContact = older contact)
        if (a.daysSinceLastContact !== b.daysSinceLastContact) {
          return b.daysSinceLastContact - a.daysSinceLastContact;
        }
        return `${a.alumni.firstName} ${a.alumni.lastName}`.localeCompare(`${b.alumni.firstName} ${b.alumni.lastName}`);
      
      case 'support-needs':
        // Sort by supportCategory if available, then by name
        const categoryA = a.alumni.supportCategory || 'zzz'; // Put undefined at end
        const categoryB = b.alumni.supportCategory || 'zzz';
        if (categoryA !== categoryB) return categoryA.localeCompare(categoryB);
        return `${a.alumni.firstName} ${a.alumni.lastName}`.localeCompare(`${b.alumni.firstName} ${b.alumni.lastName}`);
      
      case 'track-status':
        const trackOrder = { 'Off-track': 0, 'Near-track': 1, 'On-track': 2 };
        const trackA = trackOrder[a.alumni.trackingStatus as keyof typeof trackOrder] ?? 3;
        const trackB = trackOrder[b.alumni.trackingStatus as keyof typeof trackOrder] ?? 3;
        if (trackA !== trackB) return trackA - trackB;
        return `${a.alumni.firstName} ${a.alumni.lastName}`.localeCompare(`${b.alumni.firstName} ${b.alumni.lastName}`);
      
      default:
        return a.priority - b.priority;
    }
  });

  // Group queue items by priority level
  const queueByLevel = priorityQueue.reduce((groups, item) => {
    if (!groups[item.priorityLevel]) {
      groups[item.priorityLevel] = [];
    }
    groups[item.priorityLevel].push(item);
    return groups;
  }, {} as Record<string, QueueItem[]>);

  // Mutations for queue actions
  const pinMutation = useMutation({
    mutationFn: async ({ alumniId, pinned }: { alumniId: number; pinned: boolean }) => {
      return apiRequest('POST', '/api/contact-queue/pin', { alumniId, pinned });
    },
    onMutate: async ({ alumniId, pinned }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['/api/alumni'] });
      
      // Snapshot the previous value
      const previousAlumni = queryClient.getQueryData(['/api/alumni']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/alumni'], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((alumni: any) => 
          alumni.id === alumniId ? { ...alumni, pinned } : alumni
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousAlumni };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousAlumni) {
        queryClient.setQueryData(['/api/alumni'], context.previousAlumni);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['/api/alumni'] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ alumniId, snoozedUntil }: { alumniId: number; snoozedUntil: string }) => {
      return apiRequest('POST', '/api/contact-queue/snooze', { alumniId, snoozedUntil });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alumni'] });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async ({ alumniId }: { alumniId: number }) => {
      return apiRequest('POST', '/api/contact-queue/skip', { alumniId });
    },
    onMutate: async ({ alumniId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/alumni'] });
      
      // Snapshot the previous value
      const previousAlumni = queryClient.getQueryData(['/api/alumni']);
      
      // Optimistically remove from queue by setting skip date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      queryClient.setQueryData(['/api/alumni'], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((alumni: any) => 
          alumni.id === alumniId 
            ? { ...alumni, queueSkippedUntil: tomorrow.toISOString().split('T')[0] }
            : alumni
        );
      });
      
      return { previousAlumni };
    },
    onError: (err, variables, context) => {
      if (context?.previousAlumni) {
        queryClient.setQueryData(['/api/alumni'], context.previousAlumni);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alumni'] });
    },
  });

  // Auto-select first item in queue
  useEffect(() => {
    if (priorityQueue.length > 0 && !selectedAlumniId) {
      setSelectedAlumniId(priorityQueue[0].alumni.id);
    }
  }, [priorityQueue, selectedAlumniId]);

  const selectedQueueItem = priorityQueue.find(item => item.alumni.id === selectedAlumniId);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Error loading contact queue: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-100">
        {/* Main Container with Cards */}
        <div className="flex p-6 gap-6">
          {/* Left Mega-Card: Queue + Notes Interface */}
          <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col sticky top-6 self-start">
            {/* Unified Header for Left Mega-Card */}
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Contact Queue</h1>
                <div className="flex items-center gap-3">
                  {/* Refresh Button */}
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={forceRefresh}
                        className="text-sm border border-gray-300 rounded-lg p-2 bg-white hover:bg-gray-50 
                                   focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4 text-gray-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh queue</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Sort Info + Dropdown */}
                  <div className="flex items-center gap-2">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-emerald-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">Recommended: Smart Priority</p>
                          <p className="text-sm">Uses a 4-tier algorithm that prioritizes alumni based on:</p>
                          <ul className="text-xs space-y-0.5 ml-2">
                            <li>• Manual follow-ups (highest priority)</li>
                            <li>• Contact slips & failed attempts</li>
                            <li>• Tracking status changes</li>
                            <li>• First-time contacts</li>
                          </ul>
                          <p className="text-xs text-muted-foreground">This ensures the most urgent contacts are always at the top.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="text-sm border border-gray-300 rounded-lg pl-3 pr-8 py-2 bg-white
                                       focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500
                                       appearance-none min-w-[160px]"
                          >
                            <option value="smart-priority">Smart Priority</option>
                            <option value="cohort-name">Cohort, then Name</option>
                            <option value="last-contact">Last Contact (oldest first)</option>
                            <option value="name">Name</option>
                            <option value="support-needs">Support Category</option>
                            <option value="track-status">Track Status</option>
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sort order for contact queue</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {/* Queue Size Input */}
                  {activeTab === 'my-queue' && (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <input
                          type="number"
                          value={myQueueSize}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value) && value >= 1 && value <= 50) {
                              setMyQueueSize(value);
                            } else if (e.target.value === '') {
                              setMyQueueSize(5); // Reset to default if empty
                            }
                          }}
                          onBlur={(e) => {
                            // Ensure valid value on blur
                            const value = parseInt(e.target.value);
                            if (isNaN(value) || value < 1 || value > 50) {
                              setMyQueueSize(5);
                            }
                          }}
                          min="1"
                          max="50"
                          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white w-16
                                     focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500
                                     text-center"
                          placeholder="5"
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center" className="z-[9999]">
                        <p>Queue Size: Number of alumni to prioritize (1-50)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs spanning full width of mega-card */}
            <div className="px-6 pt-3 pb-2">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'my-queue' | 'team' | 'waiting')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                  <TabsTrigger 
                    value="my-queue" 
                    className={`text-sm font-medium hover:bg-gray-50 transition-colors ${
                      activeTab === 'my-queue' 
                        ? 'bg-white text-gray-900 shadow-sm border-b-2' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    style={activeTab === 'my-queue' ? { borderBottomColor: 'var(--csh-green-500)' } : {}}
                  >
                    My Queue
                  </TabsTrigger>
                  <TabsTrigger 
                    value="waiting" 
                    className={`text-sm font-medium hover:bg-gray-50 transition-colors ${
                      activeTab === 'waiting' 
                        ? 'bg-white text-gray-900 shadow-sm border-b-2' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    style={activeTab === 'waiting' ? { borderBottomColor: 'var(--csh-green-500)' } : {}}
                  >
                    Waiting
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Content Area: Two columns within the mega-card */}
            <div className="flex">
              {/* Left: Queue List */}
              <div className="w-2/5">
                <div className="px-6 pr-0 py-4 pb-8 space-y-3">
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({length: myQueueSize}).map((_, i) => (
                        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeTab === 'my-queue' ? (
                        priorityQueue.slice(0, myQueueSize).map((item) => (
                          <QueueItemCard
                            key={item.alumni.id}
                            item={item}
                            isSelected={selectedAlumniId === item.alumni.id}
                            isAttempted={item.alumni.attemptedToday}
                            onClick={() => setSelectedAlumniId(item.alumni.id)}
                            onPin={(pinned) => pinMutation.mutate({ alumniId: item.alumni.id, pinned })}
                            onSnooze={(days) => {
                              const snoozeDate = new Date();
                              snoozeDate.setDate(snoozeDate.getDate() + days);
                              snoozeMutation.mutate({ 
                                alumniId: item.alumni.id, 
                                snoozedUntil: snoozeDate.toISOString() 
                              });
                            }}
                          />
                        ))
                      ) : (
                        priorityQueue.slice(myQueueSize).map((item) => (
                          <QueueItemCard
                            key={item.alumni.id}
                            item={item}
                            isSelected={selectedAlumniId === item.alumni.id}
                            isAttempted={item.alumni.attemptedToday}
                            onClick={() => setSelectedAlumniId(item.alumni.id)}
                            onPin={(pinned) => pinMutation.mutate({ alumniId: item.alumni.id, pinned })}
                            onSnooze={(days) => {
                              const snoozeDate = new Date();
                              snoozeDate.setDate(snoozeDate.getDate() + days);
                              snoozeMutation.mutate({ 
                                alumniId: item.alumni.id, 
                                snoozedUntil: snoozeDate.toISOString() 
                              });
                            }}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Notes Interface */}
              <div className="w-3/5">
                {selectedQueueItem ? (
                  <div className="flex flex-col">
                    {/* Notes Section */}
                    <div className="flex flex-col">
                      {/* Add new note form */}
                      <div className="pt-4 pr-6 pb-4 pl-2">
                        <InlineNoteForm
                          alumni={selectedQueueItem.alumni}
                          onCancel={null}
                          onChangeDetected={() => {}}
                          hideHeader={true}
                          hideTimestamp={true}
                          onSaveSuccess={() => {
                            // Mark this alumni as attempted today via optimistic update
                            queryClient.setQueryData(['/api/alumni'], (old: any) => {
                              if (!old || !Array.isArray(old)) return old;
                              return old.map((alumni: any) => 
                                alumni.id === selectedQueueItem.alumni.id 
                                  ? { ...alumni, attemptedToday: true }
                                  : alumni
                              );
                            });
                          }}
                        />
                      </div>

                      {/* Jump to Notes Section */}
                      <div className="pl-2 pr-6 pt-1 pb-8">
                        <button
                          onClick={() => {
                            // Scroll to notes section in right panel
                            const notesSection = document.querySelector('#notes');
                            if (notesSection) {
                              notesSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="w-full flex items-center justify-center space-x-2 py-4 px-4 rounded-xl transition-colors text-sm font-medium"
                          style={{
                            background: 'rgba(63, 184, 113, 0.08)',
                            borderColor: 'rgba(63, 184, 113, 0.2)',
                            color: 'rgba(63, 184, 113, 0.8)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(63, 184, 113, 0.12)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(63, 184, 113, 0.08)';
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>View Recent Notes</span>
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center p-8">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
                        <MessageCircle className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-2 text-gray-700">Ready to Connect</h3>
                      <p className="text-sm text-gray-500">Select an alumni from the queue to start adding notes</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Card: Alumni Detail */}
          <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto">
            {selectedAlumniId ? (
              <div className="min-h-full">
                <QueueAlumniDetail key={selectedAlumniId} alumniId={selectedAlumniId.toString()} embedded={true} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center p-8">
                  <div className="w-16 h-16 mx-auto mb-6 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Users className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">Select Alumni</h3>
                  <p className="text-gray-600">Choose an alumni from the queue to view their details and start a conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Notes list component for queue panel
interface NotesListForQueueProps {
  alumniId: number;
  onNoteClick: (noteId: number) => void;
}

function NotesListForQueue({ alumniId, onNoteClick }: NotesListForQueueProps) {
  // Temporarily disabled to prevent 429 rate limit errors
  const interactions: any[] = [];
  const isLoading = false;
  const error = null;

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading notes...</div>;
  }

  if (!interactions || !Array.isArray(interactions) || interactions.length === 0) {
    return <div className="text-sm text-gray-500">No recent notes</div>;
  }

  return (
    <div className="space-y-4 pt-2">
      {interactions.slice(0, 5).map((interaction: any) => (
        <div 
          key={interaction.id}
          className="group relative cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
          onClick={() => onNoteClick(interaction.id)}
        >
          {/* Custom InteractionCard without edit/delete buttons */}
          <div className="p-4 border border-gray-200 rounded-lg bg-white">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                {/* Type badge with icon */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                  interaction.type?.toLowerCase() === 'phone' || interaction.type?.toLowerCase() === 'call' ? 'bg-green-500' :
                  interaction.type?.toLowerCase() === 'email' ? 'bg-blue-500' :
                  interaction.type?.toLowerCase() === 'text' ? 'bg-indigo-500' :
                  interaction.type?.toLowerCase() === 'in-person' ? 'bg-purple-500' :
                  interaction.type?.toLowerCase() === 'meeting' ? 'bg-purple-500' :
                  interaction.type?.toLowerCase() === 'company' || interaction.type?.toLowerCase() === 'company note' ? 'bg-blue-600' :
                  interaction.type?.toLowerCase() === 'progress' || interaction.type?.toLowerCase() === 'progress note' ? 'bg-orange-500' :
                  interaction.type?.toLowerCase() === 'parent log' ? 'bg-pink-500' :
                  'bg-slate-500'
                }`}>
                  {(interaction.type?.toLowerCase() === 'phone' || interaction.type?.toLowerCase() === 'call') && <Phone className="h-4 w-4 text-white" />}
                  {interaction.type?.toLowerCase() === 'email' && <Mail className="h-4 w-4 text-white" />}
                  {interaction.type?.toLowerCase() === 'text' && <MessageSquare className="h-4 w-4 text-white" />}
                  {interaction.type?.toLowerCase() === 'in-person' && <User className="h-4 w-4 text-white" />}
                  {!['phone', 'call', 'email', 'text', 'in-person'].includes(interaction.type?.toLowerCase()) && <MessageCircle className="h-4 w-4 text-white" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs text-gray-500">
                      {(() => {
                        // Fix timezone issue for YYYY-MM-DD format
                        const dateStr = interaction.date || interaction.createdAt;
                        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                          const [year, month, day] = dateStr.split('-').map(Number);
                          const localDate = new Date(year, month - 1, day);
                          return localDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                        }
                        
                        // For other formats, use original parsing
                        return new Date(dateStr).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      })()}
                    </span>
                    {interaction.createdAt && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {new Date(interaction.createdAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {interaction.internalSummary || interaction.overview || 'No content'}
                  </p>
                </div>
              </div>
              
              {/* Hover arrow */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                <div className="bg-gray-600 text-white p-1.5 rounded-full shadow-sm">
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Queue item card component
interface QueueItemCardProps {
  item: QueueItem;
  isSelected: boolean;
  isAttempted: boolean;
  onClick: () => void;
  onPin: (pinned: boolean) => void;
  onSnooze: (days: number) => void;
}

function QueueItemCard({ item, isSelected, isAttempted, onClick, onPin, onSnooze }: QueueItemCardProps) {
  const levelInfo = getPriorityLevelInfo(item.priorityLevel);
  
  // Apply TimelineCard styling to match AlumniDetail "Present" tab aesthetic
  const cardClasses = isSelected 
    ? 'bg-white shadow-sm border border-gray-100' 
    : isAttempted 
    ? 'bg-gray-50 border border-gray-200 opacity-75'
    : 'bg-white border border-gray-100 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm';
  
  const selectedStyle = isSelected ? {
    background: 'linear-gradient(90deg, rgba(63, 184, 113, 0.08), rgba(63, 184, 113, 0.04))'
  } : {};

  return (
    <div 
      className={`group px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${cardClasses}`}
      style={selectedStyle}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        {/* Avatar (left side, spans both lines) */}
        <div 
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
            isSelected ? '' : 'bg-gray-400'
          }`}
          style={isSelected ? { backgroundColor: 'var(--csh-green-500)' } : {}}
        >
          {item.alumni.firstName[0]}{item.alumni.lastName[0]}
        </div>

        {/* Two-line content (name + priority pill) */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Name with status icons */}
          <div className="flex items-center space-x-2">
            {item.alumni.pinned && (
              <Pin className="h-3 w-3 text-red-500 flex-shrink-0" />
            )}
            {isAttempted && (
              <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
            )}
            <h3 className={`font-semibold text-sm leading-tight ${
              isAttempted 
                ? 'text-gray-500 line-through' 
                : 'text-gray-900'
            }`}>
              {item.alumni.firstName} {item.alumni.lastName}
            </h3>
          </div>

          {/* Line 2: Priority Badge */}
          <div className="mt-1">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${levelInfo.bgColor} ${levelInfo.textColor} cursor-help`}>
                  {levelInfo.icon === 'Cake' && <Cake className="h-2.5 w-2.5" />}
                  {levelInfo.icon === 'AlertCircle' && <AlertCircle className="h-2.5 w-2.5" />}
                  {levelInfo.icon === 'TrendingDown' && <TrendingDown className="h-2.5 w-2.5" />}
                  {levelInfo.icon === 'BarChart3' && <BarChart3 className="h-2.5 w-2.5" />}
                  {levelInfo.icon === 'UserPlus' && <UserPlus className="h-2.5 w-2.5" />}
                  <span>{levelInfo.label}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                <div className="text-left">
                  <p className="font-medium">{levelInfo.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.daysSinceLastContact >= 999 ? 'No contact history' : `${item.daysSinceLastContact} days since last contact`}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Action buttons (right side, stacked vertically on hover) */}
        <div className="flex flex-col space-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`p-1 rounded transition-colors ${
                  item.alumni.pinned 
                    ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(!item.alumni.pinned);
                }}
              >
                <Pin className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{item.alumni.pinned ? 'Unpin' : 'Pin'}</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Clock className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onSnooze(1)}>
                <Clock className="h-4 w-4 mr-2" />
                Snooze 1 day
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(3)}>
                <Clock className="h-4 w-4 mr-2" />
                Snooze 3 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(5)}>
                <Clock className="h-4 w-4 mr-2" />
                Snooze 5 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(10)}>
                <Clock className="h-4 w-4 mr-2" />
                Snooze 10 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(30)}>
                <Clock className="h-4 w-4 mr-2" />
                Snooze 30 days
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday } from "date-fns";

interface CalendarEvent {
  id: number;
  title: string;
  date: Date;
  time: string;
  type: 'session' | 'exam' | 'homework';
  studentName?: string;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Demo events data for calendar preview
  const sampleEvents: CalendarEvent[] = [
    { id: 1, title: "SAT Tutoring", date: new Date(2025, 5, 30), time: "2:00 PM", type: "session", studentName: "Emma Smither" },
    { id: 2, title: "GRE Tutoring", date: new Date(2025, 5, 30), time: "4:00 PM", type: "session", studentName: "Anna Nelson" },
    { id: 3, title: "Math Homework Due", date: new Date(2025, 6, 2), time: "All Day", type: "homework", studentName: "Lisa Hercot" },
    { id: 4, title: "SAT Practice Test", date: new Date(2025, 6, 5), time: "9:00 AM", type: "exam", studentName: "Emma Smither" },
    { id: 5, title: "ACT Tutoring", date: new Date(2025, 6, 7), time: "3:00 PM", type: "session", studentName: "Côme De Sayve" },
    { id: 6, title: "GRE Official Test", date: new Date(2025, 6, 10), time: "8:00 AM", type: "exam", studentName: "Anna Nelson" },
    { id: 7, title: "Weekly Review", date: new Date(2025, 6, 12), time: "1:00 PM", type: "session", studentName: "Faina Ibragimova" },
    { id: 8, title: "Essay Review Due", date: new Date(2025, 6, 15), time: "End of Day", type: "homework", studentName: "Angelina Rosi" },
  ];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Add days from previous month to fill the first week
  const startDay = getDay(monthStart);
  const calendarDays = [];
  
  // Add empty cells for days before month start
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  
  // Add all days of the month
  calendarDays.push(...daysInMonth);

  const getEventsForDay = (date: Date) => {
    return sampleEvents.filter(event => isSameDay(event.date, date));
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'session': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'exam': return 'bg-red-100 text-red-800 border-red-200';
      case 'homework': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Calendar" />
      <div className="container mx-auto p-4">
        
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={previousMonth}
              className="p-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold text-slate-900">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={nextMonth}
              className="p-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Event</span>
          </Button>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-0">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-4 text-center font-medium text-slate-600 bg-slate-50 border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const isCurrentDay = day ? isToday(day) : false;
                
                return (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 border-r border-b last:border-r-0 ${
                      day ? 'bg-white hover:bg-slate-50' : 'bg-slate-50'
                    }`}
                  >
                    {day && (
                      <>
                        {/* Day Number */}
                        <div className={`text-sm font-medium mb-1 ${
                          isCurrentDay 
                            ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' 
                            : 'text-slate-900'
                        }`}>
                          {format(day, 'd')}
                        </div>
                        
                        {/* Events */}
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className={`text-xs p-1 rounded border ${getEventTypeColor(event.type)} cursor-pointer hover:shadow-sm transition-shadow`}
                            >
                              <div className="font-medium truncate">{event.time}</div>
                              <div className="truncate">{event.title}</div>
                              {event.studentName && (
                                <div className="truncate opacity-75">{event.studentName}</div>
                              )}
                            </div>
                          ))}
                          
                          {/* Show more indicator */}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-slate-500 font-medium">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-sm text-slate-600">Tutoring Sessions</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-sm text-slate-600">Exams</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-sm text-slate-600">Homework Due</span>
          </div>
        </div>
      </div>
    </div>
  );
}
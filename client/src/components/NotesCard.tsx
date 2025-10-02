import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Save, X, Calendar, Clock, User, Phone, Mail, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Note {
  id: string;
  date: Date;
  type: 'call' | 'email' | 'meeting' | 'text' | 'other';
  content: string;
  followUpDate?: Date;
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
}

interface NotesCardProps {
  alumniId: number;
  notes: Note[];
  onAddNote: (note: Omit<Note, 'id'>) => void;
  onUpdateNote: (id: string, note: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
}

export default function NotesCard({ alumniId, notes, onAddNote, onUpdateNote, onDeleteNote }: NotesCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState({
    type: 'call' as const,
    content: '',
    followUpDate: '',
    priority: 'medium' as const,
  });

  const handleAddNote = () => {
    if (!newNote.content.trim()) return;
    
    onAddNote({
      date: new Date(),
      type: newNote.type,
      content: newNote.content,
      followUpDate: newNote.followUpDate ? new Date(newNote.followUpDate) : undefined,
      priority: newNote.priority,
      createdBy: 'Current User', // Replace with actual user name
    });
    
    setNewNote({ type: 'call', content: '', followUpDate: '', priority: 'medium' });
    setIsAdding(false);
  };

  const handleSaveEdit = (id: string, content: string) => {
    onUpdateNote(id, { content });
    setEditingId(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <User className="h-4 w-4" />;
      case 'text': return <MessageSquare className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      case 'text': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-green-600" />
            <span>Interaction Notes</span>
          </CardTitle>
          <Button 
            size="sm" 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Note Form */}
        {isAdding && (
          <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Type</label>
                <Select value={newNote.type} onValueChange={(value: any) => setNewNote({...newNote, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">In-Person Meeting</SelectItem>
                    <SelectItem value="text">Text Message</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Priority</label>
                <Select value={newNote.priority} onValueChange={(value: any) => setNewNote({...newNote, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Note Content</label>
              <Textarea 
                value={newNote.content}
                onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                placeholder="Add your interaction notes here..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Follow-up Date (Optional)</label>
              <Input 
                type="date"
                value={newNote.followUpDate}
                onChange={(e) => setNewNote({...newNote, followUpDate: e.target.value})}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddNote} className="bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" />
                Save Note
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-3">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p>No interaction notes yet</p>
              <p className="text-sm">Click "Add Note" to record your first interaction</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="p-4 border rounded-lg bg-white">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge className={getTypeColor(note.type)}>
                      {getTypeIcon(note.type)}
                      <span className="ml-1 capitalize">{note.type}</span>
                    </Badge>
                    <Badge className={getPriorityColor(note.priority)}>
                      {note.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <span>{format(note.date, 'MMM d, yyyy')}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(note.id)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Textarea 
                      defaultValue={note.content}
                      id={`edit-${note.id}`}
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          const textarea = document.getElementById(`edit-${note.id}`) as HTMLTextAreaElement;
                          handleSaveEdit(note.id, textarea.value);
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-slate-700">{note.content}</p>
                    {note.followUpDate && (
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span>Follow-up: {format(note.followUpDate, 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    <div className="text-xs text-slate-400">
                      Added by {note.createdBy}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Scholarship {
  amount: number;
  provider: string;
  notes: string;
  renewalRequired?: 'yes' | 'no' | 'na';
}

interface InlineScholarshipManagerProps {
  scholarships: Scholarship[];
  onUpdate: (scholarships: Scholarship[]) => void;
  disabled?: boolean;
}

export function InlineScholarshipManager({ 
  scholarships = [], 
  onUpdate, 
  disabled = false 
}: InlineScholarshipManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newScholarship, setNewScholarship] = useState<{ amount: string; provider: string; notes: string; renewalRequired: string } | null>(null);
  const { toast } = useToast();

  const total = scholarships.reduce((sum, scholarship) => sum + (scholarship.amount || 0), 0);

  const handleAddScholarship = () => {
    setNewScholarship({ amount: '', provider: '', notes: '', renewalRequired: 'na' });
  };

  const handleSaveNewScholarship = () => {
    if (!newScholarship) return;
    
    const amount = parseFloat(newScholarship.amount) || 0;
    const provider = newScholarship.provider.trim();
    const notes = newScholarship.notes.trim();
    const renewalRequired = (newScholarship.renewalRequired as 'yes' | 'no' | 'na') || 'na';
    
    if (amount <= 0 || !provider) {
      toast({
        title: "Invalid scholarship",
        description: "Please enter a valid amount and provider",
        variant: "destructive"
      });
      return;
    }

    const updatedScholarships = [...scholarships, { amount, provider, notes, renewalRequired }];
    onUpdate(updatedScholarships);
    setNewScholarship(null);
    
    toast({
      title: "Scholarship added",
      description: `Added $${amount.toLocaleString()} from ${provider}`
    });
  };

  const handleCancelNewScholarship = () => {
    setNewScholarship(null);
  };

  const handleUpdateScholarship = (index: number, field: 'amount' | 'provider' | 'notes' | 'renewalRequired', value: string) => {
    const updatedScholarships = [...scholarships];
    if (field === 'amount') {
      updatedScholarships[index].amount = parseFloat(value) || 0;
    } else if (field === 'provider') {
      updatedScholarships[index].provider = value;
    } else if (field === 'notes') {
      updatedScholarships[index].notes = value;
    } else if (field === 'renewalRequired') {
      updatedScholarships[index].renewalRequired = value as 'yes' | 'no' | 'na';
    }
    onUpdate(updatedScholarships);
  };

  const handleSaveEditingScholarship = () => {
    setEditingIndex(null);
    toast({
      title: "Scholarship updated",
      description: "Changes saved successfully"
    });
  };

  const handleRemoveScholarship = (index: number) => {
    const removedAmount = scholarships[index].amount;
    const updatedScholarships = scholarships.filter((_, i) => i !== index);
    onUpdate(updatedScholarships);
    
    toast({
      title: "Scholarship removed",
      description: `Removed $${removedAmount.toLocaleString()} scholarship`
    });
  };

  if (scholarships.length === 0 && !newScholarship) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 pl-2">Scholarships:</span>
          {!disabled && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAddScholarship}
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Scholarships:</span>
        {!disabled && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddScholarship}
            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>
      
      <div className="ml-0 space-y-2">
        {scholarships.map((scholarship, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3 group">
            {editingIndex === index ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Amount:</label>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-1">$</span>
                    <Input
                      type="number"
                      value={scholarship.amount}
                      onChange={(e) => handleUpdateScholarship(index, 'amount', e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Provider:</label>
                  <Input
                    value={scholarship.provider}
                    onChange={(e) => handleUpdateScholarship(index, 'provider', e.target.value)}
                    className="w-full h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="text-xs text-gray-600 cursor-help">Renewal Required:</label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Whether this scholarship requires annual renewal applications (FAFSA, merit renewals, etc.)</p>
                    </TooltipContent>
                  </Tooltip>
                  <Select
                    value={scholarship.renewalRequired || 'na'}
                    onValueChange={(value) => handleUpdateScholarship(index, 'renewalRequired', value)}
                  >
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes - Required</SelectItem>
                      <SelectItem value="no">No - Not Required</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Notes:</label>
                  <Input
                    value={scholarship.notes}
                    onChange={(e) => handleUpdateScholarship(index, 'notes', e.target.value)}
                    className="w-full h-8 text-sm"
                  />
                </div>
                <div className="flex items-center justify-end space-x-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleSaveEditingScholarship}
                    className="h-8 px-3 text-sm"
                  >
                    Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingIndex(null)}
                    className="h-8 px-3 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500 w-16">Amount:</label>
                    <div className="font-medium">${scholarship.amount.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-500 w-16">Provider:</label>
                    <div className="font-medium">{scholarship.provider || 'Not specified'}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label className="text-xs text-gray-500 w-16 cursor-help">Renewal:</label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Whether this scholarship requires annual renewal applications (FAFSA, merit renewals, etc.)</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="text-xs px-2 py-1 rounded-full font-medium">
                      {scholarship.renewalRequired === 'yes' ? (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Required</span>
                      ) : scholarship.renewalRequired === 'no' ? (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Not Required</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">N/A</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <label className="text-xs text-gray-500 w-16 mt-0.5">Notes:</label>
                    <div className="text-gray-700">{scholarship.notes || 'No notes'}</div>
                  </div>
                </div>
                
                {!disabled && (
                  <div className="flex items-center justify-end space-x-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingIndex(index)}
                      className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveScholarship(index)}
                      className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        
        {newScholarship && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Amount:</label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-1">$</span>
                  <Input
                    type="number"
                    placeholder="5000"
                    value={newScholarship.amount}
                    onChange={(e) => setNewScholarship(prev => prev ? { ...prev, amount: e.target.value } : null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNewScholarship();
                      if (e.key === 'Escape') handleCancelNewScholarship();
                    }}
                    className="flex-1 h-8 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Provider:</label>
                <Input
                  placeholder="Pell Grant, Merit Award, etc."
                  value={newScholarship.provider}
                  onChange={(e) => setNewScholarship(prev => prev ? { ...prev, provider: e.target.value } : null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewScholarship();
                    if (e.key === 'Escape') handleCancelNewScholarship();
                  }}
                  className="w-full h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="text-xs text-gray-600 cursor-help">Renewal Required:</label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Whether this scholarship requires annual renewal applications (FAFSA, merit renewals, etc.)</p>
                  </TooltipContent>
                </Tooltip>
                <Select
                  value={newScholarship.renewalRequired}
                  onValueChange={(value) => setNewScholarship(prev => prev ? { ...prev, renewalRequired: value } : null)}
                >
                  <SelectTrigger className="w-full h-8 text-sm">
                    <SelectValue placeholder="Select renewal status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes - Required</SelectItem>
                    <SelectItem value="no">No - Not Required</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Notes:</label>
                <Input
                  placeholder="Optional details"
                  value={newScholarship.notes}
                  onChange={(e) => setNewScholarship(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewScholarship();
                    if (e.key === 'Escape') handleCancelNewScholarship();
                  }}
                  className="w-full h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 mt-3">
              <Button
                size="sm"
                onClick={handleSaveNewScholarship}
                className="h-8 px-3 text-sm"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelNewScholarship}
                className="h-8 px-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        {(scholarships.length > 0 || newScholarship) && (
          <div className="border-t pt-1 mt-2">
            <span className="text-sm font-medium text-gray-700">
              Total: ${total.toLocaleString()}
            </span>
          </div>
        )}
        </div>
      </div>
    </TooltipProvider>
  );
}
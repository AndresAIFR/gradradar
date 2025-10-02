import React, { useState } from 'react';
import { Search, Download, Upload, Plus, Filter, ChevronDown, GraduationCap, AlertTriangle, Calendar, Building2, BookOpen, Grid3x3, List, SlidersHorizontal, User, ChevronLeft, Eye, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import type { Alumni } from '@shared/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AlumniListDemo = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch real alumni data
  const { data: alumni = [], isLoading } = useQuery<Alumni[]>({
    queryKey: ['/api/alumni'],
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'from-emerald-400 to-teal-400',
      'from-sky-400 to-blue-400',
      'from-violet-400 to-purple-400',
      'from-amber-400 to-orange-400',
      'from-rose-400 to-pink-400',
      'from-indigo-400 to-blue-500',
      'from-teal-400 to-cyan-400',
      'from-purple-400 to-pink-400'
    ];
    return colors[index % colors.length];
  };

  const needsAction = (alumnus: Alumni) => {
    return alumnus.trackingStatus === 'off-track' || 
           alumnus.needsFollowUp || 
           alumnus.flaggedForOutreach ||
           !alumnus.lastContactDate;
  };

  const filteredAlumni = alumni.filter(alumnus =>
    `${alumnus.firstName} ${alumnus.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (alumnus.collegeAttending?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (alumnus.collegeMajor?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Export functions
  const exportToCSV = () => {
    setIsExporting(true);
    
    const headers = [
      'Name',
      'Cohort Year',
      'College Attending',
      'Major',
      'Tracking Status',
      'Currently Enrolled',
      'Employed',
      'Employer Name',
      'Job Title',
      'Annual Salary',
      'Last Contact Date',
      'Email',
      'Phone'
    ];

    const csvData = filteredAlumni.map(alum => [
      `${alum.firstName} ${alum.lastName}`,
      alum.cohortYear,
      alum.collegeAttending || '',
      alum.collegeMajor || '',
      alum.trackingStatus || '',
      alum.currentlyEnrolled ? 'Yes' : 'No',
      alum.employed ? 'Yes' : 'No',
      alum.employerName || '',
      '', // job title not in schema
      alum.latestAnnualIncome || '',
      alum.lastContactDate || '',
      alum.personalEmail || alum.compSciHighEmail || '',
      alum.phone || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alumni-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsExporting(false);
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    
    try {
      // Create a simple HTML table for PDF export
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Alumni Export</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #059669; margin-bottom: 20px; }
            .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f8f9fa; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8f9fa; }
            .status-on-track { color: #059669; font-weight: bold; }
            .status-off-track { color: #dc2626; font-weight: bold; }
            .status-near-track { color: #d97706; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Alumni Export Report</h1>
          <div class="meta">
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Alumni:</strong> ${filteredAlumni.length}</p>
            <p><strong>Search Term:</strong> ${searchTerm || 'None'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Cohort</th>
                <th>College</th>
                <th>Major</th>
                <th>Status</th>
                <th>Employed</th>
                <th>Employer</th>
                <th>Salary</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAlumni.map(alum => `
                <tr>
                  <td>${alum.firstName} ${alum.lastName}</td>
                  <td>${alum.cohortYear}</td>
                  <td>${alum.collegeAttending || '-'}</td>
                  <td>${alum.collegeMajor || '-'}</td>
                  <td class="status-${alum.trackingStatus}">${alum.trackingStatus || '-'}</td>
                  <td>${alum.employed ? 'Yes' : 'No'}</td>
                  <td>${alum.employerName || '-'}</td>
                  <td>${alum.latestAnnualIncome ? `$${alum.latestAnnualIncome}` : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `alumni-export-${new Date().toISOString().split('T')[0]}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const AlumniCard = ({ alum, index }: { alum: Alumni; index: number }) => (
    <Link href={`/alumni/${alum.id}`}>
      <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-gray-200 cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(index)} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
              <span className="text-white font-bold text-lg">
                {getInitials(alum.firstName, alum.lastName)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg group-hover:text-gray-800">
                {alum.firstName} {alum.lastName}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{alum.cohortYear}</p>
            </div>
          </div>
          {needsAction(alum) && (
            <div className="bg-amber-50 p-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {alum.collegeAttending && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="truncate">{alum.collegeAttending}</span>
            </div>
          )}
          {alum.collegeMajor && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <span>{alum.collegeMajor}</span>
            </div>
          )}
          {alum.employerName && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              <span className="truncate">{alum.employerName}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  const AlumniListItem = ({ alum, index }: { alum: Alumni; index: number }) => (
    <Link href={`/alumni/${alum.id}`}>
      <div className="group bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200 cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(index)} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300`}>
              <span className="text-white font-bold">
                {getInitials(alum.firstName, alum.lastName)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-gray-800">
                  {alum.firstName} {alum.lastName}
                </h3>
                <span className="text-sm text-gray-500">{alum.cohortYear}</span>
                {alum.collegeAttending && (
                  <span className="text-sm text-gray-600">{alum.collegeAttending}</span>
                )}
                {alum.collegeMajor && (
                  <span className="text-sm text-gray-500">• {alum.collegeMajor}</span>
                )}
              </div>
            </div>
          </div>
          {needsAction(alum) && (
            <div className="bg-amber-50 p-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  const FilterButton = ({ label, icon: Icon, active = false }: { label: string; icon?: any; active?: boolean }) => (
    <button className={`px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all ${
      active 
        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/30' 
        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
    }`}>
      {Icon && <Icon className="w-4 h-4" />}
      <span>{label}</span>
      <ChevronDown className="w-4 h-4 ml-1" />
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading alumni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Demo Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/alumni">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group">
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Alumni</span>
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-semibold">DEMO - Visualization Only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold">GradRadar</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl flex items-center gap-2 transition-all">
                <Upload className="w-4 h-4" />
                <span className="font-medium">Import/Export</span>
              </button>
              <button className="px-4 py-2.5 bg-white hover:bg-gray-50 text-emerald-600 rounded-xl flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-4 h-4" />
                <span>Add Alumni</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search alumni by name, college, major, employer, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 outline-none transition-all text-gray-700 placeholder:text-gray-400"
          />
        </div>

        {/* Filters and View Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FilterButton label="Cohort" />
            <FilterButton label="Contact" />
            <FilterButton label="Track" />
            
            <button className="px-4 py-2.5 bg-white text-gray-700 hover:bg-gray-50 rounded-xl flex items-center gap-2 font-medium border border-gray-200 transition-all">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 bg-white text-gray-700 hover:bg-gray-50 rounded-xl flex items-center gap-2 font-medium border border-gray-200 transition-all">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Last Name A→Z</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-2 font-medium transition-all shadow-sm disabled:opacity-50"
                  disabled={isExporting || filteredAlumni.length === 0}
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Export as CSV
                  <span className="ml-auto text-xs text-gray-500">Data file</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Export as HTML
                  <span className="ml-auto text-xs text-gray-500">Report</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex bg-white rounded-xl border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 font-medium">
              <span className="text-2xl font-bold text-gray-900">{filteredAlumni.length}</span> alumni
              {searchTerm && (
                <span className="text-sm text-gray-500 ml-2">
                  matching "{searchTerm}"
                </span>
              )}
            </p>
            {filteredAlumni.length > 0 && (
              <p className="text-sm text-gray-500">
                Ready to export {filteredAlumni.length} record{filteredAlumni.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Alumni Display */}
        <div className={`${viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4' 
          : 'space-y-3'
        }`}>
          {filteredAlumni.map((alum, index) => 
            viewMode === 'grid' ? (
              <AlumniCard key={alum.id} alum={alum} index={index} />
            ) : (
              <AlumniListItem key={alum.id} alum={alum} index={index} />
            )
          )}
        </div>

        {/* Empty State */}
        {filteredAlumni.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alumni found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlumniListDemo;
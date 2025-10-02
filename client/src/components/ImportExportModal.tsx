import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
// RadioGroup not available, using buttons instead
import { Upload, Download, FileText, AlertCircle, CheckCircle, Users, RefreshCw, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Alumni } from "@shared/schema";

interface ImportExportModalProps {
  alumni: any[];
  onImportSuccess: () => void;
}

export default function ImportExportModal({ alumni = [], onImportSuccess }: ImportExportModalProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStrategy, setImportStrategy] = useState<'skip' | 'update'>('skip');
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showUpdateWarning, setShowUpdateWarning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setImportFile(file);
    parseCSV(file);
  };

  // Robust CSV parser that handles quoted fields with commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current.trim());
    return result;
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setImportErrors(['CSV file must contain at least a header row and one data row']);
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '')).filter(h => h.length > 0);
      
      // Flexible header mapping - map various header formats to our field names (camelCase for schema validation)
      const headerMap: { [key: string]: string } = {
        // Basic info mappings - handle all variations
        'ContactId': 'contactId',
        'OSIS': 'contactId', // Alternative ID field
        'First Name': 'firstName',
        'Last Name': 'lastName',
        'Cohort Year': 'cohortYear',
        'DOB': 'dateOfBirth',
        'MobileNumber': 'phone',
        'Phone Number': 'phone',
        
        // Email variations
        'Email': 'compSciHighEmail',
        'EMAIL': 'compSciHighEmail',
        'Comp Sci High Email': 'compSciHighEmail',
        'Personal Email': 'personalEmail',
        'College Email': 'collegeEmail',
        'Preferred Email': 'preferredEmail',
        
        // Social Media
        'Instagram Handle': 'instagramHandle',
        'Twitter Handle': 'twitterHandle',
        'TikTok Handle': 'tiktokHandle',
        'LinkedIn Handle': 'linkedinHandle',
        
        // Academic & Personal
        'High School GPA': 'highSchoolGpa',
        'Household Size': 'householdSize',
        'Household Income': 'householdIncome',
        
        // College/Career mappings
        'Matriculation': 'matriculation',
        'College or Workforce': 'collegeOrWorkforce',
        'Major': 'collegeMajor',
        'College Minor': 'collegeMinor',
        'Degree Track': 'degreeTrack',
        'Intended Career Path': 'intendedCareerPath',
        'Currently Enrolled': 'currentlyEnrolled',
        'Enrollment Status': 'enrollmentStatus',
        'Expected Graduation Date': 'expectedGraduationDate',
        'Received Scholarships': 'receivedScholarships',
        'Scholarships Requiring Renewal': 'scholarshipsRequiringRenewal',
        'Enrolled in Opportunity Program': 'enrolledInOpportunityProgram',
        'Transfer Student Status': 'transferStudentStatus',
        'College GPA': 'collegeGpa',
        
        // Job Training Program
        'Training Program Name': 'trainingProgramName',
        'Training Program Type': 'trainingProgramType',
        'Training Program Location': 'trainingProgramLocation',
        'Training Program Pay': 'trainingProgramPay',
        'Training Start Date': 'trainingStartDate',
        'Training End Date': 'trainingEndDate',
        'Training Degree/Certification': 'trainingDegreeCertification',
        
        // Employment
        'On-course Economic Liberation': 'onCourseEconomicLiberation',
        'Employed': 'employed',
        'Employment Type': 'employmentType',
        'Employer Name': 'employerName',
        'Latest Annual Income': 'latestAnnualIncome',
        'Latest Income Date': 'latestIncomeDate',
        
        // Tracking Status variations
        'Track': 'trackingStatus',
        'Support Category': 'supportCategory',
        
        // Date variations for "Connected as of"
        'Connected as of 4/22/25': 'connectedAsOf',
        'Connected as of 4/30': 'connectedAsOf',
        'Connected as of 5/27': 'connectedAsOf',
        'Connected as of': 'connectedAsOf',
        
        // Engagement tracking
        'Notes': 'notes',
        'Attempted Outreach': 'attemptedOutreach',
        'Attempted Outreach ': 'attemptedOutreach', // Handle trailing space
        'Last Attempted Outreach': 'attemptedOutreach',
        'Circle Back': 'circleBack',
        'Circle back': 'circleBack',
        'Transcript Collected': 'transcriptCollected',
        'Transcript': 'transcriptCollected',
        'Needs Tutor': 'needsTutor',
        'Subject Support': 'subjectSupport',
        'Grouping': 'grouping',
        
        // Person-specific fields (accept but don't include in template)
        'Connected w/ Cynthia': 'connectedWithCynthia',
        'Meet 1:1 with Cynthia': 'meetWithCynthia',
        'Connected w/ Jay': 'connectedWithJay',
        'Meet 1:1 with Jay': 'meetWithJay',
        
        // Handle segment fields
        'Later Segment 3 (Email)': 'notes', // Map to notes field
      };

      // Map headers to our field names
      const mappedHeaders = headers.map(header => headerMap[header] || header.toLowerCase().replace(/\s+/g, ''));
      
      // Check for required fields (flexible mapping) - only require basic info
      const requiredFields = ['firstName', 'lastName', 'cohortYear'];
      const hasRequiredFields = requiredFields.every(field => 
        mappedHeaders.includes(field) || 
        headers.some(h => headerMap[h] === field)
      );

      if (!hasRequiredFields) {
        const missingFields = requiredFields.filter(field => 
          !mappedHeaders.includes(field) && 
          !headers.some(h => headerMap[h] === field)
        );
        setImportErrors([`Missing required columns. Looking for: First Name, Last Name, Cohort Year. Missing: ${missingFields.join(', ')}`]);
        return;
      }

      const data = lines.slice(1)
        .filter(line => {
          // Skip empty lines and lines that don't contain meaningful data
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === ','.repeat(headers.length - 1)) return false;
          
          // Parse the line using robust CSV parser
          const values = parseCSVLine(line).map(v => v.replace(/"/g, ''));
          const firstNameIndex = headers.findIndex(h => headerMap[h] === 'firstName');
          const lastNameIndex = headers.findIndex(h => headerMap[h] === 'lastName');
          
          // Skip if no first name or last name (these are likely summary rows)
          if (firstNameIndex >= 0 && lastNameIndex >= 0) {
            const firstName = values[firstNameIndex];
            const lastName = values[lastNameIndex];
            return firstName && lastName && firstName.trim() !== '' && lastName.trim() !== '';
          }
          
          return false;
        })
        .map((line, index) => {
          // Use robust CSV parser instead of simple split
          let values = parseCSVLine(line).map(v => v.replace(/"/g, ''));
          const row: any = {};
          
          // Validate column count matches header count and adjust if needed
          if (values.length !== headers.length) {
            
            // If there are extra empty columns at the end, trim them
            if (values.length > headers.length) {
              const extraColumns = values.slice(headers.length);
              if (extraColumns.every(col => col === '')) {
                values = values.slice(0, headers.length);
              }
            }
            // If there are missing columns, pad with empty strings
            while (values.length < headers.length) {
              values.push('');
            }
          }
          
          // Map values using flexible header mapping with data sanitization
          headers.forEach((header, i) => {
            const fieldName = headerMap[header] || header.toLowerCase().replace(/\s+/g, '');
            let value = values[i] || '';
            
            // Sanitize field values to prevent data contamination
            if (typeof value === 'string') {
              value = value.trim();
              // Remove any leading/trailing quotes that might remain
              if ((value.startsWith('"') && value.endsWith('"')) || 
                  (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
              }
            }
            
            row[fieldName] = value;
          });
          
          // Clean up phone numbers (remove extra spaces and formatting)
          if (row.phone) {
            row.phone = row.phone.replace(/\s+/g, ' ').trim();
          }
          
          // Validate required fields - make email optional since some rows might not have it
          const errors = [];
          if (!row.firstName) errors.push(`Row ${index + 2}: First name is required`);
          if (!row.lastName) errors.push(`Row ${index + 2}: Last name is required`);
          if (!row.cohortYear || isNaN(parseInt(row.cohortYear))) errors.push(`Row ${index + 2}: Valid cohort year is required`);
          
          // Convert specific fields
          if (row.cohortYear) row.cohortYear = parseInt(row.cohortYear);
          
          // Enhanced boolean conversion with better validation
          const convertToBoolean = (value: string): boolean => {
            if (!value || value === '') return false;
            const normalizedValue = value.toLowerCase().trim();
            return normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes' || normalizedValue === 'TRUE';
          };
          
          row.circleBack = convertToBoolean(row.circleBack);
          row.transcriptCollected = convertToBoolean(row.transcriptCollected);
          row.needsTutor = convertToBoolean(row.needsTutor);
          
          // Enhanced date parsing with validation
          const parseDate = (dateValue: string, fieldName?: string): string | null => {
            if (!dateValue || dateValue === '') return null;
            
            const normalizedValue = dateValue.toLowerCase().trim();
            
            // Handle "Yes" by extracting date from column header for connectedAsOf field
            if (normalizedValue === 'yes' && fieldName === 'connectedAsOf') {
              // Look for date in the original header that mapped to connectedAsOf
              const connectedAsOfHeader = headers.find(h => headerMap[h] === 'connectedAsOf');
              if (connectedAsOfHeader) {
                // Extract date from headers like "Connected as of 4/30", "Connected as of 4/22/25", etc.
                const dateMatch = connectedAsOfHeader.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
                if (dateMatch) {
                  let headerDate = dateMatch[1];
                  // If no year provided, assume current year
                  if (!headerDate.includes('/')) {
                    // This shouldn't happen based on regex, but safety check
                    headerDate = headerDate;
                  } else if (headerDate.split('/').length === 2) {
                    // Add current year if only month/day provided
                    headerDate = headerDate + '/2025';
                  }
                  // Parse the date from the header (avoid recursion by calling date parsing directly)
                  try {
                    const dateParts = headerDate.split('/');
                    if (dateParts.length >= 2) {
                      const month = parseInt(dateParts[0]);
                      const day = parseInt(dateParts[1]);
                      const year = dateParts.length === 3 ? parseInt(dateParts[2]) : 2025;
                      const date = new Date(year, month - 1, day);
                      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                        return date.toISOString().split('T')[0];
                      }
                    }
                  } catch (e) {
                    // Fall through to fallback
                  }
                }
              }
              // Fallback to current date if we can't parse header date
              return new Date().toISOString().split('T')[0];
            }
            
            // Handle "No" as null
            if (normalizedValue === 'no') {
              return null;
            }
            
            // Try to parse various date formats
            const dateFormats = [
              /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // MM/DD/YY or MM/DD/YYYY
              /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
            ];
            
            for (const format of dateFormats) {
              const match = dateValue.match(format);
              if (match) {
                try {
                  let year, month, day;
                  if (format === dateFormats[0]) { // MM/DD/YY or MM/DD/YYYY
                    month = parseInt(match[1]);
                    day = parseInt(match[2]);
                    year = parseInt(match[3]);
                    // Handle 2-digit years
                    if (year < 100) {
                      year += year < 50 ? 2000 : 1900;
                    }
                  } else { // YYYY-MM-DD
                    year = parseInt(match[1]);
                    month = parseInt(match[2]);
                    day = parseInt(match[3]);
                  }
                  
                  const date = new Date(year, month - 1, day);
                  if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                    return date.toISOString().split('T')[0];
                  }
                } catch (e) {
                  // Invalid date, continue to next format
                }
              }
            }
            
            // If no format matches and it's not empty, return null but log warning
            if (dateValue.trim() !== '') {
              
            }
            return null;
          };
          
          // Handle the "Connected as of" field with enhanced date parsing
          row.connectedAsOf = parseDate(row.connectedAsOf, 'connectedAsOf');
          
          // Handle attempted outreach date field
          if (row.attemptedOutreach) {
            row.attemptedOutreach = parseDate(row.attemptedOutreach, 'attemptedOutreach');
          }
          
          // Convert tracking status values to our expected format
          if (row.trackingStatus) {
            const normalizedStatus = row.trackingStatus.toLowerCase().trim();
            if (normalizedStatus === 'on track') {
              row.trackingStatus = 'on-track';
            } else if (normalizedStatus === 'off track') {
              row.trackingStatus = 'off-track';
            } else if (normalizedStatus === 'near course') {
              row.trackingStatus = 'near-track';
            } else if (normalizedStatus === 'unknown') {
              row.trackingStatus = 'unknown'; // Preserve unknown status
            } else if (normalizedStatus === '') {
              row.trackingStatus = 'on-track'; // Default to on-track for empty
            }
          } else {
            row.trackingStatus = 'on-track'; // Default value
          }
          
          // Convert support category values to standardized format
          if (row.supportCategory) {
            const normalizedSupport = row.supportCategory.toLowerCase().trim();
            if (normalizedSupport === 'low needs') {
              row.supportCategory = 'Low Needs';
            } else if (normalizedSupport === 'medium needs') {
              row.supportCategory = 'Medium Needs';
            } else if (normalizedSupport === 'high needs') {
              row.supportCategory = 'High Needs';
            }
          }
          
          // Set employment status based on College or Workforce field
          if (row.collegeOrWorkforce) {
            const workforceValue = row.collegeOrWorkforce.toLowerCase().trim();
            row.employed = workforceValue === 'workforce' || workforceValue === 'employed';
            row.currentlyEnrolled = workforceValue === 'college';
            row.enrollmentStatus = workforceValue === 'college' ? 'enrolled' : 'not-enrolled';
          }
          
          row.errors = errors;
          return row;
        });

      // Check for duplicates with existing alumni
      const duplicates = data.filter(row => 
        row.contactId && alumni.some(existing => existing.contactId === row.contactId)
      );
      
      setDuplicateCount(duplicates.length);
      
      const allErrors = data.flatMap(row => row.errors || []);
      setImportErrors(allErrors);
      setImportPreview(data);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile || importErrors.length > 0) return;

    setIsProcessing(true);
    
    const validData = importPreview.filter(row => !row.errors || row.errors.length === 0);
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    const failures: string[] = [];
    
    for (const row of validData) {
      try {
        // Create sanitized payload with proper data types
        const createSanitizedPayload = (rowData: any) => ({
          // Basic info - using camelCase for schema validation with proper type conversion
          firstName: String(rowData.firstName || '').trim(),
          lastName: String(rowData.lastName || '').trim(),
          cohortYear: Number(rowData.cohortYear) || new Date().getFullYear(),
          compSciHighEmail: String(rowData.compSciHighEmail || `${String(rowData.firstName).toLowerCase()}.${String(rowData.lastName).toLowerCase()}@compscihigh.edu`).trim(),
          personalEmail: String(rowData.personalEmail || '').trim(),
          phone: String(rowData.phone || '').trim(),
          contactId: String(rowData.contactId || '').trim(),
          
          // College/Career info - ensure strings
          matriculation: String(rowData.matriculation || '').trim(),
          collegeOrWorkforce: String(rowData.collegeOrWorkforce || '').trim(),
          collegeMajor: String(rowData.collegeMajor || '').trim(),
          track: String(rowData.track || '').trim(),
          
          // Tracking fields - proper null/boolean/string handling
          connectedAsOf: rowData.connectedAsOf || null,
          notes: String(rowData.notes || '').trim(),
          attemptedOutreach: rowData.attemptedOutreach || null,
          circleBack: Boolean(rowData.circleBack),
          transcriptCollected: Boolean(rowData.transcriptCollected),
          needsTutor: Boolean(rowData.needsTutor),
          subjectSupport: String(rowData.subjectSupport || '').trim(),
          grouping: String(rowData.grouping || '').trim(),
          
          // Additional tracking fields - ensure booleans
          connectedWithCynthia: Boolean(rowData.connectedWithCynthia),
          meetWithCynthia: Boolean(rowData.meetWithCynthia),
          connectedWithJay: Boolean(rowData.connectedWithJay),
          meetWithJay: Boolean(rowData.meetWithJay),
          
          // Auto-generated fields with defaults
          profileImageUrl: String(rowData.profileImageUrl || '').trim(),
          trackingStatus: String(rowData.trackingStatus || 'on-track').trim(),
          supportCategory: String(rowData.supportCategory || '').trim(),
          collegeAttending: String(rowData.matriculation || '').trim(),
          collegeGpa: String(rowData.collegeGpa || '').trim(),
          employerName: String(rowData.employerName || '').trim(),
          latestAnnualIncome: rowData.latestAnnualIncome ? Number(rowData.latestAnnualIncome) || null : null,
          trainingProgramName: String(rowData.trainingProgramName || '').trim(),
          preferredEmail: String(rowData.personalEmail || rowData.compSciHighEmail || '').trim(),
          employed: Boolean(rowData.employed),
          currentlyEnrolled: Boolean(rowData.currentlyEnrolled),
          enrollmentStatus: String(rowData.enrollmentStatus || (rowData.matriculation ? 'enrolled' : 'not-enrolled')),
        });

        // Check if this is a duplicate
        const isDuplicate = row.contactId && alumni.some(existing => existing.contactId === row.contactId);
        
        if (isDuplicate) {
          if (importStrategy === 'skip') {
            skippedCount++;
            continue;
          } else if (importStrategy === 'update') {
            // Find the existing alumni record and update it
            const existingAlumni = alumni.find(existing => existing.contactId === row.contactId);
            if (existingAlumni) {
              await apiRequest("PATCH", `/api/alumni/${existingAlumni.id}`, createSanitizedPayload(row));
              successCount++;
            }
          }
        } else {
          // This is a new record, create it
          await apiRequest("POST", "/api/alumni", createSanitizedPayload(row));
          successCount++;
        }
      } catch (error) {
        failureCount++;
        failures.push(`${row.firstName} ${row.lastName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Always refresh the data
    queryClient.invalidateQueries({ queryKey: ["/api/alumni"] });
    
    // Show appropriate message based on results
    const totalProcessed = successCount + skippedCount;
    
    if (totalProcessed > 0 && failureCount === 0) {
      const skippedMessage = skippedCount > 0 ? `, ${skippedCount} duplicates skipped` : '';
      toast({
        title: "Import successful",
        description: `${successCount} alumni imported successfully${skippedMessage}${importPreview.length > validData.length ? ` (skipped ${importPreview.length - validData.length} invalid/summary rows)` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/alumni'] });
      onImportSuccess();
      // Close modal on successful import
      setIsOpen(false);
    } else if (totalProcessed > 0 && failureCount > 0) {
      const skippedMessage = skippedCount > 0 ? `, ${skippedCount} duplicates skipped` : '';
      toast({
        title: "Partial import success",
        description: `${successCount} alumni imported${skippedMessage}, ${failureCount} failed. Check data format for failed records.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Import failed",
        description: failureCount > 0 ? `All ${failureCount} records failed to import` : "No valid data to import",
        variant: "destructive",
      });
    }
    
    setIsProcessing(false);
  };

  const handleExport = () => {
    const headers = [
      'ContactId', 'First Name', 'Last Name', 'Cohort Year', 'Phone Number', 'Email',
      'Matriculation', 'College or Workforce', 'Major', 'Track', 'Connected as of',
      'Notes', 'Attempted Outreach', 'Circle Back', 'Transcript Collected', 
      'Needs Tutor', 'Subject Support', 'Grouping'
    ];

    const fieldMap = {
      'ContactId': 'contact_id',
      'First Name': 'first_name',
      'Last Name': 'last_name',
      'Cohort Year': 'cohort_year',
      'Phone Number': 'phone',
      'Email': 'comp_sci_high_email',
      'Matriculation': 'matriculation',
      'College or Workforce': 'college_or_workforce',
      'Major': 'college_major',
      'Track': 'track',
      'Connected as of': 'connected_as_of',
      'Notes': 'notes',
      'Attempted Outreach': 'attempted_outreach',
      'Circle Back': 'circle_back',
      'Transcript Collected': 'transcript_collected',
      'Needs Tutor': 'needs_tutor',
      'Subject Support': 'subject_support',
      'Grouping': 'grouping'
    };

    const csvContent = [
      headers.join(','),
      ...alumni.map(alumnus => headers.map(header => {
        const fieldName = fieldMap[header as keyof typeof fieldMap] as keyof Alumni;
        const value = alumnus[fieldName];
        if (value === null || value === undefined) return '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alumni_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `${alumni.length} alumni exported to CSV`,
    });
  };

  const downloadTemplate = () => {
    const headers = [
      // Basic Profile (Tab 1)
      'ContactId', 'First Name', 'Last Name', 'Cohort Year', 'DOB', 'Phone Number',
      'Comp Sci High Email', 'Personal Email', 'College Email', 'Preferred Email',
      'Instagram Handle', 'Twitter Handle', 'TikTok Handle', 'LinkedIn Handle',
      'High School GPA', 'Household Size', 'Household Income',
      'Track', 'Support Category',
      
      // College (Tab 2)
      'Matriculation', 'College or Workforce', 'Major', 'College Minor', 'Degree Track',
      'Intended Career Path', 'Currently Enrolled', 'Enrollment Status', 'Expected Graduation Date',
      'Received Scholarships', 'Scholarships Requiring Renewal', 'Enrolled in Opportunity Program',
      'Transfer Student Status', 'College GPA',
      
      // Job Training Program (Tab 3)
      'Training Program Name', 'Training Program Type', 'Training Program Location',
      'Training Program Pay', 'Training Start Date', 'Training End Date', 'Training Degree/Certification',
      
      // Employment (Tab 4)
      'On-course Economic Liberation', 'Employed', 'Employment Type', 'Employer Name',
      'Latest Annual Income', 'Latest Income Date',
      
      // Engagement & Tracking
      'Connected as of', 'Notes', 'Last Attempted Outreach', 'Circle Back',
      'Transcript Collected', 'Needs Tutor', 'Subject Support', 'Grouping'
    ];

    const sampleData = [
      [
        // Basic Profile
        '249164641', 'John', 'Doe', '2024', '1/15/2006', '(555) 123-4567',
        'john.doe@compscihigh.edu', 'john.personal@gmail.com', 'jd123@nyu.edu', 'john.personal@gmail.com',
        '@johndoe', '@john_doe', '@johndoe_tk', 'john-doe-123',
        '3.8', '4', '$75,000',
        'On Track', 'Persistence - College',
        
        // College
        'NYU', 'College', 'Computer Science', 'Mathematics', 'Bachelor of Science',
        'Software Engineer', 'TRUE', 'enrolled', '5/15/2028',
        'TRUE', 'Academic Merit Scholarship', 'TRUE',
        '', '3.6',
        
        // Job Training
        '', '', '',
        '', '', '', '',
        
        // Employment
        'TRUE', 'FALSE', '', '',
        '', '',
        
        // Engagement
        '4/22/25', 'Doing well in first year, active in computer science club', 'Email sent 4/15/25', 'FALSE',
        'TRUE', 'FALSE', 'CS tutoring', 'Low Needs'
      ].map(val => `"${val}"`).join(','),
      
      [
        // Basic Profile
        '249164642', 'Jane', 'Smith', '2023', '3/22/2005', '(555) 987-6543',
        'jane.smith@compscihigh.edu', 'jsmith@gmail.com', '', 'jsmith@gmail.com',
        '@janesmith', '', '@jane_smith', 'jane-smith-pro',
        '3.9', '3', '$85,000',
        'Success-Employed', 'Success-Employed',
        
        // College
        'Google Career Program', 'Workforce', '', '', 'Certificate Program',
        'Software Developer', 'FALSE', 'completed', '12/15/2023',
        'FALSE', '', 'FALSE',
        '', '',
        
        // Job Training
        'Google Software Development Certificate', 'Online Bootcamp', 'Remote',
        '$0', '1/15/2023', '12/15/2023', 'Google Software Development Certificate',
        
        // Employment
        'TRUE', 'TRUE', 'Full-time', 'Google',
        '$95,000', '1/15/2024',
        
        // Engagement
        '5/27/25', 'Working as junior software engineer at Google, very successful', 'Phone call 5/20/25', 'FALSE',
        'TRUE', 'FALSE', '', 'Success'
      ].map(val => `"${val}"`).join(',')
    ];

    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'alumni_comprehensive_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Comprehensive template downloaded",
      description: "Template includes all 4 categories: Basic Profile, College, Job Training, Employment",
    });
  };

  const handleUpdateStrategyChange = (strategy: 'skip' | 'update') => {
    if (strategy === 'update') {
      setShowUpdateWarning(true);
    } else {
      setImportStrategy(strategy);
      setShowUpdateWarning(false);
    }
  };

  const confirmUpdateStrategy = () => {
    setImportStrategy('update');
    setShowUpdateWarning(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import/Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-green-600" />
            <span>Alumni Import/Export</span>
          </DialogTitle>
          <DialogDescription>
            Import alumni data from CSV files or export existing data for backup and reporting
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import Alumni</TabsTrigger>
            <TabsTrigger value="export">Export Alumni</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-green-600" />
                  <span>Upload CSV File</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <span className="text-sm text-slate-600">
                    Use this template to format your data correctly
                  </span>
                </div>

                {duplicateCount > 0 && (
                  <Alert>
                    <UserX className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-3">Found {duplicateCount} duplicate alumni with existing Contact IDs</div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">How should duplicates be handled?</Label>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={importStrategy === 'skip' ? 'default' : 'outline'}
                            onClick={() => handleUpdateStrategyChange('skip')}
                            className="flex-1"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Skip duplicates
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={importStrategy === 'update' ? 'default' : 'outline'}
                            onClick={() => handleUpdateStrategyChange('update')}
                            className="flex-1"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Update existing
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {importErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Import errors found:</div>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {importErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {importPreview.length > 0 && importErrors.length === 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Preview: {importPreview.length} alumni ready to import</div>
                      <div className="text-sm">
                        First few entries: {importPreview.slice(0, 3).map(row => 
                          `${row.firstName} ${row.lastName} (${row.cohortYear})`
                        ).join(', ')}
                        {importPreview.length > 3 && '...'}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={handleImport}
                    disabled={!importFile || importErrors.length > 0 || isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? 'Importing...' : `Import ${importPreview.length} Alumni`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5 text-green-600" />
                  <span>Export Alumni Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4" />
                  <span>Export all {alumni.length} alumni records to CSV format</span>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The exported file will include all alumni data including personal information. 
                    Handle with care and follow your institution's data privacy policies.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={handleExport}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Update Warning Dialog */}
        {showUpdateWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center space-x-2 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Warning: Update Existing Alumni</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you SURE you want to overwrite existing alumni records? This will permanently update all duplicate alumni with new data from your CSV file. <strong>This action cannot be undone.</strong>
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUpdateWarning(false);
                    setImportStrategy('skip');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmUpdateStrategy}
                >
                  Yes, Update Existing
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
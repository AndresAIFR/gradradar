import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DataTableProps {
  data: any[];
  visibleColumns: string[];
  selectedAlumni?: Set<number>;
  onSelectAlumni?: (id: number) => void;
  onSelectAll?: () => void;
}

const columnHelper = createColumnHelper<any>();

// Define all possible columns with proper formatting
const getAllColumns = (selectedAlumni?: Set<number>, onSelectAlumni?: (id: number) => void) => [
  // Selection column
  ...(selectedAlumni && onSelectAlumni ? [
    columnHelper.display({
      id: "select",
      header: "",
      cell: ({ row }) => {
        const isSelected = selectedAlumni.has(row.original.id);
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onSelectAlumni(row.original.id)}
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>
        );
      },
    })
  ] : []),
  // Basic Info
  columnHelper.accessor("firstName", {
    header: "First Name",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("lastName", {
    header: "Last Name",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("cohortYear", {
    header: "Cohort",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("trackingStatus", {
    header: "Status",
    cell: (info) => {
      const status = info.getValue();
      const variant = status === "on-track" ? "default" : 
                    status === "near-track" ? "secondary" : "destructive";
      return <Badge variant={variant}>{status || "Unknown"}</Badge>;
    },
  }),
  columnHelper.accessor("supportCategory", {
    header: "Support Level",
    cell: (info) => info.getValue() || "",
  }),
  
  // Contact Info
  columnHelper.accessor("phone", {
    header: "Phone",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("personalEmail", {
    header: "Personal Email",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("collegeEmail", {
    header: "College Email",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("preferredEmail", {
    header: "Preferred Email",
    cell: (info) => info.getValue() || "",
  }),
  
  // Academic Info
  columnHelper.accessor("collegeAttending", {
    header: "College",
    cell: (info) => {
      const college = info.getValue();
      const isGeneric = college === "College";
      return (
        <span className={cn(isGeneric && "text-red-600 font-medium")}>
          {college || ""}
          {isGeneric && " ⚠️"}
        </span>
      );
    },
  }),
  columnHelper.accessor("collegeProgram", {
    header: "Program",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("collegeMajor", {
    header: "Major",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("collegeMinor", {
    header: "Minor",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("collegeGpa", {
    header: "College GPA",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("currentlyEnrolled", {
    header: "Enrolled",
    cell: (info) => info.getValue() ? "Yes" : "No",
  }),
  columnHelper.accessor("collegeLatitude", {
    header: "College Latitude",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("collegeLongitude", {
    header: "College Longitude", 
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("collegeStandardName", {
    header: "College Standard Name",
    cell: (info) => info.getValue() || "",
  }),
  
  // Employment
  columnHelper.accessor("employed", {
    header: "Employed",
    cell: (info) => info.getValue() ? "Yes" : "No",
  }),
  columnHelper.accessor("employerName", {
    header: "Employer",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("latestAnnualIncome", {
    header: "Annual Income",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("currentSalary", {
    header: "Current Salary",
    cell: (info) => {
      const salary = info.getValue();
      return salary ? `$${salary.toLocaleString()}` : "";
    },
  }),
  
  // Dates
  columnHelper.accessor("lastContactDate", {
    header: "Last Contact",
    cell: (info) => {
      const date = info.getValue();
      return date ? new Date(date).toLocaleDateString() : "";
    },
  }),
  columnHelper.accessor("expectedGraduationDate", {
    header: "Expected Graduation",
    cell: (info) => {
      const date = info.getValue();
      return date ? new Date(date).toLocaleDateString() : "";
    },
  }),
  
  // Social Media
  columnHelper.accessor("instagramHandle", {
    header: "Instagram",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("linkedinHandle", {
    header: "LinkedIn",
    cell: (info) => info.getValue() || "",
  }),
  
  // Financial
  columnHelper.accessor("receivedScholarships", {
    header: "Scholarships",
    cell: (info) => info.getValue() ? "Yes" : "No",
  }),
  columnHelper.accessor("householdIncome", {
    header: "Household Income",
    cell: (info) => info.getValue() || "",
  }),
  
  // System Fields
  columnHelper.accessor("contactId", {
    header: "Contact ID",
    cell: (info) => info.getValue() || "",
  }),
  columnHelper.accessor("notes", {
    header: "Notes",
    cell: (info) => {
      const notes = info.getValue();
      return notes ? (
        <span title={notes} className="cursor-help">
          {notes.length > 50 ? `${notes.substring(0, 50)}...` : notes}
        </span>
      ) : "";
    },
  }),
];

export function DataTable({ data, visibleColumns, selectedAlumni, onSelectAlumni, onSelectAll }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const allColumns = getAllColumns(selectedAlumni, onSelectAlumni);
  
  // Filter columns based on visibility
  const columns = useMemo(() => {
    const filteredColumns = allColumns.filter(col => {
      // Always include selection column if it exists
      if (col.id === 'select') return true;
      // Include other columns based on visibility
      const accessorKey = (col as any).accessorKey;
      return accessorKey && visibleColumns.includes(accessorKey);
    });
    return filteredColumns;
  }, [visibleColumns, allColumns]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-auto border rounded-lg">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b bg-gray-50">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header.isPlaceholder ? null : header.id === 'select' ? (
                    // Select all checkbox
                    selectedAlumni && onSelectAll ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={onSelectAll}
                      >
                        {selectedAlumni.size === data.length && data.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : selectedAlumni.size > 0 ? (
                          <CheckSquare className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    ) : null
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent font-medium text-gray-500"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-1 h-3 w-3" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const isSelected = selectedAlumni?.has(row.original.id);
            return (
              <tr 
                key={row.id} 
                className={cn(
                  "border-b hover:bg-gray-50",
                  isSelected && "bg-blue-50 border-blue-200"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-1 text-xs whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No alumni data found
        </div>
      )}
    </div>
  );
}
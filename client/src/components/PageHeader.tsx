import { Button } from "@/components/ui/button";
import logoImage from "@assets/comp-sci-high-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  breadcrumb?: {
    items: Array<{
      label: string;
      href?: string;
    }>;
  };
  dropdown?: {
    currentItem: string;
    items: Array<{
      label: string;
      onClick: () => void;
    }>;
  };
}

export function PageHeader({ 
  title, 
  subtitle, 
  actionButton, 
  breadcrumb, 
  dropdown 
}: PageHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Breadcrumb */}
          {breadcrumb && (
            <nav className="flex items-center space-x-2 text-sm text-slate-500">
              {breadcrumb.items.map((item, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2">/</span>}
                  <span 
                    className={index === breadcrumb.items.length - 1 
                      ? "text-slate-900 dark:text-slate-100" 
                      : "hover:text-slate-700 cursor-pointer"
                    }
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </nav>
          )}
          
          {/* Title and Dropdown */}
          <div className="flex items-center space-x-2">
            <img 
              src={logoImage} 
              alt="Comp Sci High Logo" 
              className="w-8 h-8 rounded-lg object-cover"
              style={{ objectPosition: 'center' }}
            />
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            
            {dropdown && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-2">
                    {dropdown.currentItem}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {dropdown.items.map((item, index) => (
                    <DropdownMenuItem key={index} onClick={item.onClick}>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Subtitle */}
          {subtitle && (
            <span className="text-sm text-slate-500">
              {subtitle}
            </span>
          )}
        </div>

        {/* Action Button */}
        {actionButton && (
          <Button onClick={actionButton.onClick} className="bg-blue-600 hover:bg-blue-700">
            {actionButton.icon && <actionButton.icon className="mr-2 h-4 w-4" />}
            {actionButton.label}
          </Button>
        )}
      </div>
    </div>
  );
}
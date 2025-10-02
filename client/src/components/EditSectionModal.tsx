import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Alumni } from "@shared/schema";

// Define schemas for each section
const contactInfoSchema = z.object({
  phone: z.string().optional(),
  compSciHighEmail: z.string().optional(),
  personalEmail: z.string().optional(),
  collegeEmail: z.string().optional(),
  preferredEmail: z.string().optional(),
  instagramHandle: z.string().optional(),
  twitterHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  linkedinHandle: z.string().optional(),
});

const personalInfoSchema = z.object({
  dateOfBirth: z.string().optional(),
  highSchoolGpa: z.string().optional(),
  householdSize: z.string().optional(),
  householdIncome: z.string().optional(),
});

const currentStatusSchema = z.object({
  trackingStatus: z.enum(["on-track", "near-track", "off-track"]).optional(),
  supportCategory: z.string().optional(),
  lastContactDate: z.string().optional(),
  needsFollowUp: z.boolean().optional(),
});

const educationSchema = z.object({
  collegeAttending: z.string().optional(),
  collegeMajor: z.string().optional(),
  collegeMinor: z.string().optional(),
  degreeTrack: z.string().optional(),
  intendedCareerPath: z.string().optional(),
  currentlyEnrolled: z.boolean().optional(),
  enrollmentStatus: z.string().optional(),
  expectedGraduationDate: z.string().optional(),
  collegeGpa: z.string().optional(),
  receivedScholarships: z.boolean().optional(),
  scholarshipsRequiringRenewal: z.string().optional(),
  enrolledInOpportunityProgram: z.boolean().optional(),
  transferStudentStatus: z.string().optional(),
});

const employmentSchema = z.object({
  onCourseEconomicLiberation: z.boolean().optional(),
  employed: z.boolean().optional(),
  employmentType: z.string().optional(),
  employerName: z.string().optional(),
  latestAnnualIncome: z.string().optional(),
  latestIncomeDate: z.string().optional(),
  trainingProgramName: z.string().optional(),
  trainingProgramType: z.string().optional(),
  trainingProgramLocation: z.string().optional(),
  trainingProgramPay: z.string().optional(),
  trainingStartDate: z.string().optional(),
  trainingEndDate: z.string().optional(),
  trainingDegreeCertification: z.string().optional(),
});

type SectionType = "contact" | "personal" | "status" | "education" | "employment";

interface EditSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: SectionType;
  alumnus: Alumni;
}

export default function EditSectionModal({ isOpen, onClose, section, alumnus }: EditSectionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getSchema = () => {
    switch (section) {
      case "contact": return contactInfoSchema;
      case "personal": return personalInfoSchema;
      case "status": return currentStatusSchema;
      case "education": return educationSchema;
      case "employment": return employmentSchema;
      default: return contactInfoSchema;
    }
  };

  const getTitle = () => {
    switch (section) {
      case "contact": return "Edit Contact Information";
      case "personal": return "Edit Personal Information";
      case "status": return "Edit Current Status";
      case "education": return "Edit Education Details";
      case "employment": return "Edit Employment & Training";
      default: return "Edit Information";
    }
  };

  const getDefaultValues = () => {
    switch (section) {
      case "contact":
        return {
          phone: alumnus.phone || "",
          compSciHighEmail: alumnus.compSciHighEmail || "",
          personalEmail: alumnus.personalEmail || "",
          collegeEmail: alumnus.collegeEmail || "",
          preferredEmail: alumnus.preferredEmail || "",
          instagramHandle: alumnus.instagramHandle || "",
          twitterHandle: alumnus.twitterHandle || "",
          tiktokHandle: alumnus.tiktokHandle || "",
          linkedinHandle: alumnus.linkedinHandle || "",
        };
      case "personal":
        return {
          dateOfBirth: alumnus.dateOfBirth || "",
          highSchoolGpa: alumnus.highSchoolGpa || "",
          householdSize: alumnus.householdSize || "",
          householdIncome: alumnus.householdIncome || "",
        };
      case "status":
        return {
          trackingStatus: alumnus.trackingStatus,
          supportCategory: alumnus.supportCategory || "",
          lastContactDate: alumnus.lastContactDate || "",
          needsFollowUp: alumnus.needsFollowUp || false,
        };
      case "education":
        return {
          collegeAttending: alumnus.collegeAttending || "",
          collegeMajor: alumnus.collegeMajor || "",
          collegeMinor: alumnus.collegeMinor || "",
          degreeTrack: alumnus.degreeTrack || "",
          intendedCareerPath: alumnus.intendedCareerPath || "",
          currentlyEnrolled: alumnus.currentlyEnrolled || false,
          enrollmentStatus: alumnus.enrollmentStatus || "",
          expectedGraduationDate: alumnus.expectedGraduationDate || "",
          collegeGpa: alumnus.collegeGpa || "",
          receivedScholarships: alumnus.receivedScholarships || false,
          scholarshipsRequiringRenewal: alumnus.scholarshipsRequiringRenewal || "",
          enrolledInOpportunityProgram: alumnus.enrolledInOpportunityProgram || false,
          transferStudentStatus: alumnus.transferStudentStatus || "",
        };
      case "employment":
        return {
          onCourseEconomicLiberation: alumnus.onCourseEconomicLiberation || false,
          employed: alumnus.employed || false,
          employmentType: alumnus.employmentType || "",
          employerName: alumnus.employerName || "",
          latestAnnualIncome: alumnus.latestAnnualIncome || "",
          latestIncomeDate: alumnus.latestIncomeDate || "",
          trainingProgramName: alumnus.trainingProgramName || "",
          trainingProgramType: alumnus.trainingProgramType || "",
          trainingProgramLocation: alumnus.trainingProgramLocation || "",
          trainingProgramPay: alumnus.trainingProgramPay || "",
          trainingStartDate: alumnus.trainingStartDate || "",
          trainingEndDate: alumnus.trainingEndDate || "",
          trainingDegreeCertification: alumnus.trainingDegreeCertification || "",
        };
      default:
        return {};
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: getDefaultValues(),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/alumni/${alumnus.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update alumni");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Successfully updated alumni information" });
      queryClient.invalidateQueries({ queryKey: ["alumni", alumnus.id] });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Failed to update alumni", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  const renderFields = () => {
    switch (section) {
      case "contact":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input {...form.register("phone")} />
            </div>
            <div>
              <Label htmlFor="compSciHighEmail">CompSci High Email</Label>
              <Input {...form.register("compSciHighEmail")} />
            </div>
            <div>
              <Label htmlFor="personalEmail">Personal Email</Label>
              <Input {...form.register("personalEmail")} />
            </div>
            <div>
              <Label htmlFor="collegeEmail">College Email</Label>
              <Input {...form.register("collegeEmail")} />
            </div>
            <div>
              <Label htmlFor="preferredEmail">Preferred Email</Label>
              <Input {...form.register("preferredEmail")} />
            </div>
            <div>
              <Label htmlFor="instagramHandle">Instagram Handle</Label>
              <Input {...form.register("instagramHandle")} />
            </div>
            <div>
              <Label htmlFor="twitterHandle">Twitter Handle</Label>
              <Input {...form.register("twitterHandle")} />
            </div>
            <div>
              <Label htmlFor="tiktokHandle">TikTok Handle</Label>
              <Input {...form.register("tiktokHandle")} />
            </div>
            <div>
              <Label htmlFor="linkedinHandle">LinkedIn Handle</Label>
              <Input {...form.register("linkedinHandle")} />
            </div>
          </div>
        );
      
      case "personal":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input {...form.register("dateOfBirth")} type="date" />
            </div>
            <div>
              <Label htmlFor="highSchoolGpa">High School GPA</Label>
              <Input {...form.register("highSchoolGpa")} />
            </div>
            <div>
              <Label htmlFor="householdSize">Household Size</Label>
              <Input {...form.register("householdSize")} />
            </div>
            <div>
              <Label htmlFor="householdIncome">Household Income</Label>
              <Input {...form.register("householdIncome")} />
            </div>
          </div>
        );
      
      case "status":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trackingStatus">Tracking Status</Label>
              <Select value={form.watch("trackingStatus")} onValueChange={(value) => form.setValue("trackingStatus", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on-track">On Track</SelectItem>
                  <SelectItem value="near-track">Near Track</SelectItem>
                  <SelectItem value="off-track">Off Track</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="supportCategory">Support Category</Label>
              <Select value={form.watch("supportCategory")} onValueChange={(value) => form.setValue("supportCategory", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low Needs">Low Needs</SelectItem>
                  <SelectItem value="Medium Needs">Medium Needs</SelectItem>
                  <SelectItem value="High Needs">High Needs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lastContactDate">Last Contact Date</Label>
              <Input {...form.register("lastContactDate")} type="date" />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="needsFollowUp"
                {...form.register("needsFollowUp")}
                className="rounded border-gray-300"
              />
              <Label htmlFor="needsFollowUp">Needs Follow-up</Label>
            </div>
          </div>
        );
      
      default:
        return <div>Section not implemented yet</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {renderFields()}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
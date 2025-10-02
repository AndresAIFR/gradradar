import { Router } from "express";
import { isAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Settings Routes
 * Handles application settings, median income, and reminder functionality
 */

export function registerSettingsRoutes(api: Router) {
  // Get app settings
  api.get('/settings', isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  }));

  // Update median income
  api.put('/settings/median-income', isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const { income } = req.body;
      
      if (!income || income <= 0) {
        return res.status(400).json({ message: "Valid income amount required" });
      }
      
      const updatedSettings = await storage.updateNationalMedianIncome(income);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update median income" });
    }
  }));

  // Check quarterly reminder status
  api.get('/settings/reminder-check', isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const shouldShow = await storage.shouldShowQuarterlyReminder();
      res.json({ shouldShow });
    } catch (error) {
      res.status(500).json({ message: "Failed to check reminder status" });
    }
  }));

  // Mark quarterly reminder as shown
  api.post('/settings/mark-reminder-shown', isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const updatedSettings = await storage.markReminderShown();
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark reminder as shown" });
    }
  }));
}
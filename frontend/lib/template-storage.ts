import { EmailTemplate, emailTemplates as defaultEmailTemplates } from "./email-templates";
import { SmsTemplate, smsTemplates as defaultSmsTemplates } from "./sms-templates";

const EMAIL_TEMPLATES_STORAGE_KEY = "factora:emailTemplates";
const SMS_TEMPLATES_STORAGE_KEY = "factora:smsTemplates";

/**
 * Generate a unique ID for a template
 */
function generateTemplateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Retrieve all email templates from localStorage and merge with default templates
 */
export function getEmailTemplates(): EmailTemplate[] {
  if (typeof window === "undefined") {
    return defaultEmailTemplates;
  }

  try {
    const stored = localStorage.getItem(EMAIL_TEMPLATES_STORAGE_KEY);
    const userTemplates: EmailTemplate[] = stored
      ? JSON.parse(stored)
      : [];

    // Merge default templates with user-created templates
    // User templates take precedence if they have the same ID
    const defaultMap = new Map(
      defaultEmailTemplates.map((t) => [t.id, { ...t, isDefault: true }])
    );
    const userMap = new Map(
      userTemplates.map((t) => [t.id, { ...t, isDefault: false }])
    );

    // Combine: defaults that aren't overridden + all user templates
    const merged: EmailTemplate[] = [];
    
    // Add all user templates first
    userMap.forEach((template) => merged.push(template));
    
    // Add default templates that weren't overridden
    defaultMap.forEach((template, id) => {
      if (!userMap.has(id)) {
        merged.push(template);
      }
    });

    return merged;
  } catch (error) {
    console.error("Failed to retrieve email templates:", error);
    return defaultEmailTemplates;
  }
}

/**
 * Retrieve all SMS templates from localStorage and merge with default templates
 */
export function getSmsTemplates(): SmsTemplate[] {
  if (typeof window === "undefined") {
    return defaultSmsTemplates;
  }

  try {
    const stored = localStorage.getItem(SMS_TEMPLATES_STORAGE_KEY);
    const userTemplates: SmsTemplate[] = stored
      ? JSON.parse(stored)
      : [];

    // Merge default templates with user-created templates
    const defaultMap = new Map(
      defaultSmsTemplates.map((t) => [t.id, { ...t, isDefault: true }])
    );
    const userMap = new Map(
      userTemplates.map((t) => [t.id, { ...t, isDefault: false }])
    );

    const merged: SmsTemplate[] = [];
    
    // Add all user templates first
    userMap.forEach((template) => merged.push(template));
    
    // Add default templates that weren't overridden
    defaultMap.forEach((template, id) => {
      if (!userMap.has(id)) {
        merged.push(template);
      }
    });

    return merged;
  } catch (error) {
    console.error("Failed to retrieve SMS templates:", error);
    return defaultSmsTemplates;
  }
}

/**
 * Get only user-created email templates (excluding defaults)
 */
function getUserEmailTemplates(): EmailTemplate[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(EMAIL_TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to retrieve user email templates:", error);
    return [];
  }
}

/**
 * Get only user-created SMS templates (excluding defaults)
 */
function getUserSmsTemplates(): SmsTemplate[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(SMS_TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to retrieve user SMS templates:", error);
    return [];
  }
}

/**
 * Save or update an email template
 */
export function saveEmailTemplate(
  template: Omit<EmailTemplate, "id"> & { id?: string }
): EmailTemplate {
  if (typeof window === "undefined") {
    throw new Error("localStorage is only available in the browser");
  }

  try {
    const userTemplates = getUserEmailTemplates();
    const templateId = template.id || generateTemplateId();
    
    const existingIndex = userTemplates.findIndex((t) => t.id === templateId);
    const newTemplate: EmailTemplate = {
      ...template,
      id: templateId,
      isDefault: false,
    };

    let updatedTemplates: EmailTemplate[];
    if (existingIndex >= 0) {
      // Update existing template
      updatedTemplates = [...userTemplates];
      updatedTemplates[existingIndex] = newTemplate;
    } else {
      // Add new template
      updatedTemplates = [...userTemplates, newTemplate];
    }

    localStorage.setItem(
      EMAIL_TEMPLATES_STORAGE_KEY,
      JSON.stringify(updatedTemplates)
    );

    // Dispatch custom event to notify other pages
    window.dispatchEvent(
      new CustomEvent("emailTemplateUpdated", {
        detail: newTemplate,
      })
    );

    return newTemplate;
  } catch (error) {
    console.error("Failed to save email template:", error);
    throw error;
  }
}

/**
 * Save or update an SMS template
 */
export function saveSmsTemplate(
  template: Omit<SmsTemplate, "id"> & { id?: string }
): SmsTemplate {
  if (typeof window === "undefined") {
    throw new Error("localStorage is only available in the browser");
  }

  try {
    const userTemplates = getUserSmsTemplates();
    const templateId = template.id || generateTemplateId();
    
    const existingIndex = userTemplates.findIndex((t) => t.id === templateId);
    const newTemplate: SmsTemplate = {
      ...template,
      id: templateId,
      isDefault: false,
    };

    let updatedTemplates: SmsTemplate[];
    if (existingIndex >= 0) {
      // Update existing template
      updatedTemplates = [...userTemplates];
      updatedTemplates[existingIndex] = newTemplate;
    } else {
      // Add new template
      updatedTemplates = [...userTemplates, newTemplate];
    }

    localStorage.setItem(
      SMS_TEMPLATES_STORAGE_KEY,
      JSON.stringify(updatedTemplates)
    );

    // Dispatch custom event to notify other pages
    window.dispatchEvent(
      new CustomEvent("smsTemplateUpdated", {
        detail: newTemplate,
      })
    );

    return newTemplate;
  } catch (error) {
    console.error("Failed to save SMS template:", error);
    throw error;
  }
}

/**
 * Delete an email template (only user-created templates can be deleted)
 */
export function deleteEmailTemplate(id: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const userTemplates = getUserEmailTemplates();
    const filtered = userTemplates.filter((t) => t.id !== id);
    
    if (filtered.length === userTemplates.length) {
      // Template not found or is a default template
      return false;
    }

    localStorage.setItem(
      EMAIL_TEMPLATES_STORAGE_KEY,
      JSON.stringify(filtered)
    );

    // Dispatch custom event to notify other pages
    window.dispatchEvent(
      new CustomEvent("emailTemplateDeleted", {
        detail: { id },
      })
    );

    return true;
  } catch (error) {
    console.error("Failed to delete email template:", error);
    return false;
  }
}

/**
 * Delete an SMS template (only user-created templates can be deleted)
 */
export function deleteSmsTemplate(id: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const userTemplates = getUserSmsTemplates();
    const filtered = userTemplates.filter((t) => t.id !== id);
    
    if (filtered.length === userTemplates.length) {
      // Template not found or is a default template
      return false;
    }

    localStorage.setItem(
      SMS_TEMPLATES_STORAGE_KEY,
      JSON.stringify(filtered)
    );

    // Dispatch custom event to notify other pages
    window.dispatchEvent(
      new CustomEvent("smsTemplateDeleted", {
        detail: { id },
      })
    );

    return true;
  } catch (error) {
    console.error("Failed to delete SMS template:", error);
    return false;
  }
}


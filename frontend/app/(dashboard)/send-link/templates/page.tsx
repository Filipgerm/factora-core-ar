"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  MessageSquare,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileText,
  Save,
  X,
} from "lucide-react";
import QuillEditor from "@/components/ui/quill-editor";
import {
  getEmailTemplates,
  getSmsTemplates,
  saveEmailTemplate,
  saveSmsTemplate,
  deleteEmailTemplate,
  deleteSmsTemplate,
} from "@/lib/template-storage";
import type { EmailTemplate } from "@/lib/email-templates";
import type { SmsTemplate } from "@/lib/sms-templates";

export default function TemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") === "sms" ? "sms" : "email") as "email" | "sms";
  const [activeTab, setActiveTab] = useState<"email" | "sms">(initialTab);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [editingSmsId, setEditingSmsId] = useState<string | null>(null);
  const [isCreatingEmail, setIsCreatingEmail] = useState(false);
  const [isCreatingSms, setIsCreatingSms] = useState(false);

  // Email form state
  const [emailName, setEmailName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");

  // SMS form state
  const [smsName, setSmsName] = useState("");
  const [smsMessage, setSmsMessage] = useState("");

  useEffect(() => {
    loadTemplates();

    // Listen for template updates
    const handleEmailUpdate = () => loadTemplates();
    const handleSmsUpdate = () => loadTemplates();

    window.addEventListener("emailTemplateUpdated", handleEmailUpdate);
    window.addEventListener("emailTemplateDeleted", handleEmailUpdate);
    window.addEventListener("smsTemplateUpdated", handleSmsUpdate);
    window.addEventListener("smsTemplateDeleted", handleSmsUpdate);

    return () => {
      window.removeEventListener("emailTemplateUpdated", handleEmailUpdate);
      window.removeEventListener("emailTemplateDeleted", handleEmailUpdate);
      window.removeEventListener("smsTemplateUpdated", handleSmsUpdate);
      window.removeEventListener("smsTemplateDeleted", handleSmsUpdate);
    };
  }, []);

  // Update active tab when query param changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "sms" || tab === "email") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const loadTemplates = () => {
    setEmailTemplates(getEmailTemplates());
    setSmsTemplates(getSmsTemplates());
  };

  const startCreatingEmail = () => {
    setIsCreatingEmail(true);
    setEditingEmailId(null);
    setEmailName("");
    setEmailSubject("");
    setEmailContent("");
  };

  const startEditingEmail = (template: EmailTemplate) => {
    if (template.isDefault) return; // Can't edit default templates
    setEditingEmailId(template.id);
    setIsCreatingEmail(false);
    setEmailName(template.name);
    setEmailSubject(template.subject);
    setEmailContent(template.htmlContent);
  };

  const cancelEmailForm = () => {
    setIsCreatingEmail(false);
    setEditingEmailId(null);
    setEmailName("");
    setEmailSubject("");
    setEmailContent("");
  };

  const saveEmail = () => {
    if (!emailName.trim() || !emailSubject.trim() || !emailContent.trim()) {
      return;
    }

    try {
      saveEmailTemplate({
        id: editingEmailId || undefined,
        name: emailName.trim(),
        subject: emailSubject.trim(),
        htmlContent: emailContent,
      });
      cancelEmailForm();
      loadTemplates();
    } catch (error) {
      console.error("Failed to save email template:", error);
    }
  };

  const handleDeleteEmail = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteEmailTemplate(id);
      loadTemplates();
    }
  };

  const startCreatingSms = () => {
    setIsCreatingSms(true);
    setEditingSmsId(null);
    setSmsName("");
    setSmsMessage("");
  };

  const startEditingSms = (template: SmsTemplate) => {
    if (template.isDefault) return; // Can't edit default templates
    setEditingSmsId(template.id);
    setIsCreatingSms(false);
    setSmsName(template.name);
    setSmsMessage(template.message);
  };

  const cancelSmsForm = () => {
    setIsCreatingSms(false);
    setEditingSmsId(null);
    setSmsName("");
    setSmsMessage("");
  };

  const saveSms = () => {
    if (!smsName.trim() || !smsMessage.trim()) {
      return;
    }

    try {
      saveSmsTemplate({
        id: editingSmsId || undefined,
        name: smsName.trim(),
        message: smsMessage.trim(),
      });
      cancelSmsForm();
      loadTemplates();
    } catch (error) {
      console.error("Failed to save SMS template:", error);
    }
  };

  const handleDeleteSms = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteSmsTemplate(id);
      loadTemplates();
    }
  };

  const getTextPreview = (html: string, maxLength: number = 100): string => {
    const text = html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  return (
    <main className="flex-1 overflow-y-auto bg-white min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between lg:items-center">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push("/send-link")}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Send Link
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl sm:leading-tight">
              Manage Templates
            </h1>
            <p className="text-gray-600">
              Create and manage email and SMS templates for invitations
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "sms")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email Templates
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="mr-2 h-4 w-4" />
              SMS Templates
            </TabsTrigger>
          </TabsList>

          {/* Email Templates Tab */}
          <TabsContent value="email" className="space-y-6 mt-6">
            {/* Create/Edit Form */}
            {(isCreatingEmail || editingEmailId) && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingEmailId ? "Edit Email Template" : "Create Email Template"}
                  </CardTitle>
                  <CardDescription>
                    {editingEmailId
                      ? "Update your email template"
                      : "Create a new email template for invitations"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-name">Template Name *</Label>
                    <Input
                      id="email-name"
                      value={emailName}
                      onChange={(e) => setEmailName(e.target.value)}
                      placeholder="e.g., Welcome Email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-subject">Subject *</Label>
                    <Input
                      id="email-subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g., Welcome to Factora"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-content">Email Content *</Label>
                    <div className="rounded-xl border border-gray-200">
                      <QuillEditor
                        value={emailContent}
                        onChange={setEmailContent}
                        placeholder="Write your email content here..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={cancelEmailForm}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      onClick={saveEmail}
                      disabled={!emailName.trim() || !emailSubject.trim() || !emailContent.trim()}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Templates List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>
                      Manage your email templates for invitations
                    </CardDescription>
                  </div>
                  {!isCreatingEmail && !editingEmailId && (
                    <Button
                      onClick={startCreatingEmail}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Template
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emailTemplates.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No templates found. Create your first template to get started.
                    </p>
                  ) : (
                    emailTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-xl border border-gray-200 p-4 transition hover:border-brand-primary hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-gray-100 p-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {template.name}
                              </p>
                              {template.isDefault && (
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Subject: {template.subject}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {getTextPreview(template.htmlContent, 80)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          {!template.isDefault && (
                            <>
                              <Button
                                onClick={() => startEditingEmail(template)}
                                size="sm"
                                variant="outline"
                                className="flex-1"
                              >
                                <Edit className="mr-2 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleDeleteEmail(template.id)}
                                size="sm"
                                variant="outline"
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMS Templates Tab */}
          <TabsContent value="sms" className="space-y-6 mt-6">
            {/* Create/Edit Form */}
            {(isCreatingSms || editingSmsId) && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingSmsId ? "Edit SMS Template" : "Create SMS Template"}
                  </CardTitle>
                  <CardDescription>
                    {editingSmsId
                      ? "Update your SMS template"
                      : "Create a new SMS template for invitations"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-name">Template Name *</Label>
                    <Input
                      id="sms-name"
                      value={smsName}
                      onChange={(e) => setSmsName(e.target.value)}
                      placeholder="e.g., Welcome SMS"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-message">Message *</Label>
                    <Textarea
                      id="sms-message"
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="Hi! You've been invited to start your onboarding with Factora."
                      rows={5}
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Keep it concise so it fits in one text.</span>
                      <span>{smsMessage.length} / 160</span>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={cancelSmsForm}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      onClick={saveSms}
                      disabled={!smsName.trim() || !smsMessage.trim()}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Templates List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SMS Templates</CardTitle>
                    <CardDescription>
                      Manage your SMS templates for invitations
                    </CardDescription>
                  </div>
                  {!isCreatingSms && !editingSmsId && (
                    <Button
                      onClick={startCreatingSms}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Template
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {smsTemplates.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No templates found. Create your first template to get started.
                    </p>
                  ) : (
                    smsTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-xl border border-gray-200 p-4 transition hover:border-brand-primary hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-gray-100 p-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {template.name}
                              </p>
                              {template.isDefault && (
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {template.message}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          {!template.isDefault && (
                            <>
                              <Button
                                onClick={() => startEditingSms(template)}
                                size="sm"
                                variant="outline"
                                className="flex-1"
                              >
                                <Edit className="mr-2 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleDeleteSms(template.id)}
                                size="sm"
                                variant="outline"
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}


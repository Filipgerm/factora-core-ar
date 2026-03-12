"use client";

import { useState, useRef } from "react";
import { Search, Filter, MessageSquare, Lock, AlertTriangle, ShieldAlert, FileText, X, ChevronDown, Flag, Paperclip, Send, Bot, User, Clock, Edit2, Trash2, Pin, Check } from "lucide-react";
import { motion } from "framer-motion";
import { type Customer } from "@/lib/customers-data";


// --- NOTES TAB CONSTANTS AND COMPONENT ---

const MOCK_NOTES = [
    {
        id: 1,
        author: "John Smith",
        role: "Senior Credit Analyst",
        content: "Spoke with the CFO. They are anticipating a cash flow boost following the completion of a major contract. Recommending we prepare for a credit limit increase.",
        timestamp: "2025-01-27T10:30:00Z",
        type: "Internal",
        isPinned: true,
        priority: "normal",
        isSystem: false,
    },
    {
        id: 2,
        author: "Sarah Lee",
        role: "Risk Manager",
        content: "Manual review of latest bank statements shows healthy cash flow, but high concentration in a single vendor. Monitoring for 30 days before further adjustments.",
        timestamp: "2025-01-24T15:45:00Z",
        type: "Risk Alert",
        isPinned: false,
        priority: "high",
        isSystem: false,
        attachments: [
            { name: "Q4_Bank_Statements.pdf", size: "2.4 MB", type: "pdf" },
            { name: "Vendor_Concentration_Analysis.pdf", size: "1.1 MB", type: "pdf" }
        ]
    },
    {
        id: 3,
        author: "System Bot",
        role: "Automated Service",
        content: "Automated KYC refresh completed. No discrepancies found in legal form or business address.",
        timestamp: "2025-01-20T09:00:00Z",
        type: "Compliance",
        isPinned: false,
        priority: "low",
        isSystem: true,
        attachments: []
    }
];

const NOTE_TYPES = [
    { id: 'General', label: 'General Note', icon: MessageSquare, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
    { id: 'Internal', label: 'Internal Only', icon: Lock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { id: 'Risk Alert', label: 'Risk Alert', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
    { id: 'Compliance', label: 'Compliance', icon: ShieldAlert, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
];

export const NotesTab = ({ customer }: { customer: Customer }) => {
    // 1. Initialize State with MOCK_NOTES
    const [notes, setNotes] = useState(MOCK_NOTES);

    const [searchTerm, setSearchTerm] = useState("");
    const [newNote, setNewNote] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [selectedType, setSelectedType] = useState(NOTE_TYPES[0]);
    const [isHighPriority, setIsHighPriority] = useState(false);
    const [showTypeMenu, setShowTypeMenu] = useState(false);

    // NEW: Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState("");

    // Mock state for a file currently being "attached" in the composer
    const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAttachedFiles([...attachedFiles, { name: file.name, size: "1.2 MB", type: "pdf" }]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
    };

    // Handle Post Note
    const handlePostNote = () => {
        if (!newNote.trim()) return;

        const newNoteObj = {
            id: Date.now(), // Unique ID based on timestamp
            author: "John Doe", // Logged in user
            role: "Credit Manager",
            content: newNote,
            timestamp: new Date().toISOString(),
            type: selectedType.id,
            isPinned: false,
            priority: isHighPriority ? "high" : "normal",
            isSystem: false,
            attachments: [...attachedFiles], // Copy attached files
            isEditable: true // Mark as editable for the demo
        };

        setNotes([newNoteObj, ...notes]); // Prepend to list

        // Reset Form
        setNewNote("");
        setAttachedFiles([]);
        setIsHighPriority(false);
        setSelectedType(NOTE_TYPES[0]);
    };

    // NEW: Handle Delete
    const handleDelete = (id: number) => {
        setNotes(prev => prev.filter(note => note.id !== id));
    };

    // NEW: Handle Edit Start
    const handleStartEdit = (note: any) => {
        setEditingId(note.id);
        setEditContent(note.content);
    };

    // NEW: Handle Save Edit
    const handleSaveEdit = (id: number) => {
        setNotes(prev => prev.map(note =>
            note.id === id ? { ...note, content: editContent } : note
        ));
        setEditingId(null);
    };

    return (
        <div className="space-y-6 py-2">
            {/* 1. Header & Quick Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search notes & attachments..."
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 outline-none transition-all bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors">
                        <Filter className="w-3.5 h-3.5" />
                        Filter
                    </button>
                </div>
            </div>

            {/* 2. Enhanced Note Composer */}
            <motion.div
                animate={isFocused ? { y: -2, scale: 1.005 } : { y: 0, scale: 1 }}
                className={`relative bg-white border rounded-2xl transition-all shadow-sm overflow-visible z-20
            ${isFocused ? 'border-blue-300 shadow-xl ring-4 ring-blue-500/5' : 'border-gray-100'}`}
            >
                <textarea
                    placeholder="Add a collaboration note..."
                    className="w-full p-5 text-sm outline-none resize-none min-h-[100px] placeholder:text-gray-400 rounded-t-2xl"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />

                {/* Attachment Preview Area */}
                {attachedFiles.length > 0 && (
                    <div className="px-5 pb-3 flex flex-wrap gap-2">
                        {attachedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                                <FileText className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-xs font-medium text-gray-700">{file.name}</span>
                                <button
                                    onClick={() => removeAttachment(idx)}
                                    className="p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                    <X className="w-3 h-3 text-gray-500" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/50 rounded-b-2xl">
                    <div className="flex items-center gap-3">

                        {/* Note Type Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setShowTypeMenu(!showTypeMenu)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
                    ${selectedType.bg} ${selectedType.color} ${selectedType.border}`}
                            >
                                <selectedType.icon className="w-3.5 h-3.5" />
                                {selectedType.label}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>

                            {showTypeMenu && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg p-1 z-30">
                                    {NOTE_TYPES.map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => { setSelectedType(type); setShowTypeMenu(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                                        >
                                            <type.icon className={`w-3.5 h-3.5 ${type.color}`} />
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="h-5 w-px bg-gray-200 mx-1" />

                        {/* High Priority Toggle */}
                        <button
                            onClick={() => setIsHighPriority(!isHighPriority)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all border
                  ${isHighPriority
                                    ? 'bg-red-50 text-red-600 border-red-100'
                                    : 'text-gray-400 hover:text-gray-600 border-transparent hover:bg-gray-100'}`}
                        >
                            <Flag className={`w-3.5 h-3.5 ${isHighPriority ? 'fill-red-600' : ''}`} />
                            Priority
                        </button>

                        {/* Attachment Button */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.png,.jpg"
                        />
                        <button
                            onClick={handleAttachClick}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-gray-600 border border-transparent hover:bg-gray-100 transition-colors"
                        >
                            <Paperclip className="w-3.5 h-3.5" />
                            Attach
                        </button>
                    </div>

                    <button
                        disabled={!newNote.trim()}
                        onClick={handlePostNote}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-30 disabled:grayscale hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-200"
                    >
                        Post Note
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </motion.div>

            {/* 3. Notes List */}
            <div className="space-y-4">
                {notes.map((note: any) => ( // Changed from MOCK_NOTES to notes state
                    <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group relative p-6 border rounded-2xl transition-all hover:shadow-md
                ${note.isSystem
                                ? 'bg-gray-50/60 border-gray-200/60'
                                : 'bg-white border-gray-100'
                            }
                ${note.isPinned ? 'border-blue-100 ring-1 ring-blue-50' : ''}`}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">

                                {/* AVATAR LOGIC UPDATE */}
                                {note.isSystem ? (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 border border-purple-100 text-purple-600">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                ) : note.author === "John Doe" ? (
                                    // JOHN DOE AVATAR (Matches Sidebar)
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 shadow-sm">
                                        <span className="text-sm font-bold text-emerald-700 leading-none">JD</span>
                                    </div>
                                ) : (
                                    // Other Users (John Smith, Sarah Lee)
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary-subtle border border-brand-primary-border text-brand-primary">
                                        <User className="w-5 h-5" />
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900">{note.author}</span>

                                        {/* Tag Badges (Existing Logic) */}
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border flex items-center gap-1
                        ${note.type === 'Internal' || note.type === 'General' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                note.type === 'Risk Alert' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                    note.type === 'Compliance' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        'bg-gray-50 text-gray-500 border-gray-100'}`}
                                        >
                                            {note.type === 'Risk Alert' && <AlertTriangle className="w-3 h-3" />}
                                            {note.type === 'Internal' && <Lock className="w-3 h-3" />}
                                            {note.type === 'Compliance' && <ShieldAlert className="w-3 h-3" />}
                                            {note.type === 'General' && <MessageSquare className="w-3 h-3" />}
                                            {/* Handle type object or string mismatch safely if needed */}
                                            {typeof note.type === 'string' ? note.type : 'General'}
                                        </span>

                                        {/* Priority Badge */}
                                        {note.priority === 'high' && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter bg-red-50 text-red-600 border border-red-100 flex items-center gap-1">
                                                <Flag className="w-3 h-3 fill-red-600" />
                                                High
                                            </span>
                                        )}
                                        {note.isPinned && <Pin className="w-3 h-3 text-blue-500 fill-blue-500 ml-1" />}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">
                                        {note.role}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mr-2">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(note.timestamp)}
                                </div>

                                {/* EDIT/DELETE ACTIONS (Only for John Doe / Editable notes) */}
                                {note.isEditable && editingId !== note.id && (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleStartEdit(note)}
                                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Edit Note"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(note.id)}
                                            className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-gray-400 transition-colors"
                                            title="Delete Note"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Area - Handles View Mode vs Edit Mode */}
                        <div className="pl-[56px]">
                            {editingId === note.id ? (
                                // EDIT MODE
                                <div className="flex flex-col gap-2">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full p-3 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-blue-50/10 min-h-[80px]"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleSaveEdit(note.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                                        >
                                            <Check className="w-3 h-3" />
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // VIEW MODE
                                <p className={`text-sm leading-relaxed font-medium ${note.isSystem ? 'text-gray-500 italic' : 'text-gray-600'}`}>
                                    {note.content}
                                </p>
                            )}

                            {/* Attachments Section */}
                            {note.attachments && note.attachments.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-3">
                                    {note.attachments.map((file: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="group/file flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer min-w-[200px]"
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                                                <FileText className="w-4 h-4 text-red-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-700 group-hover/file:text-blue-700 truncate max-w-[140px]">
                                                    {file.name}
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                                    {file.size} • {file.type.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        {!note.isSystem && editingId !== note.id && (
                            <div className="mt-4 pl-[56px] flex items-center gap-6">
                                <button className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-blue-600 transition-colors">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Reply
                                </button>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
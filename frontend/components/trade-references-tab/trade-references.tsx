"use client";

import { useState } from "react";
import { Search, Plus, User, Edit2, Trash2, Mail, Phone, History, DollarSign, Clock, Calendar, TrendingUp, ChevronRight, AlertTriangle, Save, Star, CalendarCheck, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";


// --- TRADE REFERENCES TAB (ENHANCED SPLIT VIEW) ---

const INITIAL_TRADE_REFERENCES = [
    { id: 1, name: "TechParts Solutions", contact: "Elena Fisher", email: "elena@techparts.com", phone: "+30 210 555 0123", duration: "5 Years", averagePurchase: 12500, highestCredit: 15000, paymentTerms: "Net 30", dbt: 2, status: "verified", lastSale: "15 Jan 2025", rating: "Excellent" },
    { id: 3, name: "Alpha Raw Materials", contact: "Sarah Connors", email: "s.connors@alpha-raw.com", phone: "+44 20 7123 4567", duration: "7 Years", averagePurchase: 25000, highestCredit: 30000, paymentTerms: "Net 45", dbt: 0, status: "verified", lastSale: "02 Feb 2025", rating: "Excellent" },
    { id: 4, name: "Rapid Transport SA", contact: "Michael O'Neil", email: "mike@rapidtrans.ie", phone: "+353 1 555 0122", duration: "2 Years", averagePurchase: 4500, highestCredit: 5000, paymentTerms: "Net 15", dbt: 5, status: "verified", lastSale: "10 Mar 2025", rating: "Good" },
    { id: 5, name: "NextGen Components", contact: "Lucas M.", email: "lucas@nextgen.de", phone: "+49 30 1234 5678", duration: "1 Year", averagePurchase: 3000, highestCredit: 3000, paymentTerms: "Prepaid", dbt: 0, status: "pending", lastSale: "22 Jan 2025", rating: "Fair" },
];

export const TradeReferencesTab = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [references, setReferences] = useState(INITIAL_TRADE_REFERENCES);
    const [selectedId, setSelectedId] = useState<number | null>(INITIAL_TRADE_REFERENCES[0].id);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Filter List
    const filteredRefs = references.filter(ref =>
        ref.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.contact.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedRef = references.find(r => r.id === selectedId);

    const handleSelect = (id: number) => {
        setSelectedId(id);
        setIsEditing(false);
        setEditForm(null);
    };

    const handleEditClick = () => {
        if (selectedRef) {
            setEditForm({ ...selectedRef });
            setIsEditing(true);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditForm(null);
    };

    const handleSave = () => {
        setReferences(refs => refs.map(r => r.id === editForm.id ? editForm : r));
        setIsEditing(false);
        setEditForm(null);
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const performDelete = () => {
        if (!selectedId) return;
        const newRefs = references.filter(r => r.id !== selectedId);
        setReferences(newRefs);

        if (newRefs.length > 0) {
            setSelectedId(newRefs[0].id);
        } else {
            setSelectedId(null);
        }

        setIsEditing(false);
        setShowDeleteConfirm(false);
    };

    const handleAddNew = () => {
        const newId = Math.max(...references.map(r => r.id)) + 1;
        const newRef = {
            id: newId,
            name: "New Reference",
            contact: "",
            email: "",
            phone: "",
            duration: "0 Years",
            averagePurchase: 0,
            highestCredit: 0,
            paymentTerms: "Net 30",
            dbt: 0,
            status: "pending",
            lastSale: "01 Jan 2025",
            rating: "Good"
        };
        setReferences([newRef, ...references]);
        setSelectedId(newId);
        setEditForm(newRef);
        setIsEditing(true);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[650px]">
            {/* LEFT COLUMN: LIST */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
                {/* Search & Add */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-sm">
                    {filteredRefs.map(ref => (
                        <div
                            key={ref.id}
                            onClick={() => handleSelect(ref.id)}
                            className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 flex items-center justify-between
                  ${selectedId === ref.id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                        >
                            <div>
                                <div className="font-bold text-sm text-gray-900">{ref.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{ref.contact}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge
                                    className={`text-[10px] px-1.5 py-0 border-0
                      ${ref.status === 'verified'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-orange-100 text-orange-700'}`}
                                >
                                    {ref.status}
                                </Badge>
                                {selectedId === ref.id && <ChevronRight className="w-4 h-4 text-blue-400" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT COLUMN: DETAILS */}
            <div className="w-full lg:w-2/3">
                {selectedRef ? (
                    <Card className="h-full flex flex-col overflow-hidden border-gray-200 shadow-lg">
                        {/* Detail Header */}
                        <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl shadow-sm border border-blue-200">
                                    {selectedRef.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        {isEditing ? (
                                            <input
                                                className="text-xl font-bold text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 mb-1 w-full"
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                        ) : (
                                            <h2 className="text-xl font-bold text-gray-900">{selectedRef.name}</h2>
                                        )}

                                        {!isEditing && (
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 hidden sm:flex">
                                                <Award className="w-3 h-3" />
                                                {selectedRef.duration} Partner
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <User className="w-3.5 h-3.5" />
                                        {isEditing ? (
                                            <input
                                                className="bg-white border border-gray-200 rounded px-2 py-0.5 w-32"
                                                value={editForm.contact}
                                                onChange={e => setEditForm({ ...editForm, contact: e.target.value })}
                                            />
                                        ) : selectedRef.contact}
                                    </div>

                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                {isEditing && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-indigo-600 uppercase">Duration:</span>
                                        <input
                                            className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 w-24"
                                            value={editForm.duration}
                                            onChange={e => setEditForm({ ...editForm, duration: e.target.value })}
                                        />
                                    </div>
                                )}
                                {isEditing ? (
                                    <>
                                        <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                                        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700">
                                            <Save className="w-3.5 h-3.5" /> Save
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                        <button onClick={handleEditClick} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                            <Edit2 className="w-3.5 h-3.5" /> Edit
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Highest Credit */}
                                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 relative overflow-hidden group">
                                    <div className="flex items-center gap-2 text-blue-600 mb-1 relative z-10">
                                        <DollarSign className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Highest Credit</span>
                                    </div>
                                    {isEditing ? (
                                        <input type="number" className="text-2xl font-bold text-gray-900 bg-white w-full rounded border border-gray-200" value={editForm.highestCredit} onChange={e => setEditForm({ ...editForm, highestCredit: parseInt(e.target.value) })} />
                                    ) : (
                                        <div className="text-2xl font-bold text-gray-900 relative z-10">${selectedRef.highestCredit.toLocaleString()}</div>
                                    )}
                                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-blue-100/50 rounded-full blur-xl group-hover:bg-blue-200/50 transition-colors"></div>
                                </div>

                                {/* Average Purchase */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Avg. Purchase</span>
                                    </div>
                                    {isEditing ? (
                                        <input type="number" className="text-lg font-bold text-gray-900 bg-white w-full rounded border border-gray-200" value={editForm.averagePurchase} onChange={e => setEditForm({ ...editForm, averagePurchase: parseInt(e.target.value) })} />
                                    ) : (
                                        <div className="text-lg font-bold text-gray-900">${selectedRef.averagePurchase.toLocaleString()}</div>
                                    )}
                                </div>

                                {/* Payment Terms */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Payment Terms</span>
                                    </div>
                                    {isEditing ? (
                                        <input className="text-lg font-bold text-gray-900 bg-white w-full rounded border border-gray-200" value={editForm.paymentTerms} onChange={e => setEditForm({ ...editForm, paymentTerms: e.target.value })} />
                                    ) : (
                                        <div className="text-lg font-bold text-gray-900">{selectedRef.paymentTerms}</div>
                                    )}
                                </div>

                                {/* DBT (Days Beyond Terms) */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">DBT (Days)</span>
                                    </div>
                                    {isEditing ? (
                                        <input type="number" className="text-2xl font-bold text-gray-900 bg-white w-full rounded border border-gray-200" value={editForm.dbt} onChange={e => setEditForm({ ...editForm, dbt: parseInt(e.target.value) })} />
                                    ) : (
                                        <div className={`text-2xl font-bold ${selectedRef.dbt > 5 ? 'text-red-600' : 'text-green-600'}`}>
                                            {selectedRef.dbt}
                                        </div>
                                    )}
                                </div>

                                {/* Date of Last Sale */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <CalendarCheck className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Last Sale</span>
                                    </div>
                                    {isEditing ? (
                                        <input className="text-lg font-bold text-gray-900 bg-white w-full rounded border border-gray-200" value={editForm.lastSale} onChange={e => setEditForm({ ...editForm, lastSale: e.target.value })} />
                                    ) : (
                                        <div className="text-lg font-bold text-gray-900">{selectedRef.lastSale}</div>
                                    )}
                                </div>

                                {/* Overall Rating */}
                                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 hover:border-amber-200 transition-all">
                                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                                        <Star className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Overall Rating</span>
                                    </div>
                                    {isEditing ? (
                                        <select
                                            className="text-lg font-bold text-gray-900 bg-white w-full rounded border border-gray-200 p-1"
                                            value={editForm.rating}
                                            onChange={e => setEditForm({ ...editForm, rating: e.target.value })}
                                        >
                                            <option value="Excellent">Excellent</option>
                                            <option value="Good">Good</option>
                                            <option value="Fair">Fair</option>
                                            <option value="Poor">Poor</option>
                                        </select>
                                    ) : (
                                        <div className="text-lg font-bold text-amber-700 flex items-center gap-2">
                                            {selectedRef.rating}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact Information - Simplified now that Duration is moved */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Contact Details</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-500">Email Address</span>
                                        </div>
                                        {isEditing ? (
                                            <input className="text-sm font-medium text-right bg-white border border-gray-200 rounded" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                        ) : (
                                            <span className="text-sm font-bold text-gray-900">{selectedRef.email}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-500">Phone Number</span>
                                        </div>
                                        {isEditing ? (
                                            <input className="text-sm font-medium text-right bg-white border border-gray-200 rounded" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                                        ) : (
                                            <span className="text-sm font-bold text-gray-900">{selectedRef.phone}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                        Select a reference to view details
                    </div>
                )}
            </div>
            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm"
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-gray-900">Delete Reference?</h3>
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to remove this trade reference? This action cannot be undone.
                                    </p>
                                </div>
                                <div className="flex gap-3 w-full mt-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 px-4 py-2 text-sm font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={performDelete}
                                        className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Yes, Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
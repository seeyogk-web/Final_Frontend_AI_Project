
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { baseUrl } from '../../utils/ApiConstants';
import { Pencil, Save, X } from "lucide-react";

function CandidateProfile() {
    const [candidate, setCandidate] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [phone, setPhone] = useState("");
    const [resume, setResume] = useState(null);
    const [resumeUrl, setResumeUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const resumeRef = useRef(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("candidateToken");
                const res = await axios.get(`${baseUrl}/api/candidate/profile/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCandidate(res.data.candidate);
                setPhone(res.data.candidate.phone || "");
                setResumeUrl(res.data.candidate.resume || "");
            } catch (err) {
                setCandidate(null);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleResumeChange = (e) => {
        const file = e.target.files[0];
        if (file) setResume(file);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem("candidateToken");
            const formData = new FormData();
            formData.append("phone", phone);
            if (resume) formData.append("resume", resume);
            const res = await axios.put(`${baseUrl}/api/candidate/profile/me`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            setCandidate(res.data.candidate);
            setResumeUrl(res.data.candidate.resume || "");
            setEditMode(false);
            setResume(null);
            alert("Profile updated successfully!");
        } catch (err) {
            alert("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };



    if (loading) {
        return <div className="flex justify-center items-center min-h-screen text-gray-500">Loading profile...</div>;
    }
    if (!candidate) {
        return <div className="flex justify-center items-center min-h-screen text-red-500">Failed to load profile.</div>;
    }
    return (
        <section className="flex flex-col items-center">
            <div className="border border-gray-400 shadow-xl rounded-3xl p-6 bg-gray-50 min-h-screen max-w-3xl w-full">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                    <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center text-4xl text-white font-bold bg-gradient-to-br from-purple-400 to-blue-500">
                        {candidate.name ? candidate.name[0].toUpperCase() : '?'}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-1">{candidate.name}</h2>
                        <p className="text-gray-600">{candidate.email}</p>
                        <p className="text-gray-600">{candidate.phone}</p>
                    </div>
                </div>
                <div className="bg-white shadow-sm border border-gray-200 rounded-2xl mb-8 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-semibold text-gray-800 text-lg">Profile Details</h2>
                        {!editMode && (
                            <button
                                onClick={() => setEditMode(true)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                                <Pencil size={16} /> Edit
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input type="text" value={candidate.name} disabled className="w-full rounded-md px-3 py-2 text-sm border border-gray-200 bg-gray-100 text-gray-500" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" value={candidate.email} disabled className="w-full rounded-md px-3 py-2 text-sm border border-gray-200 bg-gray-100 text-gray-500" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                disabled={!editMode}
                                className={`w-full rounded-md px-3 py-2 text-sm ${editMode ? 'border border-gray-400' : 'border border-gray-200 bg-gray-100 text-gray-500'}`}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1">Resume</label>
                            {resumeUrl && (
                                <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-600 underline mb-2">View Current Resume</a>
                            )}
                            {editMode && (
                                <input
                                    ref={resumeRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleResumeChange}
                                    className="w-full"
                                />
                            )}
                        </div>
                    </div>
                    {editMode && (
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md transition shadow-md disabled:bg-blue-300"
                            >
                                <Save size={20} /> {saving ? 'Saving...' : 'Save Profile'}
                            </button>
                            <button
                                onClick={() => { setEditMode(false); setPhone(candidate.phone); setResume(null); }}
                                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-6 py-2 rounded-md transition shadow-md"
                            >
                                <X size={20} /> Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default CandidateProfile;
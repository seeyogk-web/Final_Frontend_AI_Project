import React, { useEffect, useState } from "react";
import { Search, MapPin, SlidersHorizontal, X, Upload } from "lucide-react";
import Pagination from "../../components/LandingPage/Pagination";
import axios from "axios";
import { baseUrl } from "../../utils/ApiConstants";

const AllJDs = () => {
    const [jdData, setJdData] = useState([]);
    const [appliedJdIds, setAppliedJdIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [showCandidateModal, setShowCandidateModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [resume, setResume] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        reallocate: false
    });

    useEffect(() => {
        const fetchAppliedJDs = async () => {
            try {
                const response = await axios.get(`${baseUrl}/api/candidate/applied-jobs`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('candidateToken')}`,
                    },
                });
                console.log('Applied JDs data:', response.data);

                if (response.data.success && response.data.jobs) {
                    const appliedIds = response.data.jobs.map(job => job._id);
                    setAppliedJdIds(appliedIds);
                }
            } catch (error) {
                console.error('Error fetching applied JDs:', error);
            }
        };
        fetchAppliedJDs();
    }, []);

    useEffect(() => {
        const fetchJDs = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${baseUrl}/api/jd/all-jd`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('candidateToken')}`,
                    }
                });

                console.log('JDs Data:', response.data);

                if (response.data.success && response.data.data) {
                    const mappedData = response.data.data
                        .filter(item => item._id)
                        .filter(item => !appliedJdIds.includes(item._id))
                        .map(item => ({
                            id: item._id,
                            _id: item._id,
                            title: item.offerId?.jobTitle || 'Job Title Not Available',
                            location: item.offerId?.location || 'Location Not Specified',
                            company: item.companyName || 'Company Not Specified',
                            companyId: `#${item._id.slice(-6)}`,
                            skills: item.requirements?.slice(0, 4).join(', ') + (item.requirements?.length > 4 ? ', etc.' : '') || 'Skills not specified',
                            skillsArray: item.requirements?.slice(0, 6) || [],
                            primaryLocation: item.offerId?.location || 'Location Not Specified',
                            jobSummary: item.jobSummary || '',
                            responsibilities: item.responsibilities || [],
                            requirements: item.requirements || [],
                            benefits: item.benefits || [],
                            additionalInfo: item.additionalInfo || '',
                            department: item.department || '',
                            createdBy: item.createdBy || {},
                            publicToken: item.publicToken || '',
                            createdAt: item.createdAt || '',
                        }))
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setJdData(mappedData);
                }

            } catch (error) {
                console.error('Error fetching JDs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchJDs();
    }, [appliedJdIds]);

    const itemsPerPage = 6;
    const totalPages = Math.ceil(jdData.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCandidates = jdData.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleApplyClick = (candidate) => {
        setSelectedJob(candidate);
        // Save the selected JD to localStorage for use in assessment flow
        localStorage.setItem("selectedJD", JSON.stringify(candidate));
        console.log("Saved selectedJD to localStorage:", candidate);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setSelectedJob(null);
        setShowModal(false);
    };

    const handleApplyFromModal = () => {
        setShowModal(false);
        setShowApplicationForm(true);
    };

    const handleCloseApplicationForm = () => {
        setShowApplicationForm(false);
        setResume(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            reallocate: false
        });
    };

    const handleFileChange = (e) => {
        setResume(e.target.files[0]);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'phone') {
            const numericValue = value.replace(/[^0-9]/g, '');
            setFormData(prev => ({
                ...prev,
                [name]: numericValue
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmitApplication = async (e) => {
        e.preventDefault();

        if (!resume) {
            alert('Please upload a resume');
            return;
        }

        if (!formData.name || !formData.email || !formData.phone) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('candidateToken');

            const submitData = new FormData();
            submitData.append('resume', resume);
            submitData.append('name', formData.name);
            submitData.append('email', formData.email);
            submitData.append('phone', formData.phone);
            submitData.append('reallocate', formData.reallocate ? 'yes' : 'no');

            console.log('Applying to JD ID:', selectedJob._id);
            console.log('Form Data:', {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                reallocate: formData.reallocate
            });

            const response = await axios.post(
                `${baseUrl}/api/candidate/apply/${selectedJob._id}`,
                submitData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    }
                }
            );

            console.log('Application Response:', response.data);

            if (response.data.success) {
                // Add the newly applied job ID to the appliedJdIds state
                setAppliedJdIds(prev => [...prev, selectedJob._id]);
                setShowApplicationForm(false);
                setShowCandidateModal(true);
                alert('Application submitted successfully!');
            }

        } catch (error) {
            console.error('Error submitting application:', error);
            const errorMessage = "Please enter registered Email Id";
            alert(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseCandidateModal = () => {
        setShowCandidateModal(false);
        setSelectedJob(null);
        setResume(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            reallocate: false
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <header>
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h1 className="text-2xl sm:text-3xl text-gray-900">Candidate</h1>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        {/* <div className="relative flex-1 sm:flex-initial">
                            <input
                                type="text"
                                placeholder="Search by Candidate Name"
                                className="w-full sm:w-64 pl-2 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button className="absolute right-0 top-0 h-full px-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                                <Search className="w-5 h-5" />
                            </button>
                        </div>

                        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg transition-colors hover:bg-gray-800">
                            <SlidersHorizontal className="w-5 h-5" />
                            <span className="font-medium">Filter</span>
                        </button> */}
                    </div>
                </div>
            </header>

            <main className="mt-10">
                {currentCandidates.length === 0 ? (
                    <div className="text-center text-gray-600 py-10">
                        No job descriptions available.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        {currentCandidates.map((candidate) => (
                            <div
                                key={candidate.id}
                                className="bg-white rounded-lg border border-gray-300 shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <h2 className="text-xl font-bold text-gray-900 mb-3">{candidate.title}</h2>

                                <div className="flex items-center gap-2 mb-4">
                                    <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <span className="text-sm text-green-600 font-medium">
                                        {candidate.location}
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <p className="text-gray-900 font-medium">
                                        {candidate.company}
                                    </p>
                                </div>

                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Skills</h3>
                                    <div className="h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-3">
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {candidate.skills}
                                        </p>
                                    </div>
                                </div>

                                <hr className="mb-4" />

                                <div className="flex flex-row-reverse items-center gap-3">

                                    <button
                                        onClick={() => handleApplyClick(candidate)}
                                        className="px-6 bg-black text-white py-1.5 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {jdData.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                )}
            </main>

            {showModal && selectedJob && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-3 right-3 text-gray-500 hover:text-black transition"
                        >
                            <X size={22} />
                        </button>

                        <div className="p-6 space-y-5">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedJob.title}</h2>
                                <div className="flex items-center text-red-600 text-sm font-medium">
                                    <MapPin size={16} className="mr-1" />
                                    {selectedJob.location}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-1">Job Summary:</h3>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    {selectedJob.jobSummary || 'No job summary available.'}
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Key Responsibilities:</h3>
                                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                                    {selectedJob.responsibilities?.length > 0 ? (
                                        selectedJob.responsibilities.map((resp, idx) => (
                                            <li key={idx}>{resp}</li>
                                        ))
                                    ) : (
                                        <li>No responsibilities listed.</li>
                                    )}
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Requirements:</h3>
                                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                                    {selectedJob.requirements?.length > 0 ? (
                                        selectedJob.requirements.map((req, idx) => (
                                            <li key={idx}>{req}</li>
                                        ))
                                    ) : (
                                        <li>No requirements listed.</li>
                                    )}
                                </ul>
                            </div>

                            {selectedJob.benefits?.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Benefits:</h3>
                                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                                        {selectedJob.benefits.map((benefit, idx) => (
                                            <li key={idx}>{benefit}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <hr />

                            <div className="pt-2 flex justify-center">
                                <button
                                    onClick={handleApplyFromModal}
                                    className="bg-black text-white font-medium py-2 px-16 rounded-lg transition hover:bg-gray-800 mx-auto"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showApplicationForm && selectedJob && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            className="absolute top-3 right-4 text-gray-500 hover:text-black text-xl"
                            onClick={handleCloseApplicationForm}
                            disabled={submitting}
                        >
                            <X size={22} />
                        </button>

                        <div className="p-6">
                            <div className="mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Apply for {selectedJob.title}
                                </h2>
                                <div className="flex items-center gap-1 text-red-500 mt-1">
                                    <MapPin size={16} />
                                    <span>{selectedJob.primaryLocation || selectedJob.location}</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitApplication} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Resume<span className="text-red-500">*</span>
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                                        <Upload size={28} className="text-gray-400 mb-2" />
                                        <label
                                            htmlFor="resume"
                                            className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-800 text-sm"
                                        >
                                            Upload a Resume
                                        </label>
                                        <p className="text-xs text-gray-500 mt-2">
                                            PDF, DOC, DOCX up to 5MB
                                        </p>
                                        <input
                                            id="resume"
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        {resume && (
                                            <p className="mt-2 text-sm text-green-600">{resume.name}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name<span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email<span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Enter your email"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone<span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="Enter your phone number"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:outline-none"
                                        required
                                        maxLength={10}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="reallocate"
                                        name="reallocate"
                                        checked={formData.reallocate}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 border-gray-300 rounded accent-black"
                                    />
                                    <label
                                        htmlFor="reallocate"
                                        className="text-sm text-gray-700 select-none"
                                    >
                                        I am willing to relocate for this position
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showCandidateModal && selectedJob && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 py-3 px-4">
                    <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full overflow-y-auto relative">
                        <button
                            onClick={handleCloseCandidateModal}
                            className="absolute top-3 right-3 text-gray-500 hover:text-black transition"
                        >
                            <X size={22} />
                        </button>

                        <div className="px-6 py-4 space-y-3">
                            <h2 className="text-xl font-semibold">
                                View for {selectedJob?.title}
                            </h2>
                            <p className="flex items-center text-red-500 font-medium">
                                <span className="mr-2">📍</span>
                                {selectedJob?.primaryLocation || selectedJob?.location}
                            </p>

                            <div className="space-y-2">
                                <div>
                                    <span className="font-semibold">Company:</span>{" "}
                                    {selectedJob?.company}
                                </div>
                                <div>
                                    <span className="font-semibold">Skills:</span>{" "}
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {(selectedJob?.skillsArray || []).map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <span className="font-semibold">Resume:</span>
                                <div className="mt-1 flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2">
                                    <span className="truncate">{selectedJob?.resume || "resume_2024.pdf"}</span>
                                    <button
                                        className="text-gray-500 hover:text-black"
                                        onClick={() => navigator.clipboard.writeText(selectedJob?.resume || "resume.pdf")}
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllJDs;
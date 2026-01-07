import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, Edit, Eye, Trash2 } from 'lucide-react';
import Pagination from '../../components/LandingPage/Pagination';
import RequirementAddNote from './RequirementAddNote';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { baseUrl } from '../../utils/ApiConstants';
import SpinLoader from '../../components/SpinLoader';

export default function AssignedRecruiters() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const jobsPerPage = 5;

    useEffect(() => {
        const fetchAllOffer = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${baseUrl}/api/offer/overview`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                console.log("hii", response.data);

                if (response.data.success && response.data.data) {
                    const mappedJobs = response.data.data.map((job, index) => ({
                        id: job._id,
                        jobId: `#${job._id.slice(-6)}`,
                        title: job.jobTitle,
                        deadline: new Date(job.dueDate).toLocaleDateString('en-GB'),
                        status: job.status,
                        assignedTo: job.assignedTo?.name || 'Unassigned',
                        fullData: job
                    }));
                    setJobs(mappedJobs);
                }

            } catch (error) {
                console.error('Error fetching offers:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchAllOffer();
    }, [])

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this offer?')) {
            try {
                const response = await axios.delete(`${baseUrl}/api/offer/${id}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });

                if (response.data.success) {
                    setJobs(jobs.filter(job => job.id !== id));
                    alert('Offer deleted successfully');
                }
            } catch (error) {
                console.error('Error deleting offer:', error);
                alert('Failed to delete offer');
            }
        }
    };

    const filteredJobs = jobs.filter((job) =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
    const startIndex = (currentPage - 1) * jobsPerPage;
    const currentJobs = filteredJobs.slice(startIndex, startIndex + jobsPerPage);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Closed': return 'bg-yellow-100 text-yellow-700';
            case 'Open': return 'bg-green-100 text-green-700';
            case 'Expired': return 'bg-red-100 text-red-700';
            case 'JD pending': return 'bg-yellow-100 text-yellow-700';
            case 'JD created': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <SpinLoader />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto rounded-2xl border border-gray-300 shadow-lg p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full sm:w-auto">
                        <div className="relative w-[260px] sm:w-[280px]">
                            <input
                                type="text"
                                placeholder="Search by Job Title"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-12 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button className="absolute right-0 top-0 h-full px-4 bg-black text-white rounded-r-lg hover:bg-gray-800 transition-colors">
                                <Search size={18} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className="text-sm text-gray-700">Closed</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-sm text-gray-700">Open</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-sm text-gray-700">Expired</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                        <button onClick={()=>navigate("/RMGAdmin-Dashboard/RequirementForm")} className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                            Create
                        </button>
                        {/* <button className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                            <SlidersHorizontal size={18} />
                            Filter
                        </button> */}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-300 shadow-lg">
                    <table className="min-w-[900px] w-full border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 w-[60px]">Sl.No</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 w-[140px]">ID</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 w-[200px]">Job Title</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 w-[160px]">Deadline</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 w-[160px]">Status</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 w-[160px]">Assigned To</th>
                                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 w-[400px]">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {currentJobs.map((job, index) => (
                                <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6 text-sm text-gray-700">{startIndex + index + 1}.</td>
                                    <td className="py-4 px-6 text-sm text-gray-700">{job.jobId}</td>
                                    <td className="py-4 px-6 text-sm text-gray-700">{job.title}</td>
                                    <td className="py-4 px-6 text-sm text-gray-700">{job.deadline}</td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-700">{job.assignedTo}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                                            {/* <button className="p-2 border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors">
                                                <Eye size={16} />
                                            </button> */}
                                            <button 
                                                onClick={() => handleDelete(job.id)}
                                                className="p-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => navigate('/RMGAdmin-Dashboard/SeeHistory', {
                                                    state: { jdData: job }
                                                })}
                                                className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors whitespace-nowrap">
                                                See History
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />

            </div>
        </div>
    );
}
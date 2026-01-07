import { useEffect, useState } from 'react';
import { Trash2, Search, SlidersHorizontal, X } from 'lucide-react';
import Pagination from '../../components/LandingPage/Pagination';
import axios from 'axios';
import { baseUrl } from '../../utils/ApiConstants';

function AppliedJD() {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [appliedJobs, setAppliedJobs] = useState([]);
    const [selectedSkills, setSelectedSkills] = useState(null);
    const [showSkillsPopup, setShowSkillsPopup] = useState(false);
    const itemsPerPage = 5;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${baseUrl}/api/candidate/applied-jds`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('candidateToken')}`,
                    },
                });
                console.log('Applied JDs data:', response.data);
                if (response.data.success) {
                    setAppliedJobs(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching applied JDs:', error);
            }
        };
        fetchData();
    }, []);

    const handleViewSkills = (requirements) => {
        setSelectedSkills(requirements);
        setShowSkillsPopup(true);
    };

    const closeSkillsPopup = () => {
        setShowSkillsPopup(false);
        setSelectedSkills(null);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    const filteredCandidates = appliedJobs.filter((job) =>
        job.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

    return (
        <>
            {/* Skills Popup with Blur Background */}
            {showSkillsPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Blur Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={closeSkillsPopup}
                    ></div>
                    
                    {/* Popup Content */}
                    <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Required Skills</h3>
                            <button 
                                onClick={closeSkillsPopup}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {selectedSkills && selectedSkills.length > 0 ? (
                                selectedSkills.map((skill, index) => (
                                    <div 
                                        key={index}
                                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm"
                                    >
                                        {skill}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm">No skills listed</p>
                            )}
                        </div>
                        
                        <button
                            onClick={closeSkillsPopup}
                            className="mt-6 w-full py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md border border-gray-300 p-4 md:p-6 mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Search by Name"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-3 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button className="absolute right-0 top-0 h-full px-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                            <Search className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex w-full sm:w-auto sm:justify-end">
                        {/* <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-black text-white rounded-lg transition-colors hover:bg-gray-800 w-full sm:w-auto">
                            <SlidersHorizontal className="w-5 h-5" />
                            <span className="font-medium text-sm">Filter</span>
                        </button> */}
                    </div>
                </div>

                <div className="overflow-x-auto border border-gray-300 shadow-md rounded-2xl">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-gray-300 bg-gray-50">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Company Name</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Job Title</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Applied On</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Skills</th>

                            </tr>
                        </thead>
                        <tbody>
                            {currentData.length > 0 ? (
                                currentData.map((job, index) => (
                                    <tr
                                        key={index}
                                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="py-4 px-4 text-sm text-gray-800">
                                            {index + 1}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">{job.companyName}</td>
                                        <td className="py-4 px-4 text-sm text-gray-600">{job?.offerId?.jobTitle}</td>
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                            {formatDate(job.createdAt)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <button 
                                                onClick={() => handleViewSkills(job.requirements)}
                                                className="px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-200"
                                            >
                                                View
                                            </button>
                                        </td>
                                      
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-6 text-center text-gray-500">
                                        No JDs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(newPage) => {
                                if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
                            }}
                        />
                    )}
                </div>
            </div>
        </>
    )
}

export default AppliedJD
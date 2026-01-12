import React, { useEffect, useState } from "react";
import {
    FileText,
    Filter,
    Users,
    Download,
    Eye,
    Trash2,
    Code, PenTool, Megaphone, Palette, Layers
} from "lucide-react";
import Pagination from "../components/LandingPage/Pagination";
import axios from "axios";
import { baseUrl } from "../utils/ApiConstants";

export default function RecruiterDashboard() {
    const [currentPage, setCurrentPage] = useState(1);
    const [offersPage, setOffersPage] = useState(1);
    const offersPerPage = 5;
    const itemsPerPage = 5;

    const [totalCandidates, setTotalCandidates] = useState(0);
    const [totalJd, setTotalJd] = useState(0);
    const [jdByRecruiter, setJdByRecruiter] = useState(0);
    const [allJdData, setAllJdData] = useState([]);
    const [recentJobs, setRecentJobs] = useState([]);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const token = localStorage.getItem("token");

                const [
                    candidatesRes,
                    allJdRes,
                    jdByRecruiterRes
                ] = await Promise.all([
                    axios.get(`${baseUrl}/api/jd/all-candidates`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${baseUrl}/api/jd/all-jd-hr`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${baseUrl}/api/jd/created-by/hr`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                ]);

                console.log("candidatesRes:", candidatesRes.data);
                console.log("allJdRes:", allJdRes.data);
                console.log("jdByRecruiterRes:", jdByRecruiterRes.data);

                if (candidatesRes.data.success) {
                    setTotalCandidates(candidatesRes.data.count || candidatesRes.data.data?.length || 0);
                }

                if (allJdRes.data.success) {
                    setTotalJd(allJdRes.data.count || allJdRes.data.data?.length || 0);
                    setAllJdData(allJdRes.data.data || []);
                    
                    const sortedJobs = [...(allJdRes.data.data || [])].sort(
                        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    setRecentJobs(sortedJobs.slice(0, 4));
                }

                if (jdByRecruiterRes.data.success) {
                    setJdByRecruiter(jdByRecruiterRes.data.count || jdByRecruiterRes.data.data?.length || 0);
                }

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };

        fetchAllData();
    }, []);

    const recruiterJdPercentage = totalJd > 0 ? Math.round((jdByRecruiter / totalJd) * 100) : 0;
    const otherJdPercentage = 100 - recruiterJdPercentage;

    const offersStartIndex = (offersPage - 1) * offersPerPage;
    const offersEndIndex = offersStartIndex + offersPerPage;
    const paginatedOffers = allJdData.slice(offersStartIndex, offersEndIndex);
    const totalOffersPages = Math.ceil(allJdData.length / offersPerPage);

    const handleOffersPageChange = (page) => {
        setOffersPage(page);
    };

    return (
        <div className="">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="col-span-2 bg-white p-6 rounded-2xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-800">
                            Dashboard Overview
                        </h2>
                        {/* <button className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100">
                            <Download size={16} />
                            Export
                        </button> */}
                    </div>

                    <div className="grid sm:grid-cols-3 gap-5">
                        <div className="bg-blue-100 p-5 rounded-xl">
                            <div className="bg-blue-500/20 p-3 rounded-lg w-[50px]">
                                <FileText className="text-blue-600" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{totalJd}</p>
                                    <p className="text-gray-600 text-sm">Total JD</p>
                                    <p className="text-blue-500 text-xs mt-1">
                                        All job descriptions
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-pink-100 p-5 rounded-xl">
                            <div className="bg-pink-500/20 py-3 rounded-lg w-[50px]">
                                <Filter className="mx-auto text-pink-600" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{jdByRecruiter}</p>
                                    <p className="text-gray-600 text-sm">JD by Recruiter</p>
                                    <p className="text-pink-500 text-xs mt-1">
                                        Created by you
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-lime-100 p-5 rounded-xl">
                            <div className="bg-lime-500/20 p-3 rounded-lg w-[50px]">
                                <Users className="text-lime-600" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{totalCandidates}</p>
                                    <p className="text-gray-600 text-sm">Total Candidates</p>
                                    <p className="text-lime-600 text-xs mt-1">
                                        All candidates
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] p-6 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">JD Distribution</h3>
                    <div className="relative w-52 h-52">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                            <circle
                                cx="18"
                                cy="18"
                                r="15.9155"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="3.5"
                            />
                            <circle
                                cx="18"
                                cy="18"
                                r="15.9155"
                                fill="none"
                                stroke="#ec4899"
                                strokeWidth="3.5"
                                strokeDasharray={`${recruiterJdPercentage} ${100 - recruiterJdPercentage}`}
                                strokeDashoffset="0"
                            />
                            <circle
                                cx="18"
                                cy="18"
                                r="15.9155"
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="3.5"
                                strokeDasharray={`${otherJdPercentage} ${100 - otherJdPercentage}`}
                                strokeDashoffset={`-${recruiterJdPercentage}`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-gray-500 text-sm">Total JD</p>
                            <p className="text-3xl font-bold text-gray-900">{totalJd}</p>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-4 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                            <span>By Recruiter ({recruiterJdPercentage}%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span>Others ({otherJdPercentage}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white rounded-2xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        JD Analytics
                    </h2>
                    <div className="h-48 flex items-end justify-center gap-12 bg-gradient-to-t from-gray-50 to-white rounded-lg p-4">
                        {/* Total JD Bar */}
                        <div className="flex flex-col items-center">
                            <div 
                                className="w-16 bg-blue-500 rounded-t-lg transition-all duration-500"
                                style={{ height: `${Math.min((totalJd / Math.max(totalJd, 1)) * 150, 150)}px` }}
                            ></div>
                            <p className="mt-2 text-sm font-medium text-gray-700">Total JD</p>
                            <p className="text-lg font-bold text-blue-600">{totalJd}</p>
                        </div>
                        
                        <div className="flex flex-col items-center">
                            <div 
                                className="w-16 bg-pink-500 rounded-t-lg transition-all duration-500"
                                style={{ height: `${totalJd > 0 ? Math.min((jdByRecruiter / totalJd) * 150, 150) : 0}px` }}
                            ></div>
                            <p className="mt-2 text-sm font-medium text-gray-700">By Recruiter</p>
                            <p className="text-lg font-bold text-pink-600">{jdByRecruiter}</p>
                        </div>

                        <div className="flex flex-col items-center">
                            <div 
                                className="w-16 bg-lime-500 rounded-t-lg transition-all duration-500"
                                style={{ height: `${totalJd > 0 ? Math.min((totalCandidates / Math.max(totalJd, totalCandidates)) * 150, 150) : 0}px` }}
                            ></div>
                            <p className="mt-2 text-sm font-medium text-gray-700">Candidates</p>
                            <p className="text-lg font-bold text-lime-600">{totalCandidates}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] p-4 sm:p-6 flex flex-col overflow-hidden min-h-[250px] sm:min-h-[280px]">
    <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800">Statistics</h2>
        <div className="text-xs sm:text-sm text-gray-600">
            <p className="leading-relaxed">
                <span className="font-medium">Summary</span>
                <br />
                <span className="text-blue-500 font-medium">{totalJd}</span> Total JD
                <br />
                <span className="text-pink-500 font-medium">{jdByRecruiter}</span> By Recruiter
                <br />
                <span className="text-lime-500 font-medium">{totalCandidates}</span> Candidates
            </p>
        </div>
    </div>
    <div className="flex-1 mt-4 sm:mt-6 relative min-h-[80px] sm:min-h-[100px]">
        <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
        >
            <path
                d="M0,30 C10,25 30,35 50,20 70,25 90,15 100,30"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
            />
            <path
                d="M0,35 C20,30 40,25 60,35 80,30 100,25 100,35"
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
            />
        </svg>
    </div>
    <div className="mt-3 sm:mt-4">
        <div className="flex justify-between text-xs sm:text-sm gap-2">
            <p className="text-gray-500 truncate">Recruiter Contribution</p>
            <p className="text-gray-700 font-medium flex-shrink-0">{recruiterJdPercentage}%</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
                className="bg-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(recruiterJdPercentage, 100)}%` }}
            ></div>
        </div>
    </div>
</div>
            </div>

            <div className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    <div className="bg-white p-6 rounded-2xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] lg:col-span-2 flex justify-center items-center">
                        <div className="flex flex-col md:flex-row items-start gap-8 max-w-5xl w-full">
                            <div className="space-y-4 w-full md:w-auto">
                                <h2 className="text-lg font-semibold mb-4">Category</h2>

                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-3 rounded-lg">
                                        <Code size={20} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Developer</h3>
                                        <p className="text-gray-500 text-sm">11 Community</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 p-3 rounded-lg">
                                        <PenTool size={20} className="text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Designer</h3>
                                        <p className="text-gray-500 text-sm">24 Community</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-100 p-3 rounded-lg">
                                        <Megaphone size={20} className="text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Marketing</h3>
                                        <p className="text-gray-500 text-sm">18 Community</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-3 w-full">
                                <h3 className="text-sm mb-2">All Criteria</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        {
                                            title: "UI/UX Designer",
                                            desc: "There are more than 100 participants",
                                            icon: <Palette size={18} className="text-purple-600" />,
                                            bg: "bg-purple-100",
                                        },
                                        {
                                            title: "Visual Designer",
                                            desc: "All categories of food for you",
                                            icon: <PenTool size={18} className="text-green-600" />,
                                            bg: "bg-green-100",
                                        },
                                        {
                                            title: "Graphic Designer",
                                            desc: "There are more than 100 participants",
                                            icon: <Layers size={18} className="text-orange-600" />,
                                            bg: "bg-orange-100",
                                        },
                                        {
                                            title: "Brand Designer",
                                            desc: "All categories of food for you",
                                            icon: <Megaphone size={18} className="text-blue-600" />,
                                            bg: "bg-blue-100",
                                        },
                                    ].map((item, i) => (
                                        <div
                                            key={i}
                                            className="border border-gray-500 rounded-xl p-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3"
                                        >
                                            <div className={`${item.bg} p-2 rounded-md flex-shrink-0`}>{item.icon}</div>
                                            <div>
                                                <h4 className="font-medium text-gray-800">{item.title}</h4>
                                                <p className="text-xs text-gray-500">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* <p className="text-sm text-blue-600 font-medium cursor-pointer">
                                    View More Category →
                                </p> */}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] flex flex-col">
                        <h2 className="text-lg font-semibold mb-4">Recent Jobs</h2>
                        <div className="grid grid-cols-2 gap-3 flex-1">
                            {recentJobs.length > 0 ? recentJobs.slice(0, 4).map((job, i) => {
                                const colors = [
                                    { color: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200" },
                                    { color: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
                                    { color: "bg-green-50", text: "text-green-600", border: "border-green-200" },
                                    { color: "bg-pink-50", text: "text-pink-600", border: "border-pink-200" },
                                ];
                                const colorSet = colors[i % 4];
                                
                                const jobTitle = job.offerId?.jobTitle || job.title || 'Untitled Job';
                                const companyName = job.companyName || job.offerId?.companyName || 'N/A';
                                const city = job.offerId?.city || job.location || 'N/A';
                                
                                return (
                                    <div
                                        key={job._id || i}
                                        className={`${colorSet.color} ${colorSet.border} border rounded-xl p-3 flex flex-col justify-between`}
                                    >
                                        <div>
                                            <h4 className={`font-semibold ${colorSet.text} text-sm truncate`}>{jobTitle}</h4>
                                            <p className="text-gray-600 text-xs mt-1 truncate">{companyName}</p>
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-gray-500 text-xs truncate">{city}</p>
                                            {/* <button className="text-blue-600 text-xs mt-1">View →</button> */}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <>
                                    {[
                                        { title: "UI/UX Designer", color: "bg-yellow-50", text: "text-yellow-600" },
                                        { title: "Full Stack Dev", color: "bg-blue-50", text: "text-blue-600" },
                                        { title: "Data Analyst", color: "bg-green-50", text: "text-green-600" },
                                        { title: "Graphic Design", color: "bg-pink-50", text: "text-pink-600" },
                                    ].map((item, i) => (
                                        <div
                                            key={i}
                                            className={`${item.color} rounded-xl p-3 flex flex-col justify-between`}
                                        >
                                            <div>
                                                <h4 className={`font-semibold ${item.text} text-sm`}>{item.title}</h4>
                                                <p className="text-gray-500 text-xs mt-1">Sample Company</p>
                                            </div>
                                            <button className="text-blue-600 text-xs mt-2">View →</button>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                        {/* {recentJobs.length > 0 && (
                            <button className="text-blue-600 text-sm mt-4 font-medium text-center">
                                View All Jobs →
                            </button>
                        )} */}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] mt-6 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">All Job Descriptions</h2>
                        {/* <button className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100">
                            <Download size={16} />
                            Export
                        </button> */}
                    </div>

                    <div className="overflow-x-auto p-1">
                        <table className="w-full text-sm shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-2xl min-w-[900px]">
                            <thead className="bg-gray-100 border-b border-gray-300">
                                <tr className="text-left text-gray-700">
                                    <th className="px-3 py-2">S.No</th>
                                    <th className="px-3 py-2">Job Title</th>
                                    <th className="px-3 py-2">Company</th>
                                    <th className="px-3 py-2">City</th>
                                    <th className="px-3 py-2">Employment Type</th>
                                    <th className="px-3 py-2">Experience</th>
                                    <th className="px-3 py-2">Salary</th>
                                    <th className="px-3 py-2">Created By</th>
                                    <th className="px-3 py-2">Created Date</th>
                                    {/* <th className="px-3 py-2">Action</th> */}
                                </tr>
                            </thead>

                            <tbody>
                                {paginatedOffers.length > 0 ? paginatedOffers.map((jd, i) => (
                                    <tr
                                        key={jd._id || i}
                                        className="hover:bg-gray-50 border-b border-gray-300 last:border-0"
                                    >
                                        <td className="px-3 py-3">{offersStartIndex + i + 1}</td>
                                        <td className="px-3 py-3 whitespace-nowrap font-medium">
                                            {jd.offerId?.jobTitle || jd.title || 'N/A'}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {jd.companyName || jd.offerId?.companyName || 'N/A'}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {jd.offerId?.city || jd.location || 'N/A'}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {jd.offerId?.employmentType || jd.employmentType || 'N/A'}
                                        </td>
                                        <td className="px-3 py-3">
                                            {jd.offerId?.experience || jd.experience || 'N/A'} {(jd.offerId?.experience || jd.experience) ? 'years' : ''}
                                        </td>
                                        <td className="px-3 py-3">{jd.salaryRange || 'N/A'}</td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {jd.createdBy?.name || 'N/A'}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {jd.createdAt ? new Date(jd.createdAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                        {/* <td className="px-3 py-3">
                                            <div className="flex gap-2">
                                                <div className="p-1 rounded-sm border border-blue-400">
                                                    <Eye size={16} className="text-blue-600 cursor-pointer" />
                                                </div>
                                                <div className="p-1 rounded-sm border-blue-400 border">
                                                    <Trash2 size={16} className="text-red-500 cursor-pointer" />
                                                </div>
                                            </div>
                                        </td> */}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="10" className="px-3 py-6 text-center text-gray-500">
                                            No job descriptions available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {allJdData.length > offersPerPage && (
                        <Pagination
                            currentPage={offersPage}
                            totalPages={totalOffersPages}
                            onPageChange={handleOffersPageChange}
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
    <div className="bg-white rounded-2xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] p-6 flex flex-col justify-center items-center min-h-[150px]">
                        <h3 className="text-sm text-gray-500 mb-1">TOTAL</h3>
                        <h1 className="text-3xl font-bold text-blue-600">{totalJd}</h1>
                        <p className="text-sm text-gray-500">Job Descriptions</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] p-6 flex flex-col justify-center items-center min-h-[150px]">
    <h3 className="text-sm text-gray-500 mb-1">BY RECRUITER</h3>
                        <h1 className="text-3xl font-bold text-pink-600">{jdByRecruiter}</h1>
                        <p className="text-sm text-gray-500">Created by You</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] p-4 sm:p-6 flex flex-col items-center justify-center min-h-[150px] sm:col-span-2 lg:col-span-1 overflow-hidden">
    <h3 className="text-xs sm:text-sm text-gray-500 mb-1 text-center">CANDIDATES</h3>
    <h1 className="text-2xl sm:text-3xl font-bold text-lime-600">{totalCandidates}</h1>
    <p className="text-xs sm:text-sm text-gray-500 text-center">Total Registered</p>
    <div className="w-full mt-4 max-w-full">
        <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mb-1 gap-2">
            <span className="truncate">Recruiter Contribution</span>
            <span className="flex-shrink-0">{recruiterJdPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
                className="bg-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(recruiterJdPercentage, 100)}%` }}
            ></div>
        </div>
    </div>
</div>
                </div>
            </div>
        </div>
    );
}
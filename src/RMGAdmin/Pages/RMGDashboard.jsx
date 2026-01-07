import React, { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    CartesianGrid,
    Line,
    PieChart, Pie, Cell, Legend,
} from "recharts";
import img from "../../assets/RMGDashImg1.png";
import axios from "axios";
import { baseUrl } from "../../utils/ApiConstants";
import Pagination from "../../components/LandingPage/Pagination";

const getMonthName = (monthNum) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[monthNum - 1] || "";
};

// Colors for pie chart
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function RMGDashboard() {
    const [totalOffers, setTotalOffers] = useState(0);
    const [totalJobs, setTotalJobs] = useState(0);
    const [jobsRecruitersData, setJobsRecruitersData] = useState([]);
    const [hrTicketsData, setHrTicketsData] = useState([]);
    const [currentOffers, setCurrentOffers] = useState([]);
    const [recentJobs, setRecentJobs] = useState([]);
    const [jdStatusPercentage, setJdStatusPercentage] = useState({
        closed: 0,
        inProgress: 0,
        jdCreated: 0,
        jdPending: 0,
        open: 0
    });
    const [recruitersData, setRecruitersData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentOffersPage, setCurrentOffersPage] = useState(1);
    const offersPerPage = 5;

    const [recruitersPage, setRecruitersPage] = useState(1);
    const recruitersPerPage = 5;

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const token = localStorage.getItem("token");

                const [
                    offersRes,
                    jobsRecRes,
                    hrTicketsRes,
                    currentOffersRes,
                    recentJobsRes,
                    jdStatusPercentageRes,
                    recruitersClosedRes
                ] = await Promise.all([
                    axios.get(`${baseUrl}/api/dashboard/total-offers`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${baseUrl}/api/dashboard/jobs-recruiters-month-wise`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${baseUrl}/api/dashboard/count-hr-tickets-month-wise`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${baseUrl}/api/dashboard/current-offers`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${baseUrl}/api/dashboard/recent-jobs`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${baseUrl}/api/dashboard/jd-status-percentage`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${baseUrl}/api/dashboard/getAll-recruiters-closed`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                ]);

                if (offersRes.data.success) {
                    setTotalOffers(offersRes.data.totalOffers);
                }

                if (jobsRecRes.data.success) {
                    const { totalRecruiterMonthWise, offersMonthWise } = jobsRecRes.data;
                    
                    const monthDataMap = {};
                    
                    totalRecruiterMonthWise.forEach(item => {
                        const monthName = getMonthName(item._id);
                        if (!monthDataMap[item._id]) {
                            monthDataMap[item._id] = { month: monthName, jobs: 0, recruiters: 0 };
                        }
                        monthDataMap[item._id].recruiters = item.count;
                    });
                    
                    offersMonthWise.forEach(item => {
                        const monthName = getMonthName(item.month);
                        if (!monthDataMap[item.month]) {
                            monthDataMap[item.month] = { month: monthName, jobs: 0, recruiters: 0 };
                        }
                        monthDataMap[item.month].jobs = item.count;
                    });
                    
                    const chartData = Object.keys(monthDataMap)
                        .sort((a, b) => parseInt(a) - parseInt(b))
                        .map(key => monthDataMap[key]);
                    
                    setJobsRecruitersData(chartData);
                }

                if (hrTicketsRes.data.success) {
                    const { totalHRMonthWise, totalTicketsMonthWise } = hrTicketsRes.data;
                    
                    const monthDataMap = {};
                    
                    totalHRMonthWise.forEach(item => {
                        const monthName = getMonthName(item._id);
                        if (!monthDataMap[item._id]) {
                            monthDataMap[item._id] = { month: monthName, tickets: 0, recruiters: 0 };
                        }
                        monthDataMap[item._id].recruiters = item.count;
                    });
                    
                    totalTicketsMonthWise.forEach(item => {
                        const monthName = getMonthName(item._id);
                        if (!monthDataMap[item._id]) {
                            monthDataMap[item._id] = { month: monthName, tickets: 0, recruiters: 0 };
                        }
                        monthDataMap[item._id].tickets = item.count;
                    });
                    
                    const chartData = Object.keys(monthDataMap)
                        .sort((a, b) => parseInt(a) - parseInt(b))
                        .map(key => monthDataMap[key]);
                    
                    setHrTicketsData(chartData);
                }

                if (currentOffersRes.data.success) {
                    setCurrentOffers(currentOffersRes.data.offers);
                }

                if (recentJobsRes.data.success) {
                    setRecentJobs(recentJobsRes.data.recentJobs);
                    setTotalJobs(recentJobsRes.data.totalJobs);
                }

                if (jdStatusPercentageRes.data.success) {
                    setJdStatusPercentage(jdStatusPercentageRes.data.jdStatusPercentage);
                }

                if (recruitersClosedRes.data.success) {
                    setRecruitersData(recruitersClosedRes.data.recruiterData);
                }

                setLoading(false);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const totalOffersPages = Math.ceil(currentOffers.length / offersPerPage);
    const indexOfLastOffer = currentOffersPage * offersPerPage;
    const indexOfFirstOffer = indexOfLastOffer - offersPerPage;
    const currentOffersToShow = currentOffers.slice(indexOfFirstOffer, indexOfLastOffer);

    const totalRecruitersPages = Math.ceil(recruitersData.length / recruitersPerPage);
    const indexOfLastRecruiter = recruitersPage * recruitersPerPage;
    const indexOfFirstRecruiter = indexOfLastRecruiter - recruitersPerPage;
    const currentRecruitersToShow = recruitersData.slice(indexOfFirstRecruiter, indexOfLastRecruiter);

    const jdTotal = jdStatusPercentage.closed + jdStatusPercentage.inProgress + 
                    jdStatusPercentage.jdCreated + jdStatusPercentage.jdPending + 
                    jdStatusPercentage.open || 100;

    const pieData = [
        { name: 'JD Created', value: jdStatusPercentage.jdCreated || 0 },
        { name: 'In Progress', value: jdStatusPercentage.inProgress || 0 },
        { name: 'Open', value: jdStatusPercentage.open || 0 },
        { name: 'Closed', value: jdStatusPercentage.closed || 0 },
        { name: 'JD Pending', value: jdStatusPercentage.jdPending || 0 },
    ].filter(item => item.value > 0);

    const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0);

    // Format date helper
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="min-h-screen">
            <div className="grid md:grid-cols-[30%_67%] gap-7 mb-6">
                <div className="grid gap-4">
                    <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-gray-600 text-sm font-medium">Total Jobs</h2>
                            <p className="text-2xl font-semibold text-gray-800 mt-1">{totalJobs}+</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full">
                            <svg
                                className="w-6 h-6 text-purple-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path d="M10 2a5 5 0 015 5v1h-1V7a4 4 0 00-8 0v1H5V7a5 5 0 015-5z" />
                                <path
                                    fillRule="evenodd"
                                    d="M4 8a2 2 0 00-2 2v5a2 2 0 002 2h12a2 2 0 002-2v-5a2 2 0 00-2-2H4zm5 3a1 1 0 10-2 0 1 1 0 002 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-gray-600 text-sm font-medium">Total Offers</h2>
                            <p className="text-2xl font-semibold text-gray-800 mt-1">{totalOffers}+</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <svg
                                className="w-6 h-6 text-green-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path d="M3 3v14l13-7L3 3z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-2xl p-4 overflow-x-auto">
                    <h3 className="text-gray-700 font-semibold mb-2">Jobs & Recruiters Month Wise</h3>
                    <div className="min-w-[600px] sm:min-w-full">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={jobsRecruitersData.length > 0 ? jobsRecruitersData : [{ month: 'No Data', jobs: 0, recruiters: 0 }]}>
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="jobs" fill="#3b82f6" name="Total Jobs" />
                                <Bar dataKey="recruiters" fill="#6366f1" name="Recruiters" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-2xl p-4 overflow-x-auto">
                <h3 className="text-gray-700 font-semibold mb-2">Active Recruiters & Assigned Candidates</h3>
                <div className="min-w-[600px] sm:min-w-full">
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={hrTicketsData.length > 0 ? hrTicketsData : [{ month: 'No Data', tickets: 0, recruiters: 0 }]}>
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Area
                                type="monotone"
                                dataKey="tickets"
                                stroke="#f97316"
                                fill="#fca5a5"
                                fillOpacity={0.6}
                                name="Tickets"
                            />
                            <Area
                                type="monotone"
                                dataKey="recruiters"
                                stroke="#a78bfa"
                                fill="#c4b5fd"
                                fillOpacity={0.6}
                                name="HR Count"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-[67%_30%] gap-7">
                    <div className="bg-white rounded-2xl p-5 shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] overflow-x-auto">
                        <h2 className="text-lg font-semibold mb-4">HR & Tickets Overview</h2>
                        <div className="h-72 min-w-[600px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={hrTicketsData.length > 0 ? hrTicketsData : [{ month: 'No Data', tickets: 0, recruiters: 0 }]}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="tickets"
                                        stroke="#22c55e"
                                        strokeWidth={3}
                                        dot={{ r: 5 }}
                                        activeDot={{ r: 7 }}
                                        name="Tickets"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="recruiters"
                                        stroke="#f59e0b"
                                        strokeWidth={3}
                                        dot={{ r: 5 }}
                                        activeDot={{ r: 7 }}
                                        name="HR Count"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] overflow-x-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Recent Jobs</h2>
                            {/* <a href="#" className="text-blue-600 text-sm font-medium">See all</a> */}
                        </div>

                        <div className="space-y-4 min-w-[400px]">
                            {recentJobs.length > 0 ? (
                                recentJobs.map((job, index) => (
                                    <div
                                        key={job._id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                                {job.jobTitle?.charAt(0) || 'J'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">{job.jobTitle}</p>
                                                <p className="text-sm text-gray-500">{job.positionAvailable} Positions</p>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center space-x-1">
                                            <span>📅</span>
                                            <span>{formatDate(job.createdAt)}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No recent jobs available</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Current Offers</h2>
                        {/* <a href="#" className="text-blue-600 text-sm font-medium">See all</a> */}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead>
                                <tr className="text-gray-500 text-sm">
                                    <th className="px-2 py-2 border border-gray-500 text-slate-600">Job Title</th>
                                    <th className="px-2 py-2 border border-gray-500 text-slate-600">Location</th>
                                    <th className="px-2 py-2 border border-gray-500 text-slate-600">Positions</th>
                                    <th className="px-2 py-2 border border-gray-500 text-slate-600">Status</th>
                                    <th className="px-2 py-2 border border-gray-500 text-slate-600">Due Date</th>
                                    <th className="px-2 py-2 border border-gray-500 text-slate-600">Priority</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentOffersToShow.length > 0 ? (
                                    currentOffersToShow.map((offer) => (
                                        <tr key={offer._id} className="rounded-lg">
                                            <td className="px-2 py-2 font-medium border border-gray-500 text-slate-600">
                                                {offer.jobTitle}
                                            </td>
                                            <td className="px-2 py-2 border border-gray-500 text-slate-600">
                                                {offer.city}, {offer.state}
                                            </td>
                                            <td className="px-2 py-2 border border-gray-500 text-slate-600">
                                                {offer.positionAvailable}
                                            </td>
                                            <td className="px-2 py-2 border border-gray-500 text-slate-600">
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    offer.status === 'JD created' ? 'bg-green-100 text-green-600' :
                                                    offer.status === 'Open' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {offer.status}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 border border-gray-500 text-slate-600">
                                                {formatDate(offer.dueDate)}
                                            </td>
                                            <td className="px-2 py-2 border border-gray-500 text-slate-600">
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    offer.priority === 'High' ? 'bg-red-100 text-red-600' :
                                                    offer.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                                                    'bg-green-100 text-green-600'
                                                }`}>
                                                    {offer.priority}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-2 py-4 text-center text-gray-500 border border-gray-500">
                                            No current offers available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {currentOffers.length > offersPerPage && (
                        <Pagination
                            currentPage={currentOffersPage}
                            totalPages={totalOffersPages}
                            onPageChange={setCurrentOffersPage}
                        />
                    )}
                </div>
            </div>

            <div className="p-4 bg-gray-50 min-h-screen flex flex-col gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-center items-center shadow-md">
                            <img
                                src={img}
                                alt="Laptop icon"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-md">
                            <h3 className="text-gray-700 font-semibold mb-4">JD Status Distribution</h3>
                            <div className="flex justify-center">
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={pieData.length > 0 ? pieData : [{ name: 'No Data', value: 1 }]}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {(pieData.length > 0 ? pieData : [{ name: 'No Data', value: 1 }]).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-center text-gray-600 mt-2">{pieTotal}% Total</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-gray-700 font-semibold">Total Positions Available</h3>
                                <span className="text-sm text-gray-500">Month</span>
                            </div>
                            <h2 className="text-2xl font-semibold mb-3">
                                {recentJobs.reduce((sum, job) => sum + (job.positionAvailable || 0), 0)}
                            </h2>
                            <div className="flex items-end space-x-4 min-w-[500px]">
                                {recentJobs.length > 0 ? (
                                    recentJobs.map((job, i) => (
                                        <div key={job._id} className="flex flex-col items-center">
                                            <div
                                                className="w-6 bg-gradient-to-t from-purple-600 to-purple-300 rounded-md"
                                                style={{ height: `${(job.positionAvailable || 1) * 20}px` }}
                                            ></div>
                                            <span className="text-xs text-gray-500 mt-1">
                                                {job.jobTitle?.substring(0, 8)}...
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500">No data available</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-md">
                            <h3 className="text-gray-700 font-semibold mb-4">JD Status</h3>
                            <h2 className="text-2xl font-semibold mb-4">100%</h2>
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <span className="text-sm text-gray-600 w-24">JD Created</span>
                                    <div className="w-full bg-gray-200 rounded-full h-4 mr-3">
                                        <div
                                            className="bg-blue-500 h-4 rounded-full"
                                            style={{ width: `${jdStatusPercentage.jdCreated}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-blue-500 font-medium text-sm w-12">{jdStatusPercentage.jdCreated}%</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-sm text-gray-600 w-24">In Progress</span>
                                    <div className="w-full bg-gray-200 rounded-full h-4 mr-3">
                                        <div
                                            className="bg-orange-400 h-4 rounded-full"
                                            style={{ width: `${jdStatusPercentage.inProgress}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-orange-400 font-medium text-sm w-12">{jdStatusPercentage.inProgress}%</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-sm text-gray-600 w-24">Open</span>
                                    <div className="w-full bg-gray-200 rounded-full h-4 mr-3">
                                        <div
                                            className="bg-green-500 h-4 rounded-full"
                                            style={{ width: `${jdStatusPercentage.open}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-green-500 font-medium text-sm w-12">{jdStatusPercentage.open}%</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-sm text-gray-600 w-24">Closed</span>
                                    <div className="w-full bg-gray-200 rounded-full h-4 mr-3">
                                        <div
                                            className="bg-red-500 h-4 rounded-full"
                                            style={{ width: `${jdStatusPercentage.closed}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-red-500 font-medium text-sm w-12">{jdStatusPercentage.closed}%</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-sm text-gray-600 w-24">JD Pending</span>
                                    <div className="w-full bg-gray-200 rounded-full h-4 mr-3">
                                        <div
                                            className="bg-purple-500 h-4 rounded-full"
                                            style={{ width: `${jdStatusPercentage.jdPending}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-purple-500 font-medium text-sm w-12">{jdStatusPercentage.jdPending}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-2xl mt-6">
                <h2 className="text-lg font-semibold p-4">Active Recruiter Table</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-200 text-gray-700 text-sm shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)]">
                                <th className="px-4 py-3 text-left font-medium">Sr.No</th>
                                <th className="px-4 py-3 text-left font-medium">Recruiter Name</th>
                                <th className="px-4 py-3 text-left font-medium">Active JDs</th>
                                <th className="px-4 py-3 text-left font-medium">Candidate Shortlisted</th>
                                <th className="px-4 py-3 text-left font-medium">Closed Position</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRecruitersToShow.length > 0 ? (
                                currentRecruitersToShow.map((rec, index) => (
                                    <tr
                                        key={index}
                                        className="border-b border-gray-400 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-3">{indexOfFirstRecruiter + index + 1}.</td>
                                        <td className="px-4 py-3">{rec.recruiterName}</td>
                                        <td className="px-4 py-3">{rec.activeJDs}</td>
                                        <td className="px-4 py-3">{rec.candidateShortlisted}</td>
                                        <td className="px-4 py-3">{rec.closedPositions}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    rec.isActive
                                                        ? "bg-green-100 text-green-600"
                                                        : "bg-orange-100 text-orange-600"
                                                }`}
                                            >
                                                {rec.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                                        No recruiter data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {recruitersData.length > recruitersPerPage && (
                    <Pagination
                        currentPage={recruitersPage}
                        totalPages={totalRecruitersPages}
                        onPageChange={setRecruitersPage}
                    />
                )}
                
                <div className="text-center py-3">
                    <a
                        href="#"
                        className="text-blue-600 text-sm hover:underline font-medium"
                    >
                        {/* See all */}
                    </a>
                </div>
            </div>
        </div>
    );
}
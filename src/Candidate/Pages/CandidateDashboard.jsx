import { Bookmark } from "lucide-react";
import React, { useState, useEffect } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { baseUrl } from "../../utils/ApiConstants";
import Pagination from "../../components/LandingPage/Pagination";

const CandidateDashboard = () => {
    const [range, setRange] = useState("1 Day");
    const [appliedJobs, setAppliedJobs] = useState([]);
    const navigate = useNavigate();
    const [jdCounts, setJdCounts] = useState({
        totalAppliedJds: 0,
        filteredJds: 0,
        unfilteredJds: 0
    });
    const [latestJobs, setLatestJobs] = useState([]);
    const [contributionView, setContributionView] = useState("Years");
    const [candidateName, setCandidateName] = useState("Candidate");
    const [currentDate, setCurrentDate] = useState("");
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    const ranges = ["1 Day", "1 Month", "1 Year", "Max"];

    useEffect(() => {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        setCurrentDate(now.toLocaleDateString('en-US', options));

        const fetchCandidateData = async () => {
            try {
                const token = localStorage.getItem("candidateToken");
                const res = await axios.get(`${baseUrl}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                // console.log("Candidate data:", res.data);
                if (res.data?.success && res.data?.data) {
                    const userData = res.data.data;
                    const name = userData.name || userData.fullName || userData.firstName || userData.username || userData.email?.split('@')[0] || "Candidate";
                    setCandidateName(name);
                }
            } catch (error) {
                console.log("Error fetching candidate data:", error);
            }
        };

        fetchCandidateData();
    }, []);

    useEffect(() => {
        const fetchAppliedJobs = async () => {
            try {
                const res = await axios.get(`${baseUrl}/api/candidate/applied-jobs`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("candidateToken")}`,
                    },
                });
                // console.log("applied jobs", res.data);
                if (res.data?.success) {
                    setAppliedJobs(res.data.jobs || []);
                }
            } catch (error) {
                console.log(error);
            }
        }

        fetchAppliedJobs()
    }, [])

    useEffect(() => {
        const fetchjdcounts = async () => {
            try {
                const res = await axios.get(`${baseUrl}/api/candidate/jd-counts`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("candidateToken")}`,
                    },
                });
                // console.log("jd-counts", res.data?.counts);
                if (res.data?.counts) {
                    setJdCounts(res.data.counts);
                }
            } catch (error) {
                console.log(error);
            }
        }

        fetchjdcounts()
    }, [])

    useEffect(() => {
        const fetchlatestfivejds = async () => {
            try {
                const res = await axios.get(`${baseUrl}/api/candidate/latest-five-jds`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("candidateToken")}`,
                    },
                });
                // console.log("latest-five-jds", res.data);
                if (res.data?.success) {
                    setLatestJobs(res.data.data || []);
                }
            } catch (error) {
                console.log(error);
            }
        }

        fetchlatestfivejds()
    }, [])

    const totalPages = Math.ceil(appliedJobs.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentApplications = appliedJobs.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    const getFirstName = () => {
        if (candidateName) {
            return candidateName.split(' ')[0];
        }
        return "Candidate";
    };

    const getWelcomeMessage = () => {
        if (jdCounts.totalAppliedJds === 0) {
            return "Start your journey by applying to jobs!";
        } else if (jdCounts.filteredJds > 0) {
            return `Great news! ${jdCounts.filteredJds} of your applications are shortlisted.`;
        } else if (jdCounts.unfilteredJds > 0) {
            return "Your applications are being reviewed. Stay tuned!";
        }
        return "Always stay updated in your candidate portal.";
    };

    const calculateContributionPercentage = () => {
        if (jdCounts.totalAppliedJds === 0) return 0;
        return Math.round((jdCounts.filteredJds / jdCounts.totalAppliedJds) * 100);
    };

    const getContributionStats = () => {
        switch (contributionView) {
            case "Years":
                return {
                    label: "Success Rate",
                    percentage: calculateContributionPercentage(),
                    description: "Filtered applications"
                };
            case "Months":
                return {
                    label: "This Month",
                    percentage: jdCounts.totalAppliedJds > 0 ? Math.round((jdCounts.filteredJds / jdCounts.totalAppliedJds) * 100) : 0,
                    description: "Application progress"
                };
            case "Days":
                return {
                    label: "Recent",
                    percentage: appliedJobs.length > 0 ? Math.min(100, appliedJobs.length * 20) : 0,
                    description: "Recent activity"
                };
            default:
                return {
                    label: "Success Rate",
                    percentage: calculateContributionPercentage(),
                    description: "Filtered applications"
                };
        }
    };

    const generateChartData = () => {
        if (appliedJobs.length === 0) {
            return [
                { name: "P1", value: 0 },
                { name: "P2", value: 0 },
                { name: "P3", value: 0 },
                { name: "P4", value: 0 },
                { name: "P5", value: 0 },
                { name: "P6", value: 0 },
            ];
        }

        switch (range) {
            case "1 Day":
                return appliedJobs.slice(0, 6).map((job, index) => {
                    const filteredCandidate = job.filteredCandidates?.[0];
                    const unfilteredCandidate = job.unfilteredCandidates?.[0];
                    const score = filteredCandidate?.aiScore || unfilteredCandidate?.aiScore || 0;
                    return {
                        name: job.companyName?.substring(0, 8) || `Job ${index + 1}`,
                        value: score
                    };
                });
            case "1 Month":
                return appliedJobs.slice(0, 6).map((job, index) => ({
                    name: job.companyName?.substring(0, 8) || `Job ${index + 1}`,
                    value: job.appliedCandidates?.length || 0
                }));
            case "1 Year":
                return appliedJobs.slice(0, 6).map((job, index) => ({
                    name: job.companyName?.substring(0, 8) || `Job ${index + 1}`,
                    value: job.filteredCandidates?.length > 0 ? 80 : job.unfilteredCandidates?.length > 0 ? 40 : 20
                }));
            case "Max":
                return appliedJobs.slice(0, 6).map((job, index) => {
                    const totalCandidates = (job.filteredCandidates?.length || 0) + (job.unfilteredCandidates?.length || 0);
                    return {
                        name: job.companyName?.substring(0, 8) || `Job ${index + 1}`,
                        value: Math.min(100, totalCandidates * 10 + 30)
                    };
                });
            default:
                return appliedJobs.slice(0, 6).map((job, index) => ({
                    name: `Job ${index + 1}`,
                    value: 50
                }));
        }
    };

    const chartData = generateChartData();
    const contributionStats = getContributionStats();

    const formatPostedDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 7) {
            return `${diffDays} Day${diffDays > 1 ? 's' : ''} Ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} Week${weeks > 1 ? 's' : ''} Ago`;
        } else {
            const months = Math.floor(diffDays / 30);
            return `${months} Month${months > 1 ? 's' : ''} Ago`;
        }
    };

    return (
        <div className="min-h-screen space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">

                <div className="col-span-2 bg-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between relative overflow-hidden shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)]">
                    <div className="absolute inset-0">
                        <div className={`w-full h-full rounded-2xl ${jdCounts.filteredJds > 0
                            ? "bg-gradient-to-r from-green-300/30 to-blue-300/30"
                            : jdCounts.unfilteredJds > 0
                                ? "bg-gradient-to-r from-yellow-300/30 to-orange-300/30"
                                : "bg-gradient-to-r from-purple-300/30 to-blue-300/30"
                            }`}></div>
                    </div>

                    <div className="relative z-10 max-w-md">
                        <p className="text-sm text-gray-600">{currentDate}</p>
                        <h2 className="text-2xl md:text-3xl font-semibold mt-2">
                            {getGreeting()}, {getFirstName()}!
                        </h2>
                        <p className="text-gray-500 mt-1">
                            {getWelcomeMessage()}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-4">
                            {jdCounts.totalAppliedJds > 0 && (
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                                    {jdCounts.totalAppliedJds} Applied
                                </span>
                            )}
                            {jdCounts.filteredJds > 0 && (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                                    {jdCounts.filteredJds} Shortlisted
                                </span>
                            )}
                            {latestJobs.length > 0 && (
                                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                                    {latestJobs.length} New Jobs
                                </span>
                            )}
                        </div>
                    </div>

                    <img
                        src="https://media.istockphoto.com/id/530829213/vector/profile-icon-male-avatar-portrait-casual-person.jpg?s=612x612&w=0&k=20&c=uopclRhM84eLK0cPrHbz2hAhgQxUfeTpKDFz6HtZbjM="
                        alt="Character"
                        className="w-40 md:w-52 relative z-10 mt-4 md:mt-0 rounded-full"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="space-y-4">
                        <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-xl p-6">
                            <div className="text-gray-600">Total Applications</div>
                            <div className="text-3xl font-bold mt-1">{jdCounts.totalAppliedJds}</div>
                            <div className="flex items-center mt-2 text-orange-500 font-medium">
                                <span className="ml-2 w-12 h-4 bg-orange-300 rounded-full"></span>
                            </div>
                        </div>

                        <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-xl p-6">
                            <div className="text-gray-600">Filtered Applications</div>
                            <div className="text-3xl font-bold mt-1">{jdCounts.filteredJds}</div>
                            <div className="flex items-center mt-2 text-green-600 font-medium">
                                <span className="ml-2 w-12 h-4 bg-green-300 rounded-full"></span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-xl p-6">
                            <div className="text-gray-600">Unfiltered Applications</div>
                            <div className="text-3xl font-bold mt-1">{jdCounts.unfilteredJds}</div>
                            <div className="flex items-center mt-2 text-red-500 font-medium">
                                <span className="ml-2 w-12 h-4 bg-red-300 rounded-full"></span>
                            </div>
                        </div>

                        <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-xl p-6">
                            <div className="text-gray-600">Latest Jobs Available</div>
                            <div className="text-3xl font-bold mt-1">{latestJobs.length}</div>
                            <div className="flex items-center mt-2 text-blue-500 font-medium">
                                <span className="ml-2 w-12 h-4 bg-blue-300 rounded-full"></span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-xl p-6 overflow-x-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Applications</h2>
                        <a className="text-indigo-600 text-sm font-medium">
                            See all
                        </a>
                    </div>
                    <div className="min-w-[600px]">
                        {currentApplications.length > 0 ? currentApplications.map((job, i) => (
                            <div
                                key={job._id || i}
                                className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4 last:border-0 shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] p-2 rounded-2xl"
                            >
                                <div className="flex items-center space-x-4">
                                    <img
                                        src="https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1/f_auto/v1/icons/5/udemy-icon-3j6wakwfpzle3lk48gsyn.png/udemy-icon-1o4mdttoaqgp1qaghk9f7.png?_a=DATAg1AAZAA0"
                                        alt="Company Logo"
                                        className="w-12 h-12 shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] p-1 rounded-2xl"
                                    />
                                    <div className="">
                                        <h3 className="font-medium text-gray-800">{job.department || "Position"}</h3>
                                        <p className="text-sm text-gray-500">
                                            {job.companyName} • {job.benefits?.[2] || "On-Site"}
                                        </p>
                                        <p className="text-sm text-gray-400">{job.additionalInfo?.split('.')[0] || "Location"}</p>
                                    </div>
                                </div>
                                <p className="font-medium">{job.benefits?.[0] || "Competitive Salary"}</p>
                            </div>
                        )) : (
                            <div className="text-center text-gray-500 py-8">
                                No applications yet
                            </div>
                        )}
                    </div>
                    
                    {appliedJobs.length > itemsPerPage && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>

                <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] rounded-xl p-6 flex flex-col items-center justify-center">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">
                        Contributions
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">{contributionStats.description}</p>
                    <div className="flex space-x-2 mb-6">
                        {["Years", "Months", "Days"].map((view) => (
                            <button
                                key={view}
                                onClick={() => setContributionView(view)}
                                className={`px-3 py-1 rounded-lg text-sm transition-all ${contributionView === view
                                    ? "bg-indigo-700 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                {view}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#E5E7EB"
                                strokeWidth="10"
                                fill="none"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke={contributionStats.percentage >= 70 ? "#22C55E" : contributionStats.percentage >= 40 ? "#F59E0B" : "#EF4444"}
                                strokeWidth="10"
                                fill="none"
                                strokeDasharray={2 * Math.PI * 56}
                                strokeDashoffset={2 * Math.PI * 56 - (contributionStats.percentage / 100) * 2 * Math.PI * 56}
                                strokeLinecap="round"
                                style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-2xl font-semibold text-gray-800">{contributionStats.percentage}%</p>
                            <p className="text-xs text-gray-500">{contributionStats.label}</p>
                        </div>
                    </div>
                    <div className="mt-4 w-full grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-green-600">{jdCounts.filteredJds}</p>
                            <p className="text-xs text-gray-500">Filtered</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-orange-600">{jdCounts.unfilteredJds}</p>
                            <p className="text-xs text-gray-500">Pending</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-lg font-bold text-blue-600">{jdCounts.totalAppliedJds}</p>
                            <p className="text-xs text-gray-500">Total</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[67%_30%] gap-7 mt-6">

                <div className="bg-white shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] p-6 rounded-xl overflow-x-auto">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                        <h2 className="text-xl font-semibold">
                            Latest Jobs for You
                        </h2>
                        <span onClick={() => navigate("/Candidate-Dashboard/Alljds")} className="text-blue-600 cursor-default text-sm">
                            See all
                        </span>
                    </div>

                    <div className="space-y-4 shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)] p-4 rounded-xl min-w-[500px]">
                        {latestJobs.length > 0 ? latestJobs.map((job) => (
                            <div
                                key={job._id}
                                className="flex justify-between items-center border-b pb-3 last:border-none"
                            >
                                <div className="flex items-center space-x-4">
                                    <img
                                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSW4qIERoyjk6oTJte3pRofI1CZWOEFK-0FIQ&s"
                                        alt="Company Logo"
                                        className="w-12 h-12 p-1 rounded-full shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)]"
                                    />
                                    <div>
                                        <h3 className="font-semibold text-gray-800 text-lg">
                                            {job.department || "Developer"}
                                        </h3>
                                        <p className="text-gray-500 text-sm">
                                            {job.companyName}
                                        </p>
                                        <div className="flex justify-center items-center mt-1 space-x-2">
                                            <p className="text-gray-500 text-sm">
                                                {formatPostedDate(job.createdAt)}
                                            </p>
                                            <p
                                                className={`text-sm ${job.appliedCandidates?.length > 50
                                                    ? "text-red-500"
                                                    : "text-green-600"
                                                    }`}
                                            >
                                                • {job.appliedCandidates?.length || 0} Applicants
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <button onClick={() => navigate("/Candidate-Dashboard/Alljds")} className="border border-green-500 text-green-600 px-4 py-1.5 rounded-full hover:bg-green-50 transition">
                                        Apply Now
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-gray-500 py-8">
                                No jobs available
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-[0px_0px_6px_0px_rgba(0,_0,_0,_0.35)]">
                    <h3 className="text-md font-semibold mb-2 text-gray-700">
                        Jobs Analytics
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        {range === "1 Day" && "AI Scores per Application"}
                        {range === "1 Month" && "Applicants per Job"}
                        {range === "1 Year" && "Application Status"}
                        {range === "Max" && "Overall Performance"}
                    </p>

                    <div className="w-full h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, fill: "#1D4ED8" }}
                                />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    hide={false}
                                    tick={{ fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={30}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#fff",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                    }}
                                    formatter={(value, name) => [
                                        `${value}${range === "1 Day" ? "%" : ""}`,
                                        range === "1 Day" ? "AI Score" : range === "1 Month" ? "Applicants" : "Score"
                                    ]}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex justify-center gap-2 mt-3 flex-wrap">
                        {ranges.map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`text-sm px-3 py-1 rounded-md transition-all ${range === r
                                    ? "bg-blue-100 text-blue-600 font-semibold"
                                    : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total Jobs Applied</span>
                            <span className="font-semibold text-gray-800">{appliedJobs.length}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="text-gray-500">Avg. AI Score</span>
                            <span className="font-semibold text-blue-600">
                                {appliedJobs.length > 0
                                    ? Math.round(
                                        appliedJobs.reduce((acc, job) => {
                                            const score = job.filteredCandidates?.[0]?.aiScore || job.unfilteredCandidates?.[0]?.aiScore || 0;
                                            return acc + score;
                                        }, 0) / appliedJobs.length
                                    )
                                    : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default CandidateDashboard;
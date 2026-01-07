import { useEffect, useState } from 'react';
import { FileText, Filter, X, Eye, MoreVertical, ChevronLeft, ChevronRight, Share, ShareIcon } from 'lucide-react';
import Pagination from '../components/LandingPage/Pagination';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { baseUrl } from '../utils/ApiConstants';
import SpinLoader from '../components/SpinLoader';

function JD() {
  const [currentPage, setCurrentPage] = useState(1);
  const [jdData, setJdData] = useState([]);
  const [incomingJDs, setIncomingJDs] = useState([]);
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const [stats, setStats] = useState({
    totalJD: 0,
    filteredResumes: 0,
    unfilteredResumes: 0
  });
  const [loading, setLoading] = useState(true);
  const [showSummaryPopup, setShowSummaryPopup] = useState(false);
  const [selectedJDSummary, setSelectedJDSummary] = useState(null);
  const navigate = useNavigate();

  const rowsPerPage = 5;

  const [incomingCurrentPage, setIncomingCurrentPage] = useState(1);
  const incomingRowsPerPage = 5;

  useEffect(() => {
    fetchJDs();
    fetchIncomingJDs();
  }, []);

  const fetchJDs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${baseUrl}/api/jd//created-by/hr`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      console.log('JDs Data:', response.data);

      if (response.data.success && response.data.data) {
        const data = response.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setJdData(data);

        let totalFiltered = 0;
        let totalUnfiltered = 0;

        data.forEach(jd => {
          totalFiltered += jd.filteredCandidates?.length || 0;
          totalUnfiltered += jd.unfilteredCandidates?.length || 0;
        });

        setStats({
          totalJD: response.data.count || data.length,
          filteredResumes: totalFiltered,
          unfilteredResumes: totalUnfiltered
        });
      }

    } catch (error) {
      console.error('Error fetching JDs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomingJDs = async () => {
    try {
      setLoadingIncoming(true);
      const response = await axios.get(`${baseUrl}/api/jd/assigned-offers/hr`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log("aaa", response.data);

      if (response.data.success) {
        const filteredData = response.data.data
          .filter(jd => jd.isJDCreated === false)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setIncomingJDs(filteredData);
      }
    } catch (error) {
      console.log('Error fetching incoming JDs:', error);
    } finally {
      setLoadingIncoming(false);
    }
  };

  const handleSelectJD = (jd) => {
    navigate("/RecruiterAdmin-Dashboard/JD/CreateJD", { state: { offerId: jd._id, companyName: jd.companyName } });
  };

  const statsDisplay = [
    { icon: FileText, label: 'Total JD', value: stats.totalJD.toString(), bgColor: 'bg-amber-50', iconColor: 'text-amber-500' },
    { icon: Filter, label: 'Filtered Resumes', value: stats.filteredResumes.toString(), bgColor: 'bg-blue-50', iconColor: 'text-blue-500' },
    { icon: X, label: 'Unfiltered Resumes', value: stats.unfilteredResumes.toString(), bgColor: 'bg-red-50', iconColor: 'text-red-500' },
  ];

  const totalPages = Math.ceil(jdData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = jdData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const incomingTotalPages = Math.ceil(incomingJDs.length / incomingRowsPerPage);
  const incomingStartIndex = (incomingCurrentPage - 1) * incomingRowsPerPage;
  const incomingEndIndex = incomingStartIndex + incomingRowsPerPage;
  const currentIncomingData = incomingJDs.slice(incomingStartIndex, incomingEndIndex);

  const handleIncomingPageChange = (page) => {
    setIncomingCurrentPage(page);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const formatId = (id) => {
    if (!id) return 'N/A';
    return `#${id.slice(-6).toUpperCase()}`;
  };

  const handleViewJD = (jd) => {
    localStorage.setItem("selectedJD", JSON.stringify(jd));
    console.log("Saved selectedJD to localStorage:", jd);
    navigate("/RecruiterAdmin-Dashboard/JDDetails", { state: { jdData: jd } });
  };

  const handleDeleteJD = async (jdId) => {
    console.log('Delete JD:', jdId);
  };

  // Updated function - now uses direct JD fields instead of rawAIResponse
  const handleShowSummary = (jd) => {
    setSelectedJDSummary({
      jobTitle: jd.offerId?.jobTitle || 'N/A',
      companyName: jd.companyName || jd.offerId?.company || 'N/A',
      jobSummary: jd.jobSummary || null,
      requirements: jd.requirements || [],
      responsibilities: jd.responsibilities || [],
      benefits: jd.benefits || [],
      additionalInfo: jd.additionalInfo || null
    });
    setShowSummaryPopup(true);
  };

  const handleCloseSummary = () => {
    setShowSummaryPopup(false);
    setSelectedJDSummary(null);
  };

  if (loading && loadingIncoming) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpinLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {showSummaryPopup && selectedJDSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseSummary}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden z-10">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedJDSummary.jobTitle}</h2>
                <p className="text-sm text-gray-500">{selectedJDSummary.companyName}</p>
              </div>
              <button
                onClick={handleCloseSummary}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <div className="space-y-6">
                {/* Job Summary */}
                {selectedJDSummary.jobSummary && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      Job Summary
                    </h3>
                    <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg">
                      {selectedJDSummary.jobSummary}
                    </p>
                  </div>
                )}

                {/* Requirements */}
                {selectedJDSummary.requirements?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Requirements
                    </h3>
                    <ul className="space-y-2">
                      {selectedJDSummary.requirements.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-700">
                          <span className="text-purple-500 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Responsibilities */}
                {selectedJDSummary.responsibilities?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Responsibilities
                    </h3>
                    <ul className="space-y-2">
                      {selectedJDSummary.responsibilities.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-700">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Benefits */}
                {selectedJDSummary.benefits?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Benefits
                    </h3>
                    <ul className="space-y-2">
                      {selectedJDSummary.benefits.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-700">
                          <span className="text-amber-500 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Additional Information */}
                {selectedJDSummary.additionalInfo && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Additional Information
                    </h3>
                    <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                      {selectedJDSummary.additionalInfo}
                    </p>
                  </div>
                )}

                {/* Show message if no data available */}
                {!selectedJDSummary.jobSummary &&
                  selectedJDSummary.requirements?.length === 0 &&
                  selectedJDSummary.responsibilities?.length === 0 &&
                  selectedJDSummary.benefits?.length === 0 &&
                  !selectedJDSummary.additionalInfo && (
                    <div className="text-center py-8 text-gray-500">
                      No JD details available
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4">
          {statsDisplay.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-2xl border border-gray-300 shadow-sm hover:shadow-md transition-shadow duration-300 p-6">
                <div className="flex items-center gap-4">
                  <div className={`${stat.bgColor} p-3 rounded-xl`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>


        <div className="bg-white rounded-4xl shadow-sm border border-gray-300 overflow-hidden">

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <SpinLoader />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Sr.No</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Company</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Job Title</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Created On</th>
                    {/* <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Skills</th> */}
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Filtered</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Unfiltered</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Action</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">See JD</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Send Invite</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length > 0 ? (
                    currentData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 text-sm text-gray-900 font-medium">{startIndex + index + 1}</td>
                        <td className="py-4 px-6 text-sm text-gray-700">{row.companyName || row.offerId?.company || 'N/A'}</td>
                        <td className="py-4 px-6 text-sm text-gray-700">{row.offerId?.jobTitle || 'N/A'}</td>
                        <td className="py-4 px-6 text-sm text-gray-700">{formatDate(row.createdAt)}</td>
                        {/* <td className="py-4 px-6">
                          <button
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-1.5 rounded-2xl text-sm font-medium transition-colors"
                            title={row.offerId?.skills?.join(', ') || 'No skills'}
                          >
                            View
                          </button>
                        </td> */}
                        <td className="py-4 px-6 text-sm text-blue-600 font-medium">{row.filteredCandidates?.length || 0}</td>
                        <td className="py-4 px-6 text-sm text-blue-600 font-medium">{row.unfilteredCandidates?.length || 0}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewJD(row)}
                              className="p-1 border border-blue-500 rounded-lg transition-colors"
                              aria-label="View"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </button>
                            {/* <button
                              onClick={() => handleDeleteJD(row._id)}
                              className="p-1 border border-red-500 rounded-lg transition-colors"
                              aria-label="Delete"
                            >
                              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button> */}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleShowSummary(row)}
                            className="p-1 border border-blue-500 rounded-lg transition-colors hover:bg-blue-50"
                            aria-label="View JD Summary"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                        </td>

                        <td className="py-4 px-6">
                          <button
                            onClick={() => navigate("/RecruiterAdmin-Dashboard/NonCandidateList", { state: { jdId: row._id } })}
                            className="p-1 border border-blue-500 rounded-lg transition-colors"
                            aria-label="View"
                          >
                            <ShareIcon className="w-4 h-4 text-blue-600" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="py-8 text-center text-gray-500">
                        No JDs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>

        </div>

        {/* Incoming Assigned JD Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mt-6">
          <div className="px-6 sm:px-8 py-4 border-b border-gray-300">
            <h2 className="text-xl font-semibold text-gray-900">Incoming Assigned JD</h2>
          </div>

          <div className="overflow-x-auto">
            {loadingIncoming ? (
              <div className="flex items-center justify-center py-12">
                <SpinLoader />
              </div>
            ) : incomingJDs.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-500">No incoming JD data available</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sr.No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentIncomingData.map((jd, index) => (
                    <tr key={jd._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {incomingStartIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {jd.jobTitle || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {jd.companyName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {jd.priority || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {jd.city || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {jd.country || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {jd.experience || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {jd.skills?.length ? jd.skills.join(", ") : "-"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          type="button"
                          onClick={() => handleSelectJD(jd)}
                          className="px-4 py-2 rounded-lg font-medium transition-colors bg-black text-white hover:bg-gray-800"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {incomingTotalPages > 1 && (
              <Pagination
                currentPage={incomingCurrentPage}
                totalPages={incomingTotalPages}
                onPageChange={handleIncomingPageChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default JD;
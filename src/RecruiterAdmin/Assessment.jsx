// import React, { useState, useEffect } from "react";
// import Pagination from "../components/LandingPage/Pagination";
// import { useNavigate } from "react-router-dom";
// import AssessmentAPI from "./api/generateAssessmentApi";
// import SpinLoader from "../components/SpinLoader";

// function Assessment() {
//   const [currentPage, setCurrentPage] = useState(1);
//   const rowsPerPage = 5;
//   const navigate = useNavigate();

//   // Load assessments from backend
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     let mounted = true;
//     const fetchAssessments = async () => {
//       try {
//         const json = await AssessmentAPI.getAllFinalizedTests();
//         if (!mounted) return;
//         if (!json) {
//           setError("Failed to fetch assessments");
//           setData([]);
//         } else {
//           setData(Array.isArray(json) ? json : []);
//         }
//       } catch (err) {
//         if (mounted) setError(err.message || "Failed to load");
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     fetchAssessments();
//     return () => { mounted = false; };
//   }, []);

//   const totalPages = Math.ceil(data.length / rowsPerPage);
//   const startIndex = (currentPage - 1) * rowsPerPage;
//   const endIndex = startIndex + rowsPerPage;
//   const currentData = data.slice(startIndex, endIndex);

//   const handlePageChange = (page) => setCurrentPage(page);

//   return (
//     <div className="">
//       <h1 className="text-2xl font-bold mb-4">Assessment</h1>

//       <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-200">
//         <table className="min-w-[900px] w-full text-sm">
//           <thead>
//             <tr className="bg-gray-50 border-b border-gray-200">
//               {/* <th className="text-left py-4 px-6 font-semibold text-gray-700">ID</th> */}
//               <th className="text-left py-4 px-6 font-semibold text-gray-700">Company</th>
//               <th className="text-left py-4 px-6 font-semibold text-gray-700">Job Title</th>
//               <th className="text-left py-4 px-6 font-semibold text-gray-700">Created On</th>
//               <th className="text-left py-4 px-6 font-semibold text-gray-700">Skills</th>
//               <th className="text-left py-4 px-6 font-semibold text-gray-700">Action</th>
//             </tr>
//           </thead>

//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan={6} className="py-6 px-6">
//                   <div className="flex justify-center">
//                     <SpinLoader />
//                   </div>
//                 </td>
//               </tr>
//             ) : error ? (
//               <tr><td colSpan={6} className="py-4 px-6 text-center text-red-500">{error}</td></tr>
//             ) : currentData.length === 0 ? (
//               <tr><td colSpan={6} className="py-4 px-6 text-center text-gray-500">No assessments found</td></tr>
//             ) : (
//               currentData.map((row, idx) => (
//                 <tr key={row.question_set_id || row.job_id || idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
//                   {/* <td className="py-3 px-6 text-gray-700">{row.question_set_id || row.job_id || idx}</td> */}
//                   <td className="py-3 px-6 text-blue-600 cursor-pointer">{row.company}</td>
//                   <td className="py-3 px-6 text-gray-700">{row.title}</td>
//                   <td className="py-3 px-6 text-gray-700">{row.createdAt}</td>

//                 {/* Render skills dynamically with unique keys */}
//                 <td className="py-3 px-6 text-gray-700">
//                   {row.skills && row.skills.length > 0 ? (
//                     <div className="flex flex-wrap gap-1">
//                       {row.skills.map((skill, index) => (
//                         <span
//                           key={`${row.id}-skill-${index}`}
//                           className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
//                         >
//                           {typeof skill === "string" ? skill : skill.skill}
//                         </span>
//                       ))}
//                     </div>
//                   ) : (
//                     <span className="text-gray-400 text-xs">No skills</span>
//                   )}
//                 </td>

//                 <td className="py-3 px-6">
//                   <button
//                     onClick={() =>
//                       navigate(
//                         `/RecruiterAdmin-Dashboard/Assessment/QuestionsList/${(row.question_set_id || row.job_id || "").toString().replace("#", "")}`
//                       )
//                     }
//                     className="px-6 py-1.5 bg-blue-100 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-200"
//                   >
//                     View
//                   </button>
//                 </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>

//         {totalPages > 1 && (
//           <Pagination
//             currentPage={currentPage}
//             totalPages={totalPages}
//             onPageChange={handlePageChange}
//           />
//         )}
//       </div>
//     </div>
//   );
// }

// export default Assessment;

import React, { useState, useEffect, useMemo } from "react";
import Pagination from "../components/LandingPage/Pagination";
import { useNavigate } from "react-router-dom";
import AssessmentAPI from "./api/generateAssessmentApi";
import SpinLoader from "../components/SpinLoader";

function Assessment() {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;
  const navigate = useNavigate();

  // Backend data
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchAssessments = async () => {
      try {
        const json = await AssessmentAPI.getAllFinalizedTests();
        if (!mounted) return;

        if (!json || !Array.isArray(json)) {
          setError("Failed to fetch assessments");
          setData([]);
        } else {
          setData(json);
        }
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAssessments();
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * ✅ SORT DATA BY LATEST DATE (FRONTEND)
   */
  const sortedData = useMemo(() => {
    return [...data].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [data]);

  /**
   * PAGINATION LOGIC
   */
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  const handlePageChange = (page) => setCurrentPage(page);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Assessment</h1>

      <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-200">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-4 px-6 font-semibold text-gray-700">
                Sr.No.
              </th>
              <th className="text-left py-4 px-6 font-semibold text-gray-700">
                Company
              </th>
              <th className="text-left py-4 px-6 font-semibold text-gray-700">
                Job Title
              </th>
              <th className="text-left py-4 px-6 font-semibold text-gray-700">
                Created On
              </th>
              <th className="text-left py-4 px-6 font-semibold text-gray-700">
                Skills
              </th>
              <th className="text-left py-4 px-6 font-semibold text-gray-700">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 px-6">
                  <div className="flex justify-center">
                    <SpinLoader />
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="py-4 px-6 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : currentData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 px-6 text-center text-gray-500">
                  No assessments found
                </td>
              </tr>
            ) : (
              currentData.map((row, idx) => (
                <tr
                  key={row.question_set_id || row.job_id || idx}
                  className="border-b border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="py-3 px-6 text-blue-600 cursor-pointer">
                    {startIndex + idx + 1}.
                  </td>

                  <td className="py-3 px-6 text-blue-600 cursor-pointer">
                    {row.company}
                  </td>

                  <td className="py-3 px-6 text-gray-700">
                    {row.title}
                  </td>

                  <td className="py-3 px-6 text-gray-700">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleDateString()
                      : "-"}
                  </td>

                  <td className="py-3 px-6 text-gray-700">
                    {row.skills && row.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.skills.map((skill, index) => (
                          <span
                            key={`${row.question_set_id}-skill-${index}`}
                            className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                          >
                            {typeof skill === "string"
                              ? skill
                              : skill.skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        No skills
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-6">
                    <button
                      onClick={() =>
                        navigate(
                          `/RecruiterAdmin-Dashboard/Assessment/QuestionsList/${(
                            row.question_set_id || row.job_id || ""
                          )
                            .toString()
                            .replace("#", "")}`
                        )
                      }
                      className="px-6 py-1.5 bg-blue-100 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-200"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}

export default Assessment;

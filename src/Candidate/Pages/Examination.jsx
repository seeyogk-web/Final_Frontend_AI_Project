import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AssessmentAPI from '../../RecruiterAdmin/api/generateAssessmentApi';
import SpinLoader from '../../components/SpinLoader';

export default function Examination() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const regex = / \d{2}:\d{2}:\d{2} GMT/;

  useEffect(() => {
    const fetchAssessment = async () => {
      setLoading(true);
      try {
        const candidateRaw = sessionStorage.getItem("candidateData");
        const candidate = candidateRaw ? JSON.parse(candidateRaw) : null;
        if (!candidate) {
          setJobs([
            {
              title: "No Examination Available",
              location: "—",
              description: "You have not been shortlisted for the test.",
              isActive: false,
              startDate: "—",
              startTime: "—",
              endDate: "—",
              endTime: "—",
            },
          ]);
          return;
        }

        // Use AssessmentAPI to fetch all finalized tests for candidate
        const candidateId = candidate._id || candidate.id;
        let finalisedTestResults = null;
        try {
          finalisedTestResults = await AssessmentAPI.getFinalizedTest(candidateId);
        } catch (apiErr) {
          console.error('Error fetching finalized test from AssessmentAPI:', apiErr);
        }
        // console.log("Finalised test API result for candidate", candidateId, ":", finalisedTestResults);

        if (Array.isArray(finalisedTestResults) && finalisedTestResults.length > 0) {
          // Check if the only result is a null/empty object (API: no assessment found)
          const onlyNull = finalisedTestResults.length === 1 &&
            Object.values(finalisedTestResults[0]).every(
              v => v === null || v === undefined || v === ""
            );
          if (!onlyNull) {
            // helper to parse date/time into a Date object
            const parseDateTime = (dateStr, timeStr) => {
              if (!dateStr && !timeStr) return null;
              try {
                // Try combined parse first
                const combined = `${dateStr || ''} ${timeStr || ''}`.trim();
                let dt = combined ? new Date(combined) : null;
                if (dt && !isNaN(dt)) return dt;
                // fallback to dateStr alone
                dt = dateStr ? new Date(dateStr) : null;
                if (dt && !isNaN(dt)) return dt;
              } catch (e) {}
              return null;
            };

            const now = new Date();

            // fetch taken tests for this candidate and exclude them from view
            let takenList = [];
            try {
              const taken = await AssessmentAPI.getTakenTests(candidateId);
              takenList = Array.isArray(taken) ? taken : [];
              console.log('Examination: takenList ->', takenList);
            } catch (e) {
              console.warn('Failed to fetch taken tests', e);
            }

            // normalize helpers to robustly extract question set ids from different API shapes
            const normalizeQuestionSetId = (t) => {
              if (!t) return null;
              if (typeof t === 'string') return t;
              return t.questionSetId || t.question_set_id || t.question_set || (t.questionSet && (t.questionSet.id || t.questionSet._id)) || null;
            };

            // build set of taken question_set_ids (normalize keys)
            const takenQuestionSetIds = new Set(
              takenList
                .map(t => t.question_set_id || t.questionSetId || (t.question && (t.question.question_set_id || t.question.questionSetId)) || null)
                .filter(Boolean)
            );

            // filter out tests where the finalized test's question_set_id matches any taken question_set_id
            const availableTests = finalisedTestResults.filter(test => {
              const qid = normalizeQuestionSetId(test);
              if (qid && takenQuestionSetIds.has(qid)) {
                console.log('Examination: filtering out taken test by question_set_id', { qid });
                return false;
              }
              return true;
            });

            setJobs(availableTests.map(test => {
              const rawStart = test.exam_date ? test.exam_date.replace(regex, '') : test.startDate || '';
              const rawEnd = test.end_date ? test.end_date.replace(regex, '') : test.endDate || '';
              let startDT = parseDateTime(rawStart, test.test_start || test.startTime);
              let endDT = parseDateTime(rawEnd, test.test_end || test.endTime);

              // If parsing failed for date-only strings, try treating date-only as start/end of day
              const tryDateOnlyAsEndOfDay = (dateStr) => {
                if (!dateStr) return null;
                try {
                  const d = new Date(dateStr);
                  if (d && !isNaN(d)) {
                    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
                  }
                } catch (e) {}
                return null;
              };

              const tryDateOnlyAsStartOfDay = (dateStr) => {
                if (!dateStr) return null;
                try {
                  const d = new Date(dateStr);
                  if (d && !isNaN(d)) {
                    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
                  }
                } catch (e) {}
                return null;
              };

              if (!startDT) startDT = tryDateOnlyAsStartOfDay(rawStart) || null;
              if (!endDT) endDT = tryDateOnlyAsEndOfDay(rawEnd) || null;

              // Debug logging to help verify parsing (can be removed later)
              // console.debug('Exam parse', { rawStart, rawEnd, startDT, endDT });

              const isActiveFlag = typeof test.isActive === 'boolean' ? test.isActive : true;
              // isAvailable = within scheduled window (if provided) and active
              const isWithinWindow = (startDT ? now >= startDT : true) && (endDT ? now <= endDT : true);
              const isAvailable = isActiveFlag && isWithinWindow;

              return {
                title: test.title || "Assessment",
                company: test.company,
                // include job id from the API response so downstream pages can access it
                jobId: test.jobId || test.job_id || test._id || test.id || null,
                location: test.location || "API Response Check",
                workType: test.workType || "API Response Check",
                skills: Array.isArray(test.skills) ? test.skills : [],
                description: test.description || "This is an assessment for your role.",
                startDate: rawStart || "Today",
                startTime: test.test_start || test.startTime || "10:00 AM",
                endDate: rawEnd || "—",
                endTime: test.test_end || test.endTime || "—",
                isActive: isActiveFlag,
                isAvailable,
                questionSetId: test.questionSetId || test.question_set_id || "assessment",
                questions: Array.isArray(test.questions) ? test.questions : [],
                aiScore: test.aiScore !== null && test.aiScore !== undefined ? test.aiScore : null,
                aiExplanation: test.aiExplanation !== null && test.aiExplanation !== undefined ? test.aiExplanation : null
              };
            }));
            return;
          }
        }
        // If not found or not eligible, show not shortlisted message
        setJobs([
          {
            title: "No Examination Available",
            location: "—",
            description: "You have not been shortlisted for the test.",
            isActive: false,
            startDate: "—",
            startTime: "—",
            endDate: "—",
            endTime: "—",
          },
        ]);
        } catch (err) {
          console.error("Error fetching assessment from backend", err);
          setJobs([
            {
              title: "No Assessment Found",
              location: "—",
              workType: "—",
              employmentMode: "—",
              description:
                "No assessment has been generated yet. Please check back later.",
              startDate: "—",
              startTime: "—",
              endDate: "—",
              endTime: "—",
              isActive: false,
            },
          ]);
        } finally {
          setLoading(false);
        }
    };
    fetchAssessment();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpinLoader />
      </div>
    );
  }

  const handleGiveTest = (job) => {
    // normalize job id from possible keys
    const id = job.jobId || job.job_id || job.id || null;
    const qid = job.questionSetId || job.question_set_id || job.questionSetId || null;
    try {
      sessionStorage.setItem('jobData', JSON.stringify({ job_id: id, questionSetId: qid }));
      console.log('Examination: stored jobData ->', { job_id: id, questionSetId: qid });
    } catch (e) {}
    try {
      // also pass via router state for immediate availability
      navigate(`/Candidate-Dashboard/Examination/TestDetails/${job.questionSetId}?job_id=${encodeURIComponent(id || '')}`, { state: { job_id: id } });
    } catch (e) {
      // fallback to simple navigate
      navigate(`/Candidate-Dashboard/Examination/TestDetails/${job.questionSetId}?job_id=${encodeURIComponent(id || '')}`);
    }
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Available Examinations
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-gray-300 hover:shadow-md transition-shadow duration-300 flex flex-col h-full"
          >
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{job.title}</h2>

              <p className="text-red-500 text-sm sm:text-base mb-4">{job.location}</p>

              {job.workType && (
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-3 py-1 text-xs sm:text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-xl">
                    {job.workType}
                  </span>

                  {/* <span className="px-3 py-1 text-xs sm:text-sm font-medium text-purple-700 bg-purple-50 border border-purple-300 rounded-xl">
                    {job.employmentMode}
                  </span> */}
                </div>
              )}

              <p className="text-gray-600 text-sm leading-relaxed mb-2">{job.description}</p>

              {job.skills && job.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {job.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 text-xs sm:text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-2 text-sm sm:text-base mb-4">
                <div className="flex">
                  <span className="font-semibold text-gray-900 min-w-[100px]">From:</span>
                  <span className="text-gray-700 ml-2">
                    {job.startDate} at {job.startTime}
                  </span>
                </div>

                <div className="flex">
                  <span className="font-semibold text-gray-900 min-w-[100px]">To:</span>
                  <span className="text-gray-700 ml-2">
                    {job.endDate} at {job.endTime}
                  </span>
                </div>
              </div>
            </div>

            <hr />

            <div className="flex justify-end">
              {job.isActive && job.isAvailable ? (
                <button
                  onClick={() => handleGiveTest(job)}
                  className={`mt-2 w-[100px] py-2 rounded-2xl font-medium text-sm sm:text-base transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg`}
                >
                  Give Test
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

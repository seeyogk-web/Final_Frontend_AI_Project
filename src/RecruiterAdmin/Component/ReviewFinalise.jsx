import { useState } from 'react';
import { Info, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import AssessmentAPI from '../api/generateAssessmentApi';
import { baseUrl } from '../../utils/ApiConstants';


export default function ReviewFinalise({ formData, questions, onFinalize, onBack, loading }) {
  const navigate = useNavigate();
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);

  // Transform questions to display format
  console.log("Seeyog",questions);
  // Log job details passed through formData
  console.log('ReviewFinalise received jobDetails:', formData?.jobDetails || null);
  const displayQuestions = questions.map((q, idx) => {
    const content = q.content || {};
    
    if (q.type === 'mcq') {
      // prefer correct answer info from normalized question (top-level) or content
      const correctAnswerRaw = q.correct_answer || content.correct_answer || content.answer || q.correctAnswer || null;
      const correctOptionText = q.correct_option_text || null;

      return {
        id: idx + 1,
        question_id: q.question_id,
        text: content.prompt || content.question || '',
        options: content.options || [],
        correctAnswer: correctAnswerRaw || '',
        correctOptionText: correctOptionText,
        explanation: content.explanation || 'No explanation provided',
        tags: [q.skill],
        skills: [q.skill],
        time: q.time_limit || 60,
        difficulty: q.difficulty || 'medium',
        questionType: 'MCQ',
        marks: q.positive_marking || 5,
        negative_marking: q.negative_marking || 0,
        type: q.type,
        skill: q.skill
      };
    } else if (q.type === 'coding') {
      return {
        id: idx + 1,
        question_id: q.question_id,
        text: content.prompt || content.question || '',
        input_spec: content.input_spec || '',
        output_spec: content.output_spec || '',
        examples: content.examples || [],
        tags: [q.skill],
        skills: [q.skill],
        time: q.time_limit || 300,
        difficulty: q.difficulty || 'medium',
        questionType: 'Coding',
        marks: q.positive_marking || 2,
        type: q.type,
        skill: q.skill
      };
    } else if (q.type === 'audio') {
      return {
        id: idx + 1,
        question_id: q.question_id,
        text: content.prompt_text || content.question || '',
        expected_keywords: content.expected_keywords || [],
        rubric: content.rubric || '',
        tags: [q.skill],
        skills: [q.skill],
        time: q.time_limit || content.suggested_time_seconds || 120,
        difficulty: q.difficulty || 'medium',
        questionType: 'Audio',
        marks: q.positive_marking || 5,
        type: q.type,
        skill: q.skill
      };
    } else if (q.type === 'video') {
      return {
        id: idx + 1,
        question_id: q.question_id,
        text: content.prompt_text || content.question || '',
        rubric: content.rubric || '',
        tags: [q.skill],
        skills: [q.skill],
        time: q.time_limit || content.suggested_time_seconds || 180,
        difficulty: q.difficulty || 'medium',
        questionType: 'Video',
        marks: q.positive_marking || 5,
        type: q.type,
        skill: q.skill
      };
    } else if (q.type === 'text') {
      return {
        id: idx + 1,
        question_id: q.question_id,
        text: content.prompt || content.question || '',
        tags: [q.skill],
        skills: [q.skill],
        time: q.time_limit || 60,
        difficulty: q.difficulty || 'medium',
        questionType: 'Text',
        marks: q.positive_marking || 1,
        type: q.type,
        skill: q.skill
      };
    } else if (q.type === 'rating') {
      return {
        id: idx + 1,
        question_id: q.question_id,
        text: content.prompt || content.question || '',
        scale: content.scale || 5,
        tags: [q.skill],
        skills: [q.skill],
        time: q.time_limit || 60,
        difficulty: q.difficulty || 'medium',
        questionType: 'Rating',
        marks: q.positive_marking || 1,
        type: q.type,
        skill: q.skill
      };
    }
    
    return {
      id: idx + 1,
      question_id: q.question_id,
      text: 'Question format not supported',
      type: q.type,
      skill: q.skill || 'Unknown'
    };
  });

  // Calculate statistics
  const totalQuestions = displayQuestions.length;
  const totalMarks = displayQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const totalTime = Math.ceil(displayQuestions.reduce((sum, q) => sum + parseInt(q.time || 0), 0) / 60); // in minutes

  // Calculate skill distribution for bar graph
  const skillDistribution = displayQuestions.reduce((acc, q) => {
    const skill = q.skill || 'Unknown';
    if (!acc[skill]) {
      acc[skill] = { count: 0, marks: 0 };
    }
    acc[skill].count += 1;
    acc[skill].marks += q.marks || 0;
    return acc;
  }, {});

  const skills = Object.entries(skillDistribution).map(([name, data]) => ({
    name,
    value: data.count,
    marks: data.marks,
    maxValue: totalQuestions
  }));

  const handleFinalize = async () => {
    setLocalLoading(true);
    setError(null);

    try {
      // Prepare payload using AssessmentAPI utility
      // Only include 'skills' and required fields in payload
      // Get job_id from localStorage.selectedJD if available
      let jobIdFromLocal = null;
      const selectedJDRaw = localStorage.getItem('selectedJD');
      if (selectedJDRaw) {
        try {
          const selectedJD = JSON.parse(selectedJDRaw);
          jobIdFromLocal = selectedJD._id || selectedJD.job_id || null;
        } catch {}
      }

      // Get filtered candidate IDs from localStorage
      let candidateIds = [];
      const filteredCandidateIdsRaw = localStorage.getItem('filteredCandidateIds');
      if (filteredCandidateIdsRaw) {
        try {
          candidateIds = JSON.parse(filteredCandidateIdsRaw);
        } catch {}
      }

      const minimalPayload = {
        test_title: formData.test_title || `${formData.role_title || formData.title || formData.role_title || formData.roleTitle || ''} Assessment`,
        test_description: formData.test_description || `Assessment for ${formData.role_title || formData.title || ''} position requiring ${formData.experience || ''} experience`,
        job_id: jobIdFromLocal || formData.job_id || formData.jobId || null,
        role_title: formData.role_title || formData.title || null,
        skills: (formData.skills || (formData.skillLevels ? formData.skillLevels.map(s => s.skill) : [])).join(','),
        candidate_ids: candidateIds.join(','),
        company: formData.company || null,
        startDate: formData.startDate,
        startTime: formData.startTime,
        endDate: formData.endDate,
        endTime: formData.endTime,
        questions: questions.map(q => ({
          question_id: q.question_id,
          type: q.type,
          skill: q.skill,
          difficulty: q.difficulty,
          content: q.content,
          time_limit: q.time_limit || 60,
          positive_marking: (q.positive_marking ?? (q.type === 'coding' ? 2 : (['mcq', 'audio', 'video'].includes(q.type) ? 5 : 1))),
          negative_marking: q.negative_marking || 0,
        })),
      };

      console.log("aneesh", formData);
      console.log('Payload sent to finalize API:', JSON.stringify(minimalPayload, null, 2));
      let candidateIdsArray = [];

          // If candidateIds is a string → convert to array
          if (typeof candidateIds === "string") {
            candidateIdsArray = candidateIds
              .split(",")
              .map(id => id.trim())
              .filter(Boolean);
          }

          // If already array → use as-is
          if (Array.isArray(candidateIds)) {
            candidateIdsArray = candidateIds;
          }
         const token = localStorage.getItem("token");
         await axios.post(
          `${baseUrl}/api/candidate/send-email/${jobIdFromLocal}`,
          { candidateIds: candidateIdsArray, },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }
        );

      // Call backend API directly
      // Finalize test using AssessmentAPI
      const result = await AssessmentAPI.finalizeTest(minimalPayload);
      console.log("-------------: ",result.status)
      if (result.status == 'success') {
        // Save to localStorage
        // const existingTests = JSON.parse(localStorage.getItem("jobDataList")) || [];
        // const newTest = {
        //   id: `#${result.data.questionSetId || result.data._id || 'unknown'}`,
        //   company: minimalPayload.company || formData.selectedJD?.companyName || formData.selectedJD?.offerId?.company || "Unknown Company",
        //   jobTitle: minimalPayload.test_title || minimalPayload.role_title,
        //   createdOn: new Date().toLocaleDateString(),
        //   skills: [...new Set(questions.map(q => q.skill))],
        //   totalQuestions: totalQuestions,
        //   totalMarks: totalMarks,
        //   expiryTime: result.data.expiry_time || '',
        // };
        // localStorage.setItem("jobDataList", JSON.stringify([...existingTests, newTest]));

        // Debug: log before navigation
        console.log('Navigating to /RecruiterAdmin-Dashboard/JDDetails/GenerateAssessment/Created');
        navigate('/RecruiterAdmin-Dashboard/JDDetails/GenerateAssessment/Created');
      } else {
        setError(result?.message || 'Failed to finalize test');
      }
    } catch (err) {
      setError(err.message || 'Failed to finalize test. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;

  return (
    <div className="">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info className="text-blue-600 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">Review & Finalize Test</h3>
          <p className="text-sm text-gray-600">
            Review all test details and questions below. Click "Finalize" to save and publish the test.
          </p>
          <div className="bg-white border border-gray-300 shadow-md rounded-xl p-4">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Questions</div>
            <div className="text-3xl font-bold text-blue-500">{totalQuestions}</div>
          </div>
          <div className="bg-white border border-gray-300 shadow-md rounded-xl p-4">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Marks</div>
            <div className="text-3xl font-bold text-green-500">{totalMarks}</div>
          </div>
          <div className="bg-white border border-gray-300 shadow-md rounded-xl p-4">
            <div className="text-sm font-medium text-gray-600 mb-1">Duration</div>
            <div className="text-3xl font-bold text-purple-500">{totalTime}</div>
            <div className="text-xs text-gray-500">minutes</div>
          </div>
          <div className="bg-white border border-gray-300 shadow-md rounded-xl p-4">
            <div className="text-sm font-medium text-gray-600 mb-1">Skills</div>
            <div className="text-3xl font-bold text-orange-500">{skills.length}</div>
          </div>
        </div>
      </div>

      {/* Skills Bar Graph */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Question Distribution by Skill</h2>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-700 font-medium">Questions Count</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="min-w-[400px] relative pl-12">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-sm text-gray-500 font-medium">
              {[totalQuestions, Math.ceil(totalQuestions * 0.75), Math.ceil(totalQuestions * 0.5), Math.ceil(totalQuestions * 0.25), 0].map((val, idx) => (
                <span key={idx}>{val}</span>
              ))}
            </div>

            {/* Graph area */}
            <div className="border-l-2 border-b-2 border-gray-300 h-64 relative">
              {/* Horizontal grid lines */}
              {[0, 25, 50, 75].map((percentage) => (
                <div
                  key={percentage}
                  className="absolute w-full border-t border-gray-200"
                  style={{ bottom: `${percentage}%` }}
                ></div>
              ))}

              {/* Bars */}
              <div className="h-full flex items-end justify-around px-8 pb-2 gap-4">
                {skills.map((skill, index) => {
                  const heightPercentage = (skill.value / totalQuestions) * 100;

                  return (
                    <div key={index} className="flex flex-col items-center group">
                      <div className="relative flex flex-col items-center">
                        {/* Value label on top */}
                        <span className="text-sm font-semibold text-gray-700 mb-2">
                          {skill.value}
                        </span>

                        {/* Bar */}
                        <div
                          className="w-16 lg:w-20 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-300 hover:from-blue-700 hover:to-blue-500 hover:shadow-lg cursor-pointer"
                          style={{ height: `${(heightPercentage / 100) * 240}px` }}
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {skill.value} questions<br />
                            {skill.marks} marks
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex items-start justify-around px-8 mt-4">
              {skills.map((skill, index) => (
                <div key={index} className="text-center w-16 lg:w-20">
                  <span className="text-sm text-gray-700 font-medium break-words">
                    {skill.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="mb-6 border border-gray-300 shadow-md rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Questions</h3>
        <div className="space-y-4">
          {displayQuestions.map((question) => (
            <div
              key={question.id}
              className="bg-white border border-gray-300 shadow-sm rounded-xl p-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 flex-1">
                  <span className="text-lg font-semibold text-gray-900 shrink-0">Q{question.id}</span>
                  <div className="flex-1">
                    <p className="text-base text-gray-900 font-medium mb-3">{question.text}</p>


                    {/* MCQ Options */}
                    {question.questionType === 'MCQ' && question.options && (
                      <>
                        {/* ...existing code for MCQ... */}
                        <div className="space-y-2 mb-3">
                          {question.options.map((option, idx) => {
                            const optionText = typeof option === 'string' ? option : option;
                            const isCorrect = question.correctAnswer === String.fromCharCode(65 + idx) ||
                                            question.correctAnswer === optionText;
                            return (
                              <div 
                                key={idx} 
                                className={`flex items-center gap-2 p-2 rounded text-sm ${isCorrect ? 'bg-green-50 border border-green-300' : 'bg-gray-50'}`}
                              >
                                <span className={`font-medium ${isCorrect ? 'text-green-700' : 'text-gray-600'}`}>
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                <span className={isCorrect ? 'text-green-800 font-semibold' : 'text-gray-700'}>
                                  {optionText}
                                  {isCorrect && <span className="ml-2">✅</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {question.explanation && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold">Explanation:</span> {question.explanation}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Coding Question */}
                    {question.questionType === 'Coding' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                        {question.input_spec && (
                          <p className="text-sm mb-2">
                            <span className="font-semibold text-gray-700">Input:</span> {question.input_spec}
                          </p>
                        )}
                        {question.output_spec && (
                          <p className="text-sm">
                            <span className="font-semibold text-gray-700">Output:</span> {question.output_spec}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Audio Question */}
                    {question.questionType === 'Audio' && (
                      <div className="space-y-2 mb-3">
                        {question.expected_keywords && question.expected_keywords.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <span className="text-sm font-semibold text-gray-700">Expected Keywords:</span>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {question.expected_keywords.map((keyword, idx) => (
                                <span key={idx} className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-medium">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {question.rubric && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold">Rubric:</span> {question.rubric}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Video Question */}
                    {question.questionType === 'Video' && question.rubric && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Rubric:</span> {question.rubric}
                        </p>
                      </div>
                    )}

                    {/* Text Question */}
                    {question.questionType === 'Text' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Text Response:</span> Candidate will provide a written answer.
                        </p>
                      </div>
                    )}

                    {/* Rating Question */}
                    {question.questionType === 'Rating' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Rating Scale:</span> {question.scale || 5} (Candidate will rate on a scale)
                        </p>
                      </div>
                    )}

                    {/* Question Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{question.time}s</span>
                      </div>
                      {question.marks > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          +{question.marks} marks
                        </span>
                      )}
                      {question.negative_marking > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                          -{question.negative_marking}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                        {question.skill}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                        {question.difficulty}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        {question.questionType}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={handleFinalize}
          disabled={isLoading || displayQuestions.length === 0}
          className="px-8 py-3 bg-[#0496FF] text-white rounded-lg hover:bg-blue-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Finalizing...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Finalize & Publish Test
            </>
          )}
        </button>
      </div>
    </div>
  );
}
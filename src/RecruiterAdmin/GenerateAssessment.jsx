import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TestDetail from '../RecruiterAdmin/Component/TestDetail';
import QuestionMaker from '../RecruiterAdmin/Component/QuestionMaker';
import ReviewFinalise from '../RecruiterAdmin/Component/ReviewFinalise';
import AssessmentAPI from './api/generateAssessmentApi';

function GenerateAssessment() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const location = useLocation();
  const filteredCandidates = location.state?.filteredCandidates || [];
  console.log("Filtered candidates received:", filteredCandidates);

  // Prefer JD passed via navigation state; fallback to localStorage
  const jdFromLocation = location.state?.jdData || null;
  const [selectedJD, setSelectedJD] = useState(() => {
    if (jdFromLocation) return jdFromLocation;
    try {
      const saved = localStorage.getItem("selectedJD");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Log selected JD for debugging
  console.log('Selected JD in GenerateAssessment:', selectedJD);

  // Prefill formData with selected JD info if available, using full payload structure
  const [formData, setFormData] = useState({
    title: selectedJD?.offerId?.jobTitle || '',
    company: selectedJD?.companyName || selectedJD?.offerId?.company || "Unknown Company",
    location: '',
    workType: '',
    employmentMode: '',
    skills: selectedJD?.offerId?.skills || [],
    experience: '',
    description: '',
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
    isActive: true,
    questionSetId: '',
    job_id: selectedJD?._id || null,
    total_questions: 0,
    total_duration: 0,
    mini_compensation: '',
    max_compensation: '',
    currency: 'INR',
    created_at: new Date(),
    expiry_time: '',
    status: 'active',
    duration: 0,
    questions: [],
    candidates: filteredCandidates,
    jobDetails: selectedJD,
    skillLevels: [],
  });

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Normalize question defaults so editing UI shows correct default marks/time
  const normalizeQuestionDefaults = (q) => {
    if (!q || typeof q !== 'object') return q;
    const type = q.type || (q.content && (q.content.code ? 'coding' : q.content.audio ? 'audio' : q.content.video ? 'video' : 'mcq'));
    const defaultPositive = q.positive_marking ?? (type === 'coding' ? 2 : (['mcq', 'audio', 'video'].includes(type) ? 5 : 1));
    const defaultNegative = q.negative_marking ?? 0;
    const defaultTime = q.time_limit ?? (type === 'coding' ? 300 : type === 'audio' ? 120 : type === 'video' ? 180 : 60);

    // expose MCQ correct answer if provided in payload (keep original keys too)
    const correctAnswerRaw = q.content?.correct_answer ?? q.correct_answer ?? q.correctAnswer ?? null;
    let correctOptionText = null;
    try {
      if (correctAnswerRaw && Array.isArray(q.content?.options) && typeof correctAnswerRaw === 'string') {
        const letter = correctAnswerRaw.trim().toUpperCase().charAt(0);
        const idx = letter.charCodeAt(0) - 65;
        if (idx >= 0 && idx < q.content.options.length) {
          correctOptionText = q.content.options[idx];
        } else {
          // fallback: try to find an option that starts with the letter (e.g., "C.")
          const found = q.content.options.find(opt => typeof opt === 'string' && opt.trim().startsWith(letter + '.'));
          if (found) correctOptionText = found;
        }
      }
    } catch (e) {}

    return {
      ...q,
      positive_marking: defaultPositive,
      negative_marking: defaultNegative,
      time_limit: defaultTime,
      correct_answer: correctAnswerRaw,
      correct_option_text: correctOptionText,
    };
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!formData.roleTitle || formData.skills.length === 0) {
        setError('Please fill all required fields and add at least one skill.');
        return;
      }
      await generateQuestions();
    } else if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleFormUpdate = (patch) =>
    setFormData(prev => ({ ...prev, ...patch }));

  const generateQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Transform formData to backend payload format
      const payload = AssessmentAPI.transformToBackendPayload(formData);
      console.log("Payload for Gen Test: ",payload)
      if (!payload.skills || payload.skills.length === 0) {
        throw new Error('Please select at least one skill with question counts greater than 0');
      }
      // Use AssessmentAPI for generate-test

      const result = await AssessmentAPI.generateTest(payload);
      console.log('generateTest API result:', result);
      // Support both {success, data: {questions}} and {status, questions} formats
      if (result && Array.isArray(result.questions)) {
        const normalized = result.questions.map(q => normalizeQuestionDefaults(q));
        setQuestions(normalized);
        setFormData(prev => ({
          ...prev,
          questions: normalized,
          total_questions: normalized.length,
        }));
        setCurrentStep(2);
      } else if (result && result.success && result.data && Array.isArray(result.data.questions)) {
        const normalized = result.data.questions.map(q => normalizeQuestionDefaults(q));
        setQuestions(normalized);
        setFormData(prev => ({
          ...prev,
          questions: normalized,
          total_questions: normalized.length,
        }));
        setCurrentStep(2);
      } else {
        // Log full result for debugging
        console.error('Unexpected API response:', result);
        throw new Error(result?.message || 'Invalid response from server');
      }
    } catch (err) {
      console.error('Error generating questions:', err);
      setError(err.message || 'Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use full formData as payload for backend
      const payload = { ...formData };
      // Ensure up-to-date questions and counts; normalize defaults
      const normalizedQuestions = questions.map(q => normalizeQuestionDefaults(q));
      payload.questions = normalizedQuestions;
      payload.total_questions = questions.length;
      payload.title = formData.title || formData.roleTitle;
      payload.company = formData.company || selectedJD?.companyName || selectedJD?.offerId?.company || "Unknown Company";
      payload.job_id = formData.job_id || selectedJD?._id || null;
      payload.questionSetId = formData.questionSetId || (questions.length > 0 ? 'set_' + Math.random().toString(36).substr(2, 9) : '');
      payload.created_at = new Date();
      // include full job details if available
      payload.jobDetails = formData.jobDetails || selectedJD || null;

      console.log('Finalize payload:', payload);

      // Use AssessmentAPI for finalize-test
      const result = await AssessmentAPI.finalizeTest(payload);

      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to finalize test');
      }

      // Optionally save to localStorage for frontend navigation
      const saved = JSON.parse(localStorage.getItem("jobDataList")) || [];

      const generateNextId = (existingData) => {
        if (!existingData || existingData.length === 0) return '#145756';
        const lastId = existingData[existingData.length - 1].id;
        const numeric = parseInt(lastId.replace('#','')) + 1;
        return `#${numeric}`;
      };

      const getCurrentDateString = () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2,'0');
        const month = String(now.getMonth()+1).padStart(2,'0');
        const year = now.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const newAssessment = {
        id: generateNextId(saved),
        company: payload.company,
        jobTitle: payload.title,
        createdOn: getCurrentDateString(),
        questionSetId: payload.questionSetId,
        totalQuestions: payload.total_questions,
        skills: payload.skills,
        schedule: {
          startDate: payload.startDate,
          startTime: payload.startTime,
          endDate: payload.endDate,
          endTime: payload.endTime,
        },
        expiryTime: payload.expiry_time,
        isActive: true,
      };

      saved.push(newAssessment);
      localStorage.setItem("jobDataList", JSON.stringify(saved));
      localStorage.setItem("jobData", JSON.stringify(newAssessment));

      navigate('/Created', {
        state: {
          testTitle: payload.title,
          questionSetId: payload.questionSetId,
          totalQuestions: payload.total_questions,
          expiryTime: payload.expiry_time,
        },
      });

    } catch (error) {
      console.error("Finalize error:", error);
      setError(error.message || "Failed to finalize test. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: 'Test Details' },
    { number: 2, label: 'Question Maker' },
    { number: 3, label: 'Review & Finalise' }
  ];

  const totalSteps = steps.length;
  const progress = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Generate Assessment</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center">
          <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />

          <div className="relative z-10 bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 flex items-center gap-4 max-w-md mx-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>

            <div>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {currentStep === 1 ? 'Generating questions' : 'Finalizing test'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">This may take a few moments — we&apos;re preparing the assessment.</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Progress Bar */}
      <div className="bg-white rounded-2xl border border-gray-300 px-6 pt-5 pb-7 shadow-md relative">
        <div className="flex items-start justify-between">
          {steps.map((step) => (
            <div key={step.number} className="flex-1 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-semibold ${
                  step.number <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.number}
              </div>
              <span
                className={`mt-2 text-sm font-medium text-center ${
                  step.number <= currentStep ? 'text-gray-700' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="absolute left-4 right-4 bottom-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      </div>

      {/* Step Components */}
      <main className="py-8">
        {currentStep === 1 && (
          <TestDetail
            formData={formData}
            onUpdate={handleFormUpdate}
            onNext={handleNext}
            onCancel={handleBack}
            loading={loading}
          />
        )}
        {currentStep === 2 && (
          <QuestionMaker
            questions={questions}
            onUpdate={setQuestions}
            onNext={handleNext}
            onBack={handleBack}
            loading={loading}
          />
        )}
        {currentStep === 3 && (
          <ReviewFinalise
            formData={formData}
            questions={questions}
            onFinalize={handleFinalize}
            onBack={handleBack}
            loading={loading}
          />
        )}
      </main>
    </div>
  );
}

export default GenerateAssessment;

// API service for Generate Assessment
// API service for Generate Assessment
import { pythonUrl } from "../../utils/ApiConstants";
const API_BASE_URL = `${pythonUrl}/v1`;

class AssessmentAPI {
  /**
   * Fetch all finalized tests for a candidate
   * @param {string} candidateId
   * @returns {Promise<Object[]>} Array of finalized test responses
   */
  static async getFinalizedTest(candidateId) {
    try {
      const response = await fetch(`${API_BASE_URL}/finalise/finalized-test?candidateId=${candidateId}`);
      if (!response.ok) {
        // Try to parse error JSON, but fallback to status text or HTML
        let errorText = await response.text();
        console.error(`Finalized test API returned status ${response.status}:`, errorText);
        return null;
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching finalized test:', error);
      return null;
    }
  }

  /**
   * Fetch all finalized tests (no candidate filter)
   * @returns {Promise<Object[]>}
   */
  static async getAllFinalizedTests() {
    try {
      const response = await fetch(`${API_BASE_URL}/finalise/finalized-tests`);
      if (!response.ok) {
        let errorText = await response.text();
        console.error(`Finalized tests API returned status ${response.status}:`, errorText);
        return null;
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching finalized tests:', error);
      return null;
    }
  }
  
  /**
   * Get list of tests taken by a candidate (job_id / question_set_id)
   * @param {string} candidateId
   */
  static async getTakenTests(candidateId) {
    try {
      const response = await fetch(`${API_BASE_URL}/test/taken?candidate_id=${encodeURIComponent(candidateId)}`);
      if (!response.ok) {
        let txt = await response.text();
        console.error('getTakenTests failed', response.status, txt);
        return [];
      }
      const data = await response.json();
      return data.taken || [];
    } catch (error) {
      console.error('Error fetching taken tests:', error);
      return [];
    }
  }
  /**
   * Generate test questions based on skills and difficulty levels
   * @param {Object} payload - Skills configuration
   * @returns {Promise<Object>} Generated questions
   */
  static async generateTest(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/generate-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate test');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating test:', error);
      throw error;
    }
  }

  /**
   * Finalize and save test to database
   * @param {Object} payload - Complete test data with questions
   * @returns {Promise<Object>} Saved test information
   */
  static async finalizeTest(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/finalize-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to finalize test');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error finalizing test:', error);
      throw error;
    }
  }

  /**
   * Transform frontend formData to backend payload format
   * @param {Object} formData - Frontend form data
   * @returns {Object} Backend-compatible payload
   */
  static transformToBackendPayload(formData) {
    const skills = formData.skillLevels
      .filter(skill => {
        const totalQuestions = (skill.mcq || 0) + (skill.coding || 0) + (skill.audio || 0) + (skill.video || 0);
        return totalQuestions > 0;
      })
      .map(skill => ({
        name: skill.skill,
        difficulty: skill.level.toLowerCase() === 'any' ? 'medium' : skill.level.toLowerCase(),
        counts: {
          mcq: skill.mcq || 0,
          coding: skill.coding || 0,
          audio: skill.audio || 0,
          video: skill.video || 0,
        },
      }));

    return {
      skills,
      global_settings: { mcq_options: 4 },
    };
  }

  /**
   * Transform backend questions to frontend format
   * @param {Array} backendQuestions - Questions from backend
   * @returns {Array} Frontend-compatible questions
   */
  static transformToFrontendQuestions(backendQuestions) {
    if (!Array.isArray(backendQuestions)) {
      console.error('Backend questions is not an array:', backendQuestions);
      return [];
    }

    return backendQuestions.map(q => ({
      question_id: q.question_id,
      skill: q.skill,
      type: q.type,
      difficulty: q.difficulty,
      content: q.content,
      time_limit: q.content?.time_limit || 60,
      positive_marking: q.content?.positive_marking || 1,
      negative_marking: q.content?.negative_marking || 0,
    }));
  }

  /**
   * Prepare finalization payload
   * @param {Object} formData - Form data from step 1
   * @param {Array} questions - Questions from step 2
   * @returns {Object} Finalization payload
   */
  static prepareFinalizePayload(formData, questions) {
    return {
      test_title: `${formData.roleTitle || formData.title || ''} Assessment`,
      test_description: `Assessment for ${formData.roleTitle || formData.title || ''} position requiring ${formData.experience || ''} experience`,
      job_id: formData.jobId || formData.job_id || null,
      role_title: formData.roleTitle || formData.title || null,
      skills: formData.skills || (formData.skillLevels ? formData.skillLevels.map(s => s.skill) : []),
      experience: formData.experience || null,
      work_arrangement: formData.workArrangement || formData.work_arrangement || null,
      location: formData.location || null,
      annual_compensation: formData.annualCompensation || formData.annual_compensation || null,
      work_type: formData.workType || formData.work_type || null,
      company: formData.company || null,
      questions: questions.map(q => ({
        question_id: q.question_id,
        type: q.type,
        skill: q.skill,
        difficulty: q.difficulty,
        content: q.content,
        time_limit: q.time_limit || 60,
        positive_marking: q.positive_marking || 1,
        negative_marking: q.negative_marking || 0,
      })),
    };
  }

  /**
   * Fetch questions by question set ID
   * @param {string} questionSetId
   * @returns {Promise<Array>} Questions array
   */
  static async getQuestionsByAssessmentId(questionSetId) {
    try {
      const response = await fetch(`${API_BASE_URL}/question-set/${questionSetId}/questions`);

      if (!response.ok) {
        // Try to parse error JSON if possible
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // ignore JSON parse error (likely HTML response)
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.questions || [];
    } catch (error) {
      console.error('Error fetching questions:', error);
      return []; // return empty array instead of crashing
    }
  }
}

export default AssessmentAPI;
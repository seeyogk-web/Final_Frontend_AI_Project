const BASE_URL = "https://python-k0xt.onrender.com/api/v1";

export const testApi = {
  startTest: async (questionSetId) => {
    try {
      const response = await fetch(`${BASE_URL}/test/start/${questionSetId}`);
      if (!response.ok) throw new Error('Failed to fetch test');
      return await response.json();
    } catch (error) {
      console.error('Error starting test:', error);
      throw error;
    }
  },

  submitSection: async (questionSetId, submissionData) => {
    try {
      const url = questionSetId
        ? `${BASE_URL}/test/submit_section/${encodeURIComponent(questionSetId)}`
        : `${BASE_URL}/test/submit_section`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });
      const text = await response.text();
      try {
        const json = text ? JSON.parse(text) : null;
        if (!response.ok) {
          console.error('submitSection server error:', response.status, json || text);
          throw new Error(json?.message || `Failed to submit test (${response.status})`);
        }
        return json;
      } catch (parseErr) {
        // non-JSON response
        if (!response.ok) {
          console.error('submitSection server error (non-json):', response.status, text);
          throw new Error(`Failed to submit test (${response.status})`);
        }
        return text;
      }
    } catch (error) {
      console.error('Error submitting section:', error);
      throw error;
    }
  },
  saveViolations: async (payload) => {
    try {
      console.log("Payload in test.js",payload)
      const response = await fetch(`${BASE_URL}/test/save_violations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save violations');
      return await response.json();
    } catch (error) {
      console.error('Error saving violations:', error);
      throw error;
    }
  },
  createSession: async (payload = {}) => {
    try {
      const response = await fetch(`${BASE_URL}/test/create_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create session');
      return await response.json();
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },
};
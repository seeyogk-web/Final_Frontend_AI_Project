import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Webcam from 'react-webcam';
import { useParams } from 'react-router-dom';
import { testApi } from '../../RecruiterAdmin/api/tests.js';
import McqQuestion from '../../RecruiterAdmin/Component/McqQuestion.jsx';
import CodingQuestion from '../../RecruiterAdmin/Component/CodingQuestion';
import Timer from '../../RecruiterAdmin/Component/Timer.jsx';
// uncomment the below line if candidate needs to login before giving test!!!
// import UserEmail from '../instructions_page/UserEmail.jsx';
import InstructionsPage from '../instructions_page/InstructionsPage.jsx';
import ActivityMonitor from '../instructions_page/ActivityMonitor.jsx';
import FaceDetection from '../instructions_page/FaceDetection.jsx';
import WebCamRecorder from '../instructions_page/WebCamRecorder.jsx';
import AudioInterview from '../instructions_page/AudioInterview.jsx'; // adjust the path as needed
import WebcamPreview from '../Component/WebcamPreview.jsx';
import { emitViolation } from '../../RecruiterAdmin/api/socket.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const GiveTest = ({ jdId }) => {
  const { questionSetId } = useParams();
  const location = useLocation();

  // Loading / data / error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sections & navigation
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [allAnswers, setAllAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResults, setSubmissionResults] = useState([]);
  const candidateIdRef = useRef(`candidate_${Date.now()}`);
  const finalCandidateId = candidateIdRef.current;
  const [userInfo] = useState({
    name: `Candidate_${finalCandidateId}`,
    email: `candidate_${finalCandidateId}@mail.com`,
  });
  const [mediaAllowed, setMediaAllowed] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [floatingPos, setFloatingPos] = useState({ x: 20, y: 80 });
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [hasVideoFrame, setHasVideoFrame] = useState(false);
  const dragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const [tabSwitches, setTabSwitches] = useState(0);
  const faceEventRef = useRef(null);
  const webcamInterviewRef = useRef(null);
  const saveViolationsSentRef = useRef(false);
  const [showWebcamInterview, setShowWebcamInterview] = useState(false);
  const [showAudioInterview, setShowAudioInterview] = useState(false);
  const [audioInterviewResults, setAudioInterviewResults] = useState([]);
  const [audioInterviewDone, setAudioInterviewDone] = useState(false);
  const [audioInterviewVisited, setAudioInterviewVisited] = useState(false);
  const [step, setStep] = useState('entry');
  const [instructionsVisible, setInstructionsVisible] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Violations tracking
  const [violations, setViolations] = useState({
    tab_switches: 0,
    inactivities: 0,
    face_not_visible: 0,
  });
  const [showMultipleFaces, setShowMultipleFaces] = useState(false);
  const violationsRef = useRef(violations);
  // Track which toast alerts have already been shown to avoid duplicates
  const shownToastsRef = useRef(new Set());

  // Keep refs in sync
  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  // attach localStream to video element and cleanup on unmount
  useEffect(() => {
    const targetVideo = (webcamRef.current && webcamRef.current.video) || videoRef.current;
    if (targetVideo && localStream) {
      try { targetVideo.srcObject = localStream; videoRef.current = targetVideo; } catch (e) { console.warn('attach srcObject failed', e); }
    }
    return () => {
      if (localStream) {
        try { localStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      }
    };
  }, [localStream]);

  // track whether <video> is actually playing so we can hide canvas fallback
  useEffect(() => {
    const v = videoRef.current || (webcamRef.current && webcamRef.current.video);
    if (!v) return;
    const onPlaying = () => setIsVideoPlaying(true);
    const onPause = () => setIsVideoPlaying(false);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('play', onPlaying);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onPause);
    return () => {
      try {
        v.removeEventListener('playing', onPlaying);
        v.removeEventListener('play', onPlaying);
        v.removeEventListener('pause', onPause);
        v.removeEventListener('ended', onPause);
      } catch (e) {}
    };
  }, [videoRef.current]);

  // Poll video element to detect whether frames are available (videoWidth>0)
  useEffect(() => {
    let intId = null;
    const check = () => {
      const v = videoRef.current || (webcamRef.current && webcamRef.current.video);
      if (v) {
        const hasFrame = !!(v.videoWidth && v.videoHeight);
        setHasVideoFrame(hasFrame);
        if (hasFrame) return true;
      }
      return false;
    };
    // run a few times for up to ~2s
    let attempts = 0;
    intId = setInterval(() => {
      attempts += 1;
      const ok = check();
      if (ok || attempts > 10) {
        clearInterval(intId);
      }
    }, 200);
    // immediate check
    check();
    return () => { if (intId) clearInterval(intId); };
  }, [localStream, mediaAllowed, step, streamRef.current]);

  // Request camera+mic permissions
  const requestMedia = async () => {
    // Prefer a stream granted earlier in CameraCheck (same tab) to avoid re-prompt
    try {
      const existing = window.__candidateCameraStream;
      if (existing) {
        setMediaAllowed(true);
        setLocalStream(existing);
        streamRef.current = existing;
        if (videoRef.current) {
          try { videoRef.current.srcObject = existing; } catch (e) { console.warn('attach existing stream failed', e); }
        }
        return;
      }
      const constraints = {
        video: camEnabled ? (selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: 'user' }) : false,
        audio: micEnabled,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaAllowed(true);
      setLocalStream(stream);
      streamRef.current = stream;
      // also save globally for future pages in same tab
      try { window.__candidateCameraStream = stream; window.__cameraAllowed = true; } catch (e) {}
      if (videoRef.current) {
        try { videoRef.current.srcObject = stream; } catch (e) { console.warn('set srcObject failed', e); }
      }
    } catch (err) {
      console.error('Media permissions denied:', err);
      setMediaAllowed(false);
      alert('Please allow camera and microphone access to continue the test.');
    }
  };

  // On mount, reuse stream from CameraCheck if available
  useEffect(() => {
    try {
      const existing = window.__candidateCameraStream;
      if (existing && !localStream) {
        setMediaAllowed(true);
        setLocalStream(existing);
        streamRef.current = existing;
        if (videoRef.current) {
          try { videoRef.current.srcObject = existing; } catch (e) { console.warn('attach existing on mount failed', e); }
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Enumerate devices and prefer a saved device if present
  useEffect(() => {
    const list = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vids = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(vids);
        if (!selectedDeviceId && vids.length) setSelectedDeviceId(vids[0].deviceId);
      } catch (e) {}
    };
    list();
  }, []);

  // Poll for a global stream (if set by CameraCheck in another part of the app)
  useEffect(() => {
    let pollId = null;
    const tryAttachGlobal = () => {
      try {
        const existing = window.__candidateCameraStream;
        if (existing) {
          streamRef.current = existing;
          setLocalStream(existing);
          setMediaAllowed(true);
          if (videoRef.current && videoRef.current.srcObject !== existing) {
            try { videoRef.current.srcObject = existing; const p = videoRef.current.play && videoRef.current.play(); if (p && p.then) p.catch(()=>{}); } catch (e) { console.warn('attach global stream failed', e); }
          }
          if (pollId) { clearInterval(pollId); pollId = null; }
        }
      } catch (e) {}
    };

    tryAttachGlobal();
    if (!streamRef.current) pollId = setInterval(tryAttachGlobal, 300);
    return () => { if (pollId) clearInterval(pollId); };
  }, []);

  // Auto-request media once when the test actually starts (safeguard against missing CameraCheck flow)
  const _requestedMediaRef = useRef(false);
  useEffect(() => {
    if (testStarted && !mediaAllowed && !_requestedMediaRef.current) {
      _requestedMediaRef.current = true;
      // attempt to reuse existing or prompt user
      requestMedia();
    }
  }, [testStarted, mediaAllowed]);

  // Attempt to attach any available stream to the preview video whenever relevant state changes
  useEffect(() => {
    try {
      const candidateStream = streamRef.current || localStream || window.__candidateCameraStream;
      if (!candidateStream) {
        console.log('GiveTest: no candidate stream available to attach');
        return;
      }

      const vElem = (videoRef.current) || (webcamRef.current && webcamRef.current.video);
      if (!vElem) {
        console.log('GiveTest: preview video element not mounted yet');
        return;
      }

      // attach if not already attached
      if (vElem.srcObject !== candidateStream) {
        try {
          vElem.srcObject = candidateStream;
          // attempt to play (some browsers require explicit play call)
          const p = vElem.play && vElem.play();
          if (p && p.then) p.then(() => {}).catch(()=>{});
          setMediaAllowed(true);
          videoRef.current = vElem; // ensure other code uses this concrete element
          console.log('GiveTest: attached candidate stream to preview; stream active=', !!candidateStream.active);
        } catch (e) {
          console.warn('GiveTest: failed to attach candidate stream to preview', e);
        }
      } else {
        console.log('GiveTest: preview already attached to stream');
      }
    } catch (e) {
      console.warn('GiveTest: attach effect error', e);
    }
  }, [localStream, testStarted, mediaAllowed, step]);

  // Canvas fallback: draw frames from the video element into canvas if video isn't rendering
  useEffect(() => {
    let rafId = null;
    let imgCapInterval = null;
    let offscreenVideo = null;
    const c = canvasRef.current;
    const v = videoRef.current || (webcamRef.current && webcamRef.current.video);

    const drawFromVideo = (videoEl) => {
      try {
        if (c && videoEl && (videoEl.readyState >= 2 || videoEl.videoWidth)) {
          const ctx = c.getContext('2d');
          const w = (c.width = c.clientWidth || 360);
          const h = (c.height = c.clientHeight || 260);
          try {
            ctx.drawImage(videoEl, 0, 0, w, h);
            // mark that we have a frame so UI can hide black video
            setHasVideoFrame(true);
          } catch (e) {}
        }
      } catch (e) {}
      rafId = requestAnimationFrame(() => drawFromVideo(videoEl));
    };

    const startImageCaptureLoop = (stream) => {
      try {
        const track = stream.getVideoTracks && stream.getVideoTracks()[0];
        if (!track) return;
        const ImageCapture = window.ImageCapture || null;
        if (!ImageCapture) return;
        const ic = new ImageCapture(track);
        imgCapInterval = setInterval(async () => {
          try {
            const bitmap = await ic.grabFrame();
            if (bitmap && c) {
              const ctx = c.getContext('2d');
              const w = c.width = c.clientWidth || bitmap.width || 360;
              const h = c.height = c.clientHeight || bitmap.height || 260;
              try { ctx.drawImage(bitmap, 0, 0, w, h); } catch (e) {}
              try { bitmap.close && bitmap.close(); } catch (e) {}
            }
          } catch (err) {
            // grabFrame can fail on some browsers/devices; ignore
          }
        }, 700);
      } catch (e) {}
    };

    // Start drawing only if there is any candidate stream available
    const hasStream = streamRef.current || localStream || window.__candidateCameraStream;
    if (hasStream && c) {
      try {
        c.width = c.clientWidth || 360;
        c.height = c.clientHeight || 260;
      } catch (e) {}

      // If video element is playing/rendering frames, draw from it.
      if (v && isVideoPlaying) {
        drawFromVideo(v);
      } else if (v) {
        // video exists but not playing; still start raf draw to catch frames when available
        rafId = requestAnimationFrame(() => drawFromVideo(v));
      } else {
        // Visible video isn't mounted yet; create an offscreen video attached to the stream
        try {
          const candidateStream = streamRef.current || localStream || window.__candidateCameraStream;
          if (candidateStream) {
            offscreenVideo = document.createElement('video');
            offscreenVideo.muted = true;
            offscreenVideo.playsInline = true;
            try {
              offscreenVideo.srcObject = candidateStream;
            } catch (e) {
              console.warn('offscreen assign srcObject failed', e);
            }
            // try to play; some browsers require user gesture but play() may still resolve
            const p = offscreenVideo.play && offscreenVideo.play();
            if (p && p.then) p.catch(()=>{});
            // start RAF draws from the offscreen element
            rafId = requestAnimationFrame(() => drawFromVideo(offscreenVideo));
          }
        } catch (e) {
          console.warn('failed to create offscreen video fallback', e);
        }
      }

      // Also start ImageCapture fallback to grab frames directly from the track
      const candidateStream = streamRef.current || localStream || window.__candidateCameraStream;
      if (candidateStream) startImageCaptureLoop(candidateStream);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (imgCapInterval) clearInterval(imgCapInterval);
      try {
        if (offscreenVideo) {
          offscreenVideo.pause();
          try { offscreenVideo.srcObject = null; } catch (e) {}
          offscreenVideo = null;
        }
      } catch (e) {}
    };
  }, [localStream, mediaAllowed, step]);

  // Always log mount for diagnostics
  useEffect(() => {
    try {
      console.groupCollapsed('GiveTest Mounted');
      console.log('step', step, 'testStarted', testStarted, 'mediaAllowed', mediaAllowed);
      console.log('window.__candidateCameraStream present:', !!window.__candidateCameraStream);
      console.groupEnd();
    } catch (e) { console.warn('mount log failed', e); }
  }, []);

  // Auto-start test when GiveTest mounts (ensure monitoring and preview activate)
  useEffect(() => {
    setTestStarted(true);
  }, []);

  // Log whenever localStream changes
  useEffect(() => {
    try {
      console.groupCollapsed('GiveTest Stream Update');
      console.log('localStream set?', !!localStream);
      console.log('streamRef.current', streamRef.current);
      console.log('videoRef.current', videoRef.current);
      console.groupEnd();
    } catch (e) { console.warn('stream log failed', e); }
  }, [localStream]);

  // Cleanup webcam on unload
  useEffect(() => {
    const stopCamOnExit = async () => {
      if (webcamInterviewRef.current && typeof webcamInterviewRef.current.stopAll === 'function') {
        try {
          await webcamInterviewRef.current.stopAll();
        } catch (err) {
          console.warn('Cleanup webcam error:', err);
        }
      }
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('beforeunload', stopCamOnExit);
    return () => {
      stopCamOnExit();
      window.removeEventListener('beforeunload', stopCamOnExit);
    };
  }, []);

  // Block certain keys and context menu while test active
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') ||
        (e.ctrlKey && e.key.toLowerCase() === 'p')
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e) => {
      // Only block if test started and not submitted
      if (testStarted && !submitted) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [testStarted, submitted]);

  // Track visibility/tab switches and auto-submit after threshold
  useEffect(() => {
    const onVisibility = () => {
      if (!testStarted || submitted) return;
      if (document.hidden) {
        setTabSwitches(prev => {
          const next = prev + 1;
          try { handleViolation('tab_switches', 1); } catch (e) {}

          // First switch: warning only is handled by handleViolation (avoid duplicate toasts here).

          if (next >= 2) {
            toast.error('Too many tab switches — submitting the test.');
            // disable monitoring/UI immediately and force-finalize the test
            try {
              setTestStarted(false);

              // Capture current answers and persist them so partial results can be reviewed later
              const answersToSubmit = { ...(allAnswers || {}) };
              try {
                const key = `partialAnswers_${questionSetId}_${finalCandidateId}`;
                sessionStorage.setItem(key, JSON.stringify(answersToSubmit));
              } catch (e) {
                // ignore storage failures
              }

              // Basic local MCQ evaluation for immediate feedback (optional).
              try {
                let mcqAnswered = 0, mcqCorrect = 0;
                for (let sIdx = 0; sIdx < (sections || []).length; sIdx++) {
                  const s = sections[sIdx];
                  if (!s || !s.questions) continue;
                  for (let qIdx = 0; qIdx < s.questions.length; qIdx++) {
                    const q = s.questions[qIdx];
                    const ans = answersToSubmit[q.id];
                    if (q.type === 'mcq' && ans !== undefined && ans !== '') {
                      mcqAnswered++;
                      const correct = q.correct_answer || q.content?.correct_answer;
                      if (correct != null && String(ans) === String(correct)) mcqCorrect++;
                    }
                  }
                }
                if (mcqAnswered) {
                  toast.info(`Auto-submitted partial test: MCQ ${mcqCorrect}/${mcqAnswered} marked answers submitted.`);
                }
              } catch (e) {
                // ignore local eval errors
              }

              // call forced submit with the answers captured so backend can evaluate up to this point
              handleSubmitAllSections(answersToSubmit, { markComplete: true }).catch(e => console.warn('forced submit failed', e));
            } catch (e) { console.warn('submit failed', e); }
          }

          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [testStarted, submitted, allAnswers, sections]);

  // Consolidated debug logger for component state — use DevTools or button below
  const logDebugState = () => {
    try {
      console.groupCollapsed('GiveTest Debug State');
      console.log('mediaAllowed:', mediaAllowed);
      console.log('testStarted:', testStarted, 'submitted:', submitted);
      console.log('tabSwitches:', tabSwitches);
      console.log('floatingPos:', floatingPos);
      console.log('sections.length:', sections.length, 'currentSectionIndex:', currentSectionIndex, 'currentQuestionIndex:', currentQuestionIndex);
      console.log('localStream:', localStream);
      console.log('streamRef.current:', streamRef.current);
      console.log('videoRef.current:', videoRef.current);
      console.log('video.srcObject:', videoRef.current ? videoRef.current.srcObject : null);
      console.log('allAnswers keys:', Object.keys(allAnswers || {}).length);
      console.groupEnd();
    } catch (e) {
      console.warn('logDebugState failed', e);
    }
  };

  // Disable text selection & copy while test active
  useEffect(() => {
    if (!testStarted || submitted) return;

    const handleSelect = (e) => e.preventDefault();
    const handleCopy = (e) => e.preventDefault();

    document.addEventListener('selectstart', handleSelect);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('selectstart', handleSelect);
      document.removeEventListener('copy', handleCopy);
    };
  }, [testStarted, submitted]);

  // Fetch test and organize into sections
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        // console.log("Question ID:", questionSetId)
        const data = await testApi.startTest(questionSetId);
        // console.log("Fetched test data:", data);

        const mcqQuestions = data.questions.filter(q => q.type === "mcq");
        const codingQuestions = data.questions.filter(q => q.type === "coding");
        const audioQuestions = data.questions.filter(q => q.type === "audio");
        const videoQuestions = data.questions.filter(q => q.type === "video");

        const organizedSections = [];

        if (mcqQuestions.length) {
          organizedSections.push({
            name: "MCQ",
            displayName: "Multiple Choice Questions",
            questions: mcqQuestions,
            type: "mcq",
          });
        }

        if (codingQuestions.length) {
          organizedSections.push({
            name: "Coding",
            displayName: "Coding Problems",
            questions: codingQuestions,
            type: "coding",
          });
        }

        if (audioQuestions.length) {
          organizedSections.push({
            name: "Audio",
            displayName: "Audio Interview",
            questions: audioQuestions.map(q => ({
              ...q,
              content: { prompt_text: q.prompt_text }  // Normalize
            })),
            type: "audio",
          });
        }

        if (videoQuestions.length) {
          organizedSections.push({
            name: "Video",
            displayName: "Video Interview",
            questions: videoQuestions.map(q => ({
              ...q,
              content: { prompt_text: q.prompt_text }  // Normalize
            })),
            type: "video",
          });
        }

        setSections(organizedSections);

        setLoading(false);
      } catch (err) {
        console.error('Failed to load test:', err);
        setError('Failed to load test. Please check your link and try again.');
        setLoading(false);
      }
    };

    fetchTest();
  }, [questionSetId]);

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];
  const totalQuestionsInSection = currentSection?.questions.length || 0;

  // clamp percent to [0,100] and compute section progress percent
  const clampPercent = (v) => Math.max(0, Math.min(100, v));
  const sectionPercent = totalQuestionsInSection
    ? clampPercent(Math.round(((currentQuestionIndex + 1) / totalQuestionsInSection) * 100))
    : 0;

  // Handle single-question answer change
  const handleAnswerChange = (answer) => {
    if (!currentQuestion) return;
    setAllAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  // Navigation: Next / Previous
  const handleNext = () => {
    if (currentQuestionIndex < totalQuestionsInSection - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCompletedSections(prev => new Set([...prev, currentSectionIndex]));
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      // Removed automatic submit from navigation. Submissions are now triggered by section-specific actions (audio/video Upload & Submit).
      toast.info('Please complete the section actions (Upload & Submit) to finish the test.');
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
    // do not allow going back to previous section once moved forward
  };

  const handleTimeUp = () => {
    handleNext();
  };

  // Submit all sections
  // options: { markComplete: boolean }
  const handleSubmitAllSections = async (answersOverride, options = {}) => {
    setSubmitting(true);
    try {
      const results = [];
      // read cid once from sessionStorage so it's available after the loop
      let cidFromSession = null;
      let jobIdFromSession = null;
      try {
        const raw = sessionStorage.getItem("candidateData");
        if (raw) {
          const parsed = JSON.parse(raw);
          cidFromSession = parsed?.id ?? null;
          // accept multiple possible keys used by different flows
          jobIdFromSession = parsed?.job_id || parsed?.jobId || parsed?.job || parsed?.jdId || parsed?.jd_id || null;
          console.log('GiveTest: candidateData keys from sessionStorage', Object.keys(parsed || {}));
        }
      } catch (e) {
        console.warn('Failed to read candidateData from sessionStorage', e);
      }

      // helper: read job id from URL query params as another fallback
      const getQueryParam = (name) => {
        try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; }
      };

      // try multiple fallbacks: prop, sessionStorage, URL query, location state, localStorage cached jobData
      let resolvedJobId = jdId || jobIdFromSession || getQueryParam('job_id') || getQueryParam('jobId') || getQueryParam('jdId') || getQueryParam('jd') || null;
      if (!resolvedJobId) {
        // check react-router location state
        try {
          const s = location && location.state;
          if (s && (s.job_id || s.jobId || s.jdId || s.job)) resolvedJobId = s.job_id || s.jobId || s.jdId || s.job || null;
        } catch (e) {}
      }

      if (!resolvedJobId) {
        // prefer sessionStorage (set by Examination/TestDetails) then fall back to localStorage
        try {
          const maybeSession = sessionStorage.getItem('jobData');
          if (maybeSession) {
            const jd = JSON.parse(maybeSession);
            if (jd && (jd.job_id || jd.jobId || jd._id || jd.id) && (jd.questionSetId === questionSetId || jd.question_set_id === questionSetId || !questionSetId)) {
              resolvedJobId = jd.job_id || jd.jobId || jd._id || jd.id;
            }
          }
        } catch (e) {}

        if (!resolvedJobId) {
          try {
            const maybe = localStorage.getItem('jobData');
            if (maybe) {
              const jd = JSON.parse(maybe);
              if (jd && (jd.job_id || jd.jobId || jd._id || jd.id) && (jd.questionSetId === questionSetId || jd.question_set_id === questionSetId || !questionSetId)) {
                resolvedJobId = jd.job_id || jd.jobId || jd._id || jd.id;
              }
            }
          } catch (e) {}
        }
      }

      if (!resolvedJobId) {
        try {
          const listRawSession = sessionStorage.getItem('jobDataList');
          if (listRawSession) {
            const arr = JSON.parse(listRawSession) || [];
            const found = arr.find(it => (it.questionSetId === questionSetId) || (it.question_set_id === questionSetId));
            if (found) resolvedJobId = found.job_id || found.jobId || found._id || found.id || null;
          }
        } catch (e) {}

        if (!resolvedJobId) {
          try {
            const listRaw = localStorage.getItem('jobDataList');
            if (listRaw) {
              const arr = JSON.parse(listRaw) || [];
              const found = arr.find(it => (it.questionSetId === questionSetId) || (it.question_set_id === questionSetId));
              if (found) resolvedJobId = found.job_id || found.jobId || found._id || found.id || null;
            }
          } catch (e) {}
        }
      }

      console.log('GiveTest: resolvedJobId ->', resolvedJobId);
      // expose for quick debugging in console
      try { window.__resolvedJobId = resolvedJobId; } catch (e) {}

      for (const section of sections) {
        const answersSource = answersOverride || allAnswers;

        const responses = section.questions.map((question) => ({
          question_id: question.id,
          question_type: question.type,
          question_text:
            question.prompt_text ||
            question.content?.prompt_text ||
            question.question ||
            "",

          correct_answer:
            question.correct_answer ||
            question.content?.correct_answer ||
            "N/A",

          candidate_answer: answersSource[question.id] || ''
        }));

        

        const submissionData = {
          question_set_id: questionSetId,
          section_name: section.name,
          candidate_id: finalCandidateId,
          cid: cidFromSession || finalCandidateId,
          job_id: resolvedJobId,
          responses,
        };

        if (options && options.markComplete) {
          submissionData.mark_complete = true;
        }

        // Debug logs (helpful during integration)
        console.log('Submitting section', section.name, 'with questionSetId=', questionSetId);
        console.log('submissionData.question_set_id=', submissionData.question_set_id);

        const result = await testApi.submitSection(questionSetId, submissionData);
        results.push({ sectionName: section.name, result });
      }

      setSubmissionResults(results);
      setSubmitted(true);
      toast.success("Test submitted successfully!");

      // STOP CAMERA + MONITORING AFTER SUBMIT
      try {
        // 1. Stop webcam recorder
        if (webcamInterviewRef.current && typeof webcamInterviewRef.current.stopAll === "function") {
          webcamInterviewRef.current.stopAll();
        }

        // 3. Disable further tab/inactivity/face violations
        setTestStarted(false);
        // clear any multi-face UI state
        try { setShowMultipleFaces(false); } catch (e) {}
      } catch (err) {
        console.warn("Failed to cleanup after submit:", err);
      }

      // 1) save violations (best-effort)
      try {
        if (!saveViolationsSentRef.current) {
          saveViolationsSentRef.current = true;
          console.log("HEYYYYYYYYYYYYYYYYYYYYY:")
            const violationsPayload = {
              question_set_id: questionSetId,
              candidate_id: finalCandidateId,
              tab_switches: violationsRef.current.tab_switches || 0,
              inactivities: violationsRef.current.inactivities || 0,
              face_not_visible: violationsRef.current.face_not_visible || 0,
              cid: cidFromSession || finalCandidateId,
              job_id: resolvedJobId,
            };
            console.log('GiveTest: sending saveViolations payload ->', violationsPayload);
            await testApi.saveViolations(violationsPayload);
          console.log('Violations saved');
        } else {
          console.log('saveViolations skipped (already sent)');
        }
      } catch (err) {
        console.warn('Failed to save violations', err);
      }

      // 2) optionally store candidate id to local env for other components
      window.REACT_APP_CANDIDATE_ID = finalCandidateId;
      window.REACT_APP_QUESTION_SET_ID = questionSetId;
    } catch (err) {
      console.error('Test submission error:', err);
      setError('Failed to submit test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ActivityMonitor -> onViolation handler
  const handleViolation = (key, count = 1, flush = false) => {
    // Accept additional keys: multiple_faces, single_face
    if (submitted) return;

    if (key === 'multiple_faces') {
      // visually blur the page while multiple faces are present
      setShowMultipleFaces(true);
      // Ensure only a single alert is shown: dismiss any existing toasts,
      // then show one and mark it as shown until cleared by single_face.
      try { toast.dismiss(); } catch (e) {}
      if (!shownToastsRef.current.has('multiple_faces')) {
        toast.warning('🚨 Multiple faces detected — page blurred');
        shownToastsRef.current.add('multiple_faces');
        // also mark face_not_visible to avoid duplicate face alerts
        shownToastsRef.current.add('face_not_visible');
      }
      try {
        emitViolation({
          exam_id: jdId,
          question_set_id: questionSetId,
          candidate_email: userInfo.email,
          candidate_name: userInfo.name,
          multiple_faces: count || 1,
        });
      } catch (e) {
        console.warn('emitViolation failed', e);
      }
      return;
    }

    if (key === 'single_face') {
      setShowMultipleFaces(false);
      // clear the multiple_faces shown marker so future multi-face events can alert again
      try { shownToastsRef.current.delete('multiple_faces'); } catch (e) {}
      try { toast.dismiss(); } catch (e) {}
      return;
    }

    if (!['tab_switches', 'inactivities', 'face_not_visible'].includes(key)) return;

    setViolations(prev => {
      const updated = flush
        ? { ...prev, [key]: count }
        : { ...prev, [key]: (prev[key] || 0) + count };

      // show toasts based on violation type
      if (!submitted) {
        if (!shownToastsRef.current.has(key)) {
          if (key === 'tab_switches') toast.warning('⚠️ Tab switch detected!');
          if (key === 'inactivities') toast.info('⌛ You have been inactive.');
          if (key === 'face_not_visible') toast.error('🚨 Face not visible!');
          shownToastsRef.current.add(key);
        }
      }

      // emit to socket (best-effort)
      try {
        emitViolation({
          exam_id: jdId,
          question_set_id: questionSetId,
          candidate_email: userInfo.email,
          candidate_name: userInfo.name,
          [key]: flush ? Number(count) : 1,
        });
      } catch (e) {
        console.warn('emitViolation failed', e);
      }

      return updated;
    });
  };

  // uncomment the below line if candidate needs to login before giving test!!!
  {/* // Entry step: collect email / user details
  if (step === 'entry') {
    return (
      <UserEmail
        jdId={jdId}
        onContinue={(info) => {
          setUserInfo(info);
          setStep('instructions');
          requestMedia();
        }}
      />
    );
  } */}

  // Instructions step
  if (step === 'instructions') {
    if (instructionsVisible || !mediaAllowed) {
      return (
        <InstructionsPage
          onComplete={() => {
            requestMedia();
            setInstructionsVisible(false);
            setTestStarted(true);
            setStep('test');
          }}
          mediaAllowed={mediaAllowed}
        />
      );
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading test...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error && !submitting) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Submitted / results view
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl w-full">
          <div className="text-green-500 text-6xl mb-4 text-center">✓</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
            Test Completed Successfully!
          </h2>
          <p className="text-gray-600 mb-8 text-center">
            All sections have been submitted and evaluated.
          </p>

          <div className="space-y-6">
            {submissionResults.map((sectionResult, sectionIdx) => (
              <div key={sectionIdx} className="border rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  {sectionResult.sectionName} Section
                </h3>
                <p className="text-gray-600 mb-4">{sectionResult.result.message}</p>

                {sectionResult.result.evaluations && sectionResult.result.evaluations.length > 0 && (
                  <div className="space-y-3">
                    {sectionResult.result.evaluations.map((evaluation, evalIdx) => (
                      <div
                        key={evalIdx}
                        className={`p-4 rounded-lg ${
                          evaluation.is_correct
                            ? 'bg-green-50 border-l-4 border-green-500'
                            : 'bg-red-50 border-l-4 border-red-500'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-700">Question {evalIdx + 1}</span>
                          <span className="text-lg font-bold">{(evaluation.score * 100).toFixed(0)}%</span>
                        </div>
                        {evaluation.feedback && (
                          <p className="text-sm text-gray-600">{evaluation.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => (window.location.href = '/Candidate-Dashboard')}
            className="mt-8 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // When audio interview is open, show only that UI
  if (showAudioInterview) {
    return (
      <AudioInterview
        questions={currentSection?.questions || []}
        candidateId={finalCandidateId}
        questionSetId={questionSetId} 
        baseUrl={window.REACT_APP_BASE_URL || 'http://127.0.0.1:5000'}
        onClose={() => setShowAudioInterview(false)}
        onComplete={(qa) => {
            setAudioInterviewResults(qa);
            // merge audio answers into main answers map so submit includes them
            setAllAnswers(prev => {
              const next = { ...prev };
              (qa || []).forEach(item => {
                if (item && item.questionId) next[item.questionId] = item.answer || '';
              });
              return next;
            });
            setShowAudioInterview(false);
            setAudioInterviewDone(true);
            toast.success('Audio interview completed.');
          }}
      />
    );
  }

  // UI
  return (
    <>

      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {showMultipleFaces && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-400 text-black px-4 py-2 rounded shadow">
          🚨 Multiple faces detected — page blurred
        </div>
      )}

      {/* Hidden monitoring components */}
      <ActivityMonitor
        questionSetId={questionSetId}
        candidateName={userInfo.name}
        email={userInfo.email}
        faceEventRef={faceEventRef}
        testStarted={testStarted}
        submitted={submitted}
        onViolation={handleViolation}
      />

      {!submitted && <FaceDetection faceEventRef={faceEventRef} />}

      {/* Quick button to trigger camera permissions if preview missing */}
      {!submitted && step === 'test' && !mediaAllowed && (
        <div className="fixed top-24 right-4 z-40">
          <button
            onClick={requestMedia}
            className="px-3 py-2 bg-yellow-500 text-white rounded shadow"
          >
            Enable Camera Preview
          </button>
        </div>
      )}

      {/* Manual debug logger button */}
      {!submitted && step === 'test' && (
        <div className="fixed top-48 right-4 z-40">
          <button
            onClick={logDebugState}
            className="px-3 py-2 bg-indigo-600 text-white rounded shadow"
          >
            Log Debug State
          </button>
        </div>
      )}

      {/* Floating draggable webcam preview (candidate) - rendered during test step or while testStarted */}
      {!submitted && (step === 'test' || testStarted || mediaAllowed || !!window.__candidateCameraStream) && (
        <WebcamPreview
          webcamRef={webcamRef}
          canvasRef={canvasRef}
          localStream={localStream}
          streamRef={streamRef}
          hasVideoFrame={hasVideoFrame}
          floatingPos={floatingPos}
          setFloatingPos={setFloatingPos}
          selectedDeviceId={selectedDeviceId}
        />
      )}
      
      <div className={`min-h-screen bg-gray-100 py-8 ${showMultipleFaces ? 'filter blur-sm' : ''}`}>
        <div className="max-w-4xl mx-auto px-4">
          {/* Section Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                    Section {currentSectionIndex + 1} of {sections.length}
                  </span>
                  <span className="text-lg font-bold text-gray-800">
                    {currentSection?.displayName}
                  </span>
                </div>
                <p className="text-gray-600">
                  Question {currentQuestionIndex + 1} of {totalQuestionsInSection}
                </p>
              </div>

              <Timer
                timeLimit={currentQuestion?.time_limit || 60}
                onTimeUp={handleTimeUp}
                key={`${currentSectionIndex}-${currentQuestion?.id}`}
              />
            </div>

            {/* Section Progress */}
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Section Progress</span>
                <span>{sectionPercent}%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${sectionPercent}%`,
                  }}
                />
              </div>
            </div>

            {/* Overall progress */}
            <div className="mt-4">
              <div className="flex gap-2">
                {sections.map((section, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-2 rounded-full ${
                      completedSections.has(idx)
                        ? 'bg-green-500'
                        : idx === currentSectionIndex
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    }`}
                    title={section.displayName}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                {sections.map((section, idx) => (
                  <span
                    key={idx}
                    className={`${
                      idx === currentSectionIndex
                        ? 'font-bold text-blue-600'
                        : completedSections.has(idx)
                        ? 'text-green-600'
                        : ''
                    }`}
                  >
                    {section.name}
                    {completedSections.has(idx) && ' ✓'}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Question Display */}
          {currentQuestion ? (
            <div className="mb-6">
              {(() => {
                switch (currentQuestion.type) {
                  case 'mcq':
                    return (
                      <McqQuestion
                        question={currentQuestion}
                        answer={allAnswers[currentQuestion.id]}
                        onAnswer={handleAnswerChange}
                      />
                    );

                  case 'coding':
                    return (
                      <CodingQuestion
                        question={currentQuestion}
                        answer={allAnswers[currentQuestion.id]}
                        onAnswer={handleAnswerChange}
                      />
                    );

                  case 'audio':
                    // Show placeholder if no real audio questions
                    if (currentQuestion.id === 'audio-placeholder') {
                      return (
                        <div className="bg-white rounded-lg shadow-md p-6">
                          <p className="text-gray-600">{currentQuestion.content.prompt_text || currentQuestion.prompt_text}</p>
                        </div>
                      );
                    }

                    // Normal audio interview button/modal
                      return showAudioInterview ? (
                      <AudioInterview
                        questions={currentSection?.questions || []}
                        candidateId={finalCandidateId}
                        baseUrl={window.REACT_APP_BASE_URL || 'http://127.0.0.1:5000'}
                        onClose={() => setShowAudioInterview(false)}
                        onComplete={(qa) => {
                          setAudioInterviewResults(qa);
                          setShowAudioInterview(false);
                          setAudioInterviewDone(true);
                          toast.success('Audio interview completed.');
                        }}
                      />
                    ) : (
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <button
                          onClick={() => {
                            setAudioInterviewVisited(true);
                            setShowAudioInterview(true);
                          }}
                          disabled={audioInterviewDone}
                          className={`px-6 py-3 rounded-lg transition ${audioInterviewDone ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          {audioInterviewDone ? 'Audio Completed' : '🎙 Start Audio Interview'}
                        </button>
                      </div>
                    );

                  case 'video':
                    // Show placeholder if no real video questions
                    if (currentQuestion.id === 'video-placeholder') {
                      return (
                        <div className="bg-white rounded-lg shadow-md p-6">
                          <p className="text-gray-600">
                            {currentQuestion.content.prompt_text || currentQuestion.prompt_text}
                          </p>
                        </div>
                      );
                    }

                    // Normal webcam interview button/modal
                    return showWebcamInterview ? (
                      <div className="mt-10 bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-bold mb-4">Final Interview Recording</h2>

                        <WebCamRecorder
                          ref={webcamInterviewRef}
                          questions={currentSection?.questions || []}
                          candidateId={finalCandidateId}
                          questionSetId={questionSetId}
                          baseUrl={window.REACT_APP_BASE_URL || 'http://127.0.0.1:5000'}
                          onComplete={(qa_payload) => {
                            console.log('GiveTest: received qa_payload from WebCamRecorder:', qa_payload);
                            // merge returned QA into allAnswers
                            if (qa_payload && Array.isArray(qa_payload)) {
                              // build merged answers object immediately and submit using it
                              const merged = { ...(allAnswers || {}) };
                              qa_payload.forEach(item => {
                                if (item && item.question_id) merged[item.question_id] = item.answer || '';
                              });
                              console.log('GiveTest: merged answers (will submit):', merged);
                              setAllAnswers(merged);
                              // ensure recorder stopped and submit using merged answers to avoid stale state
                              try { webcamInterviewRef.current?.stopAll(); } catch (e) {}
                              handleSubmitAllSections(merged);
                            } else {
                              try { webcamInterviewRef.current?.stopAll(); } catch (e) {}
                              handleSubmitAllSections();
                            }
                          }}
                        />
                      </div>
                    ) : (

                      <div className="bg-white rounded-lg shadow-md p-6">
                        <button
                          onClick={() => setShowWebcamInterview(true)}
                          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                          🎥 Start Final Webcam Interview
                        </button>
                      </div>
                    );

                  default:
                    return (
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-gray-600">Unknown question type</p>
                      </div>
                    );
                }
              })()}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <p className="text-gray-600">No questions available in this section.</p>
            </div>
          )}

          {/* Navigation - hidden for Video section (recorder handles navigation & submission) */}
          {currentSection?.type !== 'video' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center">
                {currentSection?.type !== 'video' && (
                  <button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                )}

                <div className="text-sm text-gray-600 text-center">
                  {currentQuestionIndex === totalQuestionsInSection - 1 &&
                   currentSectionIndex === sections.length - 1 ? (
                    <span className="font-medium text-blue-600">
                      Final submission - All sections will be submitted
                    </span>
                  ) : currentQuestionIndex === totalQuestionsInSection - 1 ? (
                    <div>
                      <span className="text-amber-600 font-medium">⚠️ Moving to next section</span>
                      <br />
                      <span className="text-xs text-gray-500">You cannot go back after proceeding</span>
                    </div>
                  ) : null}
                </div>

                {/* For non-video sections show global Next */}
                <button
                  onClick={() => {
                    // If MCQ or Coding is the last section and we're on its last question, submit the test
                    if (
                      (currentSection?.type === 'mcq' || currentSection?.type === 'coding') &&
                      currentQuestionIndex === totalQuestionsInSection - 1 &&
                      currentSectionIndex === sections.length - 1
                    ) {
                      if (submitting) return;
                      handleSubmitAllSections().catch(e => console.warn('Submit failed', e));
                      return;
                    }

                    const hasVideoSection = sections.some(s => s.type === "video");

                    // Prevent skipping the video interview ONLY inside the Video section
                    if (
                      hasVideoSection &&
                      currentSection?.type === "video" &&
                      !showWebcamInterview &&
                      currentQuestionIndex === totalQuestionsInSection - 1
                    ) {
                      toast.error("Please complete the webcam interview before submitting.");
                      return;
                    }

                    // For audio sections, the interview UI handles answers.
                    // If this is NOT the last section, move to next. If it IS the last section,
                    // submit only after the audio interview is completed.
                    if (currentSection?.type === 'audio') {
                      if (currentSectionIndex < sections.length - 1) {
                        setCompletedSections(prev => new Set([...prev, currentSectionIndex]));
                        setCurrentSectionIndex(prev => prev + 1);
                        setCurrentQuestionIndex(0);
                      } else {
                        // last section
                        if (audioInterviewDone) {
                          if (submitting) return;
                          handleSubmitAllSections().catch(e => console.warn('Submit failed', e));
                        } else {
                          toast.info('Please complete the audio interview to finish the test.');
                        }
                      }
                      return;
                    }

                    handleNext();
                }}
                disabled={submitting || (currentSection?.type === 'audio' && !audioInterviewVisited)}

                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {submitting
                  ? 'Submitting...'
                  : currentSection?.type === 'audio'
                  ? (currentSectionIndex === sections.length - 1
                      ? (audioInterviewDone ? 'Submit Test' : (audioInterviewVisited ? 'Visit Audio Interview' : 'Visit Audio Interview'))
                      : (audioInterviewVisited ? 'Go To Next Part' : 'Visit Audio Interview')
                    )
                  : ((currentSection?.type === 'mcq' || currentSection?.type === 'coding') && currentQuestionIndex === totalQuestionsInSection - 1 && currentSectionIndex === sections.length - 1)
                  ? 'Submit Test'
                  : currentQuestionIndex === totalQuestionsInSection - 1
                  ? 'Proceed to Next Section'
                  : 'Next'}
              </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Global submitting overlay (covers entire test while submitting) */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center gap-3 p-6 bg-white bg-opacity-90 rounded-lg shadow-lg">
            <div className="w-14 h-14 border-4 border-t-blue-600 border-gray-200 rounded-full animate-spin" />
            <div className="text-gray-700 font-medium">Submitting test... Please wait</div>
          </div>
        </div>
      )}
    </>
  );
};

export default GiveTest;
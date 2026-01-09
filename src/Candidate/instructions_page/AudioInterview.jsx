import React, { useEffect, useRef, useState } from 'react';
import aiAvatar from '../../img/interviewer.png';
import WebcamPreview from '../Component/WebcamPreview';
import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs';

export default function AudioInterview({
  questions = [],
  candidateId, // from GiveTest
  questionSetId, // from GiveTest
  baseUrl = window.REACT_APP_BASE_URL || 'http://127.0.0.1:5000',
  onClose = () => {},
  onComplete = () => {},
  showMultipleFaces = false,
  faceEventRef = null,
  showTabSwitch = false,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const qaListRef = useRef([]);

  // Movable preview so face-detection can operate while inside audio UI
  const previewWebcamRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [floatingPos, setFloatingPos] = useState({ x: 20, y: 80 });
  const [hasVideoFrame, setHasVideoFrame] = useState(true);
  const modelRef = useRef(null);
  const detectLoopRef = useRef(null);
  const [localMultipleFaces, setLocalMultipleFaces] = useState(false);
  const missCountRef = useRef(0);
  const prevReasonRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState('idle');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answerLanguage, setAnswerLanguage] = useState('en');
  // Removed unused loadingMedia state

  // Unified getter for question prompt
  const getPrompt = (q) =>
    q?.question || q?.prompt_text || q?.content?.prompt || '';

  // Audio recorder
  // const startAudioRecording = () => {
  //   if (!streamRef.current) return;
  //   if (isListening) stopSpeechRecognition(); // prevent conflict

  //   try {
  //     audioChunksRef.current = [];
  //     const recorder = new MediaRecorder(streamRef.current);
  //     recorder.ondataavailable = (e) => {
  //       if (e.data.size > 0) audioChunksRef.current.push(e.data);
  //     };
  //     recorder.start(500);
  //     audioRecorderRef.current = recorder;

  //     setIsRecordingAudio(true);
  //     setStatus('Recording audio answer...');
  //   } catch {
  //     alert('Cannot start audio recording.');
  //   }
  // };

  // const stopAudioRecording = () => {
  //   return new Promise((resolve) => {
  //     const recorder = audioRecorderRef.current;
  //     if (!recorder) {
  //       setIsRecordingAudio(false);
  //       setStatus('Recorded audio');
  //       return resolve();
  //     }

  //     const onStop = () => {
  //       try { recorder.removeEventListener('stop', onStop); } catch (e) {}
  //       audioRecorderRef.current = null;
  //       setIsRecordingAudio(false);
  //       setStatus('Recorded audio');
  //       resolve();
  //     };

  //     try {
  //       recorder.addEventListener('stop', onStop);
  //       try { recorder.stop(); } catch (e) { onStop(); }
  //     } catch (e) {
  //       onStop();
  //     }
  //   });
  // };

  // Initialize camera + mic
  useEffect(() => {
    let mounted = true;

    async function initMedia() {
      try {
        // Removed setLoadingMedia(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!mounted) return;

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true; // Chrome autoplay
        }

        // Auto-start audio recording once media stream is ready
        try { startAudioRecording(); } catch (e) {}
      } catch (err) {
        console.error('Media error', err);
        alert('Please allow camera and microphone access.');
      } finally {
        // Removed setLoadingMedia(false);
      }
    }

    initMedia();

    return () => {
      mounted = false;
      // Stop all tracks
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (recognitionRef.current) recognitionRef.current.stop();
      // Ensure recorder is stopped
      try {
        if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
          audioRecorderRef.current.stop();
        }
      } catch (e) {}
    };
  }, []);

  // TTS playback (server + fallback)
  const playQuestionTTS = React.useCallback(
    async (text) => {
      if (!text) return;

      window.speechSynthesis.cancel();
      setStatus('Speaking question...');
  
      try {
        const res = await fetch(`${baseUrl}/tts_question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (data?.status === 'success' && data?.tts_url) {
          const audio = new Audio(`${baseUrl}${data.tts_url}`);
          await audio.play();
          await new Promise((resolve) => (audio.onended = resolve));
          setStatus('Awaiting answer');
          return;
        }
      } catch {
        console.warn('Server TTS failed, using browser fallback.');
      }

      const u = new SpeechSynthesisUtterance(text);
      u.lang = answerLanguage === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(u);
      await new Promise((resolve) => {
        u.onend = resolve;
        setTimeout(resolve, 15000); // max wait fallback
      });
      setStatus('Awaiting answer');
    },
    [baseUrl, answerLanguage]
  );

  // Audio recorder
  const startAudioRecording = () => {
    if (!streamRef.current) return;
    if (isListening) stopSpeechRecognition(); // prevent conflict

    try {
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(500);
      audioRecorderRef.current = recorder;

      setIsRecordingAudio(true);
      setStatus('Recording audio answer...');
    } catch {
      alert('Cannot start audio recording.');
    }
  };

  const stopAudioRecording = () => {
    return new Promise((resolve) => {
      const recorder = audioRecorderRef.current;
      if (!recorder) {
        setIsRecordingAudio(false);
        setStatus('Recorded audio');
        return resolve();
      }

      const onStop = () => {
        try { recorder.removeEventListener('stop', onStop); } catch (e) {}
        audioRecorderRef.current = null;
        setIsRecordingAudio(false);
        setStatus('Recorded audio');
        resolve();
      };

      try {
        recorder.addEventListener('stop', onStop);
        try { recorder.stop(); } catch (e) { onStop(); }
      } catch (e) {
        onStop();
      }
    });
  };

  // STT
  const startSpeechRecognition = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      alert('Speech recognition not supported.');
      return;
    }
    if (isRecordingAudio) stopAudioRecording(); // prevent conflict

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = answerLanguage === 'hi' ? 'hi-IN' : 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setStatus('🎤 Listening...');
    };
    rec.onresult = (event) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
      }
      if (final.trim()) setCurrentAnswer((prev) => prev + ' ' + final.trim());
    };
    rec.onerror = (e) => console.error('STT error', e);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  // Submit answer
  const submitCurrentAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert('Please provide an answer.');
      return;
    }

    let audioFile = null;
    // Ensure recorder is stopped and final chunk is collected
    if (isRecordingAudio) await stopAudioRecording();

    if (audioChunksRef.current.length) {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const filename = `answer_${candidateId}_${currentIndex}.webm`;
      audioFile = new File([blob], filename, { type: 'audio/webm' });
    }

    const questionText = getPrompt(questions[currentIndex]);
    const qa = {
      question: questionText,
      questionId: questions[currentIndex]?.id || null,
      answer: currentAnswer.trim(),
      audioFile,
      timestamp: new Date().toISOString(),
    };

    // accumulate this QA so we have answers for all questions
    qaListRef.current.push(qa);

    // Call onComplete after last question with the full list
    if (currentIndex + 1 >= questions.length) {
      onComplete([...qaListRef.current]);
      // stop stream
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      // clear accumulated list for safety
      qaListRef.current = [];
    }
    setCurrentAnswer('');
    stopSpeechRecognition();
    audioChunksRef.current = [];

    // save to backend (best effort)
    const fd = new FormData();
    fd.append('candidate_id', candidateId);
    fd.append("question_set_id", questionSetId);
    fd.append("qa_data", JSON.stringify([qa]));
    if (audioFile) fd.append('audio', audioFile);
    fetch(`${baseUrl}/api/v1/upload_audio`, { method: 'POST', body: fd }).catch(() => {});

    // Move to next question
    const nextIndex = currentIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex);
      setTimeout(() => playQuestionTTS(getPrompt(questions[nextIndex])), 400);
    } else {
      setStatus('Interview complete');
    }
  };

  // Face detection on the movable preview: reuse BlazeFace logic used elsewhere
  useEffect(() => {
    let mounted = true;
    const startLoop = () => {
      detectLoopRef.current = setInterval(async () => {
        try {
          const videoEl = previewWebcamRef.current && previewWebcamRef.current.video;
          if (!videoEl || videoEl.readyState < 2 || !modelRef.current) return;
          const faces = await modelRef.current.estimateFaces(videoEl, false);
          console.log('[AudioInterview][faceDetect] faces=', faces?.length || 0);
          if (faces && faces.length > 1) {
            if (!prevMultipleRef.current) console.log('[AudioInterview] detected >1 face');
            missCountRef.current = 0;
            setLocalMultipleFaces(true);
            try { faceEventRef?.current?.({ type: 'multiple_faces', count: faces.length }); } catch (e) {}
            return;
          }

          if (faces && faces.length === 1) {
            missCountRef.current = 0;
            setLocalMultipleFaces(false);
            try { faceEventRef?.current?.({ type: 'single_face' }); } catch (e) {}
            return;
          }

          // No faces: allow a couple misses before treating as no-face
          missCountRef.current += 1;
          if (missCountRef.current >= 2) {
            missCountRef.current = 0;
            setLocalMultipleFaces(false);
            try { faceEventRef?.current?.({ type: 'no_face' }); } catch (e) {}
          }
        } catch (err) {
          // ignore detect errors
        }
      }, 1500);
    };

    const init = async () => {
      try {
        modelRef.current = await blazeface.load();
        if (!mounted) return;
        startLoop();
      } catch (err) {
        console.warn('AudioInterview face model load failed', err);
      }
    };

    init();

    return () => {
      mounted = false;
      clearInterval(detectLoopRef.current);
    };
  }, []);

  // Determine the current alert reason and whether UI should be blurred
  const currentReason = showMultipleFaces || localMultipleFaces ? 'multiple_faces' : showTabSwitch ? 'tab_switch' : null;
  const effectiveMultiple = !!currentReason;

  // Raise a single alert when we transition into any alert reason, and log changes
  useEffect(() => {
    if (currentReason && prevReasonRef.current !== currentReason) {
      if (currentReason === 'multiple_faces') {
        console.log('[AudioInterview] Multiple faces detected (effective).');
        try { alert('🚨 Multiple faces detected — page blurred. Please ensure only you are on camera.'); } catch (e) {}
      } else if (currentReason === 'tab_switch') {
        console.log('[AudioInterview] Tab switch detected (effective).');
        try { alert('⚠️ Tab switch detected — page blurred. Please return to the test tab.'); } catch (e) {}
      }
      prevReasonRef.current = currentReason;
    } else if (!currentReason && prevReasonRef.current) {
      console.log('[AudioInterview] Alert cleared.');
      prevReasonRef.current = null;
    }
  }, [currentReason]);

  // Auto-play first question
  useEffect(() => {
    if (questions.length > 0) {
      setTimeout(() => playQuestionTTS(getPrompt(questions[0])), 500);
    }
  }, [questions, playQuestionTTS]);

  if (!candidateId || !questionSetId) return <div>Candidate or Question Set ID missing!</div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Movable camera preview so global face-detection can blur this page as needed */}
      <WebcamPreview
        webcamRef={previewWebcamRef}
        canvasRef={previewCanvasRef}
        localStream={streamRef.current}
        streamRef={streamRef}
        hasVideoFrame={hasVideoFrame}
        floatingPos={floatingPos}
        setFloatingPos={setFloatingPos}
        selectedDeviceId={null}
      />
      {/* Global blur overlay that sits above everything when multiple faces are detected */}
      {effectiveMultiple && (
        <>
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50" />
          <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-60 bg-yellow-400 text-black px-4 py-2 rounded shadow">
            🚨 Multiple faces detected — page blurred
          </div>
        </>
      )}

      <div className={`bg-white w-full max-w-6xl h-[85vh] rounded-lg overflow-hidden shadow-xl flex ${effectiveMultiple ? 'filter blur-sm pointer-events-none z-40' : 'z-50'}`}>
        {/* LEFT PANEL */}
        <div className="w-2/5 bg-slate-50 p-6 flex flex-col items-center">
          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-sky-400 shadow">
            <img src={aiAvatar} alt="AI Interviewer" className="w-full h-full object-cover" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">AI Interviewer</h2>
          <p className="text-sm text-slate-600 mt-2 text-center px-4">
            Listen to the question and respond using voice or text.
          </p>

          <div className="mt-6 w-full">
            <div className="border bg-white p-4 rounded">
              <div className="text-sm text-slate-500">
                Question {currentIndex + 1} of {questions.length}
              </div>
              <div className="mt-2 text-lg font-medium text-slate-800">
                {getPrompt(questions[currentIndex]) || 'Loading...'}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 py-2 bg-blue-600 text-white rounded"
                onClick={() => playQuestionTTS(getPrompt(questions[currentIndex]))}
              >
                🔁 Replay Question
              </button>
              <button
                className="py-2 px-4 bg-gray-200 rounded"
                onClick={() => {
                  if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
                  onClose();
                }}
              >
                ✕ Cancel
              </button>
            </div>
          </div>

          <div className="mt-auto text-sm text-slate-600">
            Status: <span className="font-semibold">{status}</span>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className={`w-3/5 p-6 flex flex-col ${effectiveMultiple ? 'filter blur-sm pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">You</div>
              <div>
                <div className="font-semibold text-sm">{candidateId}</div>
                <div className="text-xs text-slate-500">Camera & mic ON</div>
              </div>
            </div>

            <select
              value={answerLanguage}
              onChange={(e) => setAnswerLanguage(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
          </div>

          <div className="flex-1 bg-black rounded overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>

          <label className="mt-4 text-sm font-medium">
            {answerLanguage === 'hi' ? 'आपका उत्तर' : 'Your Answer'}
          </label>
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className={`w-full border rounded p-3 mt-1 min-h-[100px] ${
              isListening ? 'border-green-500' : 'border-gray-300'
            }`}
          />

          <div className="flex gap-3 mt-3">
            <button
              className={`px-4 py-2 rounded text-white ${isRecordingAudio ? 'bg-red-600' : 'bg-gray-400'}`}
              disabled
            >
              {isRecordingAudio ? 'Recording...' : 'Recording...'}
            </button>

            <button
              className={`px-4 py-2 rounded text-white ${isListening ? 'bg-red-600' : 'bg-indigo-600'}`}
              onClick={() => (isListening ? stopSpeechRecognition() : startSpeechRecognition())}
            >
              {isListening ? 'Stop STT' : 'Voice Input (STT)'}
            </button>

            <button
              className="ml-auto px-4 py-2 bg-sky-600 text-white rounded"
              onClick={submitCurrentAnswer}
            >
              {currentIndex < questions.length - 1 ? 'Next →' : 'Finish'}
            </button>
          </div>

          <div className="text-xs text-slate-500 mt-3">
            Your audio answer will be saved for evaluation.
          </div>
        </div>
      </div>
    </div>
  );
}

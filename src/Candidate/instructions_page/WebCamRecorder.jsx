import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
 
const WebCamRecorder = forwardRef(
  (
    {
      questions = [],
      candidateId,
      questionSetId,
      baseUrl = "https://python-k0xt.onrender.com",
      onComplete = () => {},
      showMultipleFaces = false,
    },
    ref
  ) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
 
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [interviewEnded, setInterviewEnded] = useState(false);
    const [currentAnswer, setCurrentAnswer] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const qaListRef = useRef([]);
    const [status, setStatus] = useState("Idle");
    const [uploading, setUploading] = useState(false);

    // Initialize qa list with question metadata so indices exist and ids are preserved
    useEffect(() => {
      try {
        qaListRef.current = (questions || []).map((q) => ({
          question_id: q.question_id || q.id || q._id || null,
          question: (q.prompt_text || q.question) || '',
          answer: '',
        }));
        console.log('WebCamRecorder: initialized qaListRef with', qaListRef.current);
      } catch (e) { console.warn('qaList init failed', e); }
    }, [questions]);
 
    const prompt =
      (questions[currentIndex]?.prompt_text || questions[currentIndex]?.question) ||
      "Please answer this question.";
 
    // ---------------------------------------------------------
    // Initialize Camera + MediaRecorder
    // ---------------------------------------------------------
    useEffect(() => {
      async function init() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
 
          streamRef.current = stream;
 
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
 
          mediaRecorderRef.current = new MediaRecorder(stream, {
            mimeType: "video/webm;codecs=vp8,opus",
          });
 
          mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
 
          mediaRecorderRef.current.onstop = () => {
            setInterviewEnded(true);
          };

          // Auto-start recording once recorder is ready
          try {
            // clear previous chunks
            chunksRef.current = [];
            mediaRecorderRef.current.start(1000);
            setInterviewStarted(true);
            setStatus("Recording...");
          } catch (e) {
            console.warn('Auto-start recording failed', e);
          }
        } catch (err) {
          console.error("Camera init failed:", err);
          alert("Camera/microphone access is required!");
        }
      }
 
      init();
 
      return () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
      };
    }, []);
 
    // ---------------------------------------------------------
    // Start Recording
    // ---------------------------------------------------------
    const startInterview = () => {
      try {
        chunksRef.current = [];
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'recording') {
          mediaRecorderRef.current.start(1000);
        }
        setInterviewStarted(true);
        setStatus("Recording...");
      } catch (e) {
        console.warn('startInterview failed', e);
      }
    };
 
    // ---------------------------------------------------------
    // Stop Recording
    // ---------------------------------------------------------
    const pushAnswerForIndex = (idx, ans) => {
      const item = {
        question_id: questions[idx]?.question_id || questions[idx]?.id,
        question: (questions[idx]?.prompt_text || questions[idx]?.question) || '',
        answer: ans ? ans.trim() : '',
      };
      // ensure array size and set at index
      qaListRef.current = qaListRef.current || [];
      qaListRef.current[idx] = item;
      console.log(`WebCamRecorder: pushAnswerForIndex idx=${idx} answer='${item.answer}' item=`, item);
    };

    const endInterview = async () => {
      try {
        // push current answer before stopping
        console.log('WebCamRecorder: endInterview pushing answer for index', currentIndex, 'currentAnswer=', currentAnswer);
        pushAnswerForIndex(currentIndex, currentAnswer);
      } catch (e) {}

      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
        setStatus("Recording stopped");
      }
    };

    // Wait until recorder 'stop' event fires (returns a Promise)
    const stopRecordingWait = () => {
      return new Promise((resolve) => {
        const rec = mediaRecorderRef.current;
        if (!rec || rec.state === 'inactive') return resolve();
        const onStop = () => {
          try { rec.removeEventListener('stop', onStop); } catch (e) {}
          resolve();
        };
        try {
          rec.addEventListener('stop', onStop);
          try { rec.stop(); } catch (e) { onStop(); }
        } catch (e) {
          onStop();
        }
      });
    };
 
    // ---------------------------------------------------------
    // Upload Recording to Backend
    // ---------------------------------------------------------
    // Upload Recording to Backend (for all questions answered)
    // ---------------------------------------------------------
    const uploadRecording = async () => {
      setUploading(true);
      // ensure recorder has flushed final chunks
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        await stopRecordingWait();
      }

      if (!chunksRef.current.length) {
        alert("No video recorded!");
        return null;
      }

      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const filename = `video_${candidateId}_${Date.now()}.webm`;

      const file = new File([blob], filename, { type: "video/webm" });

      // use accumulated QA list
      // ensure we have a safe copy of QA data
      const qa_data = (qaListRef.current || []).map((item, idx) => ({
        question_id: item?.question_id || questions[idx]?.question_id || questions[idx]?.id,
        question: item?.question || questions[idx]?.prompt_text || questions[idx]?.question || '',
        answer: item?.answer || '',
      }));

      console.log('WebCamRecorder: uploading video with qa_data=', qa_data, 'chunksCount=', chunksRef.current.length);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("candidate_id", candidateId);
      fd.append("question_set_id", questionSetId);
      fd.append("qa_data", JSON.stringify(qa_data));

      setStatus("Uploading video...");

      try {
        const res = await fetch(`https://python-k0xt.onrender.com/api/v1/upload_video`, {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error("Upload failed:", txt);
          alert("Video upload failed!");
          setStatus("Upload failed");
          return { qa_data, error: txt };
        }

        const data = await res.json();
        console.log("Upload success:", data);
        setStatus("Video uploaded!");
        // notify parent with qa_data
        try { onComplete(qa_data); } catch (e) { console.warn('onComplete callback failed', e); }
        return { qa_data, response: data };

      } catch (err) {
        console.error("Upload error:", err);
        alert("Failed to upload video!");
        setStatus("Upload failed");
        return { qa_data, error: err };
      } finally {
        setUploading(false);
      }
      }
    // ---------------------------------------------------------
    // Exposed methods for parent component (GiveTest.jsx)
    // ---------------------------------------------------------
    useImperativeHandle(ref, () => ({
      startInterview,
      endInterview,
      uploadRecording,
      stopAll: () => {
        try {
          endInterview();
          streamRef.current?.getTracks().forEach((t) => t.stop());
        } catch {}
      },
    }));
 
    return (
<div className="p-4 bg-white rounded shadow relative">
      {showMultipleFaces && (
        <>
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50" />
          <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-60 bg-yellow-400 text-black px-4 py-2 rounded shadow">
            🚨 Multiple faces detected — page blurred
          </div>
        </>
      )}
<h2 className="text-xl font-bold mb-4">Video Interview</h2>
 
        {/* Live Camera Feed */}
<video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-72 bg-black rounded"
        />
 
        {/* Question */}
<div className="mt-4">
<h3 className="font-semibold mb-2">Question:</h3>
<p className="p-3 bg-gray-100 rounded">{prompt}</p>
</div>
 
        {/* Text Answer */}
<textarea
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          className="w-full p-3 border rounded mt-4 min-h-[120px]"
          placeholder="Write your explanation / answer here..."
        />
 
        {/* Buttons */}
        <div className="flex gap-3 mt-4">
          {!interviewStarted && (
            <button
              onClick={startInterview}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Start Recording
            </button>
          )}

          {interviewStarted && !interviewEnded && (
            <>
              <button
                onClick={async () => {
                  // save current answer for this index
                  pushAnswerForIndex(currentIndex, currentAnswer);
                  // clear answer and move to next
                  setCurrentAnswer('');
                  const next = currentIndex + 1;
                  if (next < questions.length) {
                    setCurrentIndex(next);
                    setTimeout(() => setStatus('Recording...'), 200);
                  } else {
                    // last question -> stop recording
                    await stopRecordingWait();
                    setInterviewEnded(true);
                    setStatus('Recording stopped');
                  }
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded"
              >
                Next
              </button>

              <button
                onClick={endInterview}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Stop Recording
              </button>
            </>
          )}

          {interviewEnded && (
            <button
              onClick={uploadRecording}
              className="px-4 py-2 bg-blue-600 text-white rounded"
              disabled={(qaListRef.current?.length || 0) < questions.length}
            >
              Upload & Submit
            </button>
          )}
        </div>
 
        {/* Status */}
<p className="text-sm text-gray-600 mt-3">Status: {status}</p>
          {/* Uploading overlay */}
          {uploading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div className="relative z-10 flex flex-col items-center gap-3 p-6 bg-white bg-opacity-90 rounded-lg shadow-lg">
                <div className="w-12 h-12 border-4 border-t-blue-600 border-gray-200 rounded-full animate-spin" />
                <div className="text-gray-700 font-medium">Uploading & Submitting...</div>
              </div>
            </div>
          )}
</div>
    );
  }
);
 
export default WebCamRecorder;

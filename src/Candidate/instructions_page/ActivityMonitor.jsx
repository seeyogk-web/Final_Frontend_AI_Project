import { useEffect, useRef, useCallback } from "react";
import { emitViolation } from "../../RecruiterAdmin/api/socket.js";

const ActivityMonitor = ({
  questionSetId,
  candidateId,
  cid,
  candidateName,
  email,
  faceEventRef,
  submitted,
  testStarted,
  onViolation
}) => {
  const idleTimeout = useRef(null);
  const counts = useRef({
    tab_switches: 0,
    inactivities: 0,
    face_not_visible: 0,
  });

  const flushTimer = useRef(null);

  const flush = useCallback(() => {
    const payload = Object.fromEntries(
      Object.entries(counts.current).filter(([, v]) => v > 0)
    );

    if (Object.keys(payload).length > 0) {
      emitViolation({
        question_set_id: questionSetId,
        candidate_id: candidateId,
        cid: cid,
        candidate_name: candidateName,
        candidate_email: email,
        ...payload,
      });
    }

    counts.current = {
      tab_switches: 0,
      inactivities: 0,
      face_not_visible: 0,
    };

    flushTimer.current = null;
  }, [questionSetId, candidateId, candidateName, email]);

  const bump = useCallback(
    (key) => {
      if (submitted) return;

      counts.current[key] = (counts.current[key] || 0) + 1;

      if (onViolation) onViolation(key, 1);

      if (!flushTimer.current) {
        flushTimer.current = setTimeout(flush, 2000);
      }
    },
    [flush, submitted, onViolation]
  );

  useEffect(() => {
    if (!testStarted || submitted) return;

    const onVisibility = () => {
      if (document.hidden) bump("tab_switches");
    };

    const resetInactivity = () => {
      clearTimeout(idleTimeout.current);
      idleTimeout.current = setTimeout(() => bump("inactivities"), 10000);
    };

    window.addEventListener("mousemove", resetInactivity);
    window.addEventListener("keydown", resetInactivity);
    document.addEventListener("visibilitychange", onVisibility);

    resetInactivity();

    return () => {
      window.removeEventListener("mousemove", resetInactivity);
      window.removeEventListener("keydown", resetInactivity);
      document.removeEventListener("visibilitychange", onVisibility);

      clearTimeout(idleTimeout.current);
      clearTimeout(flushTimer.current);
    };
  }, [bump, testStarted, submitted]);

  useEffect(() => {
    if (faceEventRef) {
      // Accept structured face events from FaceDetection
      faceEventRef.current = (event) => {
        if (!event) {
          // backward-compatible: treat empty call as face not visible
          bump("face_not_visible");
          return;
        }

        if (event.type === "no_face") {
          bump("face_not_visible");
          return;
        }

        if (event.type === "multiple_faces") {
          // forward multi-face event to parent (do not increment the standard violation counters)
          if (onViolation) onViolation("multiple_faces", event.count || 1);
          return;
        }

        if (event.type === "single_face") {
          if (onViolation) onViolation("single_face", 1);
          return;
        }
      };
    }
  }, [faceEventRef, bump]);

  return null;
};

export default ActivityMonitor;
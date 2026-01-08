import * as blazeface from "@tensorflow-models/blazeface";
import "@tensorflow/tfjs";
import { useEffect, useRef } from "react";

const FaceDetection = ({ faceEventRef, submitted }) => {
  const videoRef = useRef(null);
  const modelRef = useRef(null);
  const loopRef = useRef(null);

  useEffect(() => {
    if (submitted) return;

    let video = null;
    let missCount = 0;

    const startLoop = () => {
      loopRef.current = setInterval(async () => {
        if (!video || !modelRef.current) return;

        if (video.readyState < 2) {
          console.log("⏳ Video not ready...");
          return;
        }

        try {
          const faces = await modelRef.current.estimateFaces(video, false);

          // Multiple faces detected -> notify immediately
          if (faces && faces.length > 1) {
            faceEventRef?.current?.({ type: "multiple_faces", count: faces.length });
            missCount = 0;
            return;
          }

          // Single face detected -> clear any multi-face state
          if (faces && faces.length === 1) {
            missCount = 0;
            faceEventRef?.current?.({ type: "single_face" });
            return;
          }

          // No faces: respect the missCount threshold (existing behaviour)
          if (!faces || !faces.length) {
            missCount++;
            if (missCount >= 2) {
              faceEventRef?.current?.({ type: "no_face" });
              missCount = 0;
            }
          } else {
            missCount = 0;
          }
        } catch (err) {
          console.warn("Face detection error:", err);
        }
      }, 3000);
    };

    const init = async () => {
      try {
        modelRef.current = await blazeface.load();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        video = videoRef.current;
        video.srcObject = stream;

        await new Promise((res) => {
          video.onloadedmetadata = () => {
            video.play();
            res();
          };
        });

        startLoop();
      } catch (err) {
        console.error("FaceDetection init error:", err);
      }
    };

    init();

    return () => {
      clearInterval(loopRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [faceEventRef, submitted]);

  return <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline muted />;
};

export default FaceDetection;

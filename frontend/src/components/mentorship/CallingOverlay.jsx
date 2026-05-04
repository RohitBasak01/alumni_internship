import React, { useEffect, useRef } from "react";
import "./Mentorship.css";

export function CallingOverlay({
  callState,
  incomingCallData,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  isAudioOnly,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === "idle") return null;

  return (
    <div className="member-rtc-overlay">
      <div className="member-rtc-container">
        {/* Remote Video (Full Screen in container) */}
        {!isAudioOnly && (
          <video
            ref={remoteVideoRef}
            autoPlay
            className={`member-rtc-remote-video ${callState === "connected" ? "visible" : ""}`}
          />
        )}

        {/* Local Video (Picture-in-Picture) */}
        {!isAudioOnly && (
          <div className="member-rtc-local-video-container">
            <video ref={localVideoRef} autoPlay muted className="member-rtc-local-video" />
          </div>
        )}

        {/* Info Area */}
        <div className="member-rtc-info">
          <div className="member-rtc-avatar">
            {incomingCallData?.fromName?.[0] || "A"}
          </div>
          <h3>{incomingCallData?.fromName || "Alumni Contact"}</h3>
          <p>
            {callState === "ringing"
              ? "Incoming Call..."
              : callState === "calling"
              ? "Calling..."
              : "Ongoing Call"}
          </p>
        </div>

        {/* Controls */}
        <div className="member-rtc-controls">
          {callState === "ringing" ? (
            <>
              <button className="rtc-button accept" onClick={onAccept}>
                <span className="material-symbols-outlined">call</span>
              </button>
              <button className="rtc-button reject" onClick={onReject}>
                <span className="material-symbols-outlined">call_end</span>
              </button>
            </>
          ) : (
            <button className="rtc-button reject" onClick={onEnd}>
              <span className="material-symbols-outlined">call_end</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";

export function useMentorshipRTC(socket, auth, activeConversation, onIncomingCall, onError) {
  const [callState, setCallState] = useState("idle"); // idle, calling, ringing, connected
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);

  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  const endCall = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setIncomingCallData(null);

    // Notify other user
    if (incomingCallData?.fromUserId || activeConversation?.partnerId) {
      socket.emit("rtc:end-call", {
        targetUserId: incomingCallData?.fromUserId || activeConversation?.partnerId,
      });
    }
  }, [localStream, socket, incomingCallData, activeConversation]);

  const initPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const targetUserId = incomingCallData?.fromUserId || activeConversation?.partnerId;
        socket.emit("rtc:signal", {
          targetUserId,
          signalData: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current = pc;
    return pc;
  }, [socket, incomingCallData, activeConversation]);

  const startCall = useCallback(async (type = "video") => {
    try {
      // Validate socket connection
      if (!socket?.connected) {
        throw new Error("Not connected to call service. Please wait and try again.");
      }

      // Validate conversation setup
      if (!activeConversation?.partnerId) {
        throw new Error("Invalid conversation. Please refresh and try again.");
      }

      setIsAudioOnly(type === "audio");
      
      // Request media access
      try {
        var stream = await navigator.mediaDevices.getUserMedia({
          video: type === "video",
          audio: true,
        });
      } catch (mediaError) {
        if (mediaError.name === "NotAllowedError") {
          throw new Error("Camera/microphone permission denied. Please check your browser settings.");
        } else if (mediaError.name === "NotFoundError") {
          throw new Error("Camera/microphone not found. Please check your device.");
        } else {
          throw new Error(`Media access failed: ${mediaError.message}`);
        }
      }

      setLocalStream(stream);
      setCallState("calling");

      const pc = initPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("rtc:call-user", {
        targetUserId: activeConversation.partnerId,
        fromName: auth.user?.name,
        signalData: offer,
        conversationId: activeConversation._id,
        callType: type,
      });
    } catch (err) {
      console.error("Failed to start call:", err);
      const errorMessage = err.message || "Failed to start call. Please try again.";
      if (onError) onError(errorMessage);
      setCallState("idle");
    }
  }, [activeConversation, auth, initPeerConnection, socket, onError]);

  const answerCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCallData.callType === "video",
        audio: true,
      });
      setLocalStream(stream);
      setCallState("connected");

      const pc = initPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.signalData));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("rtc:answer-call", {
        targetUserId: incomingCallData.fromUserId,
        signalData: answer,
      });
    } catch (err) {
      console.error("Failed to answer call:", err);
      endCall();
    }
  }, [incomingCallData, initPeerConnection, socket, endCall]);

  const rejectCall = useCallback(() => {
    socket.emit("rtc:reject-call", {
      targetUserId: incomingCallData.fromUserId,
    });
    setIncomingCallData(null);
    setCallState("idle");
  }, [incomingCallData, socket]);

  useEffect(() => {
    if (!socket) return;

    socket.on("rtc:incoming-call", (data) => {
      setIncomingCallData(data);
      setCallState("ringing");
      if (onIncomingCall) onIncomingCall(data);
    });

    socket.on("rtc:call-accepted", async ({ signalData }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signalData));
        setCallState("connected");
      }
    });

    socket.on("rtc:call-rejected", () => {
      endCall();
    });

    socket.on("rtc:signal", async ({ signalData }) => {
      if (signalData.type === "candidate" && peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    });

    socket.on("rtc:call-error", (data) => {
      if (onError) onError(data.message);
      endCall();
    });

    socket.on("rtc:call-ended", () => {
      endCall();
    });

    return () => {
      socket.off("rtc:incoming-call");
      socket.off("rtc:call-accepted");
      socket.off("rtc:call-rejected");
      socket.off("rtc:signal");
      socket.off("rtc:call-ended");
      socket.off("rtc:call-error");
    };
  }, [socket, endCall, onIncomingCall, onError]);

  return {
    callState,
    localStream,
    remoteStream,
    incomingCallData,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    localVideoRef,
    remoteVideoRef,
    isAudioOnly,
  };
}

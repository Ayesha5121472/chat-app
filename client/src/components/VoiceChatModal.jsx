import { useContext, useEffect, useRef, useState } from "react";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { Peer } from "peerjs";
import toast from "react-hot-toast";

const VoiceChatModal = ({ onClose }) => {
  const { selectedUser, selectedGroup } = useContext(ChatContext);
  const { authUser, socket } = useContext(AuthContext);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, connecting, connected, incoming
  const [incomingCall, setIncomingCall] = useState(null);

  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  const currentTarget = selectedUser || selectedGroup;
  const targetId = currentTarget?._id;

  const cleanUp = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
      setPeer(null);
    }
    setRemoteStream(null);
    setIsCallActive(false);
    setCallStatus("idle");
    setIncomingCall(null);
  };

  const initializePeerAndStream = async () => {
    if (localStreamRef.current && peerRef.current) {
      return { stream: localStreamRef.current, peerInstance: peerRef.current };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true;
      }

      const newPeer = new Peer(authUser._id, {
        host: import.meta.env.DEV ? "localhost" : window.location.hostname,
        port: import.meta.env.DEV ? 5000 : window.location.port,
        path: "/api/peerjs",
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
          ],
        },
      });

      setPeer(newPeer);
      peerRef.current = newPeer;

      newPeer.on("open", (id) => {
        console.log("Peer connected with id:", id);
      });

      newPeer.on("call", (incomingCallObj) => {
        console.log("Incoming call from:", incomingCallObj.peer);
        setIncomingCall(incomingCallObj);
        setCallStatus("incoming");
      });

      newPeer.on("error", (err) => {
        console.error("Peer error:", err);
        toast.error("Peer connection error: " + err.message);
        cleanUp();
      });

      return { stream, peerInstance: newPeer };
    } catch (err) {
      console.error("Error initializing peer/stream:", err);
      toast.error("Failed to initialize: " + (err.message || "Please allow microphone access"));
      throw err;
    }
  };

  const handleIncomingPeerCall = (incomingCallObj, stream) => {
    callRef.current = incomingCallObj;
    incomingCallObj.answer(stream);
    incomingCallObj.on("stream", (remoteMediaStream) => {
      setRemoteStream(remoteMediaStream);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteMediaStream;
      }
      setIsCallActive(true);
      setCallStatus("connected");
    });
    incomingCallObj.on("close", () => {
      cleanUp();
    });
    incomingCallObj.on("error", (err) => {
      console.error("Call error:", err);
      toast.error("Voice call error: " + err.message);
      cleanUp();
    });
  };

  const startCall = async () => {
    if (!selectedUser) {
      toast.error("Voice calls are only available for private chats");
      return;
    }

    try {
      setCallStatus("connecting");
      const { peerInstance: newPeer } = await initializePeerAndStream();

      await new Promise((resolve) => {
        if (newPeer.open) resolve();
        else newPeer.on("open", resolve);
      });

      socket.emit("initiateVoiceCall", {
        from: authUser._id,
        to: targetId,
      });
      setCallStatus("calling");
    } catch (err) {
      console.error("Error starting call:", err);
    }
  };

  const answerIncomingCall = async () => {
    if (!incomingCall) return;

    try {
      setCallStatus("connecting");
      let stream = localStreamRef.current;
      let activePeer = peerRef.current;

      if (!stream || !activePeer) {
        const initialized = await initializePeerAndStream();
        stream = initialized.stream;
        activePeer = initialized.peerInstance;
        await new Promise((resolve) => {
          if (activePeer.open) resolve();
          else activePeer.on("open", resolve);
        });
      }

      socket.emit("acceptVoiceCall", {
        from: authUser._id,
        to: incomingCall.peer,
      });

      handleIncomingPeerCall(incomingCall, stream);
      setIncomingCall(null);
    } catch (err) {
      console.error("Error answering call:", err);
      toast.error("Could not answer the call");
    }
  };

  const declineIncomingCall = () => {
    if (incomingCall) {
      incomingCall.close();
    }
    setIncomingCall(null);
    setCallStatus("idle");
  };

  const endCall = () => {
    socket.emit("endVoiceCall", {
      from: authUser._id,
      to: targetId,
    });
    cleanUp();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Socket listeners for call events
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = ({ from }) => {
      console.log("Incoming call from socket:", from);
      toast("Incoming voice call!", {
        icon: "📞",
        duration: 30000,
        action: {
          label: "Answer",
          onClick: () => answerIncomingCall(),
        },
      });
    };

    const handleVoiceCallAccepted = async ({ from }) => {
      console.log("Voice call accepted by:", from);
      if (callStatus === "calling" && localStreamRef.current && peerRef.current) {
        const call = peerRef.current.call(from, localStreamRef.current);
        callRef.current = call;
        call.on("stream", (remoteMediaStream) => {
          setRemoteStream(remoteMediaStream);
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteMediaStream;
          }
          setIsCallActive(true);
          setCallStatus("connected");
        });
        call.on("close", () => {
          cleanUp();
        });
        call.on("error", (err) => {
          console.error("Call error:", err);
          toast.error("Voice call error: " + err.message);
          cleanUp();
        });
      }
    };

    const handleCallEnded = () => {
      toast("Voice call ended");
      cleanUp();
    };

    socket.on("incomingVoiceCall", handleIncomingCall);
    socket.on("voiceCallAccepted", handleVoiceCallAccepted);
    socket.on("voiceCallEnded", handleCallEnded);

    return () => {
      socket.off("incomingVoiceCall", handleIncomingCall);
      socket.off("voiceCallAccepted", handleVoiceCallAccepted);
      socket.off("voiceCallEnded", handleCallEnded);
    };
  }, [socket, callStatus, authUser?._id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanUp();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-8 max-w-md w-[95%] shadow-2xl border border-white/20 animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Voice Chat
          </h2>
          <button
            onClick={() => {
              if (isCallActive) {
                endCall();
              } else {
                onClose();
              }
            }}
            className="text-gray-300 hover:text-white text-3xl transition duration-300 hover:rotate-90"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-6xl animate-pulse shadow-lg shadow-purple-500/40">
              {selectedUser?.profilePic ? (
                <img
                  src={selectedUser.profilePic}
                  alt={selectedUser.fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            {isCallActive && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                Live
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-white">
              {currentTarget?.fullName || currentTarget?.name}
            </p>
            <p className="text-sm text-gray-300">
              {callStatus === "idle" && "Ready to call"}
              {callStatus === "calling" && "Calling..."}
              {callStatus === "connecting" && "Connecting..."}
              {callStatus === "connected" && "Connected"}
              {callStatus === "incoming" && "Incoming call..."}
            </p>
          </div>

          {/* Hidden audio elements */}
          <audio ref={localAudioRef} autoPlay playsInline />
          <audio ref={remoteAudioRef} autoPlay playsInline />

          {/* Call controls */}
          <div className="flex items-center gap-4">
            {!isCallActive ? (
              <>
                {callStatus === "incoming" ? (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={declineIncomingCall}
                      className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg shadow-red-500/50"
                      title="Decline Call"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.13a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" />
                      </svg>
                    </button>
                    <button
                      onClick={answerIncomingCall}
                      className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg shadow-green-500/50"
                      title="Answer Call"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startCall}
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg shadow-green-500/50"
                    title="Start Call"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg ${
                    isMuted ? "bg-red-500 hover:bg-red-600 shadow-red-500/50" : "bg-white/20 hover:bg-white/30"
                  } text-white`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg shadow-red-500/50"
                  title="End Call"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.13a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatModal;

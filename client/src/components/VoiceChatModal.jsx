import { useContext, useEffect, useRef, useState } from "react";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { Peer } from "peerjs";
import toast from "react-hot-toast";
import assets from "../assets/assets";

const imgError = (e) => { e.target.src = assets.avatar_icon; };

const VoiceChatModal = ({ type = "voice", incomingData = null, onClose }) => {
  const { selectedUser, selectedGroup } = useContext(ChatContext);
  const { authUser, socket, onlineUsers } = useContext(AuthContext);

  const [callType, setCallType] = useState(incomingData ? incomingData.type : type); // "voice" | "video"
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState(incomingData ? "incoming" : "idle"); // idle, calling, connecting, connected, incoming
  const [incomingCall, setIncomingCall] = useState(null); // The PeerJS call object
  const [incomingSocketData, setIncomingSocketData] = useState(incomingData); // The socket call data
  const [mediaError, setMediaError] = useState(null);

  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
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
    setMediaError(null);
  };

  const initializePeerAndStream = async () => {
    if (localStreamRef.current && peerRef.current) {
      return { stream: localStreamRef.current, peerInstance: peerRef.current };
    }

    try {
      const isVideo = callType === "video";
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;

      // Assign local stream preview
      if (isVideo) {
        setTimeout(() => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
          }
        }, 100);
      } else {
        setTimeout(() => {
          if (localAudioRef.current) {
            localAudioRef.current.srcObject = stream;
            localAudioRef.current.muted = true;
          }
        }, 100);
      }

      const newPeer = new Peer(authUser._id, {
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
        console.log("Incoming peer call:", incomingCallObj.peer);
        if (localStreamRef.current) {
          handleIncomingPeerCall(incomingCallObj, localStreamRef.current);
        } else {
          setIncomingCall(incomingCallObj);
          setCallStatus("incoming");
        }
      });

      newPeer.on("error", (err) => {
        console.error("Peer error:", err);
        toast.error("Connection error: " + err.message);
        cleanUp();
      });

      return { stream, peerInstance: newPeer };
    } catch (err) {
      console.error("Error initializing peer/stream:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMediaError("Camera/Microphone access was denied. Please grant permission and try again.");
      } else {
        setMediaError(err.message || "Failed to initialize media devices.");
      }
      toast.error("Failed to initialize: " + (err.message || "Please allow media access"));
      throw err;
    }
  };

  const handleIncomingPeerCall = (incomingCallObj, stream) => {
    callRef.current = incomingCallObj;
    incomingCallObj.answer(stream);
    incomingCallObj.on("stream", (remoteMediaStream) => {
      setRemoteStream(remoteMediaStream);
      setIsCallActive(true);
      setCallStatus("connected");

      // Attach remote media stream
      const isVideo = callType === "video";
      setTimeout(() => {
        if (isVideo && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteMediaStream;
        } else if (!isVideo && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteMediaStream;
        }
      }, 100);
    });
    incomingCallObj.on("close", () => {
      cleanUp();
    });
    incomingCallObj.on("error", (err) => {
      console.error("Call error:", err);
      toast.error("Call error: " + err.message);
      cleanUp();
    });
  };



  const answerIncomingCall = async () => {
    if (!incomingSocketData) return;

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
        to: incomingSocketData.from,
        type: callType,
      });

      // The actual PeerJS call will arrive shortly, and the on("call") listener
      // will handle it using the localStream we just initialized.
    } catch (err) {
      console.error("Error answering call:", err);
      toast.error("Could not answer call");
    }
  };

  // Start a new outgoing call
  const startCall = async () => {
    if (!selectedUser) {
      toast.error("Calls are only available for private chats");
      return;
    }
    
    if (!onlineUsers.includes(targetId)) {
        toast.error(`${selectedUser.fullName || selectedUser.name} is offline. You can only call online users.`);
        setCallStatus("idle");
        return;
    }

    // Reset any previous media errors
    setMediaError(null);
    try {
      setCallStatus("connecting");
      const { peerInstance: newPeer } = await initializePeerAndStream();

      await new Promise((resolve, reject) => {
        if (newPeer.open) return resolve();
        
        const timeout = setTimeout(() => reject(new Error("Connection to peer server timed out")), 10000);
        
        newPeer.on("open", () => {
            clearTimeout(timeout);
            resolve();
        });
        newPeer.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
        });
      });

      socket.emit("initiateVoiceCall", {
        from: authUser._id,
        to: targetId,
        type: callType,
      });
      setCallStatus("calling");
    } catch (err) {
      console.error("Error starting call:", err);
      toast.error(err.message || "Failed to start call");
      setCallStatus("idle");
    }
  };

  // Automatically start call if not incoming
  useEffect(() => {
    if (callStatus === "idle" && !incomingSocketData) {
        startCall();
    }
  }, []);

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
    setMediaError(null);
  };

  // Reset mediaError when modal is closed or unmounted
  useEffect(() => {
    return () => {
      setMediaError(null);
    };
  }, []);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Socket listeners for call events
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = ({ from, type: incomingType }) => {
      console.log("Incoming call from socket:", from, incomingType);
      setCallType(incomingType || "voice");
      setCallStatus("incoming");
      toast(`Incoming ${incomingType || "voice"} call!`, {
        icon: "📞",
        duration: 30000,
      });
    };

    const handleVoiceCallAccepted = async ({ from, type: incomingType }) => {
      console.log("Call accepted by:", from, incomingType);
      if (incomingType) setCallType(incomingType);

      if (callStatus === "calling" && localStreamRef.current && peerRef.current) {
        const call = peerRef.current.call(from, localStreamRef.current);
        callRef.current = call;
        call.on("stream", (remoteMediaStream) => {
          setRemoteStream(remoteMediaStream);
          setIsCallActive(true);
          setCallStatus("connected");

          const isVideo = (incomingType || callType) === "video";
          setTimeout(() => {
            if (isVideo && remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteMediaStream;
            } else if (!isVideo && remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteMediaStream;
            }
          }, 100);
        });
        call.on("close", () => {
          cleanUp();
        });
        call.on("error", (err) => {
          console.error("Call error:", err);
          toast.error("Call error: " + err.message);
          cleanUp();
        });
      }
    };

    const handleCallEnded = () => {
      toast("Call ended");
      cleanUp();
      onClose();
    };

    socket.on("incomingVoiceCall", handleIncomingCall);
    socket.on("voiceCallAccepted", handleVoiceCallAccepted);
    socket.on("voiceCallEnded", handleCallEnded);

    return () => {
      socket.off("incomingVoiceCall", handleIncomingCall);
      socket.off("voiceCallAccepted", handleVoiceCallAccepted);
      socket.off("voiceCallEnded", handleCallEnded);
    };
  }, [socket, callStatus, callType, authUser?._id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanUp();
    };
  }, []);

  const isVideo = callType === "video";

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1000] animate-in fade-in duration-200 backdrop-blur-sm">
      <div className={`bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 shadow-2xl border border-white/10 animate-in zoom-in duration-300 relative overflow-hidden flex flex-col justify-between ${
        isVideo && callStatus === "connected" ? "w-[90vw] h-[85vh] max-w-4xl rounded-3xl" : "w-[95%] max-w-md rounded-3xl p-8"
      }`}>
        
        {/* ── Background Video Fill if Video Call Active ── */}
        {isVideo && callStatus === "connected" && remoteStream && (
          <div className="absolute inset-0 z-0 bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* ── Local PIP Video overlay ── */}
        {isVideo && callStatus === "connected" && localStream && isVideoEnabled && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-6 w-32 h-44 rounded-2xl object-cover border-2 border-white/20 shadow-2xl z-20 bg-slate-900"
          />
        )}

        {/* ── Header ── */}
        <div className={`flex justify-between items-center z-10 ${isVideo && callStatus === "connected" ? "p-6 bg-gradient-to-b from-black/60 to-transparent" : "mb-6"}`}>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>{isVideo ? "📹" : "📞"}</span>
            {isVideo ? "Video Call" : "Voice Call"}
          </h2>
          <button
            onClick={() => {
              if (isCallActive) {
                endCall();
              } else {
                onClose();
              }
            }}
            className="text-gray-300 hover:text-white text-3xl transition duration-300 hover:rotate-90 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* ── Call Info Display (pulsing avatar if not active video) ── */}
        {(!isVideo || callStatus !== "connected") && (
          <div className="flex flex-col items-center gap-6 my-4 z-10">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-6xl animate-pulse shadow-lg shadow-purple-500/40 overflow-hidden">
                <img
                  src={currentTarget?.profilePic || assets.avatar_icon}
                  alt={currentTarget?.fullName}
                  onError={imgError}
                  className="w-full h-full object-cover"
                />
              </div>
              {isCallActive && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-0.5 rounded-full text-xs font-bold shadow-lg">
                  Connected
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-white">
                {currentTarget?.fullName || currentTarget?.name}
              </p>
              <p className="text-sm text-gray-400 font-medium">
                {callStatus === "idle" && "Ready to connect"}
                {callStatus === "calling" && "Calling..."}
                {callStatus === "connecting" && "Connecting..."}
                {callStatus === "connected" && "Connected"}
                {callStatus === "incoming" && `Incoming ${callType} call...`}
              </p>
            </div>
          </div>
        )}

        {/* ── Video call overlay status text ── */}
        {isVideo && callStatus === "connected" && (
          <div className="absolute top-20 left-6 z-10 bg-black/40 px-4 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-md">
            🔴 Live: {currentTarget?.fullName}
          </div>
        )}

        {/* ── Hidden audio tags ── */}
        <audio ref={localAudioRef} autoPlay playsInline />
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Media permission error overlay */}
        {mediaError && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-4">
            <div className="bg-slate-800 border border-white/10 p-6 rounded-2xl shadow-2xl text-center max-w-sm w-full">
              <div className="text-4xl mb-3">🎙️</div>
              <h3 className="text-white font-bold text-lg mb-2">Microphone Permission Required</h3>
              <p className="text-red-400 text-sm mb-4">{mediaError}</p>
              <div className="bg-white/5 rounded-xl p-4 text-left text-xs text-gray-300 mb-4 space-y-2">
                <p className="font-semibold text-white">How to allow permission:</p>
                <p>1. Click the 🔒 lock icon in the browser address bar</p>
                <p>2. Set <strong>Microphone</strong> &amp; <strong>Camera</strong> to "Allow"</p>
                <p>3. Refresh the page and try again</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setMediaError(null); onClose(); }}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    setMediaError(null);
                    try {
                      await initializePeerAndStream();
                      toast.success("Media devices initialized!");
                    } catch (e) {
                      // keep error state shown again
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm transition font-semibold"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ── Control Bar ── */}
        <div className={`flex flex-col items-center justify-center z-10 ${
          isVideo && callStatus === "connected" ? "p-6 bg-gradient-to-t from-black/60 to-transparent" : ""
        }`}>
          <div className="flex items-center gap-4">
            
            {/* Call Toggle Actions */}
            {!isCallActive ? (
              <>
                {callStatus === "incoming" ? (
                  <div className="flex items-center gap-6">
                    <button
                      onClick={declineIncomingCall}
                      className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg shadow-red-500/50 cursor-pointer"
                      title="Decline Call"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={answerIncomingCall}
                      className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg shadow-green-500/50 cursor-pointer"
                      title="Answer Call"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startCall}
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg shadow-green-500/50 cursor-pointer font-bold"
                    title="Start Call"
                  >
                    Start
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-4 bg-slate-900/60 p-3 rounded-full backdrop-blur-md border border-white/10 shadow-xl">
                
                {/* Microphone Mute */}
                <button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition duration-300 hover:scale-110 cursor-pointer ${
                    isMuted ? "bg-red-500 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? "🔇" : "🎙️"}
                </button>

                {/* Camera Toggle (Video only) */}
                {isVideo && (
                  <button
                    onClick={toggleCamera}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition duration-300 hover:scale-110 cursor-pointer ${
                      !isVideoEnabled ? "bg-red-500 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
                    }`}
                    title={isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"}
                  >
                    {isVideoEnabled ? "📷" : "🚫"}
                  </button>
                )}

                {/* Hang Up */}
                <button
                  onClick={endCall}
                  className="w-14 h-14 rounded-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-650 hover:to-rose-650 text-white flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg shadow-red-500/40 cursor-pointer"
                  title="Hang Up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatModal;

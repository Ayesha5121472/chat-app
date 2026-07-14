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
    const [callStatus, setCallStatus] = useState("idle"); // idle, calling, connecting, connected

    const localAudioRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const callRef = useRef(null);

    const currentTarget = selectedUser || selectedGroup;
    const targetId = currentTarget?._id;

    const cleanUp = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (callRef.current) {
            callRef.current.close();
            callRef.current = null;
        }
        if (peer) {
            peer.destroy();
            setPeer(null);
        }
        setIsCallActive(false);
        setCallStatus("idle");
    };

    const startCall = async () => {
        try {
            setCallStatus("connecting");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setLocalStream(stream);

            if (localAudioRef.current) {
                localAudioRef.current.srcObject = stream;
                localAudioRef.current.muted = true; // Mute self
            }

            // Initialize PeerJS
            const newPeer = new Peer(authUser._id, {
                host: window.location.hostname,
                port: 5000, // Use our server's port
                path: "/api/peerjs",
                config: {
                    iceServers: [
                        { urls: "stun:stun.l.google.com:19302" },
                        { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
                    ],
                },
            });

            setPeer(newPeer);

            newPeer.on("open", (id) => {
                console.log("Peer connected with id:", id);
                // Emit call to other user
                socket.emit("initiateVoiceCall", {
                    from: authUser._id,
                    to: targetId,
                });
                setCallStatus("calling");
            });

            newPeer.on("call", (incomingCall) => {
                setCallStatus("connecting");
                callRef.current = incomingCall;
                incomingCall.answer(stream);
                incomingCall.on("stream", (remoteMediaStream) => {
                    setRemoteStream(remoteMediaStream);
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = remoteMediaStream;
                    }
                    setIsCallActive(true);
                    setCallStatus("connected");
                });
                incomingCall.on("close", () => {
                    cleanUp();
                });
                incomingCall.on("error", (err) => {
                    console.error("Call error:", err);
                    toast.error("Voice call error: " + err.message);
                    cleanUp();
                });
            });

            newPeer.on("error", (err) => {
                console.error("Peer error:", err);
                toast.error("Peer connection error: " + err.message);
                cleanUp();
            });

            // If we're calling someone, call their peer
            if (selectedUser) {
                const call = newPeer.call(targetId, stream);
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

        } catch (err) {
            console.error("Error starting call:", err);
            toast.error("Failed to start voice call: " + (err.message || "Please allow microphone access"));
        }
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
                track.enabled = !isMuted;
            });
            setIsMuted(!isMuted);
        }
    };

    // Listen for incoming calls
    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = ({ from }) => {
            toast(`Incoming call from ${from}!`, {
                icon: "📞",
                duration: 30000,
                action: {
                    label: "Answer",
                    onClick: () => startCall(),
                },
            });
        };

        const handleCallEnded = () => {
            toast("Voice call ended");
            cleanUp();
        };

        socket.on("incomingVoiceCall", handleIncomingCall);
        socket.on("voiceCallEnded", handleCallEnded);

        return () => {
            socket.off("incomingVoiceCall", handleIncomingCall);
            socket.off("voiceCallEnded", handleCallEnded);
        };
    }, [socket]);

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
                    <h2 className="text-2xl font-bold text-white">Voice Chat</h2>
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
                            👤
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
                        </p>
                    </div>

                    {/* Hidden audio elements */}
                    <audio ref={localAudioRef} autoPlay playsInline />
                    <audio ref={remoteAudioRef} autoPlay playsInline />

                    {/* Call controls */}
                    <div className="flex items-center gap-4">
                        {!isCallActive ? (
                            <button
                                onClick={startCall}
                                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white text-3xl flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg shadow-green-500/50"
                            >
                                📞
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={toggleMute}
                                    className={`w-14 h-14 rounded-full ${isMuted ? "bg-red-500" : "bg-white/20"} hover:bg-white/30 text-white text-2xl flex items-center justify-center transition duration-300 hover:scale-110`}
                                >
                                    {isMuted ? "🔇" : "🔊"}
                                </button>
                                <button
                                    onClick={endCall}
                                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white text-3xl flex items-center justify-center transition duration-300 hover:scale-110 shadow-lg shadow-red-500/50"
                                >
                                    📞
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

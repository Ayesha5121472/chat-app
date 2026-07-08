import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../context/AuthContext.jsx";
import { ChatProvider } from "../context/ChatContext.jsx";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        {/* Toaster must be OUTSIDE all context providers so toasts work everywhere */}
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AuthProvider>
            <ChatProvider>
                <App />
            </ChatProvider>
        </AuthProvider>
    </BrowserRouter>
);

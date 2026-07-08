import { Navigate, Route, Routes } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import bgImage from "./assets/bgImage.svg";

const App = () => {
    const { authUser, isCheckingAuth } = useContext(AuthContext);

    // Waiting for token verification — show spinner
    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            <Routes>
                <Route path="/"        element={authUser ? <HomePage />   : <Navigate to="/login" replace />} />
                <Route path="/login"   element={!authUser ? <LoginPage /> : <Navigate to="/" replace />} />
                <Route path="/profile" element={authUser ? <ProfilePage />: <Navigate to="/login" replace />} />
                <Route path="*"        element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
};

export default App;

import { Navigate, Route, Routes } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import bgImage from "./assets/bgImage.svg";

const App = () => {
    const { authUser, isCheckingAuth } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);

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
            className="h-full overflow-hidden bg-cover bg-center bg-no-repeat bg-slate-100 dark:bg-transparent transition-colors duration-300"
            style={{ backgroundImage: theme === "dark" ? `url(${bgImage})` : "none" }}
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

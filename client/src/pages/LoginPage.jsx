import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import assets from "../assets/assets";

const LoginPage = () => {
    const { login } = useContext(AuthContext);

    // "Sign up" | "Login"
    const [currState, setCurrState] = useState("Login");

    // Sign-up fields
    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");

    // Shared fields
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Two-step sign-up: step1 = name+email+password, step2 = bio
    const [isDataSubmitted, setIsDataSubmitted] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const onSubmitHandler = async (e) => {
        e.preventDefault();

        // Sign-up step 1 → move to bio step
        if (currState === "Sign up" && !isDataSubmitted) {
            setIsDataSubmitted(true);
            return;
        }

        setIsLoading(true);
        await login(currState === "Sign up" ? "signup" : "login", {
            fullName,
            email,
            password,
            bio,
        });
        setIsLoading(false);
    };

    const switchToLogin = () => {
        setCurrState("Login");
        setIsDataSubmitted(false);
        setFullName("");
        setEmail("");
        setPassword("");
        setBio("");
    };

    const switchToSignup = () => {
        setCurrState("Sign up");
        setIsDataSubmitted(false);
        setFullName("");
        setEmail("");
        setPassword("");
        setBio("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center gap-8 sm:justify-evenly max-sm:flex-col px-4 transition-colors duration-300">
            {/* Logo */}
            <img
                src={assets.logo_big}
                alt="App logo"
                className="w-[min(30vw,250px)] max-sm:w-40 drop-shadow-lg"
            />

            {/* Form */}
            <form
                onSubmit={onSubmitHandler}
                className="bg-white/40 dark:bg-slate-900/40 text-slate-800 dark:text-white border border-slate-200/50 dark:border-white/10 p-8 flex flex-col gap-5 rounded-3xl shadow-2xl w-full max-w-sm glass-panel animate-slide-in-up"
            >
                {/* Title row */}
                <h2 className="font-bold text-2xl flex justify-between items-center text-slate-800 dark:text-white">
                    {currState}
                    {isDataSubmitted && (
                        <button
                            type="button"
                            onClick={() => setIsDataSubmitted(false)}
                            aria-label="Go back"
                            className="focus:outline-none cursor-pointer"
                        >
                            <img src={assets.arrow_icon} alt="Back" className="w-5" />
                        </button>
                    )}
                </h2>

                {/* Full name — sign-up step 1 only */}
                {currState === "Sign up" && !isDataSubmitted && (
                    <input
                        type="text"
                        placeholder="Full Name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="p-3 border border-slate-300 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-800/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition"
                    />
                )}

                {/* Email + Password — shown when NOT on bio step */}
                {!isDataSubmitted && (
                    <>
                        <input
                            type="email"
                            placeholder="Email Address"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="p-3 border border-slate-300 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-800/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition"
                        />
                        <input
                            type="password"
                            placeholder="Password (min 6 characters)"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="p-3 border border-slate-300 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-800/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition"
                        />
                    </>
                )}

                {/* Bio — sign-up step 2 only */}
                {currState === "Sign up" && isDataSubmitted && (
                    <textarea
                        placeholder="Write a short bio about yourself..."
                        required
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="p-3 border border-slate-300 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-800/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 resize-none transition"
                    />
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="py-3 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-750 text-white rounded-full cursor-pointer disabled:opacity-60 transition font-bold shadow-md shadow-purple-500/20 active:scale-98"
                >
                    {isLoading
                        ? "Please wait..."
                        : currState === "Sign up"
                        ? isDataSubmitted
                            ? "Create Account"
                            : "Next"
                        : "Login Now"}
                </button>

                {/* Terms */}
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
                    <input type="checkbox" id="terms" className="cursor-pointer" />
                    <label htmlFor="terms" className="cursor-pointer select-none">
                        Agree to terms of use &amp; privacy policy.
                    </label>
                </div>

                {/* Switch between login / sign-up */}
                <div>
                    {currState === "Sign up" ? (
                        <p className="text-sm text-slate-500 dark:text-gray-400">
                            Already have an account?{" "}
                            <button
                                type="button"
                                onClick={switchToLogin}
                                className="font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                            >
                                Login here
                            </button>
                        </p>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-gray-400">
                            Don&apos;t have an account?{" "}
                            <button
                                type="button"
                                onClick={switchToSignup}
                                className="font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                            >
                                Sign up here
                            </button>
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
};

export default LoginPage;

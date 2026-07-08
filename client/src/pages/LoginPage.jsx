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
        <div className="min-h-screen flex items-center justify-center gap-8 sm:justify-evenly max-sm:flex-col">
            {/* Logo */}
            <img
                src={assets.logo_big}
                alt="App logo"
                className="w-[min(30vw,250px)] max-sm:w-40"
            />

            {/* Form */}
            <form
                onSubmit={onSubmitHandler}
                className="border-2 bg-white/8 text-white border-gray-500 p-6 flex flex-col
                gap-5 rounded-lg shadow-lg w-full max-w-sm"
            >
                {/* Title row */}
                <h2 className="font-medium text-2xl flex justify-between items-center">
                    {currState}
                    {isDataSubmitted && (
                        <button
                            type="button"
                            onClick={() => setIsDataSubmitted(false)}
                            aria-label="Go back"
                            className="focus:outline-none"
                        >
                            <img src={assets.arrow_icon} alt="Back" className="w-5 cursor-pointer" />
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
                        className="p-2 border border-gray-500 rounded-md bg-transparent
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white
                        placeholder-gray-400"
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
                            className="p-2 border border-gray-500 rounded-md bg-transparent
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white
                            placeholder-gray-400"
                        />
                        <input
                            type="password"
                            placeholder="Password (min 6 characters)"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="p-2 border border-gray-500 rounded-md bg-transparent
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white
                            placeholder-gray-400"
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
                        className="p-2 border border-gray-500 rounded-md bg-transparent
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white
                        placeholder-gray-400 resize-none"
                    />
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="py-3 bg-gradient-to-r from-purple-400 to-violet-600 text-white
                    rounded-md cursor-pointer disabled:opacity-60 transition font-medium"
                >
                    {isLoading
                        ? "Please wait..."
                        : currState === "Sign up"
                        ? isDataSubmitted
                            ? "Create Account"
                            : "Next"
                        : "Login Now"}
                </button>

                {/* Terms — purely informational, NOT required so it can't block submission */}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" id="terms" />
                    <label htmlFor="terms" className="cursor-pointer">
                        Agree to the terms of use &amp; privacy policy.
                    </label>
                </div>

                {/* Switch between login / sign-up */}
                <div>
                    {currState === "Sign up" ? (
                        <p className="text-sm text-gray-400">
                            Already have an account?{" "}
                            <button
                                type="button"
                                onClick={switchToLogin}
                                className="font-medium text-violet-400 hover:underline"
                            >
                                Login here
                            </button>
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400">
                            Don&apos;t have an account?{" "}
                            <button
                                type="button"
                                onClick={switchToSignup}
                                className="font-medium text-violet-400 hover:underline"
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

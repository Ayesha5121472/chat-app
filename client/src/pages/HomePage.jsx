import { useContext } from "react";
import { ChatContext } from "../../context/ChatContext";
import ChatContainer from "../components/ChatContainer";
import RightSideBar from "../components/RightSideBar";
import SideBar from "../components/SideBar";

const HomePage = () => {
    const { selectedUser } = useContext(ChatContext);

    return (
        <div className="w-full h-screen sm:py-[5%] sm:px-[3%]">
            <div
                className={`backdrop-blur-xl border-2 border-slate-200 dark:border-gray-600 rounded-2xl shadow-xl dark:shadow-none
                h-full grid grid-cols-1 overflow-hidden ${
                    selectedUser
                        ? "md:grid-cols-[1fr_1.5fr_1fr] xl:grid-cols-[1fr_2fr_1fr]"
                        : "md:grid-cols-[1fr_1fr]"
                }`}
            >
                {/* On mobile, hide SideBar if a user is selected */}
                <div className={`min-h-0 h-full overflow-hidden ${selectedUser ? "hidden md:block" : "block"}`}>
                    <SideBar />
                </div>
                
                {/* On mobile, hide ChatContainer if NO user is selected */}
                <div className={`min-h-0 h-full overflow-hidden ${!selectedUser ? "hidden md:block" : "block"}`}>
                    <ChatContainer />
                </div>

                {/* Right sidebar only on large screens */}
                {selectedUser && (
                    <div className="min-h-0 h-full overflow-hidden hidden lg:block">
                        <RightSideBar />
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;

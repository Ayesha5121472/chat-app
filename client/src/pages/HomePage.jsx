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
                className={`backdrop-blur-xl border-2 border-gray-600 rounded-2xl overflow-hidden
                h-full grid grid-cols-1 ${
                    selectedUser
                        ? "md:grid-cols-[1fr_1.5fr_1fr] xl:grid-cols-[1fr_2fr_1fr]"
                        : "md:grid-cols-[1fr_1fr]"
                }`}
            >
                <SideBar />
                <ChatContainer />
                {/* RightSideBar handles its own visibility via null return */}
                <RightSideBar />
            </div>
        </div>
    );
};

export default HomePage;

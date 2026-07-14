import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { 
    getMessages, 
    getUsersForSidebar, 
    markMessageAsSeen, 
    sendMessage,
    addReaction,
    editMessage,
    deleteMessage
} from "../controllers/messageController.js";
const messageRouter= express.Router();


messageRouter.get("/users", protectRoute, getUsersForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen); 
messageRouter.post("/send/:id", protectRoute, sendMessage);
messageRouter.post("/react/:id", protectRoute, addReaction);
messageRouter.put("/edit/:id", protectRoute, editMessage);
messageRouter.delete("/delete/:id", protectRoute, deleteMessage);


export default messageRouter;


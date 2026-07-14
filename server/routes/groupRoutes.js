import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
    createGroup,
    getMyGroups,
    joinGroup,
    leaveGroup,
    deleteGroup,
    addGroupMember,
    removeGroupMember,
} from "../controllers/groupController.js";

const groupRouter = express.Router();

groupRouter.post("/", protectRoute, createGroup);
groupRouter.get("/my-groups", protectRoute, getMyGroups);
groupRouter.post("/join/:groupId", protectRoute, joinGroup);
groupRouter.post("/leave/:groupId", protectRoute, leaveGroup);
groupRouter.delete("/:groupId", protectRoute, deleteGroup);
groupRouter.post("/add-member/:groupId", protectRoute, addGroupMember);
groupRouter.delete("/remove-member/:groupId/:userId", protectRoute, removeGroupMember);

export default groupRouter;

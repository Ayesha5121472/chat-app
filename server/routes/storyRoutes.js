import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
    createStory,
    getStories,
    deleteStory,
    markStoryViewed,
} from "../controllers/storyController.js";

const storyRouter = express.Router();

storyRouter.post("/", protectRoute, createStory);
storyRouter.get("/", protectRoute, getStories);
storyRouter.post("/view/:storyId", protectRoute, markStoryViewed);
storyRouter.delete("/:storyId", protectRoute, deleteStory);

export default storyRouter;

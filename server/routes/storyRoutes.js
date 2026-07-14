import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
    createStory,
    getStories,
    deleteStory,
} from "../controllers/storyController.js";

const storyRouter = express.Router();

storyRouter.post("/", protectRoute, createStory);
storyRouter.get("/", protectRoute, getStories);
storyRouter.delete("/:storyId", protectRoute, deleteStory);

export default storyRouter;

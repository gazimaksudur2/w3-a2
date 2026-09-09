import { Router } from "express";
import { getImagesList } from "../controllers/images.controller.js";

const router = Router();

router.get("/images", getImagesList);

export default router;

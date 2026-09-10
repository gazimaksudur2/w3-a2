import { Router } from "express";
import { getMapsConfig } from "../controllers/maps.controller.js";

const router = Router();

router.get("/maps-config", getMapsConfig);

export default router;

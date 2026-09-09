import { Router } from "express";
import { getProperty } from "../controllers/property.controller.js";

const router = Router();

router.get("/get-property", getProperty);

export default router;

import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { contentRouter } from "./routes/content.js";
import { submitRouter } from "./routes/submit.js";
import { meRouter } from "./routes/me.js";
import { adminRouter } from "./routes/admin.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/", contentRouter);
app.use("/", submitRouter);
app.use("/", meRouter);
app.use("/admin", adminRouter);

const port = Number(process.env.API_PORT || 4000);
app.listen(port, () => console.log(`api listening on :${port}`));

import express from "express";
import cors from 'cors';
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import employeeRoutes from './routes/employeeRoutes.js';
import attendenceRoutes from './routes/attendenceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import leaveRoutes from "./routes/leaveRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import profileRoutes from "./routes/profile/profileRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";
import budgetRoutes from "./routes/FinanceRoutes/budgetRoutes.js";
import expensesRoutes from "./routes/FinanceRoutes/expensesRoutes.js";
import financeDashboardRoutes from "./routes/FinanceRoutes/financeDashboardRoutes.js";
import invoiceRoutes from "./routes/FinanceRoutes/invoiceRoutes.js";
import designationRoutes from "./routes/designationRoutes.js";
import ceoDashboardRoutes from "./routes/ceoDashboardRoutes.js";
import techDashboardRoutes from "./routes/techDashboardRoutes.js";

const app = express();

// 1. NEW: must be right after creating app, before everything else
app.set("trust proxy", 1);

// 2. CHANGED: allow both local dev and your deployed frontend
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://noteswift-beta-frontend.onrender.com",
        ],
        credentials: true,
    })
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));
app.use(cookieParser());

// 3. NEW: test route, remove later
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/attendence", attendenceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ceo", ceoDashboardRoutes);
app.use("/api/tech", techDashboardRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/finance/budgets", budgetRoutes);
app.use("/api/finance/budget", budgetRoutes);
app.use("/api/finance/expenses", expensesRoutes);
app.use("/api/finance/invoices", invoiceRoutes);
app.use("/api/finance/dashboard", financeDashboardRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/designation", designationRoutes);

export default app;

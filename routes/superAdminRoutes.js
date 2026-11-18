const express = require("express");
const router = express.Router();

const authController = require("../controllers/super_admin/authController");
const companyController = require("../controllers/super_admin/companyController");
const dashboardController = require("../controllers/super_admin/dashboardController");

// Public route: Super Admin Login
router.post("/login", authController.login);

// Protected routes (Super Admin token required)
router.use(authController.verifySuperAdmin);

// Dashboard stats
router.get("/dashboard", dashboardController.getStats);

// Companies management
router.get("/companies", companyController.listCompanies);
router.post("/companies", companyController.createCompany);
router.put("/companies/:id/status", companyController.toggleStatus);
router.put("/companies/:id/subscription", companyController.updateSubscription);

module.exports = router;

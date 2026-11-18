apiRoutes = express.Router();
/*
 * Including controllers
 */
loginController =
  module.exports = require("./../controllers/api/loginController");
tarshaloginController =
  module.exports = require("../controllers/tarsha/tarhsaloginController");
companyController =
  module.exports = require("./../controllers/tarsha/companyController");
usersController =
  module.exports = require("./../controllers/api/usersController");
employeeController =
  module.exports = require("./../controllers/api/employeeController");
customerController =
  module.exports = require("./../controllers/api/customerController");
constantController =
  module.exports = require("./../controllers/api/constantController");
file_expenseController =
  module.exports = require("./../controllers/api/file_expenseController");
office_expenseController =
  module.exports = require("./../controllers/api/office_expenseController");
documentMasterController =
  module.exports = require("./../controllers/api/documentMasterController");
// fileDetailController = module.exports = require("./../controllers/api/fileDetailController");
UtilsController =
  module.exports = require("../controllers/api/UtilsController");
const allImportantFeesController = require("../controllers/api/allImportantFeesController");
const aminitiesController = require("../controllers/api/aminitiesController");
const approvedPlanController = require("../controllers/api/approvedPlanController");
const approvedPlanPdfController = require("../controllers/api/approvedPlanPdfController");
const buildingController = require("../controllers/api/buildingController");
const dashboardController = require("../controllers/api/dashboardController");
const documentUploadController = require("../controllers/api/documentUploadController");
const enagarportalController = require("../controllers/api/enagarportalController");
const expenseController = require("../controllers/api/expenseController");
const fileApprovedRejectController = require("../controllers/api/fileApprovedRejectController");
const fileQueryController = require("../controllers/api/fileQueryController");
const inaugurationController = require("../controllers/api/inaugurationController");
const LeaveController = require("../controllers/api/LeaveController");
const notificationController = require("../controllers/api/notificationController");
const plotValidationController = require("../controllers/api/plotValidationController");
const projectController = require("../controllers/api/projectController");
const roadScrunityController = require("../controllers/api/roadScrunityController");
const searchController = require("../controllers/api/searchController");
const siteConditionController = require("../controllers/api/siteConditionController");
const tentativePdfController = require("../controllers/api/tentativePdfController");
const todosController = require("../controllers/api/todosController");
const workFeeController = require("../controllers/api/workFeeController");
const siteinspectionController = require("../controllers/api/siteinspectionController");
const mobileController = require("../controllers/api/mobileController");
const architectureController = require("../controllers/api/architectureController");
const villageController = require("../controllers/api/villageController");
const TpschemeController = require("../controllers/api/TpschemeController");
const NewFileController = require("../controllers/api/new_file_controller");
const DocumentClearanceController = require("../controllers/api/documentClearanceController");
const PVController = require("../controllers/api/pvController");
const FireNOCController = require("../controllers/api/fireNocController");
const ENagarinputoutController = require("../controllers/api/enagarPortalinoutController");
const BuildingPermissionController = require("../controllers/api/buildingpermissionController");
const MeetingController = require("../controllers/api/meetingController");
const interiorController = require("../controllers/api/interiorController");
const inwardController = require("../controllers/api/inwardController");
const campaignController = require("../controllers/api/campaignController");
const paymentController = require("../controllers/api/paymentController");
const vendorController = require("../controllers/api/vendorController");
const pmsController = require("../controllers/api/pmsController");
const cityController = require("../controllers/api/cityController");
const { userRoles } = require("../helpers/constants");
const { jwtVerify, jwtVerifyWithRoles } = require("../models/VerifyToken");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let minetype = file.mimetype;
    let res = minetype.split("/");
    if (res[0] === "video") {
      cb(null, "uploads/videos/");
    } else {
      cb(null, "uploads/");
    }
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + Date.now() + ext);
  },
});
var upload = multer({ storage: storage });

var fields = [
  { name: "post_thumbnail", maxCount: 1 },
  { name: "gif_file", maxCount: 1 },
  { name: "post_file", maxCount: 1 },
];

const { file_upload } = require("../services/FileService");
const { sendEmail } = require("../services/MailService");
const { sendMessageToClient } = require("./../controllers/api/fileController");
const fileController = require("./../controllers/api/fileController");
const fileDetailController = require("./../controllers/api/fileDetailController");
// const employeeController = require('./../controllers/api/employeeController');
const mdl_common = require("./../models/mdl_common");
const tarhsaloginController = require("../controllers/tarsha/tarhsaloginController");
const _upload = file_upload;

apiRoutes.get("/test", (req, res) => {
  res.status(200).json({ message: "Hello" });
});

/*User Route*/
apiRoutes.post("/register", loginController.signup);
apiRoutes.post("/comapany-login", loginController.login);
apiRoutes.post("/login", loginController.login);
apiRoutes.post(
  "/users/changePassword",
  mdl_common.verifytoken,
  usersController.changePassword,
);
apiRoutes.post("/users/update", mdl_common.verifytoken, usersController.update);
apiRoutes.post(
  "/users/accountDelete",
  mdl_common.verifytoken,
  usersController.findByIdAndDelete,
);
apiRoutes.post(
  "/users/searchUsers",
  mdl_common.verifytoken,
  usersController.searchUsers,
);

apiRoutes.get("/getAllCountries", loginController.getAllcountries);
apiRoutes.post("/getAllState", loginController.getAllstates);
apiRoutes.post("/getAllCities", loginController.getAllcities);

//dashboard
apiRoutes.post(
  "/getTotalEmployee",
  jwtVerify,
  dashboardController.getTotalEmployee,
);
apiRoutes.post("/getTotalFiles", jwtVerify, dashboardController.getTotalFiles);
apiRoutes.post(
  "/getTotalCustomer",
  jwtVerify,
  dashboardController.getTotalCustomer,
);

apiRoutes.get(
  "/getDashboardInfo",
  jwtVerifyWithRoles([userRoles.admin_key, userRoles.subadmin]),
  dashboardController.getDashboardInfo,
);
apiRoutes.get(
  "/getDashboardInfo-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  dashboardController.getDashboardInfoForTeam,
);

apiRoutes.get(
  "/fetchsourcebyclient",
  jwtVerifyWithRoles([userRoles.admin_key, userRoles.subadmin]),
  dashboardController.getTotalSoucebyClient,
);

apiRoutes.get(
  "/getNotification",
  jwtVerify,
  dashboardController.getNotificationByAssignId,
);

//Employee
apiRoutes.post(
  "/employee/getEmployee",
  jwtVerify,
  employeeController.getEmployee,
);
apiRoutes.get(
  "/employee/getActiveEmployee",
  jwtVerify,
  employeeController.getActiveEmployee,
);
apiRoutes.get("/fetchHod", jwtVerify, employeeController.fetchHod);
apiRoutes.post(
  "/employee/add/:foldername",
  jwtVerify,
  _upload.any(),
  employeeController.add,
);
apiRoutes.post(
  "/employee/update/:foldername",
  jwtVerify,
  _upload.any(),
  employeeController.update,
);
apiRoutes.post(
  "/employee/delete",
  jwtVerifyWithRoles([userRoles.admin_key]),
  employeeController.delete,
);
apiRoutes.get("/employee/:id", jwtVerify, employeeController.getEmployeeById);

apiRoutes.post(
  "/employee/addShifts",
  jwtVerifyWithRoles([userRoles.admin_key]),
  employeeController.addShifts,
);
apiRoutes.get("/getShiftList", jwtVerify, employeeController.getShiftList);
apiRoutes.get("/getShiftbyid/:id", jwtVerify, employeeController.getShiftbyid);
apiRoutes.post("/delete-shift", jwtVerify, employeeController.deleteShifts);
apiRoutes.post(
  "/employee/updateShifts",
  jwtVerify,
  employeeController.updateShifts,
);

//Customer
// apiRoutes.post('/customer/getCustomers',jwtVerifyWithRoles([userRoles.admin_key]),customerController.getCustomers);
apiRoutes.post(
  "/customer/getCustomers",
  jwtVerify,
  customerController.getCustomers,
);

apiRoutes.post(
  "/customer/add/:foldername",
  jwtVerifyWithRoles([userRoles.admin_key]),
  _upload.single("profile_picture"),
  customerController.add,
);

apiRoutes.post(
  "/customer/addClient",
  jwtVerifyWithRoles([userRoles.admin_key]),
  customerController.addClient,
);
apiRoutes.post(
  "/customer/update/:foldername",
  jwtVerifyWithRoles([userRoles.admin_key]),
  _upload.single("profile_picture"),
  customerController.update,
);
apiRoutes.post(
  "/customer/update",
  jwtVerifyWithRoles([userRoles.admin_key]),
  customerController.updateClient,
);
apiRoutes.post(
  "/customer/delete",
  jwtVerifyWithRoles([userRoles.admin_key]),
  customerController.delete,
);
apiRoutes.get(
  "/customer/:id",
  jwtVerifyWithRoles([userRoles.admin_key]),
  customerController.getCustomerById,
);

// meetings
apiRoutes.post(
  "/meeting/add",
  jwtVerifyWithRoles([userRoles.admin_key]),
  MeetingController.add,
);
apiRoutes.get(
  "/fetchAlldepartment",
  jwtVerify,
  MeetingController.getAllDepartment,
);
apiRoutes.get(
  "/userInformtion/:id",
  jwtVerify,
  MeetingController.getUserInformation,
);

apiRoutes.get(
  "/fetchoperationalmeeting",
  jwtVerify,
  MeetingController.getAllOperationalmeeting,
);
apiRoutes.get(
  "/fetchempopMeeting",
  jwtVerify,
  MeetingController.getEmpOpMeeting,
);
apiRoutes.get(
  "/fetchempstrategicMeeting",
  jwtVerify,
  MeetingController.getEmpstrategicMeeting,
);

apiRoutes.get(
  "/fetchemptacticalmeeting",
  jwtVerify,
  MeetingController.getEmpTacticalMeeting,
);

apiRoutes.get(
  "/fetchhodtacticalmeeting",
  jwtVerify,
  MeetingController.getHodTacticalMeeting,
);

apiRoutes.get(
  "/fetchhodstrategicmeeting",
  jwtVerify,
  MeetingController.getHodStrategicMeeting,
);
apiRoutes.get(
  "/fetchTeamOpMeeting/:id",
  jwtVerify,
  MeetingController.fetchTeamOpMeeting,
);
apiRoutes.get(
  "/fetchhodopMeeting",
  jwtVerify,
  MeetingController.getHodOpMeeting,
);
apiRoutes.get(
  "/fetchtacticalmeetingbyid/:id",
  jwtVerify,
  MeetingController.getTacticalmeetingbyid,
);

apiRoutes.get(
  "/fetchstrategicmeetingbyid/:id",
  jwtVerify,
  MeetingController.getStrategicmeetingbyid,
);

apiRoutes.get(
  "/getdepartmentshowbyuserid",
  jwtVerify,
  MeetingController.getdepartmentshowbyuserid,
);

apiRoutes.get(
  "/fetchopfillbyid/:id",
  jwtVerify,
  MeetingController.getopfillbyid,
);
apiRoutes.get(
  "/fetchTaskpercent/:id",
  jwtVerify,
  MeetingController.getTaskPercentages,
);
apiRoutes.get(
  "/fetchTaskpercentbyteamId/:id",
  jwtVerify,
  MeetingController.getTaskPercentageForTeamId,
);
apiRoutes.post(
  "/operationalmeeting/update",
  jwtVerify,
  MeetingController.operationalmeetingupdate,
);
apiRoutes.post("/meetingtask/add", jwtVerify, MeetingController.addTask);
apiRoutes.get(
  "/meetingtask/subfunction-limits",
  jwtVerify,
  MeetingController.getSubFunctionLimits,
);
apiRoutes.post(
  "/meetingtask/subfunction-limits",
  jwtVerify,
  MeetingController.getSubFunctionLimits,
);
apiRoutes.get("/get-todo-by-id/:id", jwtVerify, MeetingController.getTodoById);
apiRoutes.post("/meetingtask/update", jwtVerify, MeetingController.updateTask);
apiRoutes.post(
  "/updateStatusmeeting",
  jwtVerify,
  MeetingController.updateStatus,
);
apiRoutes.get(
  "/fetchtaskById/:id",
  jwtVerify,
  MeetingController.getTaskTeamById,
);
apiRoutes.get(
  "/fetchtaskforteamid/:id",
  jwtVerify,
  MeetingController.gettaskByTeamid,
);

apiRoutes.post(
  "/performance/update",
  jwtVerify,
  MeetingController.updatePerformance,
);
apiRoutes.post(
  "/tactical-performance/update",
  jwtVerify,
  MeetingController.updateTacticalPerformance,
);

apiRoutes.post(
  "/strategic-performance/update",
  jwtVerify,
  MeetingController.updateStrategicPerformance,
);

apiRoutes.post(
  "/mst-meeting/update",
  jwtVerify,
  MeetingController.updatemstMeeting,
);

apiRoutes.post(
  "/strategic-marks/update",
  jwtVerify,
  MeetingController.updateMarks,
);

apiRoutes.post(
  "/clarityFocus/update",
  jwtVerify,
  MeetingController.updateClarityFocus,
);

apiRoutes.post(
  "/gererateoperatingMeeting",
  jwtVerify,
  MeetingController.generateOperatingMeeting,
);

apiRoutes.post(
  "/gererateTacticalMeeting",
  jwtVerify,
  MeetingController.generateTacticalMeeting,
);

apiRoutes.post(
  "/generateStrategicMeeting",
  jwtVerify,
  MeetingController.generateStrategicMeeting,
);
apiRoutes.get(
  "/fetchPerformancebyUserId/:id",
  jwtVerify,
  MeetingController.getPerformancebyUserId,
);

apiRoutes.get(
  "/fetchperformanceTaskbyid/:id",
  jwtVerify,
  MeetingController.getperformanceTaskbyid,
);
apiRoutes.get(
  "/getperformanceTaskpercentagebyid/:id",
  jwtVerify,
  MeetingController.getperformanceTaskpercentagebyid,
);

apiRoutes.get(
  "/getTacticalperformacepercentagebyuserid/:id",
  jwtVerify,
  MeetingController.getTacticalperformacepercentagebyuserid,
);

apiRoutes.get(
  "/getstrategicperformacepercentagebyuserid/:id",
  jwtVerify,
  MeetingController.getstrategicperformacepercentagebyuserid,
);

apiRoutes.get(
  "/getLeaveApprovedbyid/:id",
  jwtVerify,
  MeetingController.getLeaveApprovedbyid,
);

apiRoutes.get(
  "/fetchdocumentbyid/:id",
  jwtVerify,
  MeetingController.fetchdocumentbyid,
);
apiRoutes.delete(
  "/remove-adharcard/:id",
  jwtVerify,
  MeetingController.deleteAdharcard,
);
apiRoutes.delete(
  "/remove-graduation/:id",
  jwtVerify,
  MeetingController.deleteGraduation,
);
apiRoutes.delete(
  "/remove-offerletter/:id",
  jwtVerify,
  MeetingController.deleteOfferletter,
);
apiRoutes.delete(
  "/remove-bondagreement/:id",
  jwtVerify,
  MeetingController.deletebondAgreement,
);
apiRoutes.delete(
  "/remove-signature/:id",
  jwtVerify,
  MeetingController.deleteSignature,
);
apiRoutes.get(
  "/fetchParticipantsbyid/:id",
  jwtVerify,
  MeetingController.getparticipantsbyid,
);

apiRoutes.get(
  "/fetchTacticalParticipantsbyid/:date/:department?",
  jwtVerify,
  MeetingController.getTacticalparticipantsbyid,
);

apiRoutes.get(
  "/fetchstrategicParticipantsbyid/:date/:department?",
  jwtVerify,
  MeetingController.getStrategicparticipantsbyid,
);

apiRoutes.get(
  "/FetchTopPerformer",
  jwtVerify,
  MeetingController.FetchTopPerformer,
);

apiRoutes.get("/fetchmstMeeting", jwtVerify, MeetingController.fetchmstMeeting);
apiRoutes.get(
  "/getTacticalparticipantsbyuserid/:id",
  jwtVerify,
  MeetingController.getTacticalparticipantsbyuserid,
);

apiRoutes.get(
  "/getStrategicparticipantsbyuserid/:id",
  jwtVerify,
  MeetingController.getStrategicparticipantsbyuserid,
);
apiRoutes.get(
  "/fetchAllAttendanced",
  jwtVerify,
  MeetingController.getAllattendance,
);

apiRoutes.get(
  "/getLiveLocation/:date",
  jwtVerify,
  MeetingController.getLivelocation,
);

apiRoutes.post("/ApprovedLeave", jwtVerify, MeetingController.ApprovedLeave);

apiRoutes.get("/fetchAllLeave", jwtVerify, MeetingController.fetchAllLeave);

apiRoutes.get(
  "/getTacticalDates",
  jwtVerify,
  MeetingController.getTacticalDates,
);
apiRoutes.get(
  "/getStrategicDates",
  jwtVerify,
  MeetingController.getStrategicDates,
);

apiRoutes.get(
  "/fetchPerformancebyid/:id",
  jwtVerify,
  MeetingController.getPerformancebyId,
);

apiRoutes.get(
  "/getClarityFocusbyId/:id",
  jwtVerify,
  MeetingController.getClarityFocusbyId,
);

apiRoutes.get(
  "/getTacticaloutecomebyid/:id",
  jwtVerify,
  MeetingController.getTacticaloutecomebyid,
);

apiRoutes.get(
  "/getstrategicoutecomebyid/:id",
  jwtVerify,
  MeetingController.getstrategicoutecomebyid,
);

apiRoutes.get("/getmarksbyid/:id", jwtVerify, MeetingController.getmarksbyid);
apiRoutes.get(
  "/getmstmeetingbyid/:id",
  jwtVerify,
  MeetingController.getmstmeetingbyid,
);
apiRoutes.get(
  "/fetchtaskperformancelistbyid/:id",
  jwtVerify,
  MeetingController.fetchtaskperformancelistbyid,
);

apiRoutes.get("/fetchallStage", jwtVerify, MeetingController.getStage);

apiRoutes.get("/fetchallproject", jwtVerify, MeetingController.getProject);

apiRoutes.get(
  "/fetchtaskforAdmin",
  jwtVerify,
  MeetingController.fetchtaskforAdmin,
);

apiRoutes.get(
  "/fetchdashboardtaskforAdmin",
  jwtVerify,
  MeetingController.fetchdashboardtaskforAdmin,
);

apiRoutes.get(
  "/fetchtaskforteam",
  jwtVerify,
  MeetingController.fetchtaskforteam,
);
apiRoutes.get(
  "/fetchTeamTaskbyId/:id",
  jwtVerify,
  MeetingController.fetchTeamTaskbyId,
);

apiRoutes.get(
  "/AttendanceforTeamid/:id",
  jwtVerify,
  MeetingController.AttendanceforTeamid,
);

apiRoutes.get(
  "/fetchtaskforteamforreport/:id",
  jwtVerify,
  MeetingController.fetchtaskforteamforreport,
);

apiRoutes.get(
  "/fetchtaskforstrategic/:id",
  jwtVerify,
  MeetingController.fetchtaskforstrategic,
);

apiRoutes.get("/getTaskForHod", jwtVerify, MeetingController.getTaskForHod);

apiRoutes.get(
  "/fetchcounterDataById/:id",
  jwtVerify,
  MeetingController.getTaskCounterDataId,
);

apiRoutes.get(
  "/getapplicationName/:id",
  jwtVerify,
  MeetingController.getapplicationName,
);
apiRoutes.get(
  "/getoperationViewbyid/:id/:date/:department?",
  jwtVerify,
  MeetingController.getoperationViewbyid,
);

apiRoutes.get(
  "/workflow/meeting-clarity",
  jwtVerify,
  MeetingController.getWorkflowMeetingClarity,
);

apiRoutes.get(
  "/workflow/team-members",
  jwtVerify,
  MeetingController.getWorkflowTeamMembers,
);

apiRoutes.get(
  "/getTaskPercentage/:id",
  jwtVerify,
  MeetingController.getTaskPercentage,
);

apiRoutes.get("/fetchProjectdata", jwtVerify, MeetingController.getProjectdata);

apiRoutes.get(
  "/gettotaldepartment",
  jwtVerify,
  MeetingController.gettotaldepartment,
);

apiRoutes.get(
  "/getStrategicmeetingPercentage/:id",
  jwtVerify,
  MeetingController.getStrategicmeetingPercentage,
);
apiRoutes.post(
  "/delete-task/:id",
  jwtVerifyWithRoles([userRoles.admin_key]),
  MeetingController.deleteTask,
);

apiRoutes.post("/verifiedTask/:id", jwtVerify, MeetingController.verifiedTask);

apiRoutes.post(
  "/update-taskcheckox",
  jwtVerify,
  MeetingController.checktaskbyclickCheckbox,
);

// tactical

apiRoutes.get(
  "/fetchtacticalmeeting",
  jwtVerify,
  MeetingController.getTacticalmeeting,
);

apiRoutes.get(
  "/fetchstrategicmeeting",
  jwtVerify,
  MeetingController.getStrategicmeeting,
);

apiRoutes.get("/fetchAllemp", jwtVerify, MeetingController.fetchAllemp);
apiRoutes.post(
  "/meeting/addtactical",
  jwtVerifyWithRoles([userRoles.admin_key]),
  MeetingController.addTactical,
);

apiRoutes.post(
  "/add_update-document/:foldername",
  jwtVerify,
  _upload.any(),
  MeetingController.addDocumentforTeam,
);

apiRoutes.get(
  "/fetchdashboardData",
  jwtVerify,
  MeetingController.fetchdashboardData,
);

apiRoutes.get("/fetchHolidays", jwtVerify, MeetingController.fetchHolidays);
// village
apiRoutes.post(
  "/village/add",
  jwtVerifyWithRoles([userRoles.admin_key]),
  villageController.add,
);
apiRoutes.post(
  "/village/update",
  jwtVerifyWithRoles([userRoles.admin_key]),
  villageController.update,
);

apiRoutes.get("/getvillage", jwtVerify, villageController.getVillage);
apiRoutes.get(
  "/villagebyid/:id",
  jwtVerifyWithRoles([userRoles.admin_key]),
  villageController.getVillageById,
);

apiRoutes.post(
  "/delete-village",
  jwtVerifyWithRoles([userRoles.admin_key]),
  villageController.deleteVillage,
);

// city

apiRoutes.post(
  "/city/add",
  jwtVerifyWithRoles([userRoles.admin_key]),
  cityController.add,
);
apiRoutes.post(
  "/city/update",
  jwtVerifyWithRoles([userRoles.admin_key]),
  cityController.update,
);

apiRoutes.get("/getcity", jwtVerify, cityController.getCity);
apiRoutes.get(
  "/citybyid/:id",
  jwtVerifyWithRoles([userRoles.admin_key]),
  cityController.getCityById,
);

apiRoutes.post(
  "/delete-city",
  jwtVerifyWithRoles([userRoles.admin_key]),
  cityController.deleteCity,
);

// payments

apiRoutes.post(
  "/paymentcategory/addcategory",
  jwtVerify,
  paymentController.addcategory,
);
apiRoutes.post(
  "/paymentcategory/update/:id",
  jwtVerify,
  paymentController.editcategory,
);

apiRoutes.get(
  "/getPaymentcategory",
  jwtVerify,
  paymentController.getPaymentcategory,
);
apiRoutes.get(
  "/getcategorybyid/:id",
  jwtVerify,
  paymentController.getcategorybyid,
);

apiRoutes.post(
  "/delete-payment-category",
  jwtVerify,
  paymentController.deletecategory,
);

apiRoutes.post("/insertPayment", jwtVerify, paymentController.insertPayment);
apiRoutes.get("/getPayments", jwtVerify, paymentController.getPayments);
apiRoutes.get(
  "/getPaymentById/:id",
  jwtVerify,
  paymentController.getPaymentById,
);
apiRoutes.post("/updatePayment", jwtVerify, paymentController.updatePayment);
apiRoutes.post("/deletePayment", jwtVerify, paymentController.deletePayment);

// ledger
apiRoutes.get("/getledgergroup", jwtVerify, paymentController.GetLedgerGroup);

apiRoutes.get("/getLedgers", jwtVerify, paymentController.getLedgers);
apiRoutes.get(
  "/getledgersbyid/:id",
  jwtVerify,
  paymentController.getledgersbyid,
);

apiRoutes.post("/ledgers/addledger", jwtVerify, paymentController.addledger);
apiRoutes.post(
  "/ledgers/updateLedger",
  jwtVerify,
  paymentController.updateLedger,
);

apiRoutes.post("/delete-ledger", jwtVerify, paymentController.deleteledgers);

apiRoutes.get("/getReceiptfile", jwtVerify, paymentController.getReceiptfile);

apiRoutes.get("/getReceipts", jwtVerify, paymentController.getReceipts);

apiRoutes.get(
  "/getReceiptsById/:id",
  jwtVerify,
  paymentController.getReceiptsById,
);
apiRoutes.post(
  "/addReceipt/:foldername",
  jwtVerify,
  _upload.any(),
  paymentController.addReceipt,
);
apiRoutes.post(
  "/updateReceipt/:foldername",
  jwtVerify,
  _upload.any(),
  paymentController.updateReceipt,
);

apiRoutes.post("/deleteReceipt", jwtVerify, paymentController.deleteReceipt);

apiRoutes.get(
  "/getPaymentExpenses",
  jwtVerify,
  paymentController.getPaymentExpenses,
);

apiRoutes.get(
  "/getPaymentExpesesById/:id",
  jwtVerify,
  paymentController.getPaymentExpesesById,
);

apiRoutes.post(
  "/deletePaymentExpenses",
  jwtVerify,
  paymentController.deletePaymentExpenses,
);

apiRoutes.post(
  "/addPaymentExpense/:foldername",
  jwtVerify,
  _upload.any(),
  paymentController.addPaymentExpense,
);
apiRoutes.post(
  "/updatePaymentExpense/:foldername",
  jwtVerify,
  _upload.any(),
  paymentController.updatePaymentExpense,
);

apiRoutes.get(
  "/getIncomeLedgers",
  jwtVerify,
  paymentController.getIncomeLedgers,
);
apiRoutes.get(
  "/getExpenseLedgers",
  jwtVerify,
  paymentController.getExpenseLedgers,
);

apiRoutes.get(
  "/getMonthlyReport",
  jwtVerify,
  paymentController.getMonthlyReport,
);
apiRoutes.get(
  "/getProjectReport",
  jwtVerify,
  paymentController.getProjectReport,
);
apiRoutes.get("/getLedgerReport", jwtVerify, paymentController.getLedgerReport);

apiRoutes.get(
  "/getProjectReportDetail",
  jwtVerify,
  paymentController.getProjectReportDetail,
);
apiRoutes.get(
  "/getLedgerReportDetail",
  jwtVerify,
  paymentController.getLedgerReportDetail,
);
apiRoutes.get(
  "/getMonthlyReportDetail",
  jwtVerify,
  paymentController.getMonthlyReportDetail,
);

// // escrow income
apiRoutes.get("/getEscrowIncome", jwtVerify, paymentController.getEscrowIncome);
apiRoutes.get(
  "/getEscrowIncomeById/:id",
  jwtVerify,
  paymentController.getEscrowIncomeById,
);
apiRoutes.post(
  "/addEscrowIncome",
  jwtVerify,
  paymentController.addEscrowIncome,
);
apiRoutes.post(
  "/updateEscrowIncome",
  jwtVerify,
  paymentController.updateEscrowIncome,
);
apiRoutes.post(
  "/deleteEscrowIncome",
  jwtVerify,
  paymentController.deleteEscrowIncome,
);

// escrow expense
apiRoutes.get(
  "/getEscrowExpenses",
  jwtVerify,
  paymentController.getEscrowExpenses,
);
apiRoutes.get(
  "/getEscrowExpensesById/:id",
  jwtVerify,
  paymentController.getEscrowExpensesById,
);
apiRoutes.post(
  "/addEscrowExpense/:foldername",
  jwtVerify,
  _upload.any(),
  paymentController.addEscrowExpense,
);
apiRoutes.post(
  "/updateEscrowExpenses/:foldername",
  jwtVerify,
  _upload.any(),
  paymentController.updateEscrowExpenses,
);

apiRoutes.post(
  "/deleteEscrowExpenses",
  jwtVerify,
  paymentController.deleteEscrowExpenses,
);

apiRoutes.get(
  "/getEscrowMonthlyReportDetail",
  jwtVerify,
  paymentController.getEscrowMonthlyReportDetail,
);

apiRoutes.get(
  "/getEscrowLedgerReportDetail",
  jwtVerify,
  paymentController.getEscrowLedgerReportDetail,
);

apiRoutes.get(
  "/getEscrowProjectReportDetail",
  jwtVerify,
  paymentController.getEscrowProjectReportDetail,
);

apiRoutes.get(
  "/getEscrowMonthlyReport",
  jwtVerify,
  paymentController.getEscrowMonthlyReport,
);

apiRoutes.get(
  "/getEscrowProjectReport",
  jwtVerify,
  paymentController.getEscrowProjectReport,
);

apiRoutes.get(
  "/getEscrowLedgerReport",
  jwtVerify,
  paymentController.getEscrowLedgerReport,
);

// vendor
apiRoutes.post(
  "/vendor/add",
  jwtVerifyWithRoles([userRoles.admin_key]),
  vendorController.add,
);
apiRoutes.post(
  "/vendor/update",
  jwtVerifyWithRoles([userRoles.admin_key]),
  vendorController.update,
);

apiRoutes.get("/getVendors", jwtVerify, vendorController.getVendors);
apiRoutes.get(
  "/vendorsbyid/:id",
  jwtVerifyWithRoles([userRoles.admin_key]),
  vendorController.getVendorsById,
);

apiRoutes.post(
  "/delete-vendor",
  jwtVerifyWithRoles([userRoles.admin_key]),
  vendorController.deleteVendor,
);

// pms

// vendor
apiRoutes.post("/pms/add", jwtVerify, pmsController.add);
apiRoutes.post("/pms/update", jwtVerify, pmsController.update);

apiRoutes.get("/getpms", jwtVerify, pmsController.getPms);
apiRoutes.get("/pmsbyid/:id", jwtVerify, pmsController.getPmsById);

apiRoutes.get("/getPmstaskById/:id", jwtVerify, pmsController.getPmstaskById);
apiRoutes.get("/getEmpPms", jwtVerify, pmsController.getEmpPms);

apiRoutes.post("/delete-pms/:id", jwtVerify, pmsController.deletePms);

// Tpsheme
apiRoutes.post(
  "/tpscheme/add",
  jwtVerifyWithRoles([userRoles.admin_key]),
  TpschemeController.add,
);
apiRoutes.post(
  "/tpscheme/update",
  jwtVerifyWithRoles([userRoles.admin_key]),
  TpschemeController.update,
);

apiRoutes.get("/gettpscheme", jwtVerify, TpschemeController.getTpscheme);

apiRoutes.get(
  "/tpschemebyid/:id",
  jwtVerifyWithRoles([userRoles.admin_key]),
  TpschemeController.getTpschemeById,
);

apiRoutes.post(
  "/delete-tpscheme",
  jwtVerifyWithRoles([userRoles.admin_key]),
  TpschemeController.deletTpscheme,
);

// new file
apiRoutes.get(
  "/fetchprojectdetails",
  jwtVerify,
  NewFileController.getProjectDetails,
);
apiRoutes.get(
  "/fetchInteriorCatgory",
  jwtVerify,
  NewFileController.getInteriorCategory,
);
apiRoutes.get(
  "/fetcharchitectureCategory",
  jwtVerify,
  NewFileController.getArchitecturCategory,
);
apiRoutes.get("/getallnewfile", jwtVerify, NewFileController.getAllNewFile);
apiRoutes.post("/newfile/add", jwtVerify, NewFileController.add);
apiRoutes.get("/getnewfilebyid/:id", jwtVerify, NewFileController.getFilesbyId);
apiRoutes.get(
  "/getServicebyId/:id",
  jwtVerify,
  NewFileController.getServicebyId,
);
apiRoutes.get(
  "/getInteriorFilesbyId/:id",
  jwtVerify,
  NewFileController.getInteriorFilesbyId,
);
apiRoutes.post("/newfile/update", jwtVerify, NewFileController.update);
apiRoutes.post(
  "/interiornewfile/update",
  jwtVerify,
  NewFileController.updateInterior,
);
apiRoutes.delete("/delete-file/:id", jwtVerify, NewFileController.deleteFile);
apiRoutes.get("/getdays/:id", jwtVerify, NewFileController.getDaysbyId);
apiRoutes.get(
  "/getinteriordays/:id",
  jwtVerify,
  NewFileController.getInteriorDaysbyId,
);

apiRoutes.post(
  "/interiornewfile/updateService",
  jwtVerify,
  NewFileController.updateService,
);

// Approval Process

// document claearnce
apiRoutes.get(
  "/fetchallfile",
  jwtVerify,
  DocumentClearanceController.getAllFile,
);

apiRoutes.get(
  "/getMembersdata/:id",
  jwtVerify,
  DocumentClearanceController.getMembersdata,
);
apiRoutes.get("/fetchdcfile", jwtVerify, DocumentClearanceController.getDCFile);
apiRoutes.get("/fetchpvfile", jwtVerify, DocumentClearanceController.getPvFile);
apiRoutes.get(
  "/fetchfirenocfile",
  jwtVerify,
  DocumentClearanceController.getFirenocFile,
);
apiRoutes.get(
  "/fetchenagarportalfile",
  jwtVerify,
  DocumentClearanceController.getEnagarportalFile,
);
apiRoutes.get(
  "/fetchbpermissionfile",
  jwtVerify,
  DocumentClearanceController.getBpermissionFile,
);
apiRoutes.get(
  "/empProjectApproval/:id",
  jwtVerify,
  DocumentClearanceController.empProjectApproval,
);
apiRoutes.get(
  "/empProjectArchitecture/:id",
  jwtVerify,
  DocumentClearanceController.empProjectArchitecture,
);
apiRoutes.get(
  "/empProjectInterior/:id",
  jwtVerify,
  DocumentClearanceController.empProjectInterior,
);
apiRoutes.get(
  "/fetchempAllfile",
  jwtVerify,
  DocumentClearanceController.empAllFile,
);
apiRoutes.get(
  "/fetchempdcfile",
  jwtVerify,
  DocumentClearanceController.getempDCFile,
);
apiRoutes.get(
  "/fetchemppvfile",
  jwtVerify,
  DocumentClearanceController.getempPvFile,
);
apiRoutes.get(
  "/fetchempfirenocfile",
  jwtVerify,
  DocumentClearanceController.getempFirenocFile,
);
apiRoutes.get(
  "/fetchempenagarportalfile",
  jwtVerify,
  DocumentClearanceController.getempEnagarportalFile,
);
apiRoutes.get(
  "/fetchempbpermissionfile",
  jwtVerify,
  DocumentClearanceController.getempBpermissionFile,
);
apiRoutes.delete(
  "/remove-approval_document/:id",
  jwtVerify,
  DocumentClearanceController.deleteapprovaldocument,
);

apiRoutes.delete(
  "/remove-document_clearance/:id",
  jwtVerify,
  DocumentClearanceController.deletedocumentclearance,
);

apiRoutes.get(
  "/fetchAlldocument",
  jwtVerify,
  DocumentClearanceController.getAllDocument,
);

apiRoutes.post(
  "/save-document_clearance",
  jwtVerify,
  DocumentClearanceController.addorEdit,
);

apiRoutes.get(
  "/documentclearance/:id",
  jwtVerify,
  DocumentClearanceController.getDocumentbyID,
);

apiRoutes.get(
  "/alldocumentdata/:id",
  jwtVerify,
  DocumentClearanceController.getAllDocumentData,
);

apiRoutes.get(
  "/getAlltentative",
  jwtVerify,
  DocumentClearanceController.getAlltentative,
);

apiRoutes.post(
  "/update-document-clearance/:foldername",
  jwtVerify,
  _upload.any(),
  DocumentClearanceController.update,
);

apiRoutes.delete(
  "/remove-files/:id",
  jwtVerify,
  DocumentClearanceController.deletefiles,
);

apiRoutes.delete(
  "/remove-collection/:id",
  jwtVerify,
  DocumentClearanceController.deleteCollection,
);

apiRoutes.get(
  "/documentClearancebyid/:id",
  jwtVerify,
  DocumentClearanceController.getdocumentclearacnebyId,
);

apiRoutes.get(
  "/fetchfilebyId/:id",
  jwtVerify,
  DocumentClearanceController.getFileDetailsbyId,
);

// pv
apiRoutes.get("/fetchpvfile", jwtVerify, PVController.getPVFile);

apiRoutes.post(
  "/add_update-pv/:foldername",
  jwtVerify,
  _upload.any(),
  PVController.add,
);

apiRoutes.get("/pvbyid/:id", jwtVerify, PVController.getPvbyId);

apiRoutes.delete(
  "/remove-pvcertificate_files/:id",
  jwtVerify,
  PVController.deletepvcertificate,
);

apiRoutes.delete(
  "/remove-document_files/:id",
  jwtVerify,
  PVController.deletedocumentfile,
);

// Interior
apiRoutes.get("/getAllInterior", jwtVerify, interiorController.getAllInterior);
apiRoutes.get(
  "/getInteriorMembersData/:id",
  jwtVerify,
  interiorController.getInteriorMembersData,
);
apiRoutes.get(
  "/getBasicInterior",
  jwtVerify,
  interiorController.getBasicInterior,
);
apiRoutes.get(
  "/getStudyInterior",
  jwtVerify,
  interiorController.getStudyInterior,
);
apiRoutes.get(
  "/getquotationInterior",
  jwtVerify,
  interiorController.getquotationInterior,
);

apiRoutes.get(
  "/getConceptInterior",
  jwtVerify,
  interiorController.getConceptInterior,
);
apiRoutes.get(
  "/getConsultantsInterior",
  jwtVerify,
  interiorController.getConsultantsInterior,
);
apiRoutes.get("/getTdInterior", jwtVerify, interiorController.getTdInterior);
apiRoutes.get(
  "/getriskInterior",
  jwtVerify,
  interiorController.getriskInterior,
);
apiRoutes.get(
  "/getScheduleInterior",
  jwtVerify,
  interiorController.getScheduleInterior,
);
apiRoutes.delete(
  "/remove-interior/:id",
  jwtVerify,
  interiorController.deleteInterior,
);

apiRoutes.get("/getempInterior", jwtVerify, interiorController.getempInterior);
apiRoutes.get(
  "/getempBasicInterior",
  jwtVerify,
  interiorController.getempBasicInterior,
);
apiRoutes.get(
  "/getempStudyInterior",
  jwtVerify,
  interiorController.getempStudyInterior,
);

apiRoutes.get(
  "/getempquotationInterior",
  jwtVerify,
  interiorController.getempquotationInterior,
);
apiRoutes.get(
  "/getempConsultantsInterior",
  jwtVerify,
  interiorController.getempConsultantsInterior,
);
apiRoutes.get(
  "/getempConceptInterior",
  jwtVerify,
  interiorController.getempConceptInterior,
);
apiRoutes.get(
  "/getempTdInterior",
  jwtVerify,
  interiorController.getempTdInterior,
);
apiRoutes.get(
  "/getempriskmatrixInterior",
  jwtVerify,
  interiorController.getempriskmatrixInterior,
);
apiRoutes.get(
  "/getempScheduleInterior",
  jwtVerify,
  interiorController.getempScheduleInterior,
);

apiRoutes.post(
  "/addoreditinterior",
  jwtVerify,
  interiorController.addoreditinterior,
);

apiRoutes.get(
  "/fetchbasicdetailsbyid/:id",
  jwtVerify,
  interiorController.fetchbasicdetailsbyid,
);

apiRoutes.get(
  "/fetchinteriorrndyid/:id",
  jwtVerify,
  interiorController.fetchinteriorrndyid,
);

apiRoutes.post(
  "/update-interior-study-rnd/:foldername",
  jwtVerify,
  _upload.any(),
  interiorController.upsertinteriorRnd,
);

apiRoutes.post(
  "/interior/add",
  jwtVerify,
  interiorController.addSpacePlanningcategory,
);

apiRoutes.get(
  "/fetchSpacePlannigbyid/:id",
  jwtVerify,
  interiorController.getSpacePlannigbyid,
);
apiRoutes.get(
  "/fetchspcategoryid/:id",
  jwtVerify,
  interiorController.getSpcategorybyid,
);

apiRoutes.post(
  "/update-spcategory",
  jwtVerify,
  interiorController.updatespCategory,
);
apiRoutes.post(
  "/interior/add-vendors",
  jwtVerify,
  interiorController.addVendors,
);

apiRoutes.post(
  "/add-space-planning/:foldername",
  jwtVerify,
  _upload.any(),
  interiorController.AddSpacePlanning,
);

apiRoutes.get(
  "/fetchquestionbyid/:id",
  jwtVerify,
  interiorController.questionbyid,
);

apiRoutes.post(
  "/interior/internalstatus",
  jwtVerify,
  interiorController.updateInternalStatus,
);

apiRoutes.post(
  "/interior/clientstatus",
  jwtVerify,
  interiorController.updateClientStatus,
);
apiRoutes.get(
  "/internalStatusbyid/:id",
  jwtVerify,
  interiorController.internalStatusbyid,
);
apiRoutes.get(
  "/ClientStatusbyid/:id",
  jwtVerify,
  interiorController.ClientStatusbyid,
);

apiRoutes.post(
  "/delete-space-planning/:id",
  jwtVerify,
  interiorController.deleteSpacePlannig,
);

apiRoutes.get(
  "/getQuationbyid/:id",
  jwtVerify,
  interiorController.getQuationbyid,
);
apiRoutes.post(
  "/interior/addquation",
  jwtVerify,
  interiorController.addQuationcategory,
);

apiRoutes.post(
  "/delete-vendor/:id",
  jwtVerify,
  interiorController.deleteVendor,
);

apiRoutes.get(
  "/fetchVendorbyId/:id",
  jwtVerify,
  interiorController.fetchVendorbyId,
);

apiRoutes.post(
  "/interior/update-quotation",
  jwtVerify,
  interiorController.updateQuotation,
);

apiRoutes.post("/interior/addfees", jwtVerify, interiorController.addFees);

apiRoutes.get("/getFees/:id", jwtVerify, interiorController.getFees);
apiRoutes.get(
  "/fetchFeesbyId/:id",
  jwtVerify,
  interiorController.fetchFeesbyId,
);

apiRoutes.post("/delete-fees/:id", jwtVerify, interiorController.deleteFees);

apiRoutes.post(
  "/interior/update-fees",
  jwtVerify,
  interiorController.updateFees,
);

apiRoutes.get(
  "/fetchInteriorDetails",
  jwtVerify,
  interiorController.getInteriorDetails,
);

apiRoutes.post(
  "/interior/addmaterialcategory",
  jwtVerify,
  interiorController.addMaterialCategory,
);

apiRoutes.get(
  "/materialcategorybyid/:id",
  jwtVerify,
  interiorController.materialcategorybyid,
);

apiRoutes.post(
  "/add-material/:foldername",
  jwtVerify,
  _upload.any(),
  interiorController.AddMaterial,
);

apiRoutes.post(
  "/delete-material/:id",
  jwtVerify,
  interiorController.deletematerial,
);

apiRoutes.get(
  "/getInteriorData/:id",
  jwtVerify,
  interiorController.getInteriorData,
);

apiRoutes.get("/materialbyid/:id", jwtVerify, interiorController.materialbyid);

apiRoutes.post(
  "/interior/addConceptCategory",
  jwtVerify,
  interiorController.addConceptCategory,
);

apiRoutes.get(
  "/conceptcategorybyid/:id",
  jwtVerify,
  interiorController.conceptcategorybyid,
);

apiRoutes.post(
  "/delete-concept/:id",
  jwtVerify,
  interiorController.deleteConcept,
);

apiRoutes.post(
  "/add-concept/:foldername",
  jwtVerify,
  _upload.any(),
  interiorController.AddConcept,
);

apiRoutes.post(
  "/interior/updatematerial",
  jwtVerify,
  interiorController.materialupdate,
);

apiRoutes.post(
  "/interior/addTechnicalCategory",
  jwtVerify,
  interiorController.addTechnicalCategory,
);

apiRoutes.post(
  "/interior/addSchedule",
  jwtVerify,
  interiorController.addSchedule,
);

apiRoutes.post(
  "/interior/addThreeDCategory",
  jwtVerify,
  interiorController.addThreeDCategory,
);

apiRoutes.get(
  "/getTechnicalCategorybyid/:id",
  jwtVerify,
  interiorController.getTechnicalCategorybyid,
);

apiRoutes.get("/get3dbyid/:id", jwtVerify, interiorController.get3dbyid);

apiRoutes.get(
  "/get3dinternalStatusbyid/:id",
  jwtVerify,
  interiorController.get3dinternalStatusbyid,
);

apiRoutes.post(
  "/update3dintenalstatus",
  jwtVerify,
  interiorController.update3dintenalstatus,
);

apiRoutes.post(
  "/addmststructure",
  jwtVerify,
  interiorController.addmststructure,
);

apiRoutes.get("/structuebyid/:id", jwtVerify, interiorController.structuebyid);

apiRoutes.post(
  "/delete-structure/:id",
  jwtVerify,
  interiorController.deleteStructure,
);

apiRoutes.post(
  "/add-structure/:foldername",
  jwtVerify,
  _upload.any(),
  interiorController.Addstructure,
);

apiRoutes.get(
  "/structureClientStatusbyid/:id",
  jwtVerify,
  interiorController.structureClientStatusbyid,
);

apiRoutes.post(
  "/updatestructureClientStatus",
  jwtVerify,
  interiorController.updatestructureClientStatus,
);

apiRoutes.get(
  "/structureinternalStatusbyid/:id",
  jwtVerify,
  interiorController.structureinternalStatusbyid,
);

apiRoutes.post(
  "/updatestructureintenalstatus",
  jwtVerify,
  interiorController.updatestructureintenalstatus,
);

apiRoutes.post("/addmstMepf", jwtVerify, interiorController.addmstMepf);

apiRoutes.get("/mepfbyid/:id", jwtVerify, interiorController.mepfbyid);

apiRoutes.post("/delete-mepf/:id", jwtVerify, interiorController.deleteMepf);

apiRoutes.post(
  "/add-mepf/:foldername",
  jwtVerify,
  _upload.any(),
  interiorController.Addmepf,
);

apiRoutes.get(
  "/mepfClientStatusbyid/:id",
  jwtVerify,
  interiorController.mepfClientStatusbyid,
);

apiRoutes.post(
  "/updatemepfClientStatus",
  jwtVerify,
  interiorController.updatemepfClientStatus,
);

apiRoutes.get(
  "/mepfinternalStatusbyid/:id",
  jwtVerify,
  interiorController.mepfinternalStatusbyid,
);

apiRoutes.post(
  "/updatemepfintenalstatus",
  jwtVerify,
  interiorController.updatemepfintenalstatus,
);

apiRoutes.get(
  "/fetchriskbyid/:id",
  jwtVerify,
  interiorController.fetchriskbyid,
);

apiRoutes.post("/delete-risk/:id", jwtVerify, interiorController.deleterisk);

apiRoutes.post(
  "/add-risk/:foldername",
  jwtVerify,
  _upload.any(),
  interiorController.Addrisk,
);

apiRoutes.post(
  "/updateriskstage",
  jwtVerify,
  interiorController.updateriskstage,
);

apiRoutes.get("/getschedule/:id", jwtVerify, interiorController.getschedule);

apiRoutes.post(
  "/add-technical-drawing/:foldername",
  jwtVerify,
  _upload.any(),
  interiorController.AddTechnical,
);

apiRoutes.post(
  "/add-threed/:foldername",
  jwtVerify,
  _upload.any(),
  interiorController.AddThreeD,
);

apiRoutes.post(
  "/delete-technical/:id",
  jwtVerify,
  interiorController.deleteTechnical,
);

apiRoutes.post("/delete-3d/:id", jwtVerify, interiorController.deleteThreed);

apiRoutes.post(
  "/delete-schedule/:id",
  jwtVerify,
  interiorController.deleteSchedule,
);

apiRoutes.post(
  "/interior/tdinternalstatus",
  jwtVerify,
  interiorController.updateTDInternalStatus,
);

apiRoutes.post(
  "/interior/tdclientstatus",
  jwtVerify,
  interiorController.updateTDClientStatus,
);

apiRoutes.post(
  "/interior/3dclientstatus",
  jwtVerify,
  interiorController.update3DClientStatus,
);
apiRoutes.get(
  "/tdinternalStatusbyid/:id",
  jwtVerify,
  interiorController.TDinternalStatusbyid,
);
apiRoutes.get(
  "/tdClientStatusbyid/:id",
  jwtVerify,
  interiorController.TDClientStatusbyid,
);

apiRoutes.get(
  "/threeDClientStatusbyid/:id",
  jwtVerify,
  interiorController.threeDClientStatusbyid,
);

apiRoutes.get(
  "/fetchquotationcategoryid/:id",
  jwtVerify,
  interiorController.getQotcategorybyid,
);

apiRoutes.post(
  "/interior/update-quotationcategory",
  jwtVerify,
  interiorController.updateQuotationCategory,
);

apiRoutes.post(
  "/addinteriorContractorCategory",
  jwtVerify,
  interiorController.addinteriorContractorCategory,
);

apiRoutes.get(
  "/getInteriorContractorcategorybyid/:id",
  jwtVerify,
  interiorController.getInteriorContractorcategorybyid,
);

apiRoutes.post(
  "/updateinteriorContractorCategory",
  jwtVerify,
  interiorController.updateinteriorContractorCategory,
);

apiRoutes.post(
  "/delete-interior-contractor/:id",
  jwtVerify,
  interiorController.deleteinteriorContractor,
);

apiRoutes.get(
  "/getinteriorContractorbyid/:id",
  jwtVerify,
  interiorController.getinteriorContractorbyid,
);

apiRoutes.post(
  "/addinteriorContractor",
  jwtVerify,
  interiorController.addinteriorContractor,
);

apiRoutes.get(
  "/fetchinteriorContractorbyId/:id",
  jwtVerify,
  interiorController.fetchinteriorContractorbyId,
);

apiRoutes.post(
  "/updateinteiorContractor",
  jwtVerify,
  interiorController.updateinteiorContractor,
);

apiRoutes.get(
  "/fetchmaterialcategoryid/:id",
  jwtVerify,
  interiorController.getMaterialcategorybyid,
);

apiRoutes.post(
  "/interior/update-materialcategory",
  jwtVerify,
  interiorController.updateMaterialCategory,
);

apiRoutes.get(
  "/fetchconceptcategoryid/:id",
  jwtVerify,
  interiorController.getConceptcategorybyid,
);

apiRoutes.post(
  "/interior/update-conceptcategory",
  jwtVerify,
  interiorController.updateConceptCategory,
);

apiRoutes.get(
  "/interiordcinternalStatusbyid/:id",
  jwtVerify,
  interiorController.interiordcinternalStatusbyid,
);

apiRoutes.post(
  "/updateinteriordcintenalstatus",
  jwtVerify,
  interiorController.updateinteriordcintenalstatus,
);

apiRoutes.get(
  "/interiorDcClientStatusbyid/:id",
  jwtVerify,
  interiorController.interiorDcClientStatusbyid,
);

apiRoutes.post(
  "/interiordcupdateClientStatus",
  jwtVerify,
  interiorController.interiordcupdateClientStatus,
);

apiRoutes.post(
  "/add-finald/:foldername",
  jwtVerify,
  _upload.any(),
  interiorController.Addfinald,
);

apiRoutes.get(
  "/fetchFinaldbyid/:id",
  jwtVerify,
  interiorController.fetchFinaldbyid,
);

apiRoutes.post(
  "/delete-finalf/:id",
  jwtVerify,
  interiorController.deletefinald,
);

apiRoutes.post(
  "/updatefinaldstatus",
  jwtVerify,
  interiorController.updatefinaldstatus,
);

apiRoutes.get(
  "/finaldstatusbyid/:id",
  jwtVerify,
  interiorController.finaldstatusbyid,
);

apiRoutes.get(
  "/fetchtdcategoryid/:id",
  jwtVerify,
  interiorController.getTdcategorybyid,
);

apiRoutes.post(
  "/interior/update-tdcategory",
  jwtVerify,
  interiorController.updateTdCategory,
);

apiRoutes.get(
  "/fetch3dcategoryid/:id",
  jwtVerify,
  interiorController.get3dcategorybyid,
);

apiRoutes.post(
  "/interior/update-3dcategory",
  jwtVerify,
  interiorController.update3dCategory,
);

apiRoutes.get(
  "/schedulestatusbyid/:id",
  jwtVerify,
  interiorController.schedulestatusbyid,
);

apiRoutes.post(
  "/updatescheduleStatus",
  jwtVerify,
  interiorController.updatescheduleStatus,
);

apiRoutes.post("/updatebdstage", jwtVerify, interiorController.updatebdstage);

apiRoutes.post("/updatespstage", jwtVerify, interiorController.updatespstage);

apiRoutes.post(
  "/updatequotationstage",
  jwtVerify,
  interiorController.updatequotationstage,
);

apiRoutes.post(
  "/updatematerialstage",
  jwtVerify,
  interiorController.updatematerialstage,
);

apiRoutes.post(
  "/updateconceptstage",
  jwtVerify,
  interiorController.updateconceptstage,
);

apiRoutes.post("/updatetdstage", jwtVerify, interiorController.updatetdstage);

apiRoutes.post("/update3dstage", jwtVerify, interiorController.update3dstage);

apiRoutes.post(
  "/updateschedulestage",
  jwtVerify,
  interiorController.updateschedulestage,
);

// Fire Noc

apiRoutes.get("/fetchfirenoc", jwtVerify, FireNOCController.getFireNocFile);
apiRoutes.post(
  "/add_update-fireNoc/:foldername",
  jwtVerify,
  _upload.any(),
  FireNOCController.addorupdate,
);

apiRoutes.get("/firenocbyid/:id", jwtVerify, FireNOCController.getfireNocbyId);
apiRoutes.delete(
  "/remove-firenoc-receipt/:id",
  jwtVerify,
  FireNOCController.deleteFireNoc,
);

//  E Nagar Input
apiRoutes.post(
  "/add_update-enagarinput/:foldername",
  jwtVerify,
  _upload.any(),
  ENagarinputoutController.addorupdatein,
);

apiRoutes.get(
  "/enagarinputbyid/:id",
  jwtVerify,
  ENagarinputoutController.getenagarInputbyId,
);

apiRoutes.delete(
  "/remove-input-drawing/:id",
  jwtVerify,
  ENagarinputoutController.deleteInputdrawing,
);

apiRoutes.delete(
  "/remove-smc-drawing/:id",
  jwtVerify,
  ENagarinputoutController.deletesmcdrawing,
);
apiRoutes.delete(
  "/remove-permission-letter/:id",
  jwtVerify,
  ENagarinputoutController.deletepermissionletter,
);

apiRoutes.delete(
  "/remove-enagar-details/:id",
  jwtVerify,
  ENagarinputoutController.deleteenagardetails,
);
apiRoutes.delete(
  "/remove-enagar-drawing/:id",
  jwtVerify,
  ENagarinputoutController.deleteenagardrwaing,
);

apiRoutes.post(
  "/add_update-enagaroutput/:foldername",
  jwtVerify,
  _upload.any(),
  ENagarinputoutController.addorupdateout,
);

apiRoutes.get(
  "/enagaroutputbyid/:id",
  jwtVerify,
  ENagarinputoutController.getenagarOutputbyId,
);

// Building Permission

apiRoutes.get(
  "/fetchinwarddetails",
  jwtVerify,
  BuildingPermissionController.getinwardData,
);
apiRoutes.post(
  "/add_update-inwarddetails/:foldername",
  jwtVerify,
  _upload.any(),
  BuildingPermissionController.addorupdate,
);

apiRoutes.get(
  "/inwarddetailsbyid/:id",
  jwtVerify,
  BuildingPermissionController.getInwardDetailsbyId,
);

apiRoutes.delete(
  "/remove-road-deposit/:id",
  jwtVerify,
  BuildingPermissionController.deleteRoadDeposit,
);
apiRoutes.delete(
  "/remove-scrunity/:id",
  jwtVerify,
  BuildingPermissionController.deleteScrunityFile,
);

apiRoutes.post(
  "/add_update-outward/:foldername",
  jwtVerify,
  _upload.any(),
  BuildingPermissionController.addupdateouteward,
);

apiRoutes.get(
  "/outwardbyid/:id",
  jwtVerify,
  BuildingPermissionController.getoutewardbyId,
);

apiRoutes.delete(
  "/remove-buildingletter/:id",
  jwtVerify,
  BuildingPermissionController.deleteBuildingletter,
);

apiRoutes.delete(
  "/remove-approval_plan/:id",
  jwtVerify,
  BuildingPermissionController.deleteApprovalplan,
);

apiRoutes.post(
  "/add_update-approval/:foldername",
  jwtVerify,
  _upload.any(),
  BuildingPermissionController.addorupdateApproval,
);

apiRoutes.get(
  "/fetchapprovalbyId/:id",
  jwtVerify,
  BuildingPermissionController.getApprovalbyId,
);

apiRoutes.delete(
  "/remove-approval_letter/:id",
  jwtVerify,
  BuildingPermissionController.deleteApprovedLetter,
);

apiRoutes.post(
  "/add_update-allfees/:foldername",
  jwtVerify,
  _upload.any(),
  BuildingPermissionController.addorupdateallfees,
);

apiRoutes.get(
  "/fetchAllfeesbyid/:id",
  jwtVerify,
  BuildingPermissionController.getAllfeesbyId,
);

apiRoutes.delete(
  "/remove-file_upload/:id",
  jwtVerify,
  BuildingPermissionController.deletefileupload,
);
apiRoutes.delete(
  "/remove-allfees/:id",
  jwtVerify,
  BuildingPermissionController.deleteallfees,
);

apiRoutes.get(
  "/fetchworkfeesbyid/:id",
  jwtVerify,
  BuildingPermissionController.getworkfeesbyId,
);
apiRoutes.delete(
  "/remove-workfees/:id",
  jwtVerify,
  BuildingPermissionController.deleteworkfees,
);
apiRoutes.delete(
  "/remove-workfile_upload/:id",
  jwtVerify,
  BuildingPermissionController.deleteworkfileupload,
);
apiRoutes.post(
  "/add_update-workfees/:foldername",
  jwtVerify,
  _upload.any(),
  BuildingPermissionController.addorupdateworkfees,
);

apiRoutes.delete(
  "/remove-fsicfile_upload/:id",
  jwtVerify,
  BuildingPermissionController.deletefsicfileupload,
);

apiRoutes.delete(
  "/remove-IcFile_upload/:id",
  jwtVerify,
  BuildingPermissionController.deleteIcfileupload,
);

apiRoutes.delete(
  "/remove-fsiData/:id",
  jwtVerify,
  BuildingPermissionController.deletefsiData,
);
apiRoutes.delete(
  "/remove-icdata/:id",
  jwtVerify,
  BuildingPermissionController.deleteIcData,
);

apiRoutes.get(
  "/fetchfsicfeesbyid/:id",
  jwtVerify,
  BuildingPermissionController.getfsicfeesbyId,
);

apiRoutes.get(
  "/fetchIcfeesbyid/:id",
  jwtVerify,
  BuildingPermissionController.geticfeesbyId,
);

apiRoutes.post(
  "/add_update-fsicfees/:foldername",
  jwtVerify,
  _upload.any(),
  BuildingPermissionController.addorupdatfsicFees,
);

//File
apiRoutes.get("/get-file-codes", jwtVerify, fileController.getMstFileCode);
apiRoutes.get(
  "/all-files-by-team-id/:id",
  jwtVerify,
  fileController.getAllFilesByTeamId,
);
apiRoutes.post("/file/getFile", jwtVerify, fileController.getFile);

apiRoutes.get(
  "/file/getFileOfOnline",
  jwtVerifyWithRoles([
    userRoles.admin_key,
    userRoles.emp_key,
    userRoles.subadmin,
  ]),
  fileController.getFileOfOnline,
);
apiRoutes.get(
  "/file/getFileOfOnline-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  fileController.getFileOfOnlineForTeam,
);

apiRoutes.get(
  "/file/getFileOfOffline",
  jwtVerifyWithRoles([
    userRoles.admin_key,
    userRoles.emp_key,
    userRoles.subadmin,
  ]),
  fileController.getFileOfOffline,
);
apiRoutes.get(
  "/file/getFileOfOffline-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  fileController.getFileOfOfflineForTeam,
);

apiRoutes.get(
  "/file/getFileOfBUC",
  jwtVerifyWithRoles([
    userRoles.admin_key,
    userRoles.emp_key,
    userRoles.subadmin,
  ]),
  fileController.getFileOfBUC,
);
apiRoutes.get(
  "/file/getFileOfBUC-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  fileController.getFileOfBUCForTeam,
);

apiRoutes.get(
  "/file/getFileOfApproved",
  jwtVerifyWithRoles([
    userRoles.admin_key,
    userRoles.emp_key,
    userRoles.subadmin,
  ]),
  fileController.getFileOfApproved,
);
apiRoutes.get(
  "/file/getFileOfApproved-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  fileController.getFileOfApprovedForTeam,
);

apiRoutes.get(
  "/file/getFileOfReject",
  jwtVerifyWithRoles([
    userRoles.admin_key,
    userRoles.emp_key,
    userRoles.subadmin,
  ]),
  fileController.getFileOfReject,
);
apiRoutes.get(
  "/file/getFileOfReject-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  fileController.getFileOfRejectForTeam,
);

apiRoutes.post("/file/add", jwtVerify, fileController.add);

// apiRoutes.post(
//   "/file/update/:foldername",
//   jwtVerify,
//   _upload.single("file_image"),
//   fileController.update
// );
apiRoutes.post("/file/update", jwtVerify, fileController.update);
apiRoutes.post("/file/delete", jwtVerify, fileController.delete);
apiRoutes.get("/file/:id", jwtVerify, fileController.getFileById);
apiRoutes.post(
  "/file/documentjson",
  jwtVerify,
  fileController.changeJsonDocument,
);
apiRoutes.get(
  "/file/documentjson/:id",
  jwtVerify,
  fileController.GetJSONDocumentById,
);

apiRoutes.get("/filedata/lisoner/get", jwtVerify, fileController.lisoner);
apiRoutes.get("/filedata/planner/get", jwtVerify, fileController.planner);
apiRoutes.get(
  "/filedata/messagetoclient/:id",
  jwtVerify,
  fileController.messagetoclient,
);
apiRoutes.get("/stagelist", jwtVerify, fileController.getStageList);
apiRoutes.get(
  "/stagelistByProcess/:id",
  fileController.getStageListByFileProcess,
);
apiRoutes.post("/enagar", jwtVerify, fileController.enagarportal);
apiRoutes.get(
  "/getEnagarportal/:id",
  jwtVerify,
  fileController.getEnagarportalByMstFileId,
);
apiRoutes.post("/ownerPortal", jwtVerify, fileController.ownerPortal);
apiRoutes.get("/getOwnerPortal/:id", jwtVerify, fileController.getOwnerPortal);
apiRoutes.get(
  "/getTypesOfPlotValidation",
  jwtVerify,
  fileController.getTypesOfPlotValidation,
);
apiRoutes.post(
  "/file_plot_validation/:foldername",
  jwtVerify,
  _upload.single("documents"),
  fileController.file_plot_validation,
);
apiRoutes.post(
  "/file_plot_validation_test/:foldername",
  jwtVerify,
  _upload.single("documents"),
  fileController.test,
);
apiRoutes.get(
  "/file_plot_validation/:id",
  jwtVerify,
  fileController.get_file_plot_validation,
);
apiRoutes.post("/reject_file_plot", jwtVerify, fileController.reject_file_plot);
apiRoutes.get(
  "/get_document_upload/:id",
  jwtVerify,
  fileController.get_document_upload,
);
apiRoutes.post(
  "/document_upload/:foldername",
  jwtVerify,
  _upload.any(),
  fileController.document_upload,
);
apiRoutes.delete(
  "/remove_document_upload/:id",
  jwtVerify,
  fileController.remove_document_upload,
);

//Constant
apiRoutes.post(
  "/constant/getMst_Type",
  jwtVerify,
  constantController.getMst_Type,
);
apiRoutes.post(
  "/constant/getStatus_File",
  jwtVerify,
  constantController.getStatus_File,
);
apiRoutes.post(
  "/constant/getStatus_File",
  jwtVerify,
  constantController.getStatus_File,
);

apiRoutes.get("/expenses/test", jwtVerify, expenseController.test_expense);

apiRoutes.get(
  "/expenses/get-deposit-expense-by-teamid/:id",
  jwtVerify,
  expenseController.getDepositExpenseByTeamId,
);

apiRoutes.get(
  "/expenses/get-deposit-expense-by-teamid-pdf/:id",
  jwtVerify,
  expenseController.getDepositExpenseByTeamIdForPdf,
);

//Deposit
apiRoutes.post(
  "/expenses/add-deposit",
  jwtVerify,
  expenseController.addDeposit,
);
apiRoutes.get("/expenses/get-deposit", expenseController.getDeposit);
apiRoutes.get(
  "/expenses/get-deposit-byid/:id",
  jwtVerify,
  expenseController.getDepositById,
);
apiRoutes.delete(
  "/expenses/delete-deposit-byid/:id",
  jwtVerify,
  expenseController.deleteDepositById,
);
apiRoutes.post(
  "/expenses/update-deposit-byid",
  jwtVerify,
  expenseController.updateDepositById,
);

//Office expense
apiRoutes.post(
  "/expenses/add-office-expense/:foldername",
  jwtVerify,
  _upload.any(),
  expenseController.addOfficeExpenseByTeam,
);
apiRoutes.post(
  "/expenses/update-office-expense/:foldername",
  jwtVerify,
  _upload.any(),
  expenseController.UpdateOfficeExpenseByTeam,
);
apiRoutes.post(
  "/expenses/update-office-expense-admin/:foldername",
  jwtVerify,
  _upload.any(),
  expenseController.UpdateOfficeExpenseByTeamForAdmin,
);
apiRoutes.post(
  "/expenses/verify-office-expense-byid",
  jwtVerify,
  expenseController.verifyOfficeExpenseById,
);
apiRoutes.get(
  "/expenses/get-office-expense-byid/:id",
  jwtVerify,
  expenseController.getOfficeExpenseById,
);
apiRoutes.get(
  "/expenses/get-office-expense-admin",
  jwtVerify,
  expenseController.getOfficeExpenseOfAdmin,
);
apiRoutes.get(
  "/expenses/get-office-expense-team",
  jwtVerify,
  expenseController.viewOfficeExpenseOfTeam,
);

apiRoutes.delete(
  "/expenses/delete-office-expense-byid/:id",
  jwtVerify,
  expenseController.deleteOfficeExpenseById,
);
apiRoutes.delete(
  "/expenses/delete-office-expense-byid-admin/:id",
  jwtVerify,
  expenseController.deleteOfficeExpenseByIdForAdmin,
);

//File Expense
apiRoutes.post(
  "/expenses/add-file-expense/:foldername",
  jwtVerify,
  _upload.any(),
  expenseController.addFileExpenseByTeam,
);
// apiRoutes.post(
//   "/expenses/upload-file-expense/:foldername",
//   jwtVerify,
//   _upload.any(),
//   expenseController.UpdateFileExpenseByTeam
// );
apiRoutes.post(
  "/expenses/update-file-expense-admin/:foldername",
  jwtVerify,
  _upload.any(),
  expenseController.UpdateFileExpenseByTeamForAdmin,
);
apiRoutes.post(
  "/expenses/verify-file-expense-byid",
  jwtVerify,
  expenseController.verifyFileExpenseById,
);
apiRoutes.get(
  "/expenses/get-file-expense-bymstfileid/:id",
  jwtVerify,
  expenseController.getFileExpenseByMstFileId,
);
apiRoutes.get(
  "/expenses/get-file-expense-bymstfileid-pdf/:id",
  jwtVerify,
  expenseController.getFileExpenseByMstFileIdPdf,
);
apiRoutes.get(
  "/expenses/get-file-expense-byid/:id",
  jwtVerify,
  expenseController.getFileExpenseById,
);
apiRoutes.get(
  "/expenses/get-file-expense-admin",
  jwtVerify,
  expenseController.getFileExpenseOfAdmin,
);
apiRoutes.get(
  "/expenses/get-file-expense-adminbyid/:id",
  jwtVerify,
  expenseController.getFileExpenseOfAdminbyid,
);
apiRoutes.get(
  "/expenses/get-file-expense-team",
  jwtVerify,
  expenseController.viewFileExpenseOfTeam,
);

apiRoutes.delete(
  "/expenses/delete-file-expense-byid/:id",
  jwtVerify,
  expenseController.deleteFileExpenseById,
);
apiRoutes.delete(
  "/expenses/delete-file-expense-byid-admin/:id",
  jwtVerify,
  expenseController.deleteFileExpenseByIdForAdmin,
);

//File Expense oldcode (Don't use the following code)
/*xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx*/
apiRoutes.post(
  "/file_expenses/getExpenses",
  jwtVerify,
  file_expenseController.getExpenses,
);
apiRoutes.get(
  "/file_expenses/getExpenses/:id",
  jwtVerify,
  file_expenseController.getExpenseById,
);
apiRoutes.post(
  "/file_expenses/add/:foldername",
  jwtVerify,
  _upload.any(),
  file_expenseController.add,
);
apiRoutes.post(
  "/file_expenses/update/:foldername",
  jwtVerify,
  _upload.any(),
  file_expenseController.update,
);
apiRoutes.post(
  "/file_expenses/delete",
  jwtVerify,
  file_expenseController.delete,
);
/*xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx*/

//Office expense oldcode (Don't use the following code)
/*xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx*/
apiRoutes.post(
  "/office_expenses/add/:foldername",
  jwtVerify,
  _upload.any(),
  office_expenseController.add,
);
apiRoutes.post(
  "/office_expenses/update/:foldername",
  jwtVerify,
  _upload.any(),
  office_expenseController.update,
);
apiRoutes.post(
  "/office_expenses/delete/",
  jwtVerify,
  office_expenseController.delete,
);
apiRoutes.post(
  "/office_expenses/getExpenses",
  jwtVerify,
  office_expenseController.getExpenses,
);
apiRoutes.get(
  "/office_expenses/getExpenses/:id",
  jwtVerify,
  office_expenseController.getExpenseById,
);
/*xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx*/

//Document master
apiRoutes.post(
  "/document_master",
  jwtVerify,
  documentMasterController.getDocumentMaster,
);

//File Details
apiRoutes.get("/file_details/:id", jwtVerify, fileDetailController.fetch);
apiRoutes.post("/file_details/", jwtVerify, fileDetailController.addoredit);

//Utils
apiRoutes.get("/departments", UtilsController.departments);
apiRoutes.get("/posts", UtilsController.post);
apiRoutes.get("/roles", UtilsController.Roles);

//Road Deposity Scrunity fees
// apiRoutes.get("/roadscrunity/test",roadScrunityController.test);
apiRoutes.get(
  "/roadscrunity/:id",
  jwtVerify,
  roadScrunityController.roadDepositScrunity,
);
apiRoutes.post(
  "/roadscrunity/:foldername",
  jwtVerify,
  _upload.any(),
  roadScrunityController.saveRoadDepositScrunityTest,
);

//File Query
apiRoutes.get("/filequery/test", fileQueryController.test);
apiRoutes.get(
  "/filequery/assistantJuniorEngineer/:id",
  jwtVerify,
  fileQueryController.fetch_assistant_junior_engineer,
);
apiRoutes.post(
  "/filequery/assistantJuniorEngineer/:foldername",
  jwtVerify,
  _upload.single("documents"),
  fileQueryController.send_assistant_junior_engineer,
);
apiRoutes.get(
  "/filequery/deputyEngineer/:id",
  jwtVerify,
  fileQueryController.fetch_deputy_engineer,
);
apiRoutes.post(
  "/filequery/deputyEngineer/:foldername",
  jwtVerify,
  _upload.single("documents"),
  fileQueryController.send_deputy_engineer,
);
apiRoutes.get(
  "/filequery/zonalOfficer/:id",
  jwtVerify,
  fileQueryController.fetch_zonal_officer,
);
apiRoutes.post(
  "/filequery/zonalOfficer/:foldername",
  jwtVerify,
  _upload.single("documents"),
  fileQueryController.send_zonal_officer,
);
apiRoutes.get(
  "/filequery/deputyCommissioner/:id",
  jwtVerify,
  fileQueryController.fetch_depty_commissioner,
);
apiRoutes.post(
  "/filequery/deputyCommissioner/:foldername",
  jwtVerify,
  _upload.single("documents"),
  fileQueryController.send_deputy_commissioner,
);
apiRoutes.get(
  "/filequery/commissioner/:id",
  jwtVerify,
  fileQueryController.fetch_commissioner,
);
apiRoutes.post(
  "/filequery/commissioner/:foldername",
  jwtVerify,
  _upload.single("documents"),
  fileQueryController.send_commissioner,
);
apiRoutes.post(
  "/filequery/rejectfilequery",
  jwtVerify,
  fileQueryController.rejectFileQuery,
);

//Todo api
apiRoutes.post("/todo/add-todo", jwtVerify, todosController.addTodo);
apiRoutes.post("/todo/update-todo", jwtVerify, todosController.updateTodo);
apiRoutes.get("/todo/get-todo", jwtVerify, todosController.getTodo);
apiRoutes.post(
  "/todo/mark-todo-as-done",
  jwtVerify,
  todosController.MarkAsDone,
);
apiRoutes.delete(
  "/todo/remove-todo/:id",
  jwtVerify,
  todosController.deleteTodo,
);
apiRoutes.delete(
  "/todo/remove-admin-comment/:id",
  jwtVerify,
  todosController.deleteadmincomment,
);
apiRoutes.delete(
  "/todo/remove-hod-comment/:id",
  jwtVerify,
  todosController.deleteHodComment,
);
apiRoutes.get(
  "/todo/get-todo-of-team",
  jwtVerify,
  todosController.getTodoOfTeamId,
);

// apiRoutes.get(
//   "/todo/get-todo-of-team/id",
//   jwtVerify,
//   todosController.getTodobyOfTeamId
// );

apiRoutes.get(
  "/todo/get-todo-by-team-id/:id",
  jwtVerify,
  todosController.getTodoByTeamId,
);
apiRoutes.get(
  "/todo/get-todo-by-id/:id",
  jwtVerify,
  todosController.getoldTodoById,
);

apiRoutes.post("/todo/check-todo", jwtVerify, todosController.checkTodoTask);
apiRoutes.post(
  "/todo/hod-check-todo",
  jwtVerify,
  todosController.checkHodTodoTask,
);
apiRoutes.get(
  "/todo/get-todo-by-fileid/:id",
  jwtVerifyWithRoles([userRoles.admin_key, userRoles.subadmin]),
  todosController.getTodoByFileId,
);

apiRoutes.get("/get-department", jwtVerify, todosController.getdepartment);

apiRoutes.get(
  "/todo/get-HOD/:selectedDeptId",
  jwtVerify,
  todosController.getHOD,
);

apiRoutes.get(
  "/todo/get-department-employee/:selectedDeptId",
  jwtVerify,
  todosController.getDpartmentempoloyee,
);
apiRoutes.get(
  "/todo/get-department-team",
  jwtVerify,
  todosController.getDepartmentTeam,
);

//Search Api
apiRoutes.post("/search", searchController.search);

//Notification Api
apiRoutes.get(
  "/notification-employee",
  jwtVerify,
  notificationController.EmployeeGetNotification,
);
apiRoutes.get(
  "/notification",
  jwtVerify,
  notificationController.GetNotification,
);
apiRoutes.post(
  "/notification-seen",
  jwtVerify,
  notificationController.seen_notification,
);

//Leave management api
apiRoutes.post("/add-leave", jwtVerify, LeaveController.addLeave);
apiRoutes.get("/delete-leave/:id", jwtVerify, LeaveController.deleteLeaveById);

apiRoutes.post("/edit-leave", jwtVerify, LeaveController.updateLeaveById);
apiRoutes.get("/get-leave/:id", jwtVerify, LeaveController.getLeaveById);
apiRoutes.get(
  "/get-leave-list-byteam-id-forteam",
  jwtVerify,
  LeaveController.getLeaveByTeamIdForTeam,
);

apiRoutes.get(
  "/get-leave-list-byteam-id/:id",
  jwtVerify,
  LeaveController.getLeaveByTeamId,
);
apiRoutes.post("/action_for_leave", jwtVerify, LeaveController.actionForLeave);
apiRoutes.get(
  "/fetchAllattendance",
  jwtVerify,
  LeaveController.getAllattendance,
);
apiRoutes.get(
  "/fetchmonthattendancedata/:id",
  jwtVerify,
  LeaveController.fetchmonthattendancedata,
);

apiRoutes.get(
  "/fetchAttendancebyTeam",
  jwtVerify,
  LeaveController.getAttendancebyTeam,
);

//File stage 3 Send message to client api
apiRoutes.post(
  "/file/messagetoclient",
  jwtVerify,
  fileController.sendMessageToClient,
);

//File stage 4 Plot validation api
apiRoutes.get(
  "/get-plot_validation/:id",
  jwtVerify,
  plotValidationController.get_plot_validation,
);
apiRoutes.post(
  "/save-plot_validation/:foldername",
  jwtVerify,
  _upload.any(),
  plotValidationController.save_plot_validation,
);
apiRoutes.post(
  "/save_and_next-plot_validation/:foldername",
  jwtVerify,
  _upload.any(),
  plotValidationController.save_and_next_plot_validation,
);
apiRoutes.post(
  "/reject-plot_validation",
  jwtVerify,
  plotValidationController.reject_plot_validation,
);
apiRoutes.post(
  "/skip-plot_validation",
  jwtVerify,
  plotValidationController.skip_plot_validation,
);

//File stage 5 Enagar Portal api
apiRoutes.post(
  "/save-enagarportal",
  jwtVerify,
  enagarportalController.save_enagarportal,
);
apiRoutes.post(
  "/save_and_next-enagarportal",
  jwtVerify,
  enagarportalController.save_and_next_enagarportal,
);
apiRoutes.get(
  "/skip-enagarportal/:id",
  jwtVerify,
  enagarportalController.skip_enagar_portal,
);
apiRoutes.post(
  "/reject_enagar_portal",
  jwtVerify,
  enagarportalController.reject_enagar_portal,
);

//File stage 7 Document Upload api
apiRoutes.get(
  "/get-document_upload/:id",
  jwtVerify,
  documentUploadController.get_document_upload,
);
apiRoutes.post(
  "/save-document_upload/:foldername",
  jwtVerify,
  _upload.any(),
  documentUploadController.save_document_upload,
);
apiRoutes.get(
  "/skip-document_upload/:id",
  jwtVerify,
  documentUploadController.skip_document_upload,
);
apiRoutes.get(
  "/remove-document_upload/:id",
  jwtVerify,
  documentUploadController.remove_document_upload,
);

//File stage 14 All Important Fees api
apiRoutes.get(
  "/get-all_important_fees/:id",
  jwtVerify,
  allImportantFeesController.get_allimportantFees2,
);
apiRoutes.post(
  "/save-all_important_fees/:foldername",
  jwtVerify,
  _upload.any(),
  allImportantFeesController.save_allImportantFees,
);
apiRoutes.get(
  "/delete-all_important_fees/:id",
  jwtVerify,
  allImportantFeesController.deleteAllImportantFeesById,
);

//File stage 15 Aminities Fees api foldername : aminities
apiRoutes.get(
  "/get-aminities_fees/:id",
  jwtVerify,
  aminitiesController.get_aminities,
);
apiRoutes.post(
  "/save-aminities_fees/:foldername",
  jwtVerify,
  _upload.any(),
  aminitiesController.save_aminities,
);
apiRoutes.get(
  "/skip-aminities_fees/:id",
  jwtVerify,
  aminitiesController.skip_aminities,
);

//File stage 16  Work fee api
apiRoutes.get("/get-work-fee/:id", jwtVerify, workFeeController.get_work_fee);
apiRoutes.post("/save-work-fee", jwtVerify, workFeeController.save_work_fee);
apiRoutes.get("/skip-work-fee/:id", jwtVerify, workFeeController.skip_work_fee);

//File stage 17 Approved Work api
apiRoutes.get(
  "/get-approved_plan/:id",
  jwtVerify,
  approvedPlanController.getApprovedPlan,
);
apiRoutes.post(
  "/save-approved_plan/:foldername",
  jwtVerify,
  _upload.any(),
  approvedPlanController.save_approved_plan,
);
apiRoutes.get(
  "/delete-approved_plan_byid/:id",
  jwtVerify,
  approvedPlanController.delete_approved_plan_byid,
);

//File stage 18 File Approved/Reject api
apiRoutes.post(
  "/save-file_approved_reject",
  jwtVerify,
  fileApprovedRejectController.save_file_approved_reject,
);

//Skip stage api
apiRoutes.get(
  "/skip-send_message_to_client/:id",
  jwtVerify,
  fileController.skipSendMessageToClient,
);
apiRoutes.post(
  "/skip-file_details",
  jwtVerify,
  fileDetailController.skipFileDetails,
);
apiRoutes.get(
  "/skip-owner_portal/:id",
  jwtVerify,
  fileController.skip_ownerPortal,
);
apiRoutes.get(
  "/skip-approved_plan/:id",
  jwtVerify,
  approvedPlanController.skip_approved_plan,
);
apiRoutes.get(
  "/skip-assistant_junior_engineer/:id",
  jwtVerify,
  fileQueryController.skip_assistant_junior_engineer,
);
apiRoutes.get(
  "/skip-deputy_engineer/:id",
  jwtVerify,
  fileQueryController.skip_deputy_engineer,
);
apiRoutes.get(
  "/skip-zonal_officer/:id",
  jwtVerify,
  fileQueryController.skip_zonal_officer,
);
apiRoutes.get(
  "/skip-deputy_commissioner/:id",
  jwtVerify,
  fileQueryController.skip_deputy_commissioner,
);
apiRoutes.get(
  "/skip-commissioner/:id",
  jwtVerify,
  fileQueryController.skip_commissioner,
);
apiRoutes.get(
  "/skip-all_important_fees/:id",
  jwtVerify,
  allImportantFeesController.skip_allimportantFees,
);

//Project LIST API

//Project
apiRoutes.get(
  "/get-project-superuser",
  // jwtVerifyWithRoles([userRoles.admin_key, userRoles.subadmin]),
  jwtVerify,
  projectController.getProjects,
);

apiRoutes.get(
  "/get-project-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  projectController.getProjectForTeam,
);
apiRoutes.get(
  "/get-project-types",
  jwtVerify,
  projectController.getProjectTypes,
);

apiRoutes.post(
  "/addProject/:foldername",
  jwtVerify,
  _upload.any(),
  projectController.addProject,
);

apiRoutes.get(
  "/get-project/:mst_file_id",
  jwtVerify,
  projectController.getProjectbyid,
);

apiRoutes.post(
  "/update-project/:foldername",
  jwtVerifyWithRoles([userRoles.admin_key]),
  _upload.any(),
  projectController.updateProject,
);

apiRoutes.post(
  "/add-location/:foldername",
  jwtVerify,
  _upload.any(),
  projectController.addLocation,
);
apiRoutes.get(
  "/get-location/:project_detail_id",
  jwtVerify,
  projectController.getLocationbyid,
);
apiRoutes.post(
  "/update-location/:foldername",
  jwtVerifyWithRoles([userRoles.admin_key]),
  _upload.any(),
  projectController.updateLocation,
);

apiRoutes.get("/get-all-location", jwtVerify, projectController.getLocation);
apiRoutes.get(
  "/get-project-details/:ID",
  jwtVerify,
  projectController.getProjectDetailsbyid,
);
apiRoutes.post(
  "/add-Project-detail",
  jwtVerify,
  projectController.addProjectDetail,
);
apiRoutes.get(
  "/get-project-checkbox/:ID",
  jwtVerify,
  projectController.getProjectsCheckboxbyid,
);
apiRoutes.post(
  "/update-project-details",
  jwtVerifyWithRoles([userRoles.admin_key]),
  projectController.updateProjectDetail,
);
apiRoutes.get(
  "/get-project-qty/:ID",
  jwtVerify,
  projectController.getprojectqty,
);
apiRoutes.post(
  "/add-all-plans/:foldername",
  jwtVerify,
  _upload.any(),
  projectController.addallplans,
);
// apiRoutes.post("/add-all-plans", jwtVerify, projectController.addallplans);
apiRoutes.get("/get-all/:ID", jwtVerify, projectController.getallplansbyid);
apiRoutes.get("/get-all-plans", jwtVerify, projectController.getAllPlans);
// apiRoutes.post("/update-all-plans/:flodername",jwtVerifyWithRoles([userRoles.admin_key]),_upload.any(),projectController.updateallplans);
apiRoutes.post(
  "/update-all-plans",
  jwtVerify,
  projectController.updateallplans,
);

apiRoutes.post(
  "/add-project-plan/:foldername",
  jwtVerify,
  _upload.any(),
  projectController.addProjectPlan,
);

apiRoutes.post(
  "/update-project-plan/:foldername",
  jwtVerifyWithRoles([userRoles.admin_key]),
  _upload.any(),
  projectController.updateProjectPlan,
);

//Online Project
apiRoutes.get(
  "/get-project-online-superuser",
  jwtVerifyWithRoles([userRoles.admin_key, userRoles.subadmin]),
  projectController.getOnlineProjectForSuperUser,
);
apiRoutes.get(
  "/get-project-online-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  projectController.getOnlineProjectForTeam,
);

// architecture

apiRoutes.delete(
  "/remove-architecture/:id",
  jwtVerify,
  architectureController.deletearchiecture,
);

apiRoutes.get(
  "/getAllArchitecture",
  jwtVerify,
  architectureController.getAllArchitecture,
);

apiRoutes.get(
  "/getArchMembersData/:id",
  jwtVerify,
  architectureController.getArchMembersData,
);
apiRoutes.get("/getBasicArch", jwtVerify, architectureController.getBasicArch);
apiRoutes.get("/getStudyArch", jwtVerify, architectureController.getStudyArch);
apiRoutes.get(
  "/getQuotationArch",
  jwtVerify,
  architectureController.getQuotationArch,
);
apiRoutes.get(
  "/getdesignconceptArch",
  jwtVerify,
  architectureController.getdesignconceptArch,
);
apiRoutes.get(
  "/getConsultantsArch",
  jwtVerify,
  architectureController.getConsultantsArch,
);
apiRoutes.get(
  "/getTechnicalDrawingsArch",
  jwtVerify,
  architectureController.getTechnicalDrawingsArch,
);
apiRoutes.get(
  "/getScheduleArch",
  jwtVerify,
  architectureController.getScheduleArch,
);
apiRoutes.get("/getRiskArch", jwtVerify, architectureController.getRiskArch);

apiRoutes.get("/getempArch", jwtVerify, architectureController.getempArch);
apiRoutes.get(
  "/getempBasicArch",
  jwtVerify,
  architectureController.getempBasicArch,
);
apiRoutes.get(
  "/getempStudyArch",
  jwtVerify,
  architectureController.getempStudyArch,
);
apiRoutes.get(
  "/getempQuotationArch",
  jwtVerify,
  architectureController.getempQuotationArch,
);
apiRoutes.get(
  "/getempdesignconceptArch",
  jwtVerify,
  architectureController.getempdesignconceptArch,
);
apiRoutes.get(
  "/getempConsultantsArch",
  jwtVerify,
  architectureController.getempConsultantsArch,
);
apiRoutes.get("/getempTdArch", jwtVerify, architectureController.getempTdArch);
apiRoutes.get(
  "/getempScheduleArch",
  jwtVerify,
  architectureController.getempScheduleArch,
);
apiRoutes.get(
  "/getempRiskArch",
  jwtVerify,
  architectureController.getempRiskArch,
);

apiRoutes.get(
  "/fetcharchbdbyid/:id",
  jwtVerify,
  architectureController.fetcharchbdbyid,
);

apiRoutes.post(
  "/update-arch-bd/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.upsertarchbd,
);

apiRoutes.post(
  "/update-arch-study-rnd/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.upsertarchRnd,
);

apiRoutes.get(
  "/fetcharchrndyid/:id",
  jwtVerify,
  architectureController.fetcharchrndyid,
);

apiRoutes.get(
  "/fetcharchSpacePlannigbyid/:id",
  jwtVerify,
  architectureController.getarchSpacePlannigbyid,
);

apiRoutes.get(
  "/fetcharchspcategoryid/:id",
  jwtVerify,
  architectureController.getarchSpcategorybyid,
);

apiRoutes.post(
  "/add-arch-space-planning/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.AddArchSpacePlanning,
);

apiRoutes.post(
  "/delete-arch-space-planning/:id",
  jwtVerify,
  architectureController.deletearchSpacePlannig,
);

apiRoutes.post(
  "/update-arch-spcategory",
  jwtVerify,
  architectureController.updatearchspCategory,
);

apiRoutes.post(
  "/add-arch-spcategory",
  jwtVerify,
  architectureController.addarchSpacePlanningcategory,
);

apiRoutes.get(
  "/archspinternalStatusbyid/:id",
  jwtVerify,
  architectureController.archspinternalStatusbyid,
);

apiRoutes.post("/updatearchSp", jwtVerify, architectureController.updatearchSp);

apiRoutes.get(
  "/archSpClientStatusbyid/:id",
  jwtVerify,
  architectureController.archSpClientStatusbyid,
);

apiRoutes.post(
  "/archspupdateClientStatus",
  jwtVerify,
  architectureController.archspupdateClientStatus,
);

apiRoutes.post(
  "/updatearchspstage",
  jwtVerify,
  architectureController.updatearchspstage,
);

apiRoutes.post(
  "/architecture/addarchdrawing",
  jwtVerify,
  architectureController.addarchdrawing,
);

apiRoutes.get(
  "/archdrwaingbyid/:id",
  jwtVerify,
  architectureController.archdrwaingbyid,
);

apiRoutes.post(
  "/add-arch-drawing/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.Addarchidrawing,
);

apiRoutes.post(
  "/delete-arch-drawing/:id",
  jwtVerify,
  architectureController.deletearchdrawing,
);

apiRoutes.get(
  "/archinternalStatusbyid/:id",
  jwtVerify,
  architectureController.archinternalStatusbyid,
);

apiRoutes.post("/updatearchIs", jwtVerify, architectureController.updatearchIs);

apiRoutes.get(
  "/archClientStatusbyid/:id",
  jwtVerify,
  architectureController.archClientStatusbyid,
);

apiRoutes.post(
  "/archupdateClientStatus",
  jwtVerify,
  architectureController.archupdateClientStatus,
);

apiRoutes.get(
  "/getarchFees/:id",
  jwtVerify,
  architectureController.getarchFees,
);
apiRoutes.post(
  "/delete-archfees/:id",
  jwtVerify,
  architectureController.deletearchFees,
);
apiRoutes.post("/addarchFees", jwtVerify, architectureController.addarchFees);
apiRoutes.get(
  "/fetcharchFeesbyId/:id",
  jwtVerify,
  architectureController.fetcharchFeesbyId,
);

apiRoutes.post(
  "/updatearchFees",
  jwtVerify,
  architectureController.updatearchFees,
);

apiRoutes.post(
  "/addarchDcCategory",
  jwtVerify,
  architectureController.addarchDcCategory,
);

apiRoutes.get(
  "/getarchDccategorybyid/:id",
  jwtVerify,
  architectureController.getarchDccategorybyid,
);

apiRoutes.post(
  "/updatearchDcCategory",
  jwtVerify,
  architectureController.updatearchDcCategory,
);

apiRoutes.get(
  "/getarchdcbyid/:id",
  jwtVerify,
  architectureController.getarchdcbyid,
);

apiRoutes.post(
  "/add-arch-dc/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.AddArchdc,
);

apiRoutes.post(
  "/delete-arch-dc/:id",
  jwtVerify,
  architectureController.deletearchDc,
);
apiRoutes.get(
  "/archdcinternalStatusbyid/:id",
  jwtVerify,
  architectureController.archdcinternalStatusbyid,
);

apiRoutes.post(
  "/updatearchdcintenalstatus",
  jwtVerify,
  architectureController.updatearchdcintenalstatus,
);

apiRoutes.get(
  "/archDcClientStatusbyid/:id",
  jwtVerify,
  architectureController.archDcClientStatusbyid,
);

apiRoutes.post(
  "/archdcupdateClientStatus",
  jwtVerify,
  architectureController.archdcupdateClientStatus,
);

apiRoutes.post(
  "/add-arch-finald/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.Addarchfinald,
);

apiRoutes.get(
  "/fetcharchFinaldbyid/:id",
  jwtVerify,
  architectureController.fetcharchFinaldbyid,
);

apiRoutes.post(
  "/delete-arch-finalf/:id",
  jwtVerify,
  architectureController.deletearchfinald,
);

apiRoutes.post(
  "/archupdatefinaldstatus",
  jwtVerify,
  architectureController.archupdatefinaldstatus,
);

apiRoutes.get(
  "/archfinaldstatusbyid/:id",
  jwtVerify,
  architectureController.archfinaldstatusbyid,
);

apiRoutes.post(
  "/updatearchfinaldstage",
  jwtVerify,
  architectureController.updatearchfinaldstage,
);

apiRoutes.post(
  "/addarchThreeDCategory",
  jwtVerify,
  architectureController.addarchThreeDCategory,
);

apiRoutes.get(
  "/getarch3dcategorybyid/:id",
  jwtVerify,
  architectureController.getarch3dcategorybyid,
);

apiRoutes.post(
  "/updatearch3dCategory",
  jwtVerify,
  architectureController.updatearch3dCategory,
);

apiRoutes.get(
  "/getarch3dbyid/:id",
  jwtVerify,
  architectureController.getarch3dbyid,
);

apiRoutes.post(
  "/add-arch-threed/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.AddarchThreeD,
);

apiRoutes.post(
  "/delete-arch-3d/:id",
  jwtVerify,
  architectureController.deletearchThreed,
);
apiRoutes.post(
  "/updatearch3DClientStatus",
  jwtVerify,
  architectureController.updatearch3DClientStatus,
);

apiRoutes.get(
  "/archthreeDClientStatusbyid/:id",
  jwtVerify,
  architectureController.archthreeDClientStatusbyid,
);

apiRoutes.get(
  "/arch3dinternalStatusbyid/:id",
  jwtVerify,
  architectureController.arch3dinternalStatusbyid,
);

apiRoutes.post(
  "/updatearch3dintenalstatus",
  jwtVerify,
  architectureController.updatearch3dintenalstatus,
);

apiRoutes.post(
  "/updatearchthreedstage",
  jwtVerify,
  architectureController.updatearchthreedstage,
);

apiRoutes.post(
  "/addarchmststructure",
  jwtVerify,
  architectureController.addarchmststructure,
);

apiRoutes.get(
  "/archstructuebyid/:id",
  jwtVerify,
  architectureController.archstructuebyid,
);

apiRoutes.post(
  "/delete-arch-structure/:id",
  jwtVerify,
  architectureController.deletearchStructure,
);

apiRoutes.post(
  "/add-arch-structure/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.Addarchstructure,
);

apiRoutes.get(
  "/archstructureClientStatusbyid/:id",
  jwtVerify,
  architectureController.archstructureClientStatusbyid,
);

apiRoutes.post(
  "/updatearchstructureClientStatus",
  jwtVerify,
  architectureController.updatearchstructureClientStatus,
);

apiRoutes.get(
  "/archstructureinternalStatusbyid/:id",
  jwtVerify,
  architectureController.archstructureinternalStatusbyid,
);

apiRoutes.post(
  "/updatearchstructureintenalstatus",
  jwtVerify,
  architectureController.updatearchstructureintenalstatus,
);

apiRoutes.post(
  "/addarchmstMepf",
  jwtVerify,
  architectureController.addarchmstMepf,
);

apiRoutes.get(
  "/archmepfbyid/:id",
  jwtVerify,
  architectureController.archmepfbyid,
);

apiRoutes.post(
  "/delete-arch-mepf/:id",
  jwtVerify,
  architectureController.deletearchMepf,
);

apiRoutes.post(
  "/add-arch-mepf/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.Addarchmepf,
);

apiRoutes.get(
  "/archmepfClientStatusbyid/:id",
  jwtVerify,
  architectureController.archmepfClientStatusbyid,
);

apiRoutes.post(
  "/updatearchmepfClientStatus",
  jwtVerify,
  architectureController.updatearchmepfClientStatus,
);

apiRoutes.get(
  "/archmepfinternalStatusbyid/:id",
  jwtVerify,
  architectureController.archmepfinternalStatusbyid,
);

apiRoutes.post(
  "/updatearchmepfintenalstatus",
  jwtVerify,
  architectureController.updatearchmepfintenalstatus,
);

apiRoutes.post(
  "/addarchContractorCategory",
  jwtVerify,
  architectureController.addarchContractorCategory,
);

apiRoutes.get(
  "/fetcharchContractorcategorybyid/:id",
  jwtVerify,
  architectureController.getarchContractorcategorybyid,
);

apiRoutes.post(
  "/updatearchContractorCategory",
  jwtVerify,
  architectureController.updatearchContractorCategory,
);

apiRoutes.post(
  "/delete-arch-contractor/:id",
  jwtVerify,
  architectureController.deletearchContractor,
);

apiRoutes.get(
  "/getarchContractorbyid/:id",
  jwtVerify,
  architectureController.getarchContractorbyid,
);

apiRoutes.post(
  "/addarchContractor",
  jwtVerify,
  architectureController.addarchContractor,
);

apiRoutes.get(
  "/fetcharchContractorbyId/:id",
  jwtVerify,
  architectureController.fetcharchContractorbyId,
);

apiRoutes.post(
  "/updatearchContractor",
  jwtVerify,
  architectureController.updatearchContractor,
);

apiRoutes.post(
  "/addarchVendorCategory",
  jwtVerify,
  architectureController.addarchVendorCategory,
);
apiRoutes.post(
  "/delete-arch-vendor/:id",
  jwtVerify,
  architectureController.deletearchVendor,
);

apiRoutes.get(
  "/fetcharchvendorcategorybyid/:id",
  jwtVerify,
  architectureController.getarchvendorcategorybyid,
);

apiRoutes.post(
  "/updatearchvendorCategory",
  jwtVerify,
  architectureController.updatearchvendorCategory,
);

apiRoutes.get(
  "/getarchVendorbyid/:id",
  jwtVerify,
  architectureController.getarchVendorbyid,
);

apiRoutes.post(
  "/addarchVendors",
  jwtVerify,
  architectureController.addarchVendors,
);

apiRoutes.get(
  "/fetcharchVendorbyId/:id",
  jwtVerify,
  architectureController.fetcharchVendorbyId,
);

apiRoutes.post(
  "/updatearchVendor",
  jwtVerify,
  architectureController.updatearchVendor,
);

apiRoutes.get(
  "/getarchQuotation/:id",
  jwtVerify,
  architectureController.getarchQuotation,
);
apiRoutes.post(
  "/delete-archquotation/:id",
  jwtVerify,
  architectureController.deletearchQuotation,
);

apiRoutes.post(
  "/addarchquotation",
  jwtVerify,
  architectureController.addarchquotation,
);

apiRoutes.get(
  "/fetcharchquotationbyId/:id",
  jwtVerify,
  architectureController.fetcharchquotationbyId,
);

apiRoutes.post(
  "/updatearchquotation",
  jwtVerify,
  architectureController.updatearchquotation,
);

apiRoutes.post(
  "/add-arch-document/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.Addarchdocument,
);

apiRoutes.get(
  "/fetcharchdocumentbyid/:id",
  jwtVerify,
  architectureController.fetcharchdocumentbyid,
);

apiRoutes.post(
  "/delete-arch-document/:id",
  jwtVerify,
  architectureController.deletearchdocument,
);

apiRoutes.post(
  "/archupdatedocumentstatus",
  jwtVerify,
  architectureController.archupdatedocumentstatus,
);

apiRoutes.get(
  "/archdocumentstatusbyid/:id",
  jwtVerify,
  architectureController.archdocumentstatusbyid,
);

apiRoutes.post(
  "/add-arch-finalfiles/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.Addarchfinalf,
);

apiRoutes.get(
  "/fetcharchdfinalfbyid/:id",
  jwtVerify,
  architectureController.fetcharchdfinalfbyid,
);

apiRoutes.post(
  "/delete-arch-finalfiles/:id",
  jwtVerify,
  architectureController.deletearchfinalf,
);

apiRoutes.post(
  "/archupdatefinalfstatus",
  jwtVerify,
  architectureController.archupdatefinalfstatus,
);

apiRoutes.get(
  "/archfinalfstatusbyid/:id",
  jwtVerify,
  architectureController.archfinalfstatusbyid,
);

apiRoutes.post(
  "/addarchmstageny",
  jwtVerify,
  architectureController.addarchmstageny,
);

apiRoutes.get(
  "/archagencybyid/:id",
  jwtVerify,
  architectureController.archagencybyid,
);

apiRoutes.post(
  "/delete-arch-agency/:id",
  jwtVerify,
  architectureController.deletearchagency,
);

apiRoutes.post(
  "/add-arch-agency/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.Addarchagency,
);

apiRoutes.get(
  "/archagencystatusbyid/:id",
  jwtVerify,
  architectureController.archagencystatusbyid,
);

apiRoutes.post(
  "/updatearchagency",
  jwtVerify,
  architectureController.updatearchagency,
);

apiRoutes.post(
  "/delete-arch-siteeng/:id",
  jwtVerify,
  architectureController.deletearchsiteeng,
);

apiRoutes.get(
  "/fetcharchsiteengbyid/:id",
  jwtVerify,
  architectureController.fetcharchsiteengbyid,
);

apiRoutes.post(
  "/add-arch-siteeng/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.Addarchsiteeng,
);

apiRoutes.get(
  "/fetcharchriskbyid/:id",
  jwtVerify,
  architectureController.fetcharchriskbyid,
);

apiRoutes.post(
  "/delete-arch-risk/:id",
  jwtVerify,
  architectureController.deletearchrisk,
);

apiRoutes.post(
  "/add-arch-risk/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.Addarchrisk,
);

apiRoutes.get(
  "/archmaterialcategorybyid/:id",
  jwtVerify,
  architectureController.archmaterialcategorybyid,
);

apiRoutes.post(
  "/delete-arch-material/:id",
  jwtVerify,
  architectureController.deletearchmaterial,
);

apiRoutes.post(
  "/addarchMaterialCategory",
  jwtVerify,
  architectureController.addarchMaterialCategory,
);
apiRoutes.get(
  "/archmaterialbyid/:id",
  jwtVerify,
  architectureController.archmaterialbyid,
);

apiRoutes.post(
  "/archmaterialupdate",
  jwtVerify,
  architectureController.archmaterialupdate,
);

apiRoutes.post(
  "/add-arch-material/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.AddarchMaterial,
);

apiRoutes.get(
  "/getarchschedule/:id",
  jwtVerify,
  architectureController.getarchschedule,
);
apiRoutes.post(
  "/delete-arch-schedule/:id",
  jwtVerify,
  architectureController.deletearchSchedule,
);

apiRoutes.post(
  "/addarchitectureschedule",
  jwtVerify,
  architectureController.addarchitectureschedule,
);

apiRoutes.get(
  "/archschedulestatusbyid/:id",
  jwtVerify,
  architectureController.archschedulestatusbyid,
);

apiRoutes.post(
  "/updatearchscheduleStatus",
  jwtVerify,
  architectureController.updatearchscheduleStatus,
);
apiRoutes.get(
  "/getArchDetails",
  jwtVerify,
  architectureController.getArchDetails,
);
apiRoutes.get(
  "/getArchDaysbyId/:id",
  jwtVerify,
  architectureController.getArchDaysbyId,
);

apiRoutes.get(
  "/getArchFilesbyId/:id",
  jwtVerify,
  architectureController.getArchFilesbyId,
);

apiRoutes.post(
  "/updateArchitecture",
  jwtVerify,
  architectureController.updateArch,
);

apiRoutes.get(
  "/getArchData/:id",
  jwtVerify,
  architectureController.getArchData,
);

apiRoutes.get("/getCategory", jwtVerify, architectureController.getCategory);

apiRoutes.get(
  "/fetcharchquestionbyid/:id",
  jwtVerify,
  architectureController.Archquestionbyid,
);

apiRoutes.post(
  "/add-arch-finaldrawing/:foldername",
  jwtVerify,
  _upload.any(),
  architectureController.AddarchfinalDrawing,
);

apiRoutes.get(
  "/fetcharchdfinaldbyid/:id",
  jwtVerify,
  architectureController.fetcharchdfinaldbyid,
);
//Offline Project
apiRoutes.get(
  "/get-project-offline-superuser",
  jwtVerifyWithRoles([userRoles.admin_key, userRoles.subadmin]),
  projectController.getOfflineProjectForSuperUser,
);
apiRoutes.get(
  "/get-project-offline-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  projectController.getOfflineProjectForTeam,
);

apiRoutes.post("/updateOnsite", jwtVerify, architectureController.updateOnsite);

apiRoutes.post(
  "/updatearchbdstage",
  jwtVerify,
  architectureController.updatearchbdstage,
);

apiRoutes.post(
  "/updatearchdrawingstage",
  jwtVerify,
  architectureController.updatearchdrawingstage,
);

apiRoutes.post(
  "/updatearchquotationstage",
  jwtVerify,
  architectureController.updatearchquotationstage,
);

apiRoutes.post(
  "/updatearchdocumentstage",
  jwtVerify,
  architectureController.updatearchdocumentstage,
);

apiRoutes.post(
  "/updatearchfinalfstage",
  jwtVerify,
  architectureController.updatearchfinalfstage,
);

apiRoutes.post(
  "/updatearchagencystage",
  jwtVerify,
  architectureController.updatearchagencystage,
);

apiRoutes.post(
  "/updatearchfinaldstage",
  jwtVerify,
  architectureController.updatearchfinaldstage,
);

apiRoutes.post(
  "/updatearchmaterialstage",
  jwtVerify,
  architectureController.updatearchmaterialstage,
);

apiRoutes.post(
  "/updatearchschedulestage",
  jwtVerify,
  architectureController.updatearchschedulestage,
);

apiRoutes.post(
  "/updatearchsiteengstage",
  jwtVerify,
  architectureController.updatearchsiteengstage,
);

apiRoutes.post(
  "/updatearchriskstage",
  jwtVerify,
  architectureController.updatearchriskstage,
);

//Approved Project
apiRoutes.get(
  "/get-project-approved-superuser",
  jwtVerifyWithRoles([userRoles.admin_key, userRoles.subadmin]),
  projectController.getApprovedProjectForSuperUser,
);
apiRoutes.get(
  "/get-project-approved-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  projectController.getApprovedProjectForTeam,
);

//BUC Project
apiRoutes.get(
  "/get-project-buc-superuser",
  jwtVerifyWithRoles([userRoles.admin_key, userRoles.subadmin]),
  projectController.getBucProjectForSuperUser,
);
apiRoutes.get(
  "/get-project-buc-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  projectController.getBucProjectForTeam,
);

//Reject Project
apiRoutes.get(
  "/get-project-reject-superuser",
  jwtVerifyWithRoles([userRoles.admin_key, userRoles.subadmin]),
  projectController.getRejectProjectForSuperUser,
);
apiRoutes.get(
  "/get-project-reject-team",
  jwtVerifyWithRoles([userRoles.emp_key]),
  projectController.getRejectProjectForTeam,
);

// Mobile app

apiRoutes.post("/mobile-login", mobileController.Mobilelogin);
apiRoutes.post("/mobile-login-admin", mobileController.MobileloginAdmin);
apiRoutes.post(
  "/todo/get-todo-of-team/teamid",
  jwtVerify,
  mobileController.getTodoOfbyTeamId,
);
apiRoutes.post(
  "/notification-app-employee",
  jwtVerify,
  mobileController.EmployeeGetAPPNotification,
);

apiRoutes.post(
  "/users/app-changePassword",
  mdl_common.verifytoken,
  mobileController.changeappPassword,
);
apiRoutes.post(
  "/todo/total-task/teamid",
  jwtVerify,
  mobileController.getTotaltask,
);

apiRoutes.post(
  "/get-leave-list-byteam-id-forteam/id",
  jwtVerify,
  mobileController.getLeaveByIdForTeam,
);

apiRoutes.post(
  "/expenses/get-file-expense-team/id",
  jwtVerify,
  mobileController.viewbyFileExpenseOfTeam,
);

apiRoutes.post(
  "/expenses/get-office-expense-team",
  jwtVerify,
  mobileController.viewOfficeExpenseOfTeamapp,
);

apiRoutes.post(
  "/todo/get-todo-by-id/id",
  jwtVerify,
  mobileController.getTodoID,
);
apiRoutes.post(
  "/expenses/get-deposit-expense-by-teamid/id",
  jwtVerify,
  mobileController.getbyDepositExpenseTeamId,
);

// apiRoutes.post("/file/getFileApp", jwtVerify, mobileController.getFileApp);

apiRoutes.post("/delete-leave", jwtVerify, mobileController.deleteleaveforapp);
apiRoutes.post("/delete-task", jwtVerify, mobileController.deleteTaskForApp);

apiRoutes.post(
  "/get-site-inspection",
  jwtVerify,
  mobileController.getsitesbyidapp,
);

apiRoutes.post(
  "/save-site-inspection",
  jwtVerify,
  // _upload.any(),
  mobileController.addapp,
);
apiRoutes.post("/add-user-track", jwtVerify, mobileController.addusertrack);

apiRoutes.post(
  "/site-inspection/:foldername",
  jwtVerify,
  _upload.any(),
  mobileController.uploadapp,
);

apiRoutes.post(
  "/get-site-inspection-app",
  jwtVerify,
  mobileController.getsitesapp,
);

apiRoutes.post(
  "/get-site-inspection-emp-app",
  jwtVerify,
  mobileController.getsiteEmp,
);

apiRoutes.post(
  "/expenses/update-file-expenses/:foldername",
  jwtVerify,
  _upload.any(),
  mobileController.uploadfilexpense,
);
apiRoutes.post("/customer/getConfig", mobileController.getConfig);
apiRoutes.get("/files/getfilesname", mobileController.getFilesname);

apiRoutes.post(
  "/customer/getInspectionbyCatID",
  jwtVerify,
  mobileController.getInspectionbyCatID,
);

apiRoutes.post(
  "/expenses/upload-office-expense/:foldername",
  jwtVerify,
  _upload.any(),
  mobileController.uploadofficexpense,
);

apiRoutes.post(
  "/get-site-customerlist",
  jwtVerify,
  mobileController.getCustomersites,
);

apiRoutes.post(
  "/get-customer-site-inspection",
  jwtVerify,
  mobileController.getcustomersitesbyid,
);

apiRoutes.post(
  "/get-files",
  jwtVerifyWithRoles([userRoles.client_key]),
  mobileController.getFileByClientId,
);
apiRoutes.post(
  "/get-projects-of-client",
  jwtVerifyWithRoles([userRoles.client_key]),
  mobileController.getProjectOfClientById,
);

apiRoutes.post(
  "/notification-client",
  jwtVerifyWithRoles([userRoles.client_key]),
  mobileController.clientNotification,
);
// file details
apiRoutes.post(
  "/get-file_details",
  jwtVerifyWithRoles([userRoles.client_key]),
  mobileController.getFileDetails,
);
apiRoutes.post(
  "/get-document_upload",
  jwtVerifyWithRoles([userRoles.client_key]),
  mobileController.getDocumentUpload,
);
apiRoutes.post(
  "/get-fs_ic_amineties_fees",
  jwtVerifyWithRoles([userRoles.client_key]),
  mobileController.getFS_IC_AminetiesFees,
);
apiRoutes.post(
  "/get-requiredDocument",
  jwtVerifyWithRoles([userRoles.client_key]),
  mobileController.getRequiredDocumentList,
);
apiRoutes.post("/total-files", jwtVerify, mobileController.getTotal);

apiRoutes.post(
  "/get-cutomerFile",
  jwtVerify,
  mobileController.getcustomerfileData,
);
apiRoutes.post(
  "/get-all_fees",
  jwtVerifyWithRoles([userRoles.client_key]),
  mobileController.getfees,
);
apiRoutes.post(
  "/get-all_fees-totalamount",
  jwtVerifyWithRoles([userRoles.client_key]),
  mobileController.getfeesTotalamount,
);

// attendance
apiRoutes.post("/save-attendance", jwtVerify, mobileController.addAttendance);
apiRoutes.post("/add-leavebyteam", jwtVerify, mobileController.addleavemobile);
apiRoutes.get(
  "/getleave-TeambyId",
  jwtVerify,
  mobileController.getLeaveListbyid,
);
apiRoutes.post(
  "/update-attendance",
  jwtVerify,
  mobileController.updateAttendance,
);
apiRoutes.post("/update-break", jwtVerify, mobileController.updateBreak);

apiRoutes.post("/save-task", jwtVerify, mobileController.AddTask);
apiRoutes.get(
  "/getmstdepartment",
  jwtVerify,
  mobileController.getmstdepartment,
);

apiRoutes.get(
  "/fetchmeetingConfig",
  jwtVerify,
  mobileController.fetchmeetingConfig,
);

apiRoutes.get(
  "/fetchAllTaskbyTeamId",
  jwtVerify,
  mobileController.fetchAllTaskbyTeamId,
);

apiRoutes.post(
  "/fetchAllTaskbyteamidforadmin",
  jwtVerify,
  mobileController.fetchAllTaskbyteamidforadmin,
);

apiRoutes.post(
  "/fetchAttendancebyteamforadmin",
  jwtVerify,
  mobileController.fetchAttendancebyteamforadmin,
);

apiRoutes.get(
  "/fetchAlltaskforAdmin",
  jwtVerify,
  mobileController.fetchAlltaskforAdmin,
);

apiRoutes.get(
  "/operationTeammeeting",
  jwtVerify,
  mobileController.getMeetingbyTeamId,
);

apiRoutes.post(
  "/update-meetingdetails",
  jwtVerify,
  mobileController.updateOperationMeetingtask,
);

apiRoutes.post("/update-location", jwtVerify, mobileController.UpdateLocation);

apiRoutes.post(
  "/update-tacticalperformance",
  jwtVerify,
  mobileController.updateTacticalPerformance,
);

apiRoutes.get(
  "/performancebyId",
  jwtVerify,
  mobileController.getPerformancebyid,
);

apiRoutes.get(
  "/getTacticalmeeting",
  jwtVerify,
  mobileController.getTacticalmeeting,
);

apiRoutes.get(
  "/getStrategicmeeting",
  jwtVerify,
  mobileController.getStrategicmeeting,
);

apiRoutes.get("/getTaskByTeamId", jwtVerify, mobileController.getTaskByTeamId);
apiRoutes.post(
  "/update-taskcheck",
  jwtVerify,
  mobileController.checktaskCheckbox,
);

apiRoutes.post(
  "/fetchopertaionalmeetingbyEmployee",
  jwtVerify,
  mobileController.getOperationalmeetingByEmployee,
);

apiRoutes.get(
  "/getMobileTacticalDates",
  jwtVerify,
  mobileController.getMobileTacticalDates,
);
apiRoutes.get(
  "/getMobileStrategicDates",
  jwtVerify,
  mobileController.getMobileStrategicDates,
);

apiRoutes.post(
  "/getopmeetingbyteamforadmin",
  jwtVerify,
  mobileController.getopmeetingbyteamforadmin,
);

apiRoutes.post(
  "/getTactticalMeetingforemp",
  jwtVerify,
  mobileController.getTactticalMeetingforemp,
);

apiRoutes.post(
  "/getTactticalMeetingforHOD",
  jwtVerify,
  mobileController.getTactticalMeetingforHOD,
);

apiRoutes.post(
  "/fetchopertaionalmeetingfaciltor",
  jwtVerify,
  mobileController.getOperationalmeetingforFaciltor,
);

apiRoutes.post(
  "/fetchopertaionalmeetingAdmin",
  jwtVerify,
  mobileController.getOperationalmeetingforAdmin,
);

apiRoutes.post(
  "/fetchopertaionalmeetingbyid",
  jwtVerify,
  mobileController.getOperationalmeetingbyId,
);

apiRoutes.post(
  "/fetchtacticalmeetingbyid",
  jwtVerify,
  mobileController.gettacticalmeetingbyid,
);

apiRoutes.post(
  "/fetchStrategicbyid",
  jwtVerify,
  mobileController.fetchStrategicbyid,
);

apiRoutes.post(
  "/fetchStrategicviewbyid",
  jwtVerify,
  mobileController.fetchStrategicviewbyid,
);

apiRoutes.post(
  "/updateMobileStrategicPerformance",
  jwtVerify,
  mobileController.updateMobileStrategicPerformance,
);

// apiRoutes.get(
//   "/fetchInteriorforAdmin",
//   jwtVerify,
//   mobileController.fetchInteriorforAdmin
// );

apiRoutes.get(
  "/fetchInteriorforHod",
  jwtVerify,
  mobileController.fetchInteriorforHod,
);

apiRoutes.post(
  "/fetchmobilebasicDetails",
  jwtVerify,
  mobileController.fetchmobilebasicDetails,
);

apiRoutes.post(
  "/fetchmobileSpacePlanning",
  jwtVerify,
  mobileController.fetchmobileSpacePlanning,
);

apiRoutes.post(
  "/fetchmobileQuotation",
  jwtVerify,
  mobileController.fetchmobileQuotation,
);

apiRoutes.post(
  "/fetchmobileConsulantsbyid",
  jwtVerify,
  mobileController.fetchmobileConsulantsbyid,
);

apiRoutes.post(
  "/fetchmobileConcept",
  jwtVerify,
  mobileController.fetchmobileConcept,
);

apiRoutes.post(
  "/fetchmobiletechnicaldrawing",
  jwtVerify,
  mobileController.fetchmobiletechnicaldrawing,
);

apiRoutes.post(
  "/fetchmobileriskbyid",
  jwtVerify,
  mobileController.fetchmobileriskbyid,
);

apiRoutes.post(
  "/fetchmobileSchedule",
  jwtVerify,
  mobileController.fetchmobileSchedule,
);

apiRoutes.post(
  "/fetchInteriormobileCalenderSchedule",
  jwtVerify,
  mobileController.fetchInteriormobileCalenderSchedule,
);

apiRoutes.post(
  "/update-meeting-clarity",
  jwtVerify,
  mobileController.updateClaritydetails,
);

apiRoutes.post(
  "/fetchopviewfaciltor",
  jwtVerify,
  mobileController.fetchopviewfaciltor,
);
apiRoutes.post(
  "/fetchtacticalviewfacilator",
  jwtVerify,
  mobileController.fetchtacticalviewfacilator,
);

apiRoutes.post(
  "/updateverfieid-meeting",
  jwtVerify,
  mobileController.verifiedmeeting,
);

apiRoutes.post(
  "/fetchApprovalforteambyadmin",
  jwtVerify,
  mobileController.fetchApprovalforteambyadmin,
);
apiRoutes.get(
  "/fetchAlltentative",
  jwtVerify,
  mobileController.fetchAlltentative,
);

apiRoutes.get(
  "/fetchApprovalforteam",
  jwtVerify,
  mobileController.fetchApprovalforteam,
);

apiRoutes.post(
  "/fetchArchitectureforteambyadmin",
  jwtVerify,
  mobileController.fetchArchitectureforteambyadmin,
);

apiRoutes.get(
  "/fetchArchitectureforteam",
  jwtVerify,
  mobileController.fetchArchitectureforteam,
);

apiRoutes.post(
  "/fetchInteriorforteambyadmin",
  jwtVerify,
  mobileController.fetchInteriorforteambyadmin,
);

apiRoutes.get(
  "/fetchApprovalforadmin",
  jwtVerify,
  mobileController.fetchApprovalforadmin,
);

apiRoutes.get(
  "/fetchArchitectureforadmin",
  jwtVerify,
  mobileController.fetchArchitectureforadmin,
);

apiRoutes.get(
  "/fetchInteriorforadmin",
  jwtVerify,
  mobileController.fetchInteriorforadmin,
);

apiRoutes.post(
  "/fetchTecticalforAdmin",
  jwtVerify,
  mobileController.fetchTecticalforAdmin,
);

apiRoutes.post(
  "/fetchStrategicforAdmin",
  jwtVerify,
  mobileController.fetchStrategicforAdmin,
);

apiRoutes.post(
  "/fetchStrategicforEmp",
  jwtVerify,
  mobileController.fetchStrategicforEmp,
);
apiRoutes.post(
  "/fetchStrategicforHod",
  jwtVerify,
  mobileController.fetchStrategicforHod,
);
apiRoutes.get(
  "/fetchTecticalforFacilator",
  jwtVerify,
  mobileController.fetchTecticalforFacilator,
);

apiRoutes.get(
  "/fetchInteriorforteam",
  jwtVerify,
  mobileController.fetchInteriorforteam,
);

apiRoutes.post(
  "/fetchApprovalforclientbyadmin",
  jwtVerify,
  mobileController.fetchApprovalforclientbyadmin,
);
apiRoutes.post(
  "/fetchArchitectureforclientbyadmin",
  jwtVerify,
  mobileController.fetchArchitectureforclientbyadmin,
);

apiRoutes.post(
  "/fetchInteriorforclientbyadmin",
  jwtVerify,
  mobileController.fetchInteriorforclientbyadmin,
);

// deposit expense

apiRoutes.get(
  "/fetchDepositExpenseForAdmin",
  jwtVerify,
  mobileController.getDepositExpenseForAdmin,
);
apiRoutes.post(
  "/fetchProjectExpenseForAdmin",
  jwtVerify,
  mobileController.getProjectExpenseForAdmin,
);
apiRoutes.post(
  "/fetchOfficeExpenseForAdmin",
  jwtVerify,
  mobileController.getOfficeExpenseForAdmin,
);
apiRoutes.post(
  "/save-deposit-expense",
  jwtVerify,
  mobileController.addDepositexpense,
);
apiRoutes.post(
  "/save-project-expense",
  jwtVerify,
  mobileController.addProjectexpense,
);
apiRoutes.post(
  "/save-office-expense",
  jwtVerify,
  mobileController.addOfficeexpense,
);
apiRoutes.get(
  "/fetchDashboardforadmin",
  jwtVerify,
  mobileController.getDashboardforadmin,
);

apiRoutes.post(
  "/fetchAllAttendanceforAdmin",
  jwtVerify,
  mobileController.fetchAllAttendanceforAdmin,
);

apiRoutes.post(
  "/fetchAttendanceSummaryforAdmin",
  jwtVerify,
  mobileController.fetchAttendanceSummaryforAdmin,
);


apiRoutes.post(
  "/fetchAllattendance",
  jwtVerify,
  mobileController.fetchAllattendance,
);
apiRoutes.get(
  "/fecthAttendanceList",
  jwtVerify,
  mobileController.fecthAttendanceList,
);
apiRoutes.get(
  "/fetchAllLeaveforAdmin",
  jwtVerify,
  mobileController.fetchAllLeaveforAdmin,
);

apiRoutes.get("/fetchAllTeam", jwtVerify, mobileController.fetchAllTeam);
apiRoutes.get("/fetchAllClient", jwtVerify, mobileController.fetchAllClient);

apiRoutes.post(
  "/add-site-inspection",
  jwtVerify,
  mobileController.addsiteinspection,
);
apiRoutes.post("/get-projectdata", jwtVerify, mobileController.getProjectData);
apiRoutes.post(
  "/fetchsiteinspectionclientforadmin",
  jwtVerify,
  mobileController.fetchsiteinspectionclientforadmin,
);

apiRoutes.post(
  "/upload-site-inspection/:foldername",
  jwtVerify,
  _upload.any(),
  mobileController.uploadsiteinspection,
);

apiRoutes.post(
  "/fetchOfficeExpenseForEmployee",
  jwtVerify,
  mobileController.getOfficeExpenseForEmployee,
);
apiRoutes.post(
  "/fetchProjectExpenseForteam",
  jwtVerify,
  mobileController.getProjectExpenseForTeam,
);
apiRoutes.get(
  "/fetchDepositExpenseForteam",
  jwtVerify,
  mobileController.getDepositExpenseForteam,
);

apiRoutes.post(
  "/getdocumentbyteam",
  jwtVerify,
  mobileController.getdocumentbyteam,
);

// apiRoutes.get(
//   "/fetchStage",
//   jwtVerify,
//   mobileController.getStage
// );

apiRoutes.get("/fetchproject", jwtVerify, mobileController.getProject);

apiRoutes.post(
  "/fetchapprovaldcbyID",
  jwtVerify,
  mobileController.getapprovaldcbyID,
);

apiRoutes.post(
  "/fetchmobilePvbyId",
  jwtVerify,
  mobileController.getmobilePvbyId,
);

apiRoutes.post(
  "/fetchmobilefireNocbyId",
  jwtVerify,
  mobileController.getmobilefireNocbyId,
);

apiRoutes.post(
  "/fetchmobileenagarInputbyId",
  jwtVerify,
  mobileController.getmobileenagarInputbyId,
);

apiRoutes.post(
  "/fetchenagarOutputbyId",
  jwtVerify,
  mobileController.getmobileenagarOutputbyId,
);

apiRoutes.post(
  "/fetchmobileInwardDetailsbyId",
  jwtVerify,
  mobileController.getmobileInwardDetailsbyId,
);
apiRoutes.post(
  "/fetchmobileoutewardbyId",
  jwtVerify,
  mobileController.getmobileoutewardbyId,
);

apiRoutes.post(
  "/fetchmobileApprovalbyId",
  jwtVerify,
  mobileController.getmobileApprovalbyId,
);

apiRoutes.post(
  "/fetchmobilefsicfeesbyId",
  jwtVerify,
  mobileController.getmobilefsicfeesbyId,
);
apiRoutes.post(
  "/fetchmobilearchbasicDetails",
  jwtVerify,
  mobileController.fetchmobilearchbasicDetails,
);

apiRoutes.post(
  "/fetchmobilearchdrwaingbyid",
  jwtVerify,
  mobileController.mobilearchdrwaingbyid,
);

apiRoutes.post(
  "/fetchmobilearchquoationbyid",
  jwtVerify,
  mobileController.fetchmobilearchquoationbyid,
);

apiRoutes.post(
  "/fetchmobilearchSpbyid",
  jwtVerify,
  mobileController.fetchmobilearchSpbyid,
);

apiRoutes.post(
  "/fetchmobilearchConsulantsbyid",
  jwtVerify,
  mobileController.fetchmobilearchConsulantsbyid,
);

apiRoutes.post(
  "/fetchmobilearchSchedulebyid",
  jwtVerify,
  mobileController.fetchmobilearchSchedulebyid,
);

apiRoutes.post(
  "/fetchmobileCalenderSchedule",
  jwtVerify,
  mobileController.fetchmobileCalenderSchedule,
);

apiRoutes.post(
  "/fetchmobilearchDesignconceptsbyid",
  jwtVerify,
  mobileController.fetchmobilearchDesignconceptsbyid,
);

apiRoutes.post(
  "/fetchmobilearchriskbyid",
  jwtVerify,
  mobileController.fetchmobilearchriskbyid,
);

apiRoutes.get(
  "/fetchclientApproval",
  jwtVerify,
  mobileController.fetchclientApproval,
);

apiRoutes.get(
  "/fetchClientInterior",
  jwtVerify,
  mobileController.fetchClientInterior,
);

apiRoutes.get(
  "/fetchClientArchitecture",
  jwtVerify,
  mobileController.fetchClientArchitecture,
);

apiRoutes.post("/clientlogin", mobileController.clientlogin);

apiRoutes.post("/fetchpostbyid", jwtVerify, mobileController.fetchpostbyid);

apiRoutes.get("/fetchpost", jwtVerify, mobileController.fetchpost);
apiRoutes.get("/fetchAdminpost", jwtVerify, mobileController.fetchAdminpost);

apiRoutes.post("/addPost", jwtVerify, mobileController.addPost);

apiRoutes.post("/updatePost", jwtVerify, mobileController.updatePost);

apiRoutes.post(
  "/uploadpost/:foldername",
  jwtVerify,
  _upload.any(),
  mobileController.uploadpost,
);
apiRoutes.post("/delete-post", jwtVerify, mobileController.deletePost);

apiRoutes.post(
  "/AddOrUpdateCampaign",
  jwtVerify,
  mobileController.AddOrUpdateCampaign,
);

apiRoutes.post(
  "/uploadCampaign/:foldername",
  jwtVerify,
  _upload.any(),
  mobileController.uploadCampaign,
);

apiRoutes.get("/fetchcampaign", jwtVerify, mobileController.fetchcampaign);
apiRoutes.get(
  "/fetchAdmincampaign",
  jwtVerify,
  mobileController.fetchAdmincampaign,
);

apiRoutes.post(
  "/fetchcampaignbyid",
  jwtVerify,
  mobileController.fetchcampaignbyid,
);

apiRoutes.post(
  "/fetchmobileCalenderCampaign",
  jwtVerify,
  mobileController.fetchmobileCalenderCampaign,
);
apiRoutes.post("/delete-campaign", jwtVerify, mobileController.deleteCampaign);

apiRoutes.post(
  "/AddOrUpdateLeads",
  jwtVerify,
  mobileController.AddOrUpdateLeads,
);

apiRoutes.get("/fetchleads", jwtVerify, mobileController.fetchleads);

apiRoutes.post("/fetchleadsbyid", jwtVerify, mobileController.fetchleadsbyid);

apiRoutes.post("/delete-leads", jwtVerify, mobileController.deleteLeads);

apiRoutes.post(
  "/AddOrUpdateFollowups",
  jwtVerify,
  mobileController.AddOrUpdateFollowups,
);

apiRoutes.post("/fetchFollowups", jwtVerify, mobileController.fetchFollowups);

apiRoutes.post(
  "/delete-follow-ups",
  jwtVerify,
  mobileController.deleteFollowups,
);

// question
apiRoutes.post(
  "/AddOrUpdateQuestion",
  jwtVerify,
  mobileController.AddOrUpdateQuestion,
);

apiRoutes.post("/fetchQuestion", jwtVerify, mobileController.fetchQuestion);

apiRoutes.post("/delete-question", jwtVerify, mobileController.deleteQuestion);

// meeting
apiRoutes.post(
  "/AddOrUpdateMeeting",
  jwtVerify,
  mobileController.AddOrUpdateMeeting,
);

apiRoutes.post("/fetchMeeting", jwtVerify, mobileController.fetchMeeting);

apiRoutes.post("/delete-meeting", jwtVerify, mobileController.deleteMeeting);

// site visit

apiRoutes.post(
  "/AddOrUpdateSitevisit",
  jwtVerify,
  mobileController.AddOrUpdateSitevisit,
);

apiRoutes.post("/fetchSitevisit", jwtVerify, mobileController.fetchSitevisit);

apiRoutes.post(
  "/delete-site-visit",
  jwtVerify,
  mobileController.deleteSitevisit,
);

apiRoutes.post(
  "/uploadSitevist/:foldername",
  jwtVerify,
  _upload.any(),
  mobileController.uploadSitevist,
);

// proposal

apiRoutes.post(
  "/AddOrUpdateproposal",
  jwtVerify,
  mobileController.AddOrUpdateproposal,
);

apiRoutes.post("/fetchproposal", jwtVerify, mobileController.fetchproposal);

apiRoutes.post("/delete-proposal", jwtVerify, mobileController.deleteProposal);

apiRoutes.post(
  "/uploadproposal/:foldername",
  jwtVerify,
  _upload.any(),
  mobileController.uploadproposal,
);

// presentation
apiRoutes.post(
  "/AddOrUpdatepresentation",
  jwtVerify,
  mobileController.AddOrUpdatepresentation,
);

apiRoutes.post(
  "/fetchpresentation",
  jwtVerify,
  mobileController.fetchpresentation,
);

apiRoutes.post(
  "/delete-presentation",
  jwtVerify,
  mobileController.deletepresentation,
);

apiRoutes.post(
  "/uploadpresentation/:foldername",
  jwtVerify,
  _upload.any(),
  mobileController.uploadpresentation,
);

// terms nd condition

apiRoutes.post(
  "/AddOrUpdateTerms",
  jwtVerify,
  mobileController.AddOrUpdateTerms,
);

apiRoutes.post("/fetchterms", jwtVerify, mobileController.fetchterms);
apiRoutes.post("/getTaskFiledata", jwtVerify, mobileController.getTaskFiledata);
apiRoutes.post("/GetProjectPrice", jwtVerify, mobileController.GetProjectPrice);

apiRoutes.post(
  "/UpdateProjectPrice",
  jwtVerify,
  mobileController.UpdateProjectPrice,
);

apiRoutes.post(
  "/getEscrowMobileMonthlyReport",
  jwtVerify,
  mobileController.getEscrowMobileMonthlyReport,
);
apiRoutes.post(
  "/getEscrowMobileProjectReport",
  jwtVerify,
  mobileController.getEscrowMobileProjectReport,
);

apiRoutes.post(
  "/getEscrowMobileLedgerReport",
  jwtVerify,
  mobileController.getEscrowMobileLedgerReport,
);

apiRoutes.post(
  "/getEscrowMobileMonthlyReportDetail",
  jwtVerify,
  mobileController.getEscrowMobileMonthlyReportDetail,
);

apiRoutes.post(
  "/getEscrowMobileProjectReportDetail",
  jwtVerify,
  mobileController.getEscrowMobileProjectReportDetail,
);

apiRoutes.post(
  "/getEscrowMobileLedgerReportDetail",
  jwtVerify,
  mobileController.getEscrowMobileLedgerReportDetail,
);

apiRoutes.post(
  "/getMobileMonthlyReport",
  jwtVerify,
  mobileController.getMobileMonthlyReport,
);
apiRoutes.post(
  "/getMobileProjectReport",
  jwtVerify,
  mobileController.getMobileProjectReport,
);
apiRoutes.post(
  "/getMobileLedgerReport",
  jwtVerify,
  mobileController.getMobileLedgerReport,
);
apiRoutes.post(
  "/getMobileProjectReportDetail",
  jwtVerify,
  mobileController.getMobileProjectReportDetail,
);
apiRoutes.post(
  "/getMobileLedgerReportDetail",
  jwtVerify,
  mobileController.getMobileLedgerReportDetail,
);
apiRoutes.post(
  "/getMobileMonthlyReportDetail",
  jwtVerify,
  mobileController.getMobileMonthlyReportDetail,
);

apiRoutes.get(
  "/getMobileEscrowExpenses",
  jwtVerify,
  mobileController.getMobileEscrowExpenses,
);
apiRoutes.get(
  "/getMobileEscrowIncome",
  jwtVerify,
  mobileController.getMobileEscrowIncome,
);
apiRoutes.get(
  "/getMobileReceipts",
  jwtVerify,
  mobileController.getMobileReceipts,
);
apiRoutes.get(
  "/getMobilePaymentExpenses",
  jwtVerify,
  mobileController.getMobilePaymentExpenses,
);

apiRoutes.post("/getMobilePms", jwtVerify, mobileController.getMobilePms);

apiRoutes.post("/getEmpMobilePms", jwtVerify, mobileController.getEmpMobilePms);

apiRoutes.post(
  "/getMobilePmstaskById",
  jwtVerify,
  mobileController.getMobilePmstaskById,
);

apiRoutes.post("/addMobilePms", jwtVerify, mobileController.addMobilePms);

apiRoutes.get(
  "/getdepartmentshowbymobileuserid",
  jwtVerify,
  mobileController.getdepartmentshowbymobileuserid,
);

apiRoutes.get(
  "/generateMobileOperatingMeeting",
  jwtVerify,
  mobileController.generateMobileOperatingMeeting,
);

apiRoutes.get(
  "/generateMobileTacticalMeeting",
  jwtVerify,
  mobileController.generateMobileTacticalMeeting,
);

apiRoutes.get(
  "/generateMobileStrategicMeeting",
  jwtVerify,
  mobileController.generateMobileStrategicMeeting,
);

//site inspection
apiRoutes.get(
  "/get-site-inspection/:id",
  jwtVerify,
  siteinspectionController.getsitesbyid,
);
apiRoutes.get(
  "/get-client-data/:id",
  jwtVerify,
  siteinspectionController.getTotalClient,
);

apiRoutes.post(
  "/save-site-inspection/:foldername",
  jwtVerify,
  _upload.any(),
  siteinspectionController.add,
);

apiRoutes.post(
  "/update-site-inspection/:foldername",
  jwtVerify,
  _upload.any(),
  siteinspectionController.update,
);
apiRoutes.get(
  "/get-site-inspection",
  jwtVerify,
  siteinspectionController.getsites,
);

apiRoutes.post(
  "/delete-site-inspection/:id",
  jwtVerify,
  siteinspectionController.deletesite,
);

apiRoutes.get(
  "/get-site-checklist",
  jwtVerify,
  siteinspectionController.getChecklist,
);
apiRoutes.get(
  "/get-dropdown-file/:id",
  jwtVerify,
  siteinspectionController.getfileData,
);
apiRoutes.get(
  "/get-site-emplist",
  jwtVerify,
  siteinspectionController.getempsite,
);

// inward
apiRoutes.post(
  "/save-inward/:foldername",
  jwtVerify,
  _upload.any(),
  inwardController.AddInward,
);

apiRoutes.post(
  "/save-outward/:foldername",
  jwtVerify,
  _upload.any(),
  inwardController.AddOutward,
);

apiRoutes.get("/fetchAdminList", jwtVerify, inwardController.fetchAdminList);

apiRoutes.get(
  "/fetchoutwardAdminList",
  jwtVerify,
  inwardController.fetchoutwardAdminList,
);

apiRoutes.get(
  "/fetchOutwardTeamList",
  jwtVerify,
  inwardController.fetchOutwardTeamList,
);

apiRoutes.get("/fetchTeamList", jwtVerify, inwardController.fetchTeamList);

apiRoutes.post(
  "/deleteInward",
  jwtVerifyWithRoles([userRoles.admin_key]),
  inwardController.deleteInward,
);

apiRoutes.post(
  "/deleteOutWard",
  jwtVerifyWithRoles([userRoles.admin_key]),
  inwardController.deleteOutWard,
);

// campaign
apiRoutes.post(
  "/AddOrUpdateCampaign/:foldername",
  jwtVerify,
  _upload.any(),
  campaignController.AddOrUpdateCampaign,
);
apiRoutes.get("/fetchpostData", jwtVerify, campaignController.fetchpostData);

apiRoutes.get("/fetchAdminpost", jwtVerify, campaignController.fetchAdminpost);
apiRoutes.get("/fetchcampaign", jwtVerify, campaignController.fetchcampaign);
apiRoutes.get(
  "/fetchAdmincampaign",
  jwtVerify,
  campaignController.fetchAdmincampaign,
);
apiRoutes.get(
  "/fetchcampaignbyid/:id",
  jwtVerify,
  campaignController.fetchcampaignbyid,
);

apiRoutes.post(
  "/addPost/:foldername",
  jwtVerify,
  _upload.any(),
  campaignController.addPost,
);
apiRoutes.post("/StatusPost", jwtVerify, campaignController.StatusPost);
apiRoutes.post("/StatusCampaign", jwtVerify, campaignController.StatusCampaign);
apiRoutes.post(
  "/deleteCampaign/:id",
  jwtVerify,
  campaignController.deleteCampaign,
);

apiRoutes.post("/deletePost", jwtVerify, campaignController.deletePost);
apiRoutes.get(
  "/fetchpostbyid/:id",
  jwtVerify,
  campaignController.fetchpostbyid,
);
apiRoutes.post(
  "/updatePost/:foldername",
  jwtVerify,
  _upload.any(),
  campaignController.updatePost,
);

apiRoutes.post("/AddOrEditLeads", jwtVerify, campaignController.AddOrEditLeads);
apiRoutes.get(
  "/fetchAdminleads",
  jwtVerify,
  campaignController.fetchAdminleads,
);

apiRoutes.get("/fetchleads", jwtVerify, campaignController.fetchleads);

apiRoutes.get(
  "/fetchleadsbyid/:id",
  jwtVerify,
  campaignController.fetchleadsbyid,
);

apiRoutes.post("/delete-leads/:id", jwtVerify, campaignController.deleteLeads);

apiRoutes.post(
  "/delete-followups/:id",
  jwtVerify,
  campaignController.deleteFollowups,
);
apiRoutes.get(
  "/fetchFollowups/:id",
  jwtVerify,
  campaignController.fetchFollowups,
);
apiRoutes.get(
  "/fetchAdminFollowups/:id",
  jwtVerify,
  campaignController.fetchAdminFollowups,
);
apiRoutes.get(
  "/fetchFollowupsbyid/:id",
  jwtVerify,
  campaignController.fetchFollowupsbyid,
);

apiRoutes.post(
  "/AddOrUpdateFollowups",
  jwtVerify,
  campaignController.AddOrUpdateFollowups,
);

apiRoutes.post(
  "/delete-question/:id",
  jwtVerify,
  campaignController.deleteQuestion,
);
apiRoutes.get(
  "/fetchQuestion/:id",
  jwtVerify,
  campaignController.fetchQuestion,
);
apiRoutes.get(
  "/fetchAdminQuestion/:id",
  jwtVerify,
  campaignController.fetchAdminQuestion,
);
apiRoutes.get(
  "/fetchQuestiondatabyid/:id",
  jwtVerify,
  campaignController.fetchQuestionbyid,
);

apiRoutes.post(
  "/AddOrUpdateQuestion",
  jwtVerify,
  campaignController.AddOrUpdateQuestion,
);

apiRoutes.post(
  "/delete-meeting-schedule/:id",
  jwtVerify,
  campaignController.deleteMeetingSchedule,
);
apiRoutes.get(
  "/fetchMeetingSchedulebyid/:id",
  jwtVerify,
  campaignController.fetchMeetingSchedulebyid,
);
apiRoutes.get(
  "/fetchAdminMeetingSchedule/:id",
  jwtVerify,
  campaignController.fetchAdminMeetingSchedule,
);
apiRoutes.get(
  "/fetchMeetingSchedule/:id",
  jwtVerify,
  campaignController.fetchMeetingSchedule,
);

apiRoutes.post(
  "/AddOrUpdateMeetingschedule",
  jwtVerify,
  campaignController.AddOrUpdateMeetingschedule,
);

apiRoutes.post(
  "/delete-site-visit/:id",
  jwtVerify,
  campaignController.deleteSitevisit,
);
apiRoutes.get(
  "/fetchSitevisit/:id",
  jwtVerify,
  campaignController.fetchSitevisit,
);
apiRoutes.get(
  "/fetchAdminSitevisit/:id",
  jwtVerify,
  campaignController.fetchAdminSitevisit,
);
apiRoutes.get(
  "/fetchSitevisitbyid/:id",
  jwtVerify,
  campaignController.fetchSitevisitbyid,
);

apiRoutes.post(
  "/AddOrUpdateSitevisit/:foldername",
  jwtVerify,
  _upload.any(),
  campaignController.AddOrUpdateSitevisit,
);

apiRoutes.post(
  "/delete-proposal/:id",
  jwtVerify,
  campaignController.deleteProposal,
);
apiRoutes.get(
  "/fetchproposal/:id",
  jwtVerify,
  campaignController.fetchproposal,
);
apiRoutes.get(
  "/fetchAdminproposal/:id",
  jwtVerify,
  campaignController.fetchAdminproposal,
);
apiRoutes.get(
  "/fetchproposalbyid/:id",
  jwtVerify,
  campaignController.fetchproposalbyid,
);

apiRoutes.post(
  "/AddOrUpdateproposal/:foldername",
  jwtVerify,
  _upload.any(),
  campaignController.AddOrUpdateproposal,
);

apiRoutes.post(
  "/delete-presentation/:id",
  jwtVerify,
  campaignController.deletepresentation,
);

apiRoutes.get("/fetchterms/:id", jwtVerify, campaignController.fetchterms);
apiRoutes.get(
  "/fetchpresentation/:id",
  jwtVerify,
  campaignController.fetchpresentation,
);
apiRoutes.get(
  "/fetchpAdminresentation/:id",
  jwtVerify,
  campaignController.fetchpAdminresentation,
);
apiRoutes.get(
  "/fetchpresentationbyid/:id",
  jwtVerify,
  campaignController.fetchpresentationbyid,
);

apiRoutes.post(
  "/AddOrUpdatepresentation/:foldername",
  jwtVerify,
  _upload.any(),
  campaignController.AddOrUpdatepresentation,
);

//Site Condition
apiRoutes.get(
  "/get-site_condition/:id",
  jwtVerify,
  siteConditionController.get_site_condition,
);
apiRoutes.post(
  "/save-site_condition/:foldername",
  jwtVerify,
  _upload.any(),
  siteConditionController.save_site_condition,
);
apiRoutes.post(
  "/delete-site_condition-image",
  jwtVerify,
  siteConditionController.delete_site_condition,
);
apiRoutes.get(
  "/get-project-direction",
  jwtVerify,
  siteConditionController.getProjectDirection,
);
// apiRoutes.get("/skip-site_condition/:id",jwtVerify,siteConditionController.skip_site_condition);

//Tentative PDF
apiRoutes.get(
  "/get-tentative-pdf/:id",
  jwtVerify,
  tentativePdfController.getTentativePdf,
);
apiRoutes.post(
  "/delete-tentative-pdf",
  jwtVerify,
  tentativePdfController.deleteTenativePdf,
);
apiRoutes.post(
  "/save-tentative-pdf/:foldername",
  jwtVerify,
  _upload.any(),
  tentativePdfController.saveTentativePdf,
);

//Approved Plan PDF
apiRoutes.get(
  "/get-approved_plan-pdf/:id",
  jwtVerify,
  approvedPlanPdfController.getApprovedPlanPdf,
);
apiRoutes.post(
  "/delete-approved_plan-pdf",
  jwtVerify,
  approvedPlanPdfController.deleteApprovedPlanPdf,
);
apiRoutes.post(
  "/save-approved_plan-pdf/:foldername",
  jwtVerify,
  _upload.any(),
  approvedPlanPdfController.saveApprovePlanPdf,
);

//Building Bungalow details
apiRoutes.get(
  "/get-building_bungalow/:id",
  jwtVerify,
  buildingController.getBuildingData,
);
apiRoutes.post(
  "/save-building_bungalow",
  jwtVerify,
  buildingController.saveBuildingData,
);
apiRoutes.post(
  "/delete-building_bungalow",
  jwtVerify,
  buildingController.deleteBuildingData,
);
apiRoutes.get(
  "/get-project_types",
  jwtVerify,
  buildingController.getProjectTypes,
);

//Inauguration Message
apiRoutes.get(
  "/get-inauguration_message/:id",
  jwtVerify,
  inaugurationController.getInauguration,
);
apiRoutes.post(
  "/save-inauguration_message/:foldername",
  jwtVerify,
  _upload.any(),
  inaugurationController.saveInauguration,
);
apiRoutes.post(
  "/delete-inauguration_message",
  jwtVerify,
  inaugurationController.deleteInaugurationImage,
);

const myHtml = `
<html>
<body>
<table>
    <tr>
        <td>1</td>
        <td>2</td>
    </tr>
    <tr>
        <td>3</td>
        <td>4</td>
    </tr>
</table>
</body>
</html>`;

apiRoutes.get("/test_mail", async (req, res) => {
  //    await sendEmail({to:"parmardhawal2019@gmail.com",subject:"Testing mail",html:myHtml});
  res.status(200).json({ message: "Email has been sent" });
});

apiRoutes.post(
  "/users/uploadProfile",
  mdl_common.verifytoken,
  upload.single("profileImage"),
  function (req, res) {
    jwt.verify(req.token, meta.thekey, (err, auth) => {
      if (err) {
        res.json({ message: err.message, error: true });
      } else {
        var user_id = auth.id;
        if (typeof req.file == "undefined") {
          var data = {
            error: true,
            message: "Please select Image",
            data: new Object(),
          };
          res.status(201).send(data);
        } else {
          if (IMAGE_TYPES.indexOf(req.file.mimetype) == -1) {
            fs.unlink(req.file.path, function (error) {
              if (error) {
                console.log(error);
              } else {
                var data = {
                  error: true,
                  message: "Supported image formats: jpeg, jpg, jpe, png",
                  data: new Object(),
                };
                res.status(201).send(data);
              }
            });
          } else {
            var user = {
              profile_picture: req.file.path,
            };
            db.query(
              "UPDATE `users` SET ? WHERE `id` = " + user_id + "",
              user,
              function (err, r) {
                if (err) {
                  let data = {
                    error: true,
                    message: err.sqlMessage,
                    data: new Object(),
                  };
                  res.status(201).send(data);
                } else {
                  let data = {
                    error: false,
                    message: "Profile updated successfully",
                    data: user,
                  };
                  res.status(201).send(data);
                }
              },
            );
          }
        }
      }
    });
  },
);
module.exports = apiRoutes;

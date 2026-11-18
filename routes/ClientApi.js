const buildingController = require("../controllers/api/buildingController");
const siteConditionController = require("../controllers/api/siteConditionController");
const ApprovalController = require("../controllers/client_api/ApprovalController");
const LoginController = require("../controllers/client_api/LoginController");
const ProjectController = require("../controllers/client_api/ProjectController");
const InteiorController = require("../controllers/client_api/InteriorController");
const { userRoles } = require("../helpers/constants");
const { jwtVerifyWithRoles,jwtVerify } = require("../models/VerifyToken");

ClientApiRoutes = express.Router();

ClientApiRoutes.get("/test-client",(req,res)=>{
    res.status(200).json({message:"Client api is working"})
});

ClientApiRoutes.post("/login",LoginController.client_login);

ClientApiRoutes.get("/getApproval",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getApproval);
ClientApiRoutes.get("/fetchdocumentbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getDocumentbyID);
ClientApiRoutes.get("/fetchpvid/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getPvbyId);
ClientApiRoutes.get("/fetchfirenocbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getfireNocbyId);
ClientApiRoutes.get("/fetchenagarinput/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getenagarInputbyId);
ClientApiRoutes.get("/fetchenagaroutput/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getenagarOutputbyId);
ClientApiRoutes.get("/fetchinwarddetails/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getInwardDetailsbyId);
ClientApiRoutes.get("/fetchoutward/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getoutewardbyId);
ClientApiRoutes.get("/fetchapprovalbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getApprovalbyid);
ClientApiRoutes.get("/fetchallfees/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getAllfeesbyId);
ClientApiRoutes.get("/fetchworkfees/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getworkfeesbyId);
ClientApiRoutes.get("/fetchfsifees/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.getfsicfeesbyId);
ClientApiRoutes.get("/fetchicfees/:id",jwtVerifyWithRoles([userRoles.client_key]),ApprovalController.geticfeesbyId);


// Architecture
ClientApiRoutes.get("/getarchitecture",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.getArchitecture);
ClientApiRoutes.get("/get-bddata/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.fetchbddata);
ClientApiRoutes.get("/fetcharchquestionbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.Archquestionbyid);
ClientApiRoutes.get("/getarchSpacePlannigbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.getarchSpacePlannigbyid);
ClientApiRoutes.get("/getarchContractorbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.getarchContractorbyid);
ClientApiRoutes.get("/getarchQuotation/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.getarchQuotation);
ClientApiRoutes.get("/getarchFees/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.getarchFees);
ClientApiRoutes.get("/fetcharchFinaldbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.fetcharchFinaldbyid);
ClientApiRoutes.get("/fetcharchrndyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.fetcharchrndyid);
ClientApiRoutes.get("/getarch3dbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.getarch3dbyid);
ClientApiRoutes.get("/archmepfbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.archmepfbyid);
ClientApiRoutes.get("/fetcharchdrwaingbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.fetcharchdrwaingbyid);
ClientApiRoutes.get("/archstructuebyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.archstructuebyid);
ClientApiRoutes.get("/fetcharchmaterialcategorybyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.archmaterialcategorybyid);
ClientApiRoutes.get("/fetcharchschedule/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.getarchschedule);
ClientApiRoutes.get("/getarchdcbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.getarchdcbyid);
ClientApiRoutes.get("/fetcharchriskbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),ProjectController.fetcharchriskbyid);

// Interior
ClientApiRoutes.get("/getInterior",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.getInterior);
ClientApiRoutes.get("/fetchbasicdetailsbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.fetchbasicdetailsbyid);
ClientApiRoutes.get("/fetchquestionbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.questionbyid);
ClientApiRoutes.get("/fetchriskbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.fetchriskbyid);
ClientApiRoutes.get("/fetchstructuebyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.structuebyid);
ClientApiRoutes.get("/fetchmepfbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.mepfbyid);
ClientApiRoutes.get("/fetchSpacePlannigbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.getSpacePlannigbyid);
ClientApiRoutes.get("/fetchquotationbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.getQuationbyid);
ClientApiRoutes.get("/fetchContractorbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.getContractorbyid);
ClientApiRoutes.get("/fetchfessbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.getFees);
ClientApiRoutes.get("/fetchmaterialcategorybyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.materialcategorybyid);
ClientApiRoutes.get("/fetchrndyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.fetchrndyid);
ClientApiRoutes.get("/fetchdcbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.getdcbyid);
ClientApiRoutes.get("/fetchFinaldbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.fetchFinaldbyid);
ClientApiRoutes.get("/getTechnicalCategorybyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.getTechnicalCategorybyid);
ClientApiRoutes.get("/get3dCategorybyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.get3dCategorybyid);
ClientApiRoutes.get("/fetchschedule/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.getschedule);
ClientApiRoutes.post("/updateClientStatus",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.updateClientStatus);
ClientApiRoutes.get("/clientStatusbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.ClientStatusbyid);
ClientApiRoutes.post("/updateTDClientStatus",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.updateTDClientStatus);
ClientApiRoutes.get("/TDClientStatusbyid/:id",jwtVerifyWithRoles([userRoles.client_key]),InteiorController.TDClientStatusbyid);


ClientApiRoutes.get("/get-project-direction",jwtVerifyWithRoles([userRoles.client_key]),siteConditionController.getProjectDirection);
ClientApiRoutes.get("/get-project_types",jwtVerifyWithRoles([userRoles.client_key]),buildingController.getProjectTypes);

module.exports = ClientApiRoutes;
const { frontEndUrl } = require("../../helpers/constants");
const { fileStageEmailTemplate, sendEmail } = require("../../services/MailService");
const { isValidJson } = require("../../services/Utility");
const commonController = require("./commonController");

module.exports =
{
    save_enagarportal: (req, res) => {
        try {
            console.log(req.body);
            const fileDate = new Date(req.body.date); // Assuming 'd' represents each object in the 'data' array

            console.log("fileDate==>", fileDate);

            const createdDate = new Date(getCurrentDateAndTime());
            console.log("createdDate-->", createdDate);

            // Calculate the difference in milliseconds between the two dates
            const timeDifference = Math.abs(createdDate - fileDate);
            console.log("timeDifference-->", timeDifference);

            // Convert the time difference from milliseconds to days
            const differenceInDays = Math.ceil(
              timeDifference / (1000 * 60 * 60 * 24)
            );
            console.log("differenceInDays-->", differenceInDays);

            // Assign red or green card based on the condition
            let cardColor;
            if (differenceInDays <= 17 ) {
              // If the difference is 0 or 17  days, give a green card
              cardColor = "green";
            } else if (differenceInDays > 17 ) {
              // If the difference is greater than 17  days, give a red card
              cardColor = "red";
            } else {
              cardColor = "red";
            }

            const data = {
                mst_company_id: req.user?.comp_id,
                mst_file_id: req.body?.mst_file_id,
                drawing_assign_date: req.body?.drawing_assign_date,
                completed_date: req.body?.completed_date,
                completed_date2: req.body?.completed_date2,
                upload_date: req.body?.upload_date,
                application_number: req.body?.application_number,
                assign_application_number: req.body?.assign_application_number,
                pdf_received_date: req.body?.pdf_received_date,
                assign_pdf_received_date: req.body?.assign_pdf_received_date,
                smc_checking_date: req.body?.smc_checking_date,
                assign_smc_checking_date: req.body?.assign_smc_checking_date,
                smc_upload_date: req.body?.smc_upload_date,
                approve_date: req.body?.approve_date,
                assign_approve_date: req.body?.assign_approve_date,
                assign_liasoner: req.body?.assign_liasoner,
                assign_planner: req.body?.assign_planner,
                login: req.body?.login,
                password: req.body?.password,
                card:cardColor,
                remark_by_hod:req.body?.remark_by_hod,
                remark_by_emp:req.body?.remark_by_emp,
                approved_by_hod:req.body?.approved_by_hod === "Yes" ? 1 : 0,
                created_at: getCurrentDateAndTime(),
                created_by: req.user?.id
            }

            db.query("SELECT *from `file_enagar_portal` WHERE `mst_file_id`=" + data.mst_file_id + " and `is_rejected`=0", (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(200).json({ message: err.sqlMessage, error: true, data: {} })
                } else if (result.length > 0) {
                    //Update

                    const updatedData = {
                        drawing_assign_date: req.body?.drawing_assign_date ? req.body?.drawing_assign_date : result[0]?.drawing_assign_date,
                        completed_date: req.body?.completed_date ? req.body?.completed_date : result[0]?.completed_date,
                        completed_date2: req.body?.completed_date2 ? req.body?.completed_date2 : result[0]?.completed_date2,
                        upload_date: req.body?.upload_date ? req.body?.upload_date : result[0]?.upload_date,
                        application_number: req.body?.application_number ? req.body?.application_number : result[0]?.application_number,
                        assign_application_number: req.body?.assign_application_number ? req.body?.assign_application_number : result[0]?.assign_application_number,
                        pdf_received_date: req.body?.pdf_received_date ? req.body?.pdf_received_date : result[0]?.pdf_received_date,
                        assign_pdf_received_date: req.body?.assign_pdf_received_date ? req.body?.assign_pdf_received_date : result[0]?.assign_pdf_received_date,
                        smc_checking_date: req.body?.smc_checking_date ? req.body?.smc_checking_date : result[0]?.smc_checking_date,
                        assign_smc_checking_date: req.body?.assign_smc_checking_date ? req.body?.assign_smc_checking_date : result[0]?.assign_smc_checking_date,
                        smc_upload_date: req.body?.smc_upload_date ? req.body?.smc_upload_date : result[0]?.smc_upload_date,
                        approve_date: req.body?.approve_date ? req.body?.approve_date : result[0]?.approve_date,
                        assign_approve_date: req.body?.assign_approve_date ? req.body?.assign_approve_date : result[0]?.assign_approve_date,
                        assign_liasoner: req.body?.assign_liasoner ? req.body?.assign_liasoner : result[0]?.assign_liasoner,
                        assign_planner: req.body?.assign_planner ? req.body?.assign_planner : result[0]?.assign_planner,
                        login: req.body?.login ? req.body?.login : result[0]?.login,
                        password: req.body?.password ? req.body?.password : result[0]?.password,
                        remark_by_hod:req.body?.remark_by_hod,
                        remark_by_emp:req.body?.remark_by_emp,
                        card: req.body.card ? req.body.card : cardColor,
                        approved_by_hod:req.body?.approved_by_hod === "Yes" ? 1 : 0,
                        updated_at: getCurrentDateAndTime(),
                        updated_by: req.user?.id
                    }

                    var sql = "UPDATE `file_enagar_portal` SET ? WHERE `mst_file_id`=" + req.body?.mst_file_id + " and `is_rejected`=0";

                    db.query(sql, updatedData, (err, result) => {
                        if (err) {
                            console.log(err);
                            res.status(200).json({ message: err.sqlMessage, error: true, data: {} })
                        } else {
                            res.status(200).json({ message: "Changes saved!", error: false, data: {} })
                        }
                    });


                } else {
                    //Insert

                    var sql = "INSERT INTO `file_enagar_portal` SET ?"

                    db.query(sql, data, (err, result) => {
                        if (err) {
                            console.log(err);
                            res.status(200).json({ message: err.sqlMessage, error: true, data: {} })
                        } else {
                            res.status(200).json({ message: "Changes saved!", error: false, data: {} })
                        }
                    })

                }
            });


        }
        catch (err) {
            console.log(err);
            res.status(200).json({ message: "Server error", error: true, data: {} });
        }
    },
    save_and_next_enagarportal: (req, res) => {
        try {
            console.log(req.body);
            const data = req.body;
            console.log("datatata===>",data)

            let updatedData = {};
            
            var sql = "SELECT *from `file_enagar_portal` WHERE `mst_file_id`="+data?.mst_file_id+" and `is_rejected`=0";
            const fileDate = new Date(req.body.date); // Assuming 'd' represents each object in the 'data' array

            console.log("fileDate==>", fileDate);

            const createdDate = new Date(getCurrentDateAndTime());
            console.log("createdDate-->", createdDate);

            // Calculate the difference in milliseconds between the two dates
            const timeDifference = Math.abs(createdDate - fileDate);
            console.log("timeDifference-->", timeDifference);

            // Convert the time difference from milliseconds to days
            const differenceInDays = Math.ceil(
              timeDifference / (1000 * 60 * 60 * 24)
            );
            console.log("differenceInDays-->", differenceInDays);

            // Assign red or green card based on the condition
            let cardColor;
            if (differenceInDays <= 17 ) {
              // If the difference is 0 or 17  days, give a green card
              cardColor = "green";
            } else if (differenceInDays > 17 ) {
              // If the difference is greater than 17  days, give a red card
              cardColor = "red";
            } else {
              cardColor = "red";
            }


            db.query(sql,(err,result)=>{
                if(err)
                {
                    res.status(200).json({message:err.sqlMessage,error:false,data:{}})
                }else if(result.length>0)
                {
                    if(data?.is_save == "type1")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            drawing_assign_date : data?.drawing_assign_date,
                            assign_planner : data?.assign_planner,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:0},type3:{is_save:0},type4:{is_save:0},type5:{is_save:0},type6:{is_save:0}}),
                            updated_at:getCurrentDateAndTime(),
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            card:cardColor,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            updated_by : req.user?.id
                        }
                    }
                    else if(data?.is_save == "type2")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            completed_date2 : data?.completed_date2,
                            assign_liasoner : data?.assign_liasoner,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:1},type3:{is_save:0},type4:{is_save:0},type5:{is_save:0},type6:{is_save:0}}),
                            updated_at:getCurrentDateAndTime(),
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            card:cardColor,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            updated_by : req.user?.id
                        }
                    }
                    else if(data?.is_save == "type3")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            login : data?.login,
                            password : data?.password,
                            application_number : data?.application_number,
                            assign_application_number : data?.assign_application_number,
                            upload_date : data?.upload_date,
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            card:cardColor,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:1},type3:{is_save:1},type4:{is_save:0},type5:{is_save:0},type6:{is_save:0}}),
                            updated_at:getCurrentDateAndTime(),
                            updated_by : req.user?.id
                        }
                    }
                    else if(data?.is_save == "type4")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            pdf_received_date : data?.pdf_received_date,
                            assign_pdf_received_date : data?.assign_pdf_received_date,
                            updated_at:getCurrentDateAndTime(),
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            card:cardColor,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:1},type3:{is_save:1},type4:{is_save:1},type5:{is_save:0},type6:{is_save:0}}),
                            updated_by : req.user?.id
                        }
                    }
                    else if(data?.is_save == "type5")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            smc_checking_date : data?.smc_checking_date,
                            assign_smc_checking_date : data?.assign_smc_checking_date,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:1},type3:{is_save:1},type4:{is_save:1},type5:{is_save:1},type6:{is_save:0}}),
                            updated_at:getCurrentDateAndTime(),
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            card:cardColor,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            updated_by : req.user?.id
                        }
                    }
                    else if(data?.is_save == "type6")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            smc_upload_date : data?.smc_upload_date,
                            assign_approve_date : data?.assign_approve_date,
                            approve_date : data?.approve_date,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:1},type3:{is_save:1},type4:{is_save:1},type5:{is_save:1},type6:{is_save:1}}),
                            is_save:1,
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            card:cardColor,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            updated_at:getCurrentDateAndTime(),
                            updated_by : req.user?.id
                        }
                    }

                        var sql = "UPDATE `file_enagar_portal` SET ? WHERE `mst_file_id`="+data?.mst_file_id+" and `is_rejected`=0";

                        db.query(sql,updatedData,async (err,result)=>{
                            if(err){
                                console.log(err);
                                res.status(200).json({message:err.sqlMessage,data:{},error:true});
                            }else{
                                if(data?.is_save=="type6"){
                                    const fileData = await commonController.getMstFileByMstFileId(data?.mst_file_id);
                                    /*Send Email*/
                                    await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"E Nagar Portal",to_stage:"Owner Portal",url:`${frontEndUrl.FileStageRouteUrl}/${data?.mst_file_id}`})});
                                    
                                    commonController.setTeamToMstFile(data?.assign_approve_date,data?.mst_file_id);
                                    commonController.updateMstFileStage(6,data?.mst_file_id);
                                    
                                    res.status(200).json({message:"Changes saved!",data:{skip:1},error:false});
                                }else{
                                    if(data?.is_save=="type1"){
                                        commonController.setTeamToMstFile(data?.assign_planner,data?.mst_file_id);
                                    }
                                    else if(data?.is_save=="type2"){
                                        commonController.setTeamToMstFile(data?.assign_liasoner,data?.mst_file_id);
                                    }
                                    else if(data?.is_save=="type3"){
                                        commonController.setTeamToMstFile(data?.assign_application_number,data?.mst_file_id);
                                    }
                                    else if(data?.is_save=="type4"){
                                        commonController.setTeamToMstFile(data?.assign_pdf_received_date,data?.mst_file_id);
                                    }
                                    else if(data?.is_save=="type5"){
                                        commonController.setTeamToMstFile(data?.assign_smc_checking_date,data?.mst_file_id);
                                    }
                                    else if(data?.is_save=="type6"){
                                        commonController.setTeamToMstFile(data?.assign_approve_date,data?.mst_file_id);
                                    }
                                    
                                    res.status(200).json({message:"Changes saved!",data:{skip:0},error:false});
                                }
                            }
                        });

                }
                else
                {

                    if(data?.is_save == "type1")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            drawing_assign_date : data?.drawing_assign_date,
                            assign_planner : data?.assign_planner,
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:0},type3:{is_save:0},type4:{is_save:0},type5:{is_save:0},type6:{is_save:0}}),
                            created_at:getCurrentDateAndTime(),
                            created_by : req.user?.id
                        }
                    }
                    else if(data?.is_save == "type2")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            completed_date2 : data?.completed_date2,
                            assign_liasoner : data?.assign_liasoner,
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:1},type3:{is_save:0},type4:{is_save:0},type5:{is_save:0},type6:{is_save:0}}),
                            created_at:getCurrentDateAndTime(),
                            created_by : req.user?.id
                        } 
                    }
                    else if(data?.is_save == "type3")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            login : data?.login,
                            password : data?.password,
                            application_number : data?.application_number,
                            assign_application_number : data?.assign_application_number,
                            upload_date : data?.upload_date,
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:1},type3:{is_save:1},type4:{is_save:0},type5:{is_save:0},type6:{is_save:0}}),
                            created_at:getCurrentDateAndTime(),
                            created_by : req.user?.id
                        }
                    }
                    else if(data?.is_save == "type4")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            pdf_received_date : data?.pdf_received_date,
                            assign_pdf_received_date : data?.assign_pdf_received_date,
                            created_at:getCurrentDateAndTime(),
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:1},type3:{is_save:1},type4:{is_save:1},type5:{is_save:0},type6:{is_save:0}}),
                            created_by : req.user?.id
                        }
                    }
                    else if(data?.is_save == "type5")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            smc_checking_date : data?.smc_checking_date,
                            assign_smc_checking_date : data?.assign_smc_checking_date,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:1},type3:{is_save:1},type4:{is_save:1},type5:{is_save:1},type6:{is_save:0}}),
                            created_at:getCurrentDateAndTime(),
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            created_by : req.user?.id
                        }
                    }
                    else if(data?.is_save == "type6")
                    {
                        updatedData = {
                            mst_company_id : req.user?.comp_id,
                            smc_upload_date : data?.smc_upload_date,
                            assign_approve_date : data?.assign_approve_date,
                            approve_date : data?.approve_date,
                            type_save : JSON.stringify({type1:{is_save:1},type2:{is_save:1},type3:{is_save:1},type4:{is_save:1},type5:{is_save:1},type6:{is_save:1}}),
                            is_save:1,
                            remark_by_hod:data?.remark_by_hod,
                            remark_by_emp:data?.remark_by_emp,
                            approved_by_hod:data?.approved_by_hod === "Yes" ? 1 : 0,
                            created_at:getCurrentDateAndTime(),
                            created_by : req.user?.id
                        }
                    }

                        var sql = "INSERT INTO `file_enagar_portal` SET ? ";

                        db.query(sql,{...updatedData,mst_file_id:data?.mst_file_id},async (err,result)=>{
                            if(err){
                                res.status(200).json({message:err.sqlMessage,data:{},error:true});
                                console.log(err);
                            }else{
                                if(data?.is_save=="type6"){
                                    const fileData = await commonController.getMstFileByMstFileId(data?.mst_file_id);
                                    /*Send Email*/
                                    await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"E Nagar Portal",to_stage:"Owner Portal",url:`${frontEndUrl.FileStageRouteUrl}/${data?.mst_file_id}`})});
                                    
                                    commonController.setTeamToMstFile(data?.assign_approve_date,data?.mst_file_id);
                                  
                                    commonController.updateMstFileStage(6,data?.mst_file_id);
                                    
                                    res.status(200).json({message:"Changes saved!",data:{skip:1},error:false});
                                }else{
                                    if(data?.is_save=="type1"){
                                        commonController.setTeamToMstFile(data?.assign_planner,data?.mst_file_id);
                                    }
                                    else if(data?.is_save=="type2"){
                                        commonController.setTeamToMstFile(data?.assign_liasoner,data?.mst_file_id);
                                    }
                                    else if(data?.is_save=="type3"){
                                        commonController.setTeamToMstFile(data?.assign_application_number,data?.mst_file_id);
                                    }
                                    else if(data?.is_save=="type4"){
                                        commonController.setTeamToMstFile(data?.assign_pdf_received_date,data?.mst_file_id);
                                    }
                                    else if(data?.is_save=="type5"){
                                        commonController.setTeamToMstFile(data?.assign_smc_checking_date,data?.mst_file_id);
                                    }
                                    else if(data?.is_save=="type6"){
                                        commonController.setTeamToMstFile(data?.assign_approve_date,data?.mst_file_id);
                                    }

                                    res.status(200).json({message:"Changes saved!",data:{skip:0},error:false});
                                }
                            }
                        });

                }
            });
        }
        catch (err) {
            console.log(err);
            res.status(200).json({ message: "Server error", error: true, data: {} });
        }
    },
    skip_enagar_portal: (req, res) => {
        try {
            const mst_file_id = req?.params?.id;

            var sql = "SELECT *from `file_enagar_portal` WHERE `mst_file_id`=" + mst_file_id + " and `is_rejected`=0";

            db.query(sql, (err, result) => {
                if (err) {
                    console.log(err);
                }
                else if (result.length > 0) {

                    const jsonObject = isValidJson(result[0]?.type_save);
                    let skipJsonObject = isValidJson(result[0]?.is_skip);

                    if (skipJsonObject == null) {
                        skipJsonObject = { type1: { is_skip: 0 }, type2: { is_skip: 0 }, type3: { is_skip: 0 }, type4: { is_skip: 0 }, type5: { is_skip: 0 }, type6: { is_skip: 0 } }
                    }


                    if (jsonObject != null) {

                        // console.log(jsonObject.type1.is_save);

                        let skipData =
                        {
                            ...jsonObject
                        }


                        let nextStage = 0;


                        if (jsonObject?.type1?.is_save == 0) {

                            skipData = { ...jsonObject, type1: { is_save: 1 } }
                            skipJsonObject = { ...skipJsonObject, type1: { is_skip: 1 } }

                        } else if (jsonObject?.type2?.is_save == 0) {
                            skipData = { ...jsonObject, type2: { is_save: 1 } }
                            skipJsonObject = { ...skipJsonObject, type2: { is_skip: 1 } }

                        } else if (jsonObject?.type3?.is_save == 0) {
                            skipData = { ...jsonObject, type3: { is_save: 1 } }
                            skipJsonObject = { ...skipJsonObject, type3: { is_skip: 1 } }
                        } else if (jsonObject?.type4?.is_save == 0) {
                            skipData = { ...jsonObject, type4: { is_save: 1 } }
                            skipJsonObject = { ...skipJsonObject, type4: { is_skip: 1 } }
                        } else if (jsonObject?.type5?.is_save == 0) {
                            skipData = { ...jsonObject, type5: { is_save: 1 } }
                            skipJsonObject = { ...skipJsonObject, type5: { is_skip: 1 } }
                        } else if (jsonObject?.type6?.is_save == 0) {
                            nextStage = 1
                            skipData = { ...jsonObject, type6: { is_save: 1 } }
                            skipJsonObject = { ...skipJsonObject, type6: { is_skip: 1 } }
                        } else {
                            nextStage = 0
                        }

                        const jsonString = JSON.stringify(skipData);
                        const skipJsonString = JSON.stringify(skipJsonObject);

                        const updatedData = {
                            type_save: jsonString,
                            is_skip: skipJsonString,
                            updated_at: getCurrentDateAndTime(),
                            updated_by: req?.user?.id
                        }

                        var sql = "UPDATE `file_enagar_portal` SET ? WHERE `mst_file_id`=" + mst_file_id + " and `is_rejected`=0";

                        db.query(sql, updatedData, (err, result) => {
                            if (err) {
                                res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                            }
                            else {

                                if (nextStage) {
                                    commonController.updateMstFileStage(6, mst_file_id);
                                }

                                res.status(200).json({ message: "Skipped", error: false, data: { nextStage: nextStage } });
                            }
                        })

                    } else {
                        res.status(200).json({ message: "Unable to Skip", error: true, data: {} });
                    }
                } else {
                    console.log("Data does not existed");
                    res.status(200).json({ message: "Unable to Skip", error: true, data: {} });
                }
            });

        }
        catch (err) {
            console.log(err);
            res.status(200).json({ message: "Server error", error: true, data: {} });
        }
    },
    reject_enagar_portal: (req, res) => {
        // var mst_file_id = req.params.id;

        try {

            var mst_file_id = req?.body?.mst_file_id;
            var reason = req?.body?.reason;

            if (!mst_file_id) {
                res.status(201).json({ error: true, message: "ID is required", data: {} });
            }
            else {
                var sql = "SELECT MAX(`is_rejected`) as `last_rejected_number` FROM `file_enagar_portal` where `mst_file_id`=" + parseInt(mst_file_id) + "";
                db.query(sql, (err, max) => {
                    if (err) {
                        console.log(err);
                        res.status(201).json({ error: true, message: err.sqlMessage, data: {} })
                    } else {
                        var lastRejectedValue = parseInt(max[0].last_rejected_number);
                        console.log("lastRejectedValue-" + lastRejectedValue);
                        // var sql = "UPDATE `file_enagar_portal` SET `is_rejected`=?,`updated_by`=?,`updated_at`=? WHERE `mst_file_id`=? and `is_rejected`=0";
                        // const data = [(lastRejectedValue + 1), parseInt(req.user.id), getCurrentDateAndTime(), parseInt(mst_file_id)];
                        const data = {
                            is_rejected: lastRejectedValue + 1,
                            updated_by: req?.user?.id,
                            reason: reason ? reason : null,
                            updated_at: getCurrentDateAndTime(),
                        };
                        var sql = "UPDATE `file_enagar_portal` SET ? WHERE `mst_file_id`=" + mst_file_id + " and `is_rejected`=0";
                        db.query(sql, data, async (err, result) => {
                            if (err) {
                                console.log(err);
                                res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
                            } else {
                                commonController.initialEntry_to_enagar_portal(parseInt(req.user.comp_id), parseInt(mst_file_id), parseInt(req.user.id));
                                commonController.revertTeamToMstFile(parseInt(mst_file_id), async (teamId) => {

                                    /*Sending Notification*/
                                    try {
                                        const fileData = await commonController.getMstFileByMstFileId(parseInt(mst_file_id));
                                        // notificationController.setNotification
                                        // (
                                        // 	JSON.stringify({message:`${fileData[0]?.file_name} has been rejected by`,action:"Plot validation certificate Rejected",mst_file_id:parseInt(mst_file_id)}),
                                        // 	teamId,
                                        // 	parseInt(req?.user?.id),
                                        // 	parseInt(mst_file_id),
                                        // 	fileData[0]?.cus_id
                                        // );	
                                    }
                                    catch (err) {
                                        console.log(err);
                                        console.log(`${line}Error while sending the notification\n${line}`);
                                    }


                                    try {
                                        res.status(201).json({ error: false, message: "Changes rejected", data: { team_id: teamId } });
                                    } catch (err) {
                                        console.log(err);
                                        res.status(201).json({ error: false, message: "Changes rejected", data: { team_id: 0 } });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
        catch (err) {
            console.log(err);
            res.status(200).json({ message: "Server error", error: true, data: {} });
        }
    }
}
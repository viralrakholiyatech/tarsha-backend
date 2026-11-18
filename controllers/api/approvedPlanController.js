const { frontEndUrl } = require("../../helpers/constants");
const { unlinkMultipleImages, getImageWithFoldername } = require("../../services/FileService");
const { sendEmail, fileStageEmailTemplate } = require("../../services/MailService");
const { filter_string } = require("../../services/Utility");
const commonController = require("./commonController");

module.exports =
{
    // getApprovedPlan: (req, res) => {
    //     try {
    //         const mst_file_id = req.params?.id;

    //         const key = "plan";

    //         var sql1 = "SELECT * FROM `mst_document` WHERE `category`='" + key + "'";
    //         var sql2 = "SELECT `id`,`mst_company_id`,`mst_file_id`,`mst_document_id`,`document_name`,`show_website`,`document_path`,`is_save` FROM `file_approved_plan` WHERE `mst_file_id`=" + mst_file_id + " and `is_deleted`=0";

    //         db.query(`${sql1};${sql2}`, (err, result) => {
    //             if (err) {
    //                 console.log(err);
    //                 res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
    //             } else {

    //                 const arr1 = result[0];
    //                 const arr2 = result[1];

    //                 let finalData = [...arr2];

    //                 arr1.forEach((arr1_element, arr1_index) => {
    //                     if (!arr2.some((arr2_element) => arr2_element?.mst_document_id == arr1_element?.id)) {
    //                         const newObj = {
    //                             id:null,
    //                             mst_company_id: null,
    //                             mst_file_id: mst_file_id,
    //                             mst_type_id: arr1_element?.id,
    //                             description: arr1_element?.type_name,
    //                             show_website: 0,
    //                             document_path: null,
    //                             is_save: 0
    //                         }

    //                         finalData = [...finalData, newObj];
    //                     }
    //                 })
    //                 res.status(200).json({ message: "Record fetched", data: finalData, error: false });
    //             }
    //         })
    //     }
    //     catch (err) {
    //         console.log(err);
    //         res.status(200).json({ message: "Server error", data: {}, error: true });
    //     }


    // },
    // getApprovedPlan: (req, res) => {
    //     try {
    //         const mst_file_id = req.params?.id;

    //         const key = "plan";

    //         var sql1 = "SELECT * FROM `mst_document` WHERE `category`='" + key + "'";
    //         var sql2 = "SELECT `id`,`mst_company_id`,`mst_file_id`,`mst_document_id`,`document_name`,`show_website`,`document_path`,`is_save` FROM `file_approved_plan` WHERE `mst_file_id`=" + mst_file_id + " and `is_deleted`=0";

    //         db.query(`${sql1};${sql2}`, (err, result) => {
    //             if (err) {
    //                 console.log(err);
    //                 res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
    //             } else {

    //                 const arr1 = result[0];
    //                 const arr2 = result[1];

    //                 let finalData = [...arr2];

    //                 arr1.forEach((arr1_element, arr1_index) => {
    //                     if (!arr2.some((arr2_element) => arr2_element?.mst_document_id == arr1_element?.id)) {
    //                         const newObj = {
    //                             id:null,
    //                             mst_company_id: null,
    //                             mst_file_id: mst_file_id,
    //                             mst_document_id: arr1_element?.id,
    //                             document_name: arr1_element?.doc_name,
    //                             show_website: 0,
    //                             document_path: null,
    //                             is_save: 0
    //                         }

    //                         finalData = [...finalData, newObj];
    //                     }
    //                 })
    //                 res.status(200).json({ message: "Record fetched", data: finalData, error: false });
    //             }
    //         })
    //     }
    //     catch (err) {
    //         console.log(err);
    //         res.status(200).json({ message: "Server error", data: {}, error: true });
    //     }


    // },

    getApprovedPlan: (req, res) => {
        try {
            const mst_file_id = req.params?.id;
    
            const key = "plan";
    
            var sql1 = "SELECT * FROM `mst_document` WHERE `category`='" + key + "'";
            var sql2 = "SELECT `id`,`mst_company_id`,`card`,`remark_by_emp`,`created_at`,`remark_by_hod`,`approved_by_hod`,`mst_file_id`,`mst_document_id`,`document_name`,`show_website`,`document_path`,`is_save` FROM `file_approved_plan` WHERE `mst_file_id`=" + mst_file_id + " and `is_deleted`=0";
    
            db.query(sql1, (err1, result1) => {
                if (err1) {
                    console.log(err1);
                    res.status(500).json({ message: err1.sqlMessage, error: true, data: {} });
                } else {
                    db.query(sql2, (err2, result2) => {
                        if (err2) {
                            console.log(err2);
                            res.status(500).json({ message: err2.sqlMessage, error: true, data: {} });
                        } else {
                            const arr1 = result1;
                            const arr2 = result2;
    
                            let finalData = [...arr2];
    
                            arr1.forEach((arr1_element, arr1_index) => {
                                if (!arr2.some((arr2_element) => arr2_element?.mst_document_id == arr1_element?.id)) {
                                    const newObj = {
                                        id: null,
                                        mst_company_id: null,
                                        mst_file_id: mst_file_id,
                                        mst_document_id: arr1_element?.id,
                                        document_name: arr1_element?.doc_name,
                                        show_website: 0,
                                        document_path: null,
                                        is_save: 0
                                    }
    
                                    finalData = [...finalData, newObj];
                                }
                            })
                            res.status(200).json({ message: "Record fetched", data: finalData, error: false });
                        }
                    });
                }
            });
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: "Server error", data: {}, error: true });
        }
    },
    
    save_approved_plan:async  (req, res) => {
        try {
            const data = JSON.parse(req.body?.data);
            const allData = data;
            const approvedByHod = Array.isArray(req.body.approved_by_hod) ? req.body.approved_by_hod[0] : req.body.approved_by_hod;
            const date = Array.isArray(req.body.date) ? req.body.date[0] : req.body.date;
console.log("req.bodyd===>",req.body)
            const fileDate = new Date(date); // Assuming 'd' represents each object in the 'data' array

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
            if (differenceInDays <= 1 ) {
              // If the difference is 0 or 1  days, give a green card
              cardColor = "green";
            } else if (differenceInDays > 1 ) {
              // If the difference is greater than 1  days, give a red card
              cardColor = "red";
            } else {
              cardColor = "red";
            }


            console.log(allData);
            console.log(req.files);

            const is_save = req.body?.is_save;
            const mst_file_id = data[0]?.mst_file_id;

            const filePathArray = [];
            var paths = [];

            if(req?.files.length>0)
            {
                req.files.forEach((f)=>{
                    filePathArray.push({fieldname:f?.fieldname,path:getImageWithFoldername(f?.path)});
                    paths.push(getImageWithFoldername(f?.path));
                });  
            }

            try{    

                var shouldUpdateStage = true;

                if(Array.isArray(allData))
                {
                    for (let d of allData) 
                    {
                        let documents = "";

                        if(filePathArray.length && Array.isArray(filePathArray)){
                            filePathArray.forEach((p)=>{
                                 if(p?.fieldname.split("_")[0]==d?.index){
                                    documents = p?.path
                                 }   
                            });
                        }

                        const values = {
                            id : d?.id!=null ? d?.id : null,
                            mst_company_id : req.user?.comp_id ? req.user?.comp_id : null,
                            mst_file_id : d?.mst_file_id,
                            mst_document_id : d?.mst_document_id!=null ? d?.mst_document_id  :null, 
                            document_name : d?.document_name && d?.document_name?.length>0 ? filter_string(d?.document_name?.trim())  : null,
                            document_path: documents ? "approved_plan/"+documents : null,
                            remark_by_hod:req.body.remark_by_hod,
                            remark_by_emp:req.body.remark_by_emp,
                            approved_by_hod:approvedByHod === "Yes" ? 1 : 0,
                            is_save : is_save,
                            // card: req.body.card ? req.body.card : cardColor,
                            card: req.body.card || cardColor,

                            show_website: d?.show_website == 1 || d?.show_website == 0 ? d?.show_website : 0,
                            created_at : getCurrentDateAndTime(),
                            created_by : req.user?.id
                        }

                        if(values.id!=null)
                        {
                            //Update

                            var sql = "SELECT *from `file_approved_plan` WHERE `id`="+values.id+"";

                            db.query(sql,(err,result)=>{
                                if(err)
                                {
                                    console.log(err);
                                }
                                else if(result.length>0)
                                {

                                    if(result[0]?.is_save==1 || result[0]?.is_skip==1){
                                        delete values.is_save;
                                    }
                                    
                                    delete values?.mst_file_id;
                                    delete values.created_at
                                    delete values.created_by

                                    const updatedData = {
                                            ...values,
                                            updated_at : getCurrentDateAndTime(),
                                            updated_by : req.user?.id,
                                            document_path:values?.document_path!=null?  values?.document_path : result[0]?.document_path
                                    } 

                                    var sql = "UPDATE `file_approved_plan` SET ? WHERE `id`="+values.id+"";

                                    db.query(sql,updatedData,(err,result)=>{
                                        if(err){
                                            console.log(err);
                                        }
                                    });
                                }
                            });
                            

                        }else{
                            //Insert
                            delete values.id;

                            var sql = "INSERT INTO `file_approved_plan` SET ?";
                            shouldUpdateStage = true;
                            db.query(sql,values,(err,result)=>{
                                if(err){console.log(err)}
                            });
                        }
                        
                    }
                }
              
                if(is_save==1)
                {
                    const fileData = await commonController.getMstFileByMstFileId(parseInt(mst_file_id));
                                
                    /*Send Email*/
                    await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Work Fee",to_stage:"Approved Plan",url:`${frontEndUrl.FileStageRouteUrl}/${mst_file_id}`})});

                    commonController.updateMstFileStage(18,mst_file_id);
                    res.status(200).json({ message: "Changes saved!", error: false, data: {is_save:1} });
                
                }
                else
                {
                    res.status(200).json({ message: "Changes saved!", error: false, data: {is_save:0} });
                }

            }
            catch(err){
                console.log(err);
                paths.length ? unlinkMultipleImages(paths):""
                res.status(200).json({ message: "Unable to save", data: {}, error: true });
            }


        }
        catch (err) {
            console.log(err);
            paths.length ? unlinkMultipleImages(paths):""
            res.status(200).json({ message: "Server error", data: {}, error: true });
        }
    },
    delete_approved_plan_byid:(req,res)=>{
        try
        {
            const id  = req?.params?.id;

            db.query("UPDATE `file_approved_plan` SET ? WHERE `id`="+id+"",{is_deleted:1,updated_at:getCurrentDateAndTime(),updated_by:req.user?.id},(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessag,error:true,data:{}});
                }else{
                    res.status(200).json({message:"Removed!",error:false,data:{}});
                }
            }); 

            
        }
        catch(err)
        {
            console.log(err);
            res.status(200).json({ message: "Server error", data: {}, error: true });
        }
    },
    save_and_next_approved_plan: (req, res) => {
        try {
            res.status(200).json({ message: "Under the development stage", data: {}, error: true });
        }
        catch (err) {
            console.log(err);
            res.status(200).json({ message: "Server error", data: {}, error: true });
        }
    },
    skip_approved_plan: (req, res) => {
        try {

            const mst_file_id = req.params?.id;

            var sql ="SELECT *from `file_approved_plan` WHERE `mst_file_id`="+mst_file_id+" and `is_deleted`=0";

            db.query(sql,(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else if(result.length>0){

                   const shouldUpdateStage = result.some((e)=>e?.is_skip==1||e?.is_save==1);

                   console.log(shouldUpdateStage);

                    //No need to update the stage
                    const data = {
                        is_save:1,
                        is_skip:1,
                        updated_at: getCurrentDateAndTime(),
                        updated_by:req.user?.id
                    }

                    var sql = "UPDATE `file_approved_plan` SET ? WHERE `mst_file_id`="+mst_file_id+" and `is_deleted`=0";

                    db.query(sql,data,(err,result)=>{
                        if(err){
                            res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                        }else {
                            if(!shouldUpdateStage){
                                commonController.updateMstFileStage(18,mst_file_id);
                            }
                            res.status(200).json({message:"You've skipped",error:false,data:{skip:!shouldUpdateStage ? 1 :0}});
                        }
                    })
                }else{
                    commonController.updateMstFileStage(18,mst_file_id);
                    commonController.initialEntry_to_approved_plan(mst_file_id,req.user?.id,1);
                    res.status(200).json({message:"You've skipped",error:false,data:{skip:1}});
                }
            })
        }   
        catch (err) {
            console.log(err);
            res.status(200).json({ message: "Server error", data: {}, error: true });
        }
    }
}
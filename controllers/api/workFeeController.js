const { frontEndUrl } = require("../../helpers/constants");
const { fileStageEmailTemplate, sendEmail } = require("../../services/MailService");
const commonController = require("./commonController");

module.exports = 
{
    save_work_fee:(req,res)=>{
        try
        {
            console.log("datata==>",req.body)

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
            if (differenceInDays <= 1 ) {
              // If the difference is 0 or 1  days, give a green card
              cardColor = "green";
            } else if (differenceInDays > 1 ) {
              // If the difference is greater than 1  days, give a red card
              cardColor = "red";
            } else {
              cardColor = "red";
            }

            const data = {
                mst_company_id : req?.user?.comp_id ? req?.user?.comp_id : null,
                mst_file_id : req?.body?.mst_file_id,
                fee_amount : req?.body?.fee_amount,
                fee_status  : req?.body?.fee_status,
                is_save : req?.body?.is_save,
                remark_by_hod:req.body.remark_by_hod,
                remark_by_emp:req.body.remark_by_emp,
                card:cardColor,
                approved_by_hod:req.body.approved_by_hod === "Yes" ? 1 : 0,
                created_by : req?.user?.id,
                created_at : getCurrentDateAndTime()
            }

            var sql = "SELECT *from `file_work_fee` WHERE `mst_file_id`="+req?.body?.mst_file_id+"";

            db.query(sql,(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessage,data:{},error:true})
                }else if(result.length>0){
                    //Edit

                    if(result[0]?.is_save==1 || result[0]?.is_skip==1){

                        var updatedData = {
                            mst_company_id : req?.user?.comp_id ? req?.user?.comp_id : null,
                            fee_amount : parseFloat(req?.body?.fee_amount),
                            fee_status  : parseInt(req?.body?.fee_status),
                            remark_by_hod:req.body.remark_by_hod,
                            remark_by_emp:req.body.remark_by_emp,
                            card: req.body.card ? req.body.card : cardColor,
                            approved_by_hod:req.body.approved_by_hod === "Yes" ? 1 : 0,
                            updated_by : req?.user?.id,
                            updated_at : getCurrentDateAndTime()
                        }

                        var sql = "UPDATE `file_work_fee` SET ? WHERE `mst_file_id`="+req?.body?.mst_file_id+"";

                        db.query(sql,updatedData,(err,result)=>{
                            if(err){
                                res.status(200).json({message:err.sqlMessage,data:{},error:true})
                            }else{
                                res.status(200).json({message:"Changes saved!",data:{},error:false})
                            }
                        })

                    }else{
                        var updatedData = {
                            mst_company_id : req?.user?.comp_id ? req?.user?.comp_id : null,
                            fee_amount : parseFloat(req?.body?.fee_amount),
                            fee_status  : parseInt(req?.body?.fee_status),
                            remark_by_hod:req.body.remark_by_hod,
                            remark_by_emp:req.body.remark_by_emp,
                            approved_by_hod:req.body.approved_by_hod === "Yes" ? 1 : 0,
                            is_save: req?.body?.is_save,
                            card: req.body.card ? req.body.card : cardColor,
                            updated_by : req?.user?.id,
                            updated_at : getCurrentDateAndTime()
                        }

                        var sql = "UPDATE `file_work_fee` SET ? WHERE `mst_file_id`="+req?.body?.mst_file_id+"";

                        db.query(sql,updatedData,async (err,result)=>{
                            if(err){
                                console.log(err);
                                res.status(200).json({message:err.sqlMessage,data:{},error:true})
                            }else{

                                if(updatedData?.is_save==1)
                                {
                                    const fileData = await commonController.getMstFileByMstFileId(parseInt(req.body?.mst_file_id));
                                
                                    /*Send Email*/
                                    await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Work Fee",to_stage:"Approved Plan",url:`${frontEndUrl.FileStageRouteUrl}/${req.body?.mst_file_id}`})});

                                    commonController.initialEntry_to_approved_plan(parseInt(req.body?.mst_file_id),req.user?.id)
                                    commonController.updateMstFileStage(17,parseInt(req.body?.mst_file_id));
                                }

                                res.status(200).json({message:"Changes saved!",data:{},error:false})
                            }
                        })
                    }

                }else{
                    //Insert
                    var sql = "INSERT INTO `file_work_fee` SET ?"

                    db.query(sql,data,async (err,result)=>{
                        if(err){
                            res.status(200).json({message:err.sqlMessage,data:{},error:true})
                        }else {

                            if(data?.is_save==1){

                                const fileData = await commonController.getMstFileByMstFileId(parseInt(req.body?.mst_file_id));
                                
                                /*Send Email*/
                                await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Work Fee",to_stage:"Approved Plan",url:`${frontEndUrl.FileStageRouteUrl}/${req.body?.mst_file_id}`})});

                                //Move to next stage
                                commonController.initialEntry_to_approved_plan(parseInt(req.body?.mst_file_id),req.user?.id)
                                commonController.updateMstFileStage(17,parseInt(req?.body?.mst_file_id));
                            }

                            res.status(200).json({message:"Changes saved!",data:{},error:false});
                        }
                    });

                }
            })
        }
        catch(res)
        {
            console.log(err);
            res.status(200).json({message:"Server error",error:false,data:{}})
        }
    },
    skip_work_fee:(req,res)=>{
        try
        {
            const mst_file_id = req?.params?.id;

            const data = {
                is_skip:1,
                is_save:1,
                updated_by:req?.user?.id,
                updated_at:getCurrentDateAndTime()
            }

            var sql = "SELECT *from `file_work_fee` WHERE `mst_file_id`="+mst_file_id+"";

            db.query(sql,(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessage,data:{},error:true})
                }else if(result.length>0){
                    
                    if(result[0]?.is_save==1 || result[0]?.is_skip==1)
                    {
                        
                        const updatedData = {
                            is_skip:1,
                            updated_by:req?.user?.id,
                            updated_at:getCurrentDateAndTime()
                        }
                        

                        var sql = "UPDATE `file_work_fee` SET ? WHERE `mst_file_id`="+mst_file_id+"";

                        db.query(sql,updatedData,(err,result)=>{
                            if(err){
                                res.status(200).json({message:err.sqlMessage,data:{},error:true})
                            }else{
                                res.status(200).json({message:"Current stage has been skipped",data:{},error:false});
                            }
                        });

                    }else{
                        const updatedData = {
                            is_skip:1,
                            is_save:1,
                            updated_by:req?.user?.id,
                            updated_at:getCurrentDateAndTime()
                        }
                        var sql = "UPDATE `file_work_fee` SET ? WHERE `mst_file_id`="+mst_file_id+"";
                        db.query(sql,updatedData,(err,result)=>{
                            if(err){
                                res.status(200).json({message:err.sqlMessage,data:{},error:true})
                            }else{
                                commonController.initialEntry_to_approved_plan(parseInt(mst_file_id),req.user?.id)
                                commonController.updateMstFileStage(17,parseInt(mst_file_id));
                                res.status(200).json({message:"Current stage has been skipped",data:{},error:false});
                            }
                        });
                    }
                    
                    
                }else{
                    const insertedData = {
                        mst_file_id:mst_file_id,
                        is_save:1,
                        is_skip:1,
                        created_at:getCurrentDateAndTime(),
                        created_by:req?.user?.id
                    }
                    var sql = "INSERT INTO `file_work_fee` SET ?";
                    db.query(sql,insertedData,(err,result)=>{
                        if(err){
                            res.status(200).json({message:err.sqlMessage,data:{},error:true})
                        }else{
                            commonController.initialEntry_to_approved_plan(parseInt(mst_file_id),req.user?.id)
                            commonController.updateMstFileStage(17,parseInt(mst_file_id));
                            res.status(200).json({message:"Current stage has been skipped",data:{},error:false});
                        }
                    });
                }
            });

           
        }
        catch(res)
        {
            console.log(err);
            res.status(200).json({message:"Server error",error:false,data:{}})
        }
    },
    get_work_fee:(req,res)=>{
        try
        {
            const id = req?.params?.id;
            var sql = "SELECT `id`,`card`,`mst_file_id`,`fee_amount`,`fee_status`,`remark_by_emp`,`approved_by_hod`,`remark_by_hod`,`is_save`,`is_skip`,`created_at`  FROM `file_work_fee` WHERE `mst_file_id`="+id+"";

            db.query(sql,(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessage,data:{},error:true})
                }else if(result.length>0){
                    res.status(200).json({message:"Record fetched",error:false,data:result})
                }else{
                    res.status(200).json({message:"Not found",error:true,data:{}})
                }
            });
        }
        catch(res)
        {
            console.log(err);
            res.status(200).json({message:"Server error",error:false,data:{}})
        }
    }
}
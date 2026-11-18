const { frontEndUrl } = require("../../helpers/constants");
const { getImageWithFoldername, unlinkSingleImage } = require("../../services/FileService");
const { fileStageEmailTemplate, sendEmail } = require("../../services/MailService");
const { filter_string, skipStagesMessage } = require("../../services/Utility");
const commonController = require("./commonController");

module.exports = {
    test: (req, res) => {
        res.status(200).json({ message: "Working" })
    },
    // fetch_assistant_junior_engineer: (req, res) => {
    //     //1=assistant juinior engineer
    //     const typeNumber = 1;

    //     var sql1 = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";
    //     var sql2 = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=(SELECT MAX(`is_rejected`) FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + ")";
    //     var sql3 = "SELECT COUNT(*) as `total` FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + "";

    //     db.query(sql1 + ";" + sql2 + ";" + sql3, (err, result, fields) => {
    //         if (err) {
    //             console.log(err);
    //             res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
    //         }
    //         else if (result[2][0]?.total > 0) {
    //             res.status(200).json({ message: "Record fetched", error: false, maxcount: parseInt(result[2][0]?.total), data1: result[0], data2: result[1] });
    //         }
    //         else {
    //             res.status(200).json({ message: "Not found", error: false, maxcount: parseInt(result[2][0]?.total), data1: [], data2: [] });
    //         }
    //     });
    // },

    // fetch_assistant_junior_engineer: (req, res) => {
    //     //1=assistant junior engineer
    //     const typeNumber = 1;
      
    //     var sql1 = "SELECT * FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " AND `type_number`=" + parseInt(typeNumber) + " AND `is_rejected`=0";
    //     var sql2 = "SELECT * FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " AND `type_number`=" + parseInt(typeNumber) + " AND `is_rejected`=(SELECT MAX(`is_rejected`) FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " AND `type_number`=" + parseInt(typeNumber) + ")";
    //     var sql3 = "SELECT COUNT(*) as `total` FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " AND `type_number`=" + parseInt(typeNumber) + "";
      
    //     db.query(sql1 + "; " + sql2 + "; " + sql3, (err, result, fields) => {
    //       if (err) {
    //         console.log(err);
    //         res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
    //       } else if (result[2][0]?.total > 0) {
    //         res.status(200).json({ message: "Record fetched", error: false, maxcount: parseInt(result[2][0]?.total), data1: result[0], data2: result[1] });
    //       } else {
    //         res.status(200).json({ message: "Not found", error: false, maxcount: parseInt(result[2][0]?.total), data1: [], data2: [] });
    //       }
    //     });
    //   },

    fetch_assistant_junior_engineer: (req, res) => {
        const typeNumber = 1;
        const fileId = parseInt(req.params.id);
    
        var sql1 = `SELECT * FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber} AND \`is_rejected\`=0`;
        var sql2 = `SELECT * FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber} AND \`is_rejected\`=(SELECT MAX(\`is_rejected\`) FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber})`;
        var sql3 = `SELECT COUNT(*) as \`total\` FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber}`;
    
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
                        db.query(sql3, (err3, result3) => {
                            if (err3) {
                                console.log(err3);
                                res.status(500).json({ message: err3.sqlMessage, error: true, data: {} });
                            } else {
                                const total = result3[0]?.total || 0;
                                if (total > 0) {
                                    res.status(200).json({ message: "Record fetched", error: false, maxcount: total, data1: result1, data2: result2 });
                                } else {
                                    res.status(200).json({ message: "Not found", error: false, maxcount: total, data1: [], data2: [] });
                                }
                            }
                        });
                    }
                });
            }
        });
    },
    
      
    skip_assistant_junior_engineer:(req,res)=>
    {
        try{
            const typeNumber = 1;
            const mst_file_id = req.params?.id;

            var sql = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(mst_file_id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";

            db.query(sql,(err,result)=>{
                if(err){
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else if(result.length>0){
                    
                    let updatedData = {
                        is_save:  1,
                        is_skip : 1,
                        updated_at : getCurrentDateAndTime(),
                        updated_by : req?.user?.id
                    }


                    let skip = 0;

                    if(result[0]?.is_skip==1 || result[0]?.is_save==1){
                        skip=1;
                    }

                    

                    var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`="+mst_file_id+" and `type_number`="+typeNumber+" and `is_rejected`=0";

                    db.query(sql,updatedData,(err,result)=>{
                        if(err){
                            console.log(err);
                            res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                        }else{

                            let nextStage = 0;

                            if(skip==0){
                                nextStage = 1;
                                commonController.updateMstFileStage(10,mst_file_id);
                            }

                            res.status(200).json({message:skipStagesMessage(),data:{skip:nextStage},error:false});
                        }
                    });

                }else{
                    //Insert new row

                    let data = {
                        mst_file_id:mst_file_id,
                        mst_company_id : req?.user?.comp_id,
                        type_number:typeNumber,
                        is_save: 1,
                        is_skip : 1,
                        created_at : getCurrentDateAndTime(),
                        created_by : req?.user?.id
                    }

                    var sql = "INSERT INTO `file_query` SET ?"

                    db.query(sql,data,(err,result)=>{
                        if(err)
                        {
                            res.status(200).json({message:err.sqlMessage,data:{},error:true});
                        }
                        else
                        {
                            commonController.updateMstFileStage(10, mst_file_id);
                            res.status(200).json({message:skipStagesMessage(),data:{skip:1},error:false});
                        }
                    });
                }
            });


        }
        catch(err){
            
        }
    },
    send_assistant_junior_engineer: (req, res) => {

        const typeNumber = 1;


        req.assert("mst_file_id", "mst_file_id is required").notEmpty();
        req.assert("is_save", "is_save is required").notEmpty();

        var errors = req.validationErrors();

        if (errors) {
            res.status(200).json({ error: true, message: errors[0].msg, data: {} });
        }
        else {

            let documents = "";

            if (req.file) {
                try {
                    documents = getImageWithFoldername(req.file?.path);
                } catch (err) {
                    console.log(err);
                }
            }


            const data = JSON.parse(JSON.stringify(req.body));

            console.log(data);

            const fileDate = new Date(data.date); // Assuming 'd' represents each object in the 'data' array

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
            if (differenceInDays <= 6 ) {
              // If the difference is 0 or 1  days, give a green card
              cardColor = "green";
            } else if (differenceInDays > 6 ) {
              // If the difference is greater than 1  days, give a red card
              cardColor = "red";
            } else {
              cardColor = "red";
            }

            const newData = {
                mst_company_id: req.user.comp_id ? parseInt(req.user.comp_id) : 0,
                mst_file_id: data.mst_file_id,
                type_number: typeNumber,
                remarks: data.remarks ? filter_string(data.remarks) : "",
                date: data.date ? data.date : null,
                documents: documents ? "assistant_junior_engineer/"+documents : "",
                is_save: parseInt(data.is_save) == 0 || parseInt(data.is_save) == 1 ? parseInt(data.is_save) : 0,
                is_rejected: 0,
                remark_by_hod:data.remark_by_hod,
                remark_by_emp:data.remark_by_emp,
                approved_by_hod:data.approved_by_hod === "Yes" ? 1 : 0,
                card:cardColor,
                created_at: getCurrentDateAndTime(),
                created_by: parseInt(req.user.id) ? parseInt(req.user.id) : 0
            };

            var sql = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(newData?.mst_file_id) + " and `type_number`=" + typeNumber + " and `is_save`=0 and `is_rejected`=0";

            db.query(sql, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                }
                else if (result.length > 0) {
                    var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`=" + parseInt(newData?.mst_file_id) + " and `type_number`=" + typeNumber + " and `is_save`=0 and `is_rejected`=0";

                    const updatedData = {
                        mst_company_id: newData.mst_company_id,
                        remarks: newData?.remarks,
                        date: newData?.date,
                        documents: newData?.documents ? newData?.documents : (result[0]?.documents ? result[0]?.documents : ""),
                        is_save: newData?.is_save,
                        is_rejected: newData?.is_rejected,
                        remark_by_hod:newData.remark_by_hod,
                        remark_by_emp:newData.remark_by_emp,
                        card: newData.card ? newData.card : cardColor,
                        approved_by_hod:newData.approved_by_hod === "Yes" ? 1 : 0,
                        updated_at: newData?.created_at,
                        updated_by: newData?.created_by
                    };

                    console.log("ddd",updatedData);

                    if(updatedData?.is_save!=1){
                        delete updatedData.is_save;
                    }

                    db.query(sql, updatedData,async  (err, xresult) => {
                        if (err) {
                            console.log(err);
                            res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                        }
                        else {
                            if (newData?.is_save) {
                                const fileData = await commonController.getMstFileByMstFileId(parseInt(newData?.mst_file_id));
                                
                                /*Send Email*/
                                await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Assistant/Junior Engineer",to_stage:"Deputy Engineer",url:`${frontEndUrl.FileStageRouteUrl}/${newData?.mst_file_id}`})});
                                
                                commonController.updateMstFileStage(10, newData?.mst_file_id)
                            }
                            res.status(200).json({ message: "Changes saved!", error: false, data: { filename: updatedData?.documents } });
                        }
                    })
                }
                else {

                    var sql = "SELECT * FROM `file_query` WHERE  `type_number`="+typeNumber+" and `is_rejected`=0 and `is_save`=1 and `mst_file_id`="+data.mst_file_id+"";
                    db.query(sql,(err,result)=>{
                        if(err){
                            console.log(err);
                            res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                        }else if(result.length>0){

                            const updatedData = {
                                mst_company_id: 1,
                                remarks: newData?.remarks,
                                date: newData?.date,
                                remark_by_hod:newData.remark_by_hod,
                                remark_by_emp:newData.remark_by_emp,
                                approved_by_hod:newData.approved_by_hod === "Yes" ? 1 : 0,
                                card: newData.card ? newData.card : cardColor,
                                documents: newData?.documents ? newData?.documents : (result[0]?.documents ? result[0]?.documents : ""),
                                updated_at: newData?.created_at,
                                updated_by: newData?.created_by
                            };

                            var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`="+newData?.mst_file_id+" and `is_save`=1 and `is_rejected`=0 and `type_number`="+typeNumber+"";

                            db.query(sql,updatedData,(err,result)=>{
                                if(err){
                                    console.log(err);
                                    res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                }else{
                                    res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                                }
                            })

                        }else{
                            var sql = "INSERT INTO `file_query` SET ?";
                            db.query(sql, newData, async (err, result) => {
                                if (err) {
                                    console.log(err);
                                    res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                }
                                else {
                                    if (newData?.is_save) {
                                        const fileData = await commonController.getMstFileByMstFileId(parseInt(newData?.mst_file_id));
                                
                                        /*Send Email*/
                                        await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Assistant/Junior Engineer",to_stage:"Deputy Engineer",url:`${frontEndUrl.FileStageRouteUrl}/${newData?.mst_file_id}`})});
                                        
                                        commonController.updateMstFileStage(10, newData?.mst_file_id)
                                    }
                                    res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                                }
                            });
                        }
                    })
                    
                }
            })


        }
    },
    fetch_deputy_engineer: (req, res) => {
        const typeNumber = 2;
        const fileId = parseInt(req.params.id);
    
        var sql1 = `SELECT * FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber} AND \`is_rejected\`=0`;
        var sql2 = `SELECT * FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber} AND \`is_rejected\`=(SELECT MAX(\`is_rejected\`) FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber})`;
        var sql3 = `SELECT COUNT(*) as \`total\` FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber}`;
    
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
                        db.query(sql3, (err3, result3) => {
                            if (err3) {
                                console.log(err3);
                                res.status(500).json({ message: err3.sqlMessage, error: true, data: {} });
                            } else {
                                const total = result3[0]?.total || 0;
                                if (total > 0) {
                                    res.status(200).json({ message: "Record fetched", error: false, maxcount: total, data1: result1, data2: result2 });
                                } else {
                                    res.status(200).json({ message: "Not found", error: false, maxcount: total, data1: [], data2: [] });
                                }
                            }
                        });
                    }
                });
            }
        });
    },
    
    // fetch_deputy_engineer: (req, res) => {
    //     //2=Deputy engineer
    //     const typeNumber = 2;

    //     var sql1 = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";
    //     var sql2 = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=(SELECT MAX(`is_rejected`) FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + ")";
    //     var sql3 = "SELECT COUNT(*) as `total` FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + "";

    //     db.query(sql1 + ";" + sql2 + ";" + sql3, (err, result, fields) => {
            
    //         if (err) {
    //             console.log(err);
    //             res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
    //         }
    //         else if (result[2][0]?.total > 0) {
    //             res.status(200).json({ message: "Record fetched", error: false, maxcount: parseInt(result[2][0]?.total), data1: result[0], data2: result[1] });
    //         }
    //         else {
    //             res.status(200).json({ message: "Not found", error: false, maxcount: parseInt(result[2][0]?.total), data1: [], data2: [] });
    //         }
    //     });
    // },
    skip_deputy_engineer:(req,res)=>
    {
        try{
            const typeNumber = 2;
            const mst_file_id = req.params?.id;

            var sql = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(mst_file_id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";

            db.query(sql,(err,result)=>{
                if(err){
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else if(result.length>0){
                    
                    let updatedData = {
                        is_save:  1,
                        is_skip : 1,
                        updated_at : getCurrentDateAndTime(),
                        updated_by : req?.user?.id
                    }


                    // const skip = result[0]?.is_skip;

                    let skip = 0;

                    if(result[0]?.is_skip==1 || result[0]?.is_save==1){
                        skip=1;
                    }


                    var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`="+mst_file_id+" and `type_number`="+typeNumber+" and `is_rejected`=0";

                    db.query(sql,updatedData,(err,result)=>{
                        if(err){
                            console.log(err);
                            res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                        }else{

                            let nextStage = 0;
                            if(skip==0){
                                let nextStage = 1;
                                commonController.updateMstFileStage(12,mst_file_id);
                            }

                            res.status(200).json({message:skipStagesMessage(),data:{skip:nextStage},error:false});
                        }
                    });

                }else{
                    //Insert new row

                    let data = {
                        mst_file_id:mst_file_id,
                        mst_company_id : req?.user?.comp_id,
                        type_number:typeNumber,
                        is_save: 1,
                        is_skip : 1,
                        created_at : getCurrentDateAndTime(),
                        created_by : req?.user?.id
                    }

                    var sql = "INSERT INTO `file_query` SET ?"

                    db.query(sql,data,(err,result)=>{
                        if(err)
                        {
                            res.status(200).json({message:err.sqlMessage,data:{},error:true});
                        }
                        else
                        {
                            commonController.updateMstFileStage(12, mst_file_id);
                            res.status(200).json({message:skipStagesMessage(),data:{skip:1},error:false});
                        }
                    });
                }
            });


        }
        catch(err){
            
        }
    },
    send_deputy_engineer: (req, res) => {

        try {   

            const typeNumber = 2;
            
            let documents = "";

            try
            {
                documents = getImageWithFoldername(req.file?.path);
            }
            catch(err)
            {
                console.log(`${err} error while getting the file`);
            }

            req.assert("mst_file_id", "mst_file_id is required").notEmpty();
            req.assert("is_save", "is_save is required").notEmpty();

            const errors = req.validationErrors();

            if (errors) {
                unlinkSingleImage(getImageWithFoldername(req.file.path));
                res.status(200).json({ error: true, message: errors[0].msg, data: {} });
            }
            else {

                const data = JSON.parse(JSON.stringify(req.body));

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
          if (differenceInDays <= 6 ) {
            // If the difference is 0 or 1  days, give a green card
            cardColor = "green";
          } else if (differenceInDays > 6 ) {
            // If the difference is greater than 1  days, give a red card
            cardColor = "red";
          } else {
            cardColor = "red";
          }
            
                const newData = {
                    mst_company_id: req.user.comp_id ? parseInt(req.user.comp_id) : 0,
                    mst_file_id: data.mst_file_id,
                    type_number: typeNumber,
                    remarks: data?.remarks ? filter_string(data?.remarks) : "",
                    date: data?.date ? data?.date : getCurrentDateAndTime(),
                    documents: documents ? "deputy_engineer/"+documents : "",
                    is_save: parseInt(data.is_save) == 0 || parseInt(data.is_save) == 1 ? parseInt(data?.is_save) : 0,
                    is_rejected: 0,
                    card:cardColor,
                    remark_by_hod:data.remark_by_hod,
                    remark_by_emp:data.remark_by_emp,
                    approved_by_hod:data.approved_by_hod === "Yes" ? 1 : 0,
                    created_at: getCurrentDateAndTime(),
                    created_by: parseInt(req.user.id) ? parseInt(req.user.id) : 0
                };

                var sql = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(data?.mst_file_id) + " and `type_number`=" + typeNumber + " and `is_save`=0 and `is_rejected`=0";

                db.query(sql, (err, result) => {
                    if (err) {
                        console.log(err);
                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                    }
                    else if (result.length > 0) {
                        
                        var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`=" + parseInt(data?.mst_file_id) + " and `type_number`=" + typeNumber + " and `is_save`=0 and `is_rejected`=0";

                        const updatedData = {
                            mst_company_id: newData.mst_company_id,
                            remarks: newData?.remarks,
                            date: newData?.date,
                            documents: newData?.documents ? newData?.documents : ( result[0]?.documents ?result[0]?.documents:""),
                            is_save: newData?.is_save,
                            is_rejected: newData?.is_rejected,
                            remark_by_hod:newData.remark_by_hod,
                            remark_by_emp:newData.remark_by_emp,
                            card: newData.card ? newData.card : cardColor,
                            approved_by_hod:newData.approved_by_hod === "Yes" ? 1 : 0,
                            updated_at: newData?.created_at,
                            updated_by: newData?.created_by
                        };

                        db.query(sql, updatedData, async (err, xresult) => {
                            if (err) {
                                console.log(err);
                                res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                            }
                            else {
                                if (updatedData?.is_save) {
                                    commonController.updateMstFileStage(11, newData?.mst_file_id)

                                    const fileData = await commonController.getMstFileByMstFileId(parseInt(newData?.mst_file_id));
                                
                                    /*Send Email*/
                                    await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Deputy Engineer",to_stage:"Zonal Officer/I.C. Town Planner",url:`${frontEndUrl.FileStageRouteUrl}/${newData?.mst_file_id}`})});
                                }
                                res.status(200).json({ message: "Changes saved!", error: false, data: { filename: updatedData?.documents } });
                            }
                        })
                    }
                    else {
                        
                        var sql = "SELECT * FROM `file_query` WHERE  `type_number`="+typeNumber+" and `is_rejected`=0 and `is_save`=1 and `mst_file_id`="+data.mst_file_id+"";
                        db.query(sql,(err,result)=>{
                            if(err){
                                console.log(err);
                                res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                            }else if(result.length>0){
    
                                const updatedData = {
                                    mst_company_id: 1,
                                    remarks: newData?.remarks,
                                    date: newData?.date,
                                    documents: newData?.documents ? newData?.documents : (result[0]?.documents ? result[0]?.documents : ""),
                                    updated_at: newData?.created_at,
                                    remark_by_hod:newData.remark_by_hod,
                                    remark_by_emp:newData.remark_by_emp,
                                    card: newData.card ? newData.card : cardColor,
                                    approved_by_hod:newData.approved_by_hod === "Yes" ? 1 : 0,
                                    updated_by: newData?.created_by
                                };
    
                                var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`="+newData?.mst_file_id+" and `is_save`=1 and `is_rejected`=0 and `type_number`="+typeNumber+"";
    
                                db.query(sql,updatedData,(err,result)=>{
                                    if(err){
                                        console.log(err);
                                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                    }else{
                                        res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                                    }
                                })
    
                            }else{
                                var sql = "INSERT INTO `file_query` SET ?";
                                db.query(sql, newData, async (err, result) => {
                                    if (err) {
                                        console.log(err);
                                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                    }
                                    else {
                                        if (newData?.is_save) {
                                            const fileData = await commonController.getMstFileByMstFileId(parseInt(newData?.mst_file_id));
                                
                                            /*Send Email*/
                                            await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Deputy Engineer",to_stage:"Zonal Officer/I.C. Town Planner",url:`${frontEndUrl.FileStageRouteUrl}/${newData?.mst_file_id}`})});
                                            
                                            commonController.updateMstFileStage(11, newData?.mst_file_id)
                                        }
                                        res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                                    }
                                });
                            }
                        })



                        // var sql = "INSERT INTO `file_query` SET ?";
                        // db.query(sql, newData, (err, result) => {
                        //     if (err) {
                        //         console.log(err);
                        //         res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                        //     }
                        //     else {
                        //         if (newData?.is_save) {
                        //             commonController.updateMstFileStage(11, newData?.mst_file_id)
                        //         }
                        //         res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                        //     }
                        // });
                    }
                })

            }



        }
        catch (err) {
            console.log(err);
            unlinkSingleImage(getImageWithFoldername(req.file.path));
            res.status(200).json({ message: "Something went wrong", error: true, data: {} });
        }
    },
    // fetch_zonal_officer: (req, res) => {
    //     //3=zonal officer
    //     const typeNumber = 3;

    //     var sql1 = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";
    //     var sql2 = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=(SELECT MAX(`is_rejected`) FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + ")";
    //     var sql3 = "SELECT COUNT(*) as `total` FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + "";

    //     db.query(sql1 + ";" + sql2 + ";" + sql3, (err, result, fields) => {
    //         console.log(result[2][0]?.total);
    //         if (err) {
    //             console.log(err);
    //             res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
    //         }
    //         else if (result[2][0]?.total > 0) {
    //             res.status(200).json({ message: "Record fetched", error: false, maxcount: parseInt(result[2][0]?.total), data1: result[0], data2: result[1] });
    //         }
    //         else {
    //             res.status(200).json({ message: "Not found", error: false, maxcount: parseInt(result[2][0]?.total), data1: [], data2: [] });
    //         }
    //     });
    // },
    fetch_zonal_officer: (req, res) => {
        const typeNumber = 3;
        const fileId = parseInt(req.params.id);
    
        var sql1 = `SELECT * FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber} AND \`is_rejected\`=0`;
        var sql2 = `SELECT * FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber} AND \`is_rejected\`=(SELECT MAX(\`is_rejected\`) FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber})`;
        var sql3 = `SELECT COUNT(*) as \`total\` FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber}`;
    
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
                        db.query(sql3, (err3, result3) => {
                            if (err3) {
                                console.log(err3);
                                res.status(500).json({ message: err3.sqlMessage, error: true, data: {} });
                            } else {
                                const total = result3[0]?.total || 0;
                                if (total > 0) {
                                    res.status(200).json({ message: "Record fetched", error: false, maxcount: total, data1: result1, data2: result2 });
                                } else {
                                    res.status(200).json({ message: "Not found", error: false, maxcount: total, data1: [], data2: [] });
                                }
                            }
                        });
                    }
                });
            }
        });
    },
    
    skip_zonal_officer:(req,res)=>
    {
        try{
            const typeNumber = 3;
            const mst_file_id = req.params?.id;

            var sql = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(mst_file_id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";

            db.query(sql,(err,result)=>{
                if(err){
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else if(result.length>0){
                    
                    let updatedData = {
                        is_save:  1,
                        is_skip : 1,
                        updated_at : getCurrentDateAndTime(),
                        updated_by : req?.user?.id
                    }


                    // const skip = result[0]?.is_skip;

                    let skip = 0;

                    if(result[0]?.is_skip==1 || result[0]?.is_save==1){
                        skip=1;
                    }

                    var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`="+mst_file_id+" and `type_number`="+typeNumber+" and `is_rejected`=0";

                    db.query(sql,updatedData,(err,result)=>{
                        if(err){
                            console.log(err);
                            res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                        }else{

                            let nextStage = 0;

                            if(skip==0){
                                let nextStage = 1;
                                commonController.updateMstFileStage(12,mst_file_id);
                            }

                            res.status(200).json({message:skipStagesMessage(),data:{skip:nextStage},error:false});
                        }
                    });

                }else{
                    //Insert new row

                    let data = {
                        mst_file_id:mst_file_id,
                        mst_company_id : req?.user?.comp_id,
                        type_number:typeNumber,
                        is_save: 1,
                        is_skip : 1,
                        created_at : getCurrentDateAndTime(),
                        created_by : req?.user?.id
                    }

                    var sql = "INSERT INTO `file_query` SET ?"

                    db.query(sql,data,(err,result)=>{
                        if(err)
                        {
                            res.status(200).json({message:err.sqlMessage,data:{},error:true});
                        }
                        else
                        {
                            commonController.updateMstFileStage(12, mst_file_id);
                            res.status(200).json({message:skipStagesMessage(),data:{skip:1},error:false});
                        }
                    });
                }
            });


        }
        catch(err){
            
        }
    },
    send_zonal_officer: (req, res) => {

        try {
            const typeNumber = 3;

            let documents = "";

            try
            {
                documents = getImageWithFoldername(req.file?.path);
            }
            catch(err)
            {
                console.log(`${err} error while getting the file`);
            }

            req.assert("mst_file_id", "mst_file_id is required").notEmpty();
            req.assert("is_save", "is_save is required").notEmpty();

            const errors = req.validationErrors();

            if (errors) {
                unlinkSingleImage(getImageWithFoldername(req.file.path));
                res.status(200).json({ error: true, message: errors[0].msg, data: {} });
            }
            else {

                const data = JSON.parse(JSON.stringify(req.body));

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
          if (differenceInDays <= 6 ) {
            // If the difference is 0 or 1  days, give a green card
            cardColor = "green";
          } else if (differenceInDays > 6 ) {
            // If the difference is greater than 1  days, give a red card
            cardColor = "red";
          } else {
            cardColor = "red";
          }
            
                const newData = {
                    mst_company_id: req.user.comp_id ? parseInt(req.user.comp_id) : 0,
                    mst_file_id: data.mst_file_id,
                    type_number: typeNumber,
                    remarks: data?.remarks ? filter_string(data?.remarks) : "",
                    date: data?.date ? data?.date : getCurrentDateAndTime(),
                    documents: documents ? "zonal_officer/"+documents : "",
                    is_save: parseInt(data.is_save) == 0 || parseInt(data.is_save) == 1 ? parseInt(data?.is_save) : 0,
                    is_rejected: 0,
                    remark_by_hod:data.remark_by_hod,
                    remark_by_emp:data.remark_by_emp,
                    card:cardColor,
                    approved_by_hod:data.approved_by_hod === "Yes" ? 1 : 0,
                    created_at: getCurrentDateAndTime(),
                    created_by: parseInt(req.user.id) ? parseInt(req.user.id) : 0
                };

                var sql = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(data?.mst_file_id) + " and `type_number`=" + typeNumber + " and `is_save`=0 and `is_rejected`=0";

                db.query(sql, (err, result) => {
                    if (err) {
                        console.log(err);
                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                    }
                    else if (result.length > 0) {
                        
                        var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`=" + parseInt(data?.mst_file_id) + " and `type_number`=" + typeNumber + " and `is_save`=0 and `is_rejected`=0";

                        const updatedData = {
                            mst_company_id: newData.mst_company_id,
                            remarks: newData?.remarks,
                            date: newData?.date,
                            documents: newData?.documents ? newData?.documents : ( result[0]?.documents ?result[0]?.documents:""),
                            is_save: newData?.is_save,
                            is_rejected: newData?.is_rejected,
                            remark_by_hod:newData.remark_by_hod,
                            remark_by_emp:newData.remark_by_emp,
                            card: newData.card ? newData.card : cardColor,
                            approved_by_hod:newData.approved_by_hod === "Yes" ? 1 : 0,
                            updated_at: newData?.created_at,
                            updated_by: newData?.created_by
                        };

                        db.query(sql, updatedData, async (err, xresult) => {
                            if (err) {
                                console.log(err);
                                res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                            }
                            else {
                                if (updatedData?.is_save) {
                                    const fileData = await commonController.getMstFileByMstFileId(parseInt(newData?.mst_file_id));
                                
                                    /*Send Email*/
                                    await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Zonal Officer/ I.C. Town Planner",to_stage:"Deputy Commissioner",url:`${frontEndUrl.FileStageRouteUrl}/${newData?.mst_file_id}`})});
                                    
                                    commonController.updateMstFileStage(12, newData?.mst_file_id)
                                }
                                res.status(200).json({ message: "Changes saved!", error: false, data: { filename: updatedData?.documents } });
                            }
                        })
                    }
                    else {

                        var sql = "SELECT * FROM `file_query` WHERE  `type_number`="+typeNumber+" and `is_rejected`=0 and `is_save`=1 and `mst_file_id`="+data.mst_file_id+"";
                        db.query(sql,(err,result)=>{
                            if(err){
                                console.log(err);
                                res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                            }else if(result.length>0){
    
                                const updatedData = {
                                    mst_company_id: 1,
                                    remarks: newData?.remarks,
                                    date: newData?.date,
                                    remark_by_hod:newData.remark_by_hod,
                                    remark_by_emp:newData.remark_by_emp,
                                    card: newData.card ? newData.card : cardColor,
                                    approved_by_hod:newData.approved_by_hod === "Yes" ? 1 : 0,
                                    documents: newData?.documents ? newData?.documents : (result[0]?.documents ? result[0]?.documents : ""),
                                    updated_at: newData?.created_at,
                                    updated_by: newData?.created_by
                                };
    
                                var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`="+newData?.mst_file_id+" and `is_save`=1 and `is_rejected`=0 and `type_number`="+typeNumber+"";
    
                                db.query(sql,updatedData,(err,result)=>{
                                    if(err){
                                        console.log(err);
                                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                    }else{
                                        res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                                    }
                                })
    
                            }else{
                                var sql = "INSERT INTO `file_query` SET ?";
                                db.query(sql, newData, async (err, result) => {
                                    if (err) {
                                        console.log(err);
                                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                    }
                                    else {
                                        if (newData?.is_save) {
                                            const fileData = await commonController.getMstFileByMstFileId(parseInt(newData?.mst_file_id));
                                
                                            /*Send Email*/
                                            await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Zonal Officer/ I.C. Town Planner",to_stage:"Deputy Commissioner",url:`${frontEndUrl.FileStageRouteUrl}/${newData?.mst_file_id}`})});
                                            
                                            commonController.updateMstFileStage(12, newData?.mst_file_id)
                                        }
                                        res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                                    }
                                });
                            }
                        })



                        // var sql = "INSERT INTO `file_query` SET ?";
                        // db.query(sql, newData, (err, result) => {
                        //     if (err) {
                        //         console.log(err);
                        //         res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                        //     }
                        //     else {
                        //         if (newData?.is_save) {
                        //             commonController.updateMstFileStage(12, newData?.mst_file_id)
                        //         }
                        //         res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                        //     }
                        // });
                    }
                })

            }

        }
        catch (err) {
            console.log(err);
            unlinkSingleImage(getImageWithFoldername(req.file.path));
            res.status(200).json({ message: "Something went wrong", error: true, data: {} });
        }
    },
    fetch_depty_commissioner: (req, res) => {
        const typeNumber = 4;
        const fileId = parseInt(req.params.id);
    
        var sql1 = `SELECT * FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber} AND \`is_rejected\`=0`;
        var sql2 = `SELECT * FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber} AND \`is_rejected\`=(SELECT MAX(\`is_rejected\`) FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber})`;
        var sql3 = `SELECT COUNT(*) as \`total\` FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber}`;
    
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
                        db.query(sql3, (err3, result3) => {
                            if (err3) {
                                console.log(err3);
                                res.status(500).json({ message: err3.sqlMessage, error: true, data: {} });
                            } else {
                                const total = result3[0]?.total || 0;
                                if (total > 0) {
                                    res.status(200).json({ message: "Record fetched", error: false, maxcount: total, data1: result1, data2: result2 });
                                } else {
                                    res.status(200).json({ message: "Not found", error: false, maxcount: total, data1: [], data2: [] });
                                }
                            }
                        });
                    }
                });
            }
        });
    },
    
    
    // fetch_depty_commissioner: (req, res) => {
    //     //4=deputy commissioner
    //     const typeNumber = 4;

    //     var sql1 = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";
    //     var sql2 = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=(SELECT MAX(`is_rejected`) FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + ")";
    //     var sql3 = "SELECT COUNT(*) as `total` FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + "";

    //     db.query(sql1 + ";" + sql2 + ";" + sql3, (err, result, fields) => {
    //         console.log(result[2][0]?.total);
    //         if (err) {
    //             console.log(err);
    //             res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
    //         }
    //         else if (result[2][0]?.total > 0) {
    //             res.status(200).json({ message: "Record fetched", error: false, maxcount: parseInt(result[2][0]?.total), data1: result[0], data2: result[1] });
    //         }
    //         else {
    //             res.status(200).json({ message: "Not found", error: false, maxcount: parseInt(result[2][0]?.total), data1: [], data2: [] });
    //         }
    //     });
    // },
    skip_deputy_commissioner:(req,res)=>
    {
        try{
            const typeNumber = 4;
            const mst_file_id = req.params?.id;

            var sql = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(mst_file_id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";

            db.query(sql,(err,result)=>{
                if(err){
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else if(result.length>0){
                    
                    let updatedData = {
                        is_save:  1,
                        is_skip : 1,
                        updated_at : getCurrentDateAndTime(),
                        updated_by : req?.user?.id
                    }


                    // const skip = result[0]?.is_skip;


                    let skip = 0;

                    if(result[0]?.is_skip==1 || result[0]?.is_save==1){
                        skip=1;
                    }

                    var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`="+mst_file_id+" and `type_number`="+typeNumber+" and `is_rejected`=0";

                    db.query(sql,updatedData,(err,result)=>{
                        if(err){
                            console.log(err);
                            res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                        }else{
                            let nextStage = 0;
                            if(skip==0){
                                let nextStage = 1;
                                commonController.updateMstFileStage(13,mst_file_id);
                            }

                            res.status(200).json({message:skipStagesMessage(),data:{skip:nextStage},error:false});
                        }
                    });

                }else{
                    //Insert new row

                    let data = {
                        mst_file_id:mst_file_id,
                        mst_company_id : req?.user?.comp_id,
                        type_number:typeNumber,
                        is_save: 1,
                        is_skip : 1,
                        created_at : getCurrentDateAndTime(),
                        created_by : req?.user?.id
                    }

                    var sql = "INSERT INTO `file_query` SET ?"

                    db.query(sql,data,(err,result)=>{
                        if(err)
                        {
                            res.status(200).json({message:err.sqlMessage,data:{},error:true});
                        }
                        else
                        {
                            commonController.updateMstFileStage(13, mst_file_id);
                            res.status(200).json({message:skipStagesMessage(),data:{skip:1},error:false});
                        }
                    });
                }
            });


        }
        catch(err){
            
        }
    },
    send_deputy_commissioner: (req, res) => {

        try {
            const typeNumber = 4;

            let documents = "";

            try
            {
                documents = getImageWithFoldername(req.file?.path);
            }
            catch(err)
            {
                console.log(`${err} error while getting the file`);
            }

            req.assert("mst_file_id", "mst_file_id is required").notEmpty();
            req.assert("is_save", "is_save is required").notEmpty();

            const errors = req.validationErrors();

            if (errors) {
                unlinkSingleImage(getImageWithFoldername(req.file.path));
                res.status(200).json({ error: true, message: errors[0].msg, data: {} });
            }
            else {

                const data = JSON.parse(JSON.stringify(req.body));
                
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
          if (differenceInDays <= 6 ) {
            // If the difference is 0 or 1  days, give a green card
            cardColor = "green";
          } else if (differenceInDays > 6 ) {
            // If the difference is greater than 1  days, give a red card
            cardColor = "red";
          } else {
            cardColor = "red";
          }
            
                const newData = {
                    mst_company_id: req.user.comp_id ? parseInt(req.user.comp_id) : 0,
                    mst_file_id: data.mst_file_id,
                    type_number: typeNumber,
                    remarks: data?.remarks ? filter_string(data?.remarks) : "",
                    date: data?.date ? data?.date : getCurrentDateAndTime(),
                    documents: documents ? "deputy_commissioner/"+documents : "",
                    is_save: parseInt(data.is_save) == 0 || parseInt(data.is_save) == 1 ? parseInt(data?.is_save) : 0,
                    is_rejected: 0,
                    remark_by_hod:data.remark_by_hod,
                    remark_by_emp:data.remark_by_emp,
                    card:cardColor,
                    approved_by_hod:data.approved_by_hod === "Yes" ? 1 : 0,
                    created_at: getCurrentDateAndTime(),
                    created_by: parseInt(req.user.id) ? parseInt(req.user.id) : 0
                };

                var sql = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(data?.mst_file_id) + " and `type_number`=" + typeNumber + " and `is_save`=0 and `is_rejected`=0";

                db.query(sql, (err, result) => {
                    if (err) {
                        console.log(err);
                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                    }
                    else if (result.length > 0) {
                        
                        var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`=" + parseInt(data?.mst_file_id) + " and `type_number`=" + typeNumber + " and `is_save`=0 and `is_rejected`=0";

                        const updatedData = {
                            mst_company_id: newData.mst_company_id,
                            remarks: newData?.remarks,
                            date: newData?.date,
                            documents: newData?.documents ? newData?.documents : ( result[0]?.documents ?result[0]?.documents:""),
                            is_save: newData?.is_save,
                            is_rejected: newData?.is_rejected,
                            remark_by_hod:newData.remark_by_hod,
                            remark_by_emp:newData.remark_by_emp,
                            approved_by_hod:newData.approved_by_hod === "Yes" ? 1 : 0,
                            updated_at: newData?.created_at,
                            updated_by: newData?.created_by
                        };

                        db.query(sql, updatedData,async  (err, xresult) => {
                            if (err) {
                                console.log(err);
                                res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                            }
                            else {
                                if (updatedData?.is_save) {
                                    const fileData = await commonController.getMstFileByMstFileId(parseInt(newData?.mst_file_id));
                                
                                            /*Send Email*/
                                            await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Deputy Commissioner",to_stage:"Commissioner",url:`${frontEndUrl.FileStageRouteUrl}/${newData?.mst_file_id}`})});
                                            
                                    commonController.updateMstFileStage(13, newData?.mst_file_id)
                                }
                                res.status(200).json({ message: "Changes saved!", error: false, data: { filename: updatedData?.documents } });
                            }
                        })
                    }
                    else {


                        var sql = "SELECT * FROM `file_query` WHERE  `type_number`="+typeNumber+" and `is_rejected`=0 and `is_save`=1 and `mst_file_id`="+data.mst_file_id+"";
                        db.query(sql,(err,result)=>{
                            if(err){
                                console.log(err);
                                res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                            }else if(result.length>0){
    
                                const updatedData = {
                                    mst_company_id: 1,
                                    remarks: newData?.remarks,
                                    date: newData?.date,
                                    documents: newData?.documents ? newData?.documents : (result[0]?.documents ? result[0]?.documents : ""),
                                    updated_at: newData?.created_at,
                                    remark_by_hod:newData.remark_by_hod,
                                    remark_by_emp:newData.remark_by_emp,
                                    approved_by_hod:newData.approved_by_hod === "Yes" ? 1 : 0,
                                    updated_by: newData?.created_by
                                };
    
                                var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`="+newData?.mst_file_id+" and `is_save`=1 and `is_rejected`=0 and `type_number`="+typeNumber+"";
    
                                db.query(sql,updatedData,(err,result)=>{
                                    if(err){
                                        console.log(err);
                                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                    }else{
                                        res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                                    }
                                })
    
                            }else{
                                var sql = "INSERT INTO `file_query` SET ?";
                                db.query(sql, newData, async (err, result) => {
                                    if (err) {
                                        console.log(err);
                                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                    }
                                    else {
                                        if (newData?.is_save) {
                                            const fileData = await commonController.getMstFileByMstFileId(parseInt(newData?.mst_file_id));
                                
                                            /*Send Email*/
                                            await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Deputy Commissioner",to_stage:"Commissioner",url:`${frontEndUrl.FileStageRouteUrl}/${newData?.mst_file_id}`})});
                                            commonController.updateMstFileStage(13, newData?.mst_file_id)
                                        }
                                        res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                                    }
                                });
                            }
                        })

                        // var sql = "INSERT INTO `file_query` SET ?";
                        // db.query(sql, newData, (err, result) => {
                        //     if (err) {
                        //         console.log(err);
                        //         res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                        //     }
                        //     else {
                        //         if (newData?.is_save) {
                        //             commonController.updateMstFileStage(13, newData?.mst_file_id)
                        //         }
                        //         res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                        //     }
                        // });
                    }
                })

            }

        }
        catch (err) {
            console.log(err);
            unlinkSingleImage(getImageWithFoldername(req.file.path));
            res.status(200).json({ message: "Something went wrong", error: true, data: {} });
        }
    },

    // fetch_commissioner: (req, res) => {
    //     const typeNumber = 5;
      
    //     var sql1 = "SELECT * FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";
    //     var sql2 = "SELECT * FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=(SELECT MAX(`is_rejected`) FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + ")";
    //     var sql3 = "SELECT COUNT(*) as `total` FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + "";
      
    //     db.query(sql1 + ";" + sql2 + ";" + sql3, (err, result, fields) => {
    //       if (err) {
    //         console.log(err);
    //         res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
    //       } else {
    //         const total = result && result[2] && result[2][0] ? result[2][0].total : 0;
      
    //         if (total > 0) {
    //           res.status(200).json({ message: "Record fetched", error: false, maxcount: parseInt(total), data1: result[0], data2: result[1] });
    //         } else {
    //           res.status(200).json({ message: "Not found", error: false, maxcount: parseInt(total), data1: [], data2: [] });
    //         }
    //       }
    //     });
    //   },
    fetch_commissioner: (req, res) => {
        const typeNumber = 5;
        const fileId = parseInt(req.params.id);
    
        var sql1 = `SELECT * FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber} AND \`is_rejected\`=0`;
        var sql2 = `SELECT * FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber} AND \`is_rejected\`=(SELECT MAX(\`is_rejected\`) FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber})`;
        var sql3 = `SELECT COUNT(*) as \`total\` FROM \`file_query\` WHERE \`mst_file_id\`=${fileId} AND \`type_number\`=${typeNumber}`;
    
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
                        db.query(sql3, (err3, result3) => {
                            if (err3) {
                                console.log(err3);
                                res.status(500).json({ message: err3.sqlMessage, error: true, data: {} });
                            } else {
                                const total = result3[0]?.total || 0;
                                if (total > 0) {
                                    res.status(200).json({ message: "Record fetched", error: false, maxcount: total, data1: result1, data2: result2 });
                                } else {
                                    res.status(200).json({ message: "Not found", error: false, maxcount: total, data1: [], data2: [] });
                                }
                            }
                        });
                    }
                });
            }
        });
    },
    
      
    // fetch_commissioner: (req, res) => {
    //     //5=commissioner
    //     const typeNumber = 5;

    //     var sql1 = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";
    //     var sql2 = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=(SELECT MAX(`is_rejected`) FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + ")";
    //     var sql3 = "SELECT COUNT(*) as `total` FROM `file_query` WHERE `mst_file_id`=" + parseInt(req.params.id) + " and `type_number`=" + parseInt(typeNumber) + "";

    //     db.query(sql1 + ";" + sql2 + ";" + sql3, (err, result, fields) => {
    //         console.log(result[2][0]?.total);
    //         if (err) {
    //             console.log(err);
    //             res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
    //         }
    //         else if (result[2][0]?.total > 0) {
    //             res.status(200).json({ message: "Record fetched", error: false, maxcount: parseInt(result[2][0]?.total), data1: result[0], data2: result[1] });
    //         }
    //         else {
    //             res.status(200).json({ message: "Not found", error: false, maxcount: parseInt(result[2][0]?.total), data1: [], data2: [] });
    //         }
    //     });
    // },
    skip_commissioner:(req,res)=>
    {
        try{
            const typeNumber = 5;
            const mst_file_id = req.params?.id;

            var sql = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(mst_file_id) + " and `type_number`=" + parseInt(typeNumber) + " and `is_rejected`=0";

            db.query(sql,(err,result)=>{
                if(err){
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else if(result.length>0){
                    
                    let updatedData = {
                        is_save:  1,
                        is_skip : 1,
                        updated_at : getCurrentDateAndTime(),
                        updated_by : req?.user?.id
                    }

                    let skip = 0;


                    if(result[0]?.is_skip==1 || result[0]?.is_save==1){
                        skip = 1;
                    }

                   

                    var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`="+mst_file_id+" and `type_number`="+typeNumber+" and `is_rejected`=0";

                    db.query(sql,updatedData,async (err,result)=>{
                        if(err){
                            console.log(err);
                            res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                        }else{

                            if(skip==0){
                                commonController.updateMstFileStage(14,mst_file_id);
                                await commonController.initialEntry_to_allImportantFees(mst_file_id,req?.user?.id);
                            }

                            res.status(200).json({message:skipStagesMessage(),data:{skip:skip},error:false});
                        }
                    });

                }else{
                    //Insert new row

                    let data = {
                        mst_file_id:mst_file_id,
                        mst_company_id : req?.user?.comp_id,
                        type_number:typeNumber,
                        is_save: 1,
                        is_skip : 1,
                        created_at : getCurrentDateAndTime(),
                        created_by : req?.user?.id
                    }

                    var sql = "INSERT INTO `file_query` SET ?"

                    db.query(sql,data,async (err,result)=>{
                        if(err)
                        {
                            res.status(200).json({message:err.sqlMessage,data:{},error:true});
                        }
                        else
                        {
                            commonController.updateMstFileStage(14, mst_file_id);
                            await commonController.initialEntry_to_allImportantFees(mst_file_id,req?.user?.id);
                            res.status(200).json({message:skipStagesMessage(),data:{skip:1},error:false});
                        }
                    });
                }
            });


        }
        catch(err){
            res.status(200).json({message:"Server error",data:{},error:true});
        }
    },
    send_commissioner: (req, res) => {

        try {
            const typeNumber = 5;

            let documents = "";

            try
            {
                documents = getImageWithFoldername(req.file?.path);
            }
            catch(err)
            {
                console.log(`${err} error while getting the file`);
            }

            req.assert("mst_file_id", "mst_file_id is required").notEmpty();
            req.assert("is_save", "is_save is required").notEmpty();

            const errors = req.validationErrors();

            if (errors) {
                unlinkSingleImage(getImageWithFoldername(req.file.path));
                res.status(200).json({ error: true, message: errors[0].msg, data: {} });
            }
            else {

                const data = JSON.parse(JSON.stringify(req.body));

                
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
          if (differenceInDays <= 6 ) {
            // If the difference is 0 or 1  days, give a green card
            cardColor = "green";
          } else if (differenceInDays > 6 ) {
            // If the difference is greater than 1  days, give a red card
            cardColor = "red";
          } else {
            cardColor = "red";
          }
            
                const newData = {
                    mst_company_id: req.user.comp_id ? parseInt(req.user.comp_id) : 0,
                    mst_file_id: data.mst_file_id,
                    type_number: typeNumber,
                    remarks: data?.remarks ? filter_string(data?.remarks) : "",
                    date: data?.date ? data?.date : getCurrentDateAndTime(),
                    documents: documents ? "commissioner/"+documents : "",
                    is_save: parseInt(data.is_save) == 0 || parseInt(data.is_save) == 1 ? parseInt(data?.is_save) : 0,
                    is_rejected: 0,
                    remark_by_hod:data.remark_by_hod,
                    remark_by_emp:data.remark_by_emp,
                    card:cardColor,
                    approved_by_hod:data.approved_by_hod === "Yes" ? 1 : 0,
                    created_at: getCurrentDateAndTime(),
                    created_by: parseInt(req.user.id) ? parseInt(req.user.id) : 0
                };

                var sql = "SELECT *FROM `file_query` WHERE `mst_file_id`=" + parseInt(data?.mst_file_id) + " and `type_number`=" + typeNumber + " and `is_save`=0 and `is_rejected`=0";

                db.query(sql, (err, result) => {
                    if (err) {
                        console.log(err);
                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                    }
                    else if (result.length > 0) {
                        
                        var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`=" + parseInt(data?.mst_file_id) + " and `type_number`=" + typeNumber + " and `is_save`=0 and `is_rejected`=0";

                        const updatedData = {
                            mst_company_id: newData.mst_company_id,
                            remarks: newData?.remarks,
                            date: newData?.date,
                            documents: newData?.documents ? newData?.documents : ( result[0]?.documents ?result[0]?.documents:""),
                            is_save: newData?.is_save,
                            is_rejected: newData?.is_rejected,
                            updated_at: newData?.created_at,
                            remark_by_hod:newData.remark_by_hod,
                            remark_by_emp:newData.remark_by_emp,
                            approved_by_hod:newData.approved_by_hod === "Yes" ? 1 : 0,
                            updated_by: newData?.created_by
                        };

                        if(result[0]?.is_save==1){ 
                            delete updatedData.is_save;
                        }

                        db.query(sql, updatedData, async (err, xresult) => {
                            if (err) {
                                console.log(err);
                                res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                            }
                            else {
                                if (updatedData?.is_save==1) {
                                    const fileData = await commonController.getMstFileByMstFileId(parseInt(newData?.mst_file_id));
                                
                                    /*Send Email*/
                                    await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Commissioner",to_stage:"All Important Fees",url:`${frontEndUrl.FileStageRouteUrl}/${newData?.mst_file_id}`})});
                                    
                                    await commonController.initialEntry_to_allImportantFees(newData?.mst_file_id,req?.user?.id);
                                    commonController.updateMstFileStage(14, newData?.mst_file_id)
                                }
                                res.status(200).json({ message: "Changes saved!", error: false, data: { filename: updatedData?.documents } });
                            }
                        })
                    }
                    else {

                        var sql = "SELECT * FROM `file_query` WHERE  `type_number`="+typeNumber+" and `is_rejected`=0 and `is_save`=1 and `mst_file_id`="+data.mst_file_id+"";
                        db.query(sql,(err,result)=>{
                            if(err){
                                console.log(err);
                                res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                            }else if(result.length>0){
    
                                const updatedData = {
                                    mst_company_id: 1,
                                    remarks: newData?.remarks,
                                    date: newData?.date,
                                    documents: newData?.documents ? newData?.documents : (result[0]?.documents ? result[0]?.documents : ""),
                                    updated_at: newData?.created_at,
                                    remark_by_hod:newData.remark_by_hod,
                                    remark_by_emp:newData.remark_by_emp,
                                    approved_by_hod:newData.approved_by_hod === "Yes" ? 1 : 0,
                                    updated_by: newData?.created_by
                                };
    
                                var sql = "UPDATE `file_query` SET ? WHERE `mst_file_id`="+newData?.mst_file_id+" and `is_save`=1 and `is_rejected`=0 and `type_number`="+typeNumber+"";
    
                                db.query(sql,updatedData,(err,result)=>{
                                    if(err){
                                        console.log(err);
                                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                    }else{
                                        res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                                    }
                                })
    
                            }else{
                                var sql = "INSERT INTO `file_query` SET ?";
                                db.query(sql, newData, async (err, result) => {
                                    if (err) {
                                        console.log(err);
                                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                    }
                                    else {
                                        if (newData?.is_save) {

                                            const fileData = await commonController.getMstFileByMstFileId(parseInt(newData?.mst_file_id));
                                
                                            /*Send Email*/
                                            await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"Commissioner",to_stage:"All Important Fees",url:`${frontEndUrl.FileStageRouteUrl}/${newData?.mst_file_id}`})});

                                            await commonController.initialEntry_to_allImportantFees(newData?.mst_file_id,req?.user?.id);
                                            commonController.updateMstFileStage(14, newData?.mst_file_id)
                                        }
                                        res.status(200).json({ message: "Changes saved!", error: false, data: { filename: newData?.documents } });
                                    }
                                });
                            }
                        })

                       
                    }
                })

            }

        }
        catch (err) {
            console.log(err);
            unlinkSingleImage(getImageWithFoldername(req.file.path));
            res.status(200).json({ message: "Something went wrong", error: true, data: {} });
        }
    },
    rejectFileQuery: (req, res) => {
        //data fileId,typeNumber

        req.assert("mst_file_id", "mst_file_id is required").notEmpty();
        req.assert("type_number", "type_number is required").notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            res.status(200).json({ message: errors[0].msg, error: true, data: {} });
        }
        else {
            if (
                (parseInt(req.body.type_number) === 1 ||
                    parseInt(req.body.type_number) === 2 ||
                    parseInt(req.body.type_number) === 3 ||
                    parseInt(req.body.type_number) === 4 ||
                    parseInt(req.body.type_number) === 5)
                &&
                !Number.isNaN(parseInt(req.body.mst_file_id))
            ) {
                var sql = "SELECT *FROM `mst_stage` WHERE `title`='Assitant/junior Engineer'";

                db.query(sql, (err, mst_stage_result) => {
                    if (err) {
                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                    }
                    else if (mst_stage_result.length > 0) {
                        const mst_stage_id = mst_stage_result[0]?.id;

                        let maxRejected = 0;

                        var sql = "SELECT MAX(`is_rejected`) as `total` FROM `file_query` WHERE `mst_file_id` = " + req.body.mst_file_id + "";

                        db.query(sql, (err, max_rejected_result) => {
                            if (err) {
                                res.status(200).json({ error: true, message: err.sqlMessage, data: {} });
                            }
                            else {

                                maxRejected = max_rejected_result[0]?.total;

                                var sql = "UPDATE `file_query` SET ?  WHERE `mst_file_id`=" + req.body.mst_file_id + " and `is_rejected`=0";

                                const data = {
                                    is_rejected: parseInt(maxRejected) + 1,
                                    updated_by: req.user?.id ? parseInt(req.user?.id) : 0,
                                    updated_at: getCurrentDateAndTime()
                                };

                                db.query(sql, data, (err, result) => {
                                    if (err) {
                                        res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                                    }
                                    else {
                                        console.log("Rejected!");
                                        commonController.updateMstFileStage(mst_stage_id, parseInt(req.body.mst_file_id));
                                        res.status(200).json({ message: "Changes rejected", error: false, data: { stage_id: mst_stage_id } });
                                    }
                                });
                            }
                        });
                    }
                    else {
                        res.status(200).json({ message: "Unable to reject!", error: true, data: {} });
                    }
                })
            }
            else {
                res.status(200).json({ message: "Unable to reject!", error: true, data: {} });
            }

        }
    }
}
const yup = require("yup");
const { frontEndUrl } = require("../../helpers/constants");
const { getImageWithFoldername, unlinkMultipleImages } = require("../../services/FileService");
const { sendEmail, fileStageEmailTemplate } = require("../../services/MailService");
const { filter_string } = require("../../services/Utility");
const commonController = require("./commonController");
module.exports =
{
    save_allImportantFees: async (req, res) => {
        try {
            const data = JSON.parse(req.body.data);
            const allData = data;
            console.log(allData);
            console.log(req.files);
            // console.log();
            const is_save = req.body.is_save 

            const filePathArray = [];
            const paths = [];

            const mst_file_id = allData[0]?.mst_file_id;

            if(req?.files.length>0)
            {
                req.files.forEach((f)=>{
                    filePathArray.push({fieldname:f?.fieldname,path:getImageWithFoldername(f?.path)});
                    paths.push(getImageWithFoldername(f?.path));
                });  
            }

            try {
                const company_id = req?.user?.comp_id ? req?.user?.comp_id : 0;

                  
                const fileDate = new Date(req.body.startdates); // Assuming 'd' represents each object in the 'data' array

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
            
                if (Array.isArray(allData)) {

                    for (let d of allData) {

                        let documents = "";

                        if(filePathArray.length && Array.isArray(filePathArray)){
                            filePathArray.forEach((p)=>{
                                 if(p?.fieldname.split("_")[0]==d?.index){
                                    documents = p?.path
                                 }   
                            });
                        }

                        const file_id = d?.mst_file_id;
                        const type_id = d?.mst_type_id;
                        const id = d?.id;

                        let values = {
                            mst_company_id: company_id,
                            show_website: d?.show_website == 1 || d?.show_website == 0 ? d?.show_website : null,
                            description: d?.description ? filter_string(d?.description.trim()) : "",
                            amount: d?.amount != null ? d?.amount : null,
                            date: d?.date,
                            remark_by_hod:req.body.remark_by_hod,
                            remark_by_emp:req.body.remark_by_emp,
                            approved_by_hod:req.body.approved_by_hod === "Yes" ? 1 : 0,
                            file: documents ? "all_important_fees/"+documents : null,
                            is_save : is_save,
                            card: req.body.card ? req.body.card : cardColor,
                            updated_by: req?.user?.id,
                            updated_at: getCurrentDateAndTime()
                        }

                        if(id)
                        {
                            //Update
                           
    
                            var sql = "SELECT *from `all_important_fees` WHERE  `id`="+id+"";
    
                            db.query(sql,(err,result)=>{
                                if(err)
                                {
                                    console.log(err);
                                }
                                else if(result.length>0)
                                
                                {

                                    var sql = "UPDATE `all_important_fees` SET ? WHERE  `id`="+id+"";
                                    
    
                                    if(result[0]?.is_save==1){
                                        delete values?.is_save;
                                    }
    
                                    if(!values?.file){
                                        delete values.file;
                                    }
    
                                    db.query(sql,values,(err,result)=>{
                                        if(err)
                                        {
                                            console.log(err);
                                        }
                                        else
                                        {
                                            
                                        }
                                    })
                                }
                            })
                        }
                        else
                        {
                            //Insert
                            delete values.updated_at;
                            delete values.updated_by;
                            values = {...values,mst_file_id:mst_file_id,created_at : getCurrentDateAndTime(),created_by:req.user?.id}
                            var sql = "INSERT INTO `all_important_fees` SET ?";
                            
                            db.query(sql,values,(err,result)=>{
                                if(err)
                                {
                                    console.log(err);
                                }
                                else
                                {

                                }
                            })
                        }

                        
                    }
                }

                if(is_save==1){
                    const fileData = await commonController.getMstFileByMstFileId(parseInt(mst_file_id));
                                
                    /*Send Email*/
                    await sendEmail({subject:"File stage Updated",html:fileStageEmailTemplate({file_name:fileData[0]?.file_name,from_stage:"All Important Fees",to_stage:"F.S/I.C. - Amineties Fees",url:`${frontEndUrl.FileStageRouteUrl}/${mst_file_id}`})});
                    
                    commonController.updateMstFileStage(15,allData[0]?.mst_file_id)
                    commonController.initialEntry_to_file_aminities_fees(allData[0]?.mst_file_id,req.user?.id,0);
                }

                res.status(200).json({ message: "Changes saved!", error: false, data: [] ,is_save:is_save });

            }
            catch (err) {
                console.log(err);
                paths.length ? unlinkMultipleImages(paths):""
                res.status(200).json({ message: "Server error", error: true, data: {} });
            }

        }
        catch (err) {
            console.log(err);
            res.status(200).json({ message: "Server error", data: {}, error: true })
        }
    },
    get_allimportantFees: (req, res) => {
        try {
            const mst_file_id = parseInt(req.params?.id);
            var sql1 = "SELECT `id`,`type_name` FROM `mst_type` WHERE `types`='all_important_fees' order by `display_order` asc";
            var sql2 = "SELECT `mst_company_id`,`mst_file_id`,`mst_type_id`,`show_website`,`description`,`short_description`,`amount`,`date`,`file`,`is_save`,`is_skip` FROM `all_important_fees` WHERE `mst_file_id`=" + mst_file_id + "";

            var sql = "SELECT `aif`.`id`,`aif`.`mst_company_id`,`aif`.`mst_file_id`,`aif`.`mst_type_id`,`mt`.`type_name`,`aif`.`show_website`,`aif`.`description`,`aif`.`short_description`,`aif`.`amount`,`aif`.`date`,`aif`.`file`,`aif`.`is_save`,`aif`.`is_skip` FROM `all_important_fees` as `aif` LEFT JOIN `mst_type` as `mt` ON `aif`.`mst_type_id`=`mt`.`id` WHERE `mst_file_id`=" + mst_file_id + "";

            db.query(`${sql}`, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(200).json({ message: "An error occured, Please contact to admin", error: true, data: {} });
                }
                else {
                    res.status(200).json({ message: "Record fetched", data: result, error: false });
                }
            })

        }
        catch (err) {
            console.log(err);
            res.status(200).json({ message: "Server error", data: {}, error: true })
        }
    },
    get_allimportantFees2: (req, res) => {
        try {
            const mst_file_id = parseInt(req.params?.id);
    
            var sql1 = "SELECT `id`,`type_name` FROM `mst_type` WHERE `types`='all_important_fees' order by `display_order` asc";
            var sql2 = "SELECT `id`,`mst_company_id`,`created_at`,`card`,`mst_file_id`,`mst_type_id`,`show_website`,`description`,`short_description`,`remark_by_hod`,`remark_by_emp`,`approved_by_hod`,`amount`,`date`,`file`,`is_save`,`is_skip` FROM `all_important_fees` WHERE `mst_file_id`=" + mst_file_id + " and `is_deleted`=0";
    
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
                                if (!arr2.some((arr2_element) => arr2_element?.mst_type_id == arr1_element?.id)) {
                                    const newObj = {
                                        id: null,
                                        mst_company_id: null,
                                        mst_file_id: mst_file_id,
                                        mst_type_id: arr1_element?.id,
                                        description: arr1_element?.type_name,
                                        amount: null,
                                        show_website: 0,
                                        date: null,
                                        file: null,
                                        is_save: 0
                                    }
    
                                    finalData = [...finalData, newObj];
                                }
                            });
    
                            res.status(200).json({ message: "Record fetched", data: finalData, error: false });
                        }
                    });
                }
            });
        } catch (err) {
            console.log(err);
            res.status(500).json({ message: "Server error", data: {}, error: true });
        }
    },
    
    // get_allimportantFees2:(req,res)=>
    // {
    //     try
    //     {
    //         const mst_file_id = parseInt(req.params?.id);

    //         var sql1 = "SELECT `id`,`type_name` FROM `mst_type` WHERE `types`='all_important_fees' order by `display_order` asc";
    //         var sql2 = "SELECT `id`,`mst_company_id`,`mst_file_id`,`mst_type_id`,`show_website`,`description`,`short_description`,`amount`,`date`,`file`,`is_save`,`is_skip` FROM `all_important_fees` WHERE `mst_file_id`=" + mst_file_id + " and `is_deleted`=0";

    //         db.query(`${sql1};${sql2}`,(err,result)=>{
    //             if(err){
    //                 console.log(err);
    //                 res.status(200).json({ message:err.sqlMessage, error: true, data: {} });
    //             }else{
    //                 const arr1 = result[0];
    //                 const arr2 = result[1];

    //                 let finalData = [...arr2];

    //                 arr1.forEach((arr1_element, arr1_index) => {
    //                     if (!arr2.some((arr2_element) => arr2_element?.mst_type_id == arr1_element?.id))
    //                     {
    //                         const newObj = {
    //                             id:null,
    //                             mst_company_id: null,
    //                             mst_file_id: mst_file_id,
    //                             mst_type_id: arr1_element?.id,
    //                             description: arr1_element?.type_name,
    //                             amount : null,
    //                             show_website: 0,
    //                             date : null ,
    //                             file: null,
    //                             is_save: 0
    //                         }

    //                         finalData = [...finalData, newObj];
    //                     }


    //                 });

    //                 res.status(200).json({ message: "Record fetched", data: finalData, error: false });
    //             }
    //         });
    //     }
    //     catch(err)
    //     {
    //         console.log(err);
    //         res.status(200).json({ message: "Server error", data: {}, error: true })
    //     }
    // },
    skip_allimportantFees: (req, res) => {
        try {
            const mst_file_id = req.params?.id;

            var sql = "SELECT * FROM `all_important_fees` WHERE `mst_file_id`="+mst_file_id+"";

            db.query(sql,(err,result)=>{
                if(err)
                {
                    console.log(err);
                    res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
                }
                else if(result.length>0)
                {
                    const shouldUpdateStage = result.some((e)=>e?.is_skip==1);

                    const updatedData = {
                        is_skip : 1,
                        is_save : 1,
                        updated_at : getCurrentDateAndTime(),
                        updated_by : req.user?.id
                    }



                    var sql = "UPDATE `all_important_fees` SET ? WHERE  `mst_file_id`="+mst_file_id+"";

                    db.query(sql,updatedData,(err,result)=>{
                        if(err){
                            console.log(err);
                            // res.status(200).json({message:err.sqlMessage,data:{},error:true})
                        }else{}
                    })

                    if(!shouldUpdateStage){
                        commonController.updateMstFileStage(15,mst_file_id);
                        commonController.initialEntry_to_file_aminities_fees(mst_file_id,req?.user?.id);
                    }

                    res.status(200).json({message:"You've skipped",error:false,data:{skip:!shouldUpdateStage ? 1 : 0}});

                }
                else
                {
                    res.status(200).json({ message: "Under the development stage", error: true, data: {} });
                }
                
            })


        }
        catch (err) {
            console.log(err);
            res.status(200).json({ message: "Server error", data: {}, error: true })
        }
    },
    save: (req, res) => {
        const data = JSON.parse(JSON.stringify(req.body.data));
        const allData = data;
        const mst_file_id = req.body.mst_file_id;
        const isSaveAndNext = parseInt(req.body?.save_and_next);
        console.log(req.files);

       

        

        console.log(mst_file_id);
        console.log(allData);
        console.log(filePathArray);

        try {
            const company_id = req?.params?.comp_id ? req?.params?.comp_id : 0;
            if (Array.isArray(allData)) {
                for (let d of allData) {
                    const values = {
                        mst_company_id: company_id,
                        mst_file_id: mst_file_id,
                        mst_type_id: d?.mst_type_id,
                        show_website: d?.show_website == 1 || d?.show_website == 0 ? d?.show_website : null,
                        description: d?.description ? filter_string(d?.description.trim()) : "",
                        short_description: d?.short_description,
                        amount: d?.amount != null ? d?.amount : null,
                        date: d?.date,
                        file: "",
                        // is_save:module.exports.validJson(d?.is_save) ? data?.is_save : JSON.stringify({ save: 0, send_msg: 0, next: 0 }),
                        created_by: req?.user?.id ? req?.user?.id : 0,
                        created_at: getCurrentDateAndTime()
                    }

                    console.log(values);
                }
            }

            res.status(200).json({ message: "Under the development stage", error: true, data: [] });

        }
        catch (err) {
            console.log(err);
            // paths.length ? unlinkMultipleImages(paths):""
            res.status(200).json({ message: "Server error", error: true, data: {} });
        }


    },
    getData: (req, res) => {
        const mst_file_id = parseInt(req.params?.id);
        const comp_id = req?.user?.comp_id ? req?.user?.comp_id : 0;
        var sql1 = "SELECT `id`,`type_name` FROM `mst_type` WHERE `types`='all_important_fees' order by `display_order` asc";
        var sql2 = "SELECT `mst_company_id`,`mst_file_id`,`mst_type_id`,`show_website`,`description`,`short_description`,`amount`,`date`,`file`,`is_save` FROM `all_important_fees` WHERE `mst_file_id`=" + mst_file_id + " and `mst_company_id`=" + comp_id + "";

        db.query(`${sql1};${sql2}`, (err, result) => {
            if (err) {
                console.log(err);
                res.status(200).json({ message: "An error occured, Please contact to admin", error: true, data: {} });
            }
            else {
                res.status(200).json({ message: "Record fetched", data1: result[0], data2: result[1], error: false });
            }
        })
    },

    validJson: (stringJson) => {
        try {
            JSON.parse(stringJson);
            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    },

    deleteAllImportantFeesById : (req,res) =>{
        try
        {
            const id = req.params?.id;

            const data = {
                is_deleted : 1,
                updated_at : getCurrentDateAndTime(),
                updated_by : req.user?.id,
            }

            var sql = "UPDATE `all_important_fees` SET ? WHERE `id`="+id+"";

            db.query(sql,data,(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else {
                    res.status(200).json({message:"Removed!",data:{},error:false});
                }
            });
            
        }
        catch(err)
        {
            console.log(err);
            res.status(200).json({ message: "Server error", error: true, data: {} });
        }
    }

}
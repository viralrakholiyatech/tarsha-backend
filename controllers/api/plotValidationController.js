const { frontEndUrl } = require("../../helpers/constants");
const {
  unlinkMultipleImages,
  getImageWithFoldername,
} = require("../../services/FileService");
const {
  sendEmail,
  fileStageEmailTemplate,
} = require("../../services/MailService");
const { filter_string } = require("../../services/Utility");
const commonController = require("./commonController");
module.exports = {
  get_plot_validation: (req, res) => {
    try {
      const mst_file_id = req.params?.id;

      var sql =
        "SELECT MAX(`is_rejected`) as `is_zero` FROM `file_plot_validation` WHERE `mst_file_id`=" +
        mst_file_id +
        "";
      // console.log("sql1======>",sql);

      db.query(`${sql}`, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else {
          const is_zero = result[0]?.is_zero;
          // console.log("Maximum rejection of Plot validation : "+is_zero+"");
          if (is_zero > 0) {
            var sql1 =
              "SELECT `fpv`.`id`,`fpv`.`card`,`fpv`.`created_at`,`fpv`.`mst_company_id`,`fpv`.`remark_by_emp`,`fpv`.`remark_by_hod`,`fpv`.`approved_by_hod`,`fpv`.`mst_file_id`,`fpv`.`mst_type_id`,`mt`.`type_name`,`fpv`.`inward_no`,`fpv`.`inward_date`,`fpv`.`outward_no`,`fpv`.`outward_date`,`fpv`.`inward_assign_to`,concat(`u_inward`.`first_name`,' ',`u_inward`.`last_name`) as `inward_assign_name`,`fpv`.`outward_assign_to`,concat(`u_outward`.`first_name`,' ',`u_outward`.`last_name`) as `outward_assign_name`,`fpv`.`documents`,`fpv`.`document_upload_date`,`fpv`.`inward_is_save`,`fpv`.`outward_is_save`,`is_rejected` FROM `file_plot_validation` as `fpv` LEFT JOIN `mst_type` as `mt` ON `fpv`.`mst_type_id`=`mt`.`id` LEFT JOIN `users` as `u_inward` ON `u_inward`.`id`=`fpv`.`inward_assign_to` LEFT JOIN `users` as `u_outward` ON `u_outward`.`id`=`fpv`.`outward_assign_to` WHERE `fpv`.`mst_file_id`=" +
              mst_file_id +
              " HAVING `fpv`.`is_rejected`=(SELECT MAX(`is_rejected`) FROM `file_plot_validation` WHERE `mst_file_id`=" +
              mst_file_id +
              ") ORDER BY `fpv`.`display_order` ASC";
            var sql2 =
              "SELECT `fpv`.`id`,`fpv`.`created_at`,`fpv`.`card`,`fpv`.`mst_company_id`,`fpv`.`remark_by_emp`,`fpv`.`remark_by_hod`,`fpv`.`approved_by_hod`,`fpv`.`mst_file_id`,`fpv`.`mst_type_id`,`mt`.`type_name`,`fpv`.`inward_no`,`fpv`.`inward_date`,`fpv`.`outward_no`,`fpv`.`outward_date`,`fpv`.`inward_assign_to`,concat(`u_inward`.`first_name`,' ',`u_inward`.`last_name`) as `inward_assign_name`,`fpv`.`outward_assign_to`,concat(`u_outward`.`first_name`,' ',`u_outward`.`last_name`) as `outward_assign_name`,`fpv`.`documents`,`fpv`.`document_upload_date`,`fpv`.`inward_is_save`,`fpv`.`outward_is_save`,`is_rejected` FROM `file_plot_validation` as `fpv` LEFT JOIN `mst_type` as `mt` ON `fpv`.`mst_type_id`=`mt`.`id` LEFT JOIN `users` as `u_inward` ON `u_inward`.`id`=`fpv`.`inward_assign_to` LEFT JOIN `users` as `u_outward` ON `u_outward`.`id`=`fpv`.`outward_assign_to` WHERE `fpv`.`mst_file_id`=" +
              mst_file_id +
              " AND `fpv`.`is_rejected`=0 ORDER BY `fpv`.`display_order` ASC";

            console.log("sql2:", sql1);
            console.log("sql3:", sql2);

            db.query(`${sql1};${sql2}`, (err, result) => {
              // console.log("resu09====>",result)
              if (err) {
                console.log(err);
                res
                  .status(200)
                  .json({ message: err.sqlMessage, error: true, data: {} });
              } else if (result[1].length > 0) {
                res
                  .status(200)
                  .json({ data1: result[1], data2: result[0], error: false });
                // console.log("res===>",res)
              } else {
                res
                  .status(200)
                  .json({
                    message: "Something went wrong, Please contact to admin",
                    data: {},
                    error: true,
                  });
              }
            });
          } else {
            var sql =
              "SELECT `fpv`.`id`,`fpv`.`created_at`,`fpv`.`card`,`fpv`.`remark_by_emp`,`fpv`.`remark_by_hod`,`fpv`.`approved_by_hod`,`fpv`.`mst_company_id`,`fpv`.`mst_file_id`,`fpv`.`mst_type_id`,`mt`.`type_name`,`fpv`.`inward_no`,`fpv`.`inward_date`,`fpv`.`outward_no`,`fpv`.`outward_date`,`fpv`.`inward_assign_to`,concat(`u_inward`.`first_name`,' ',`u_inward`.`last_name`) as `inward_assign_name`,`fpv`.`outward_assign_to`,concat(`u_outward`.`first_name`,' ',`u_outward`.`last_name`) as `outward_assign_name`,`fpv`.`documents`,`fpv`.`document_upload_date`,`fpv`.`inward_is_save`,`fpv`.`outward_is_save`,`is_rejected` FROM `file_plot_validation` as `fpv` LEFT JOIN `mst_type` as `mt` ON `fpv`.`mst_type_id`=`mt`.`id` LEFT JOIN `users` as `u_inward` ON `u_inward`.`id`=`fpv`.`inward_assign_to` LEFT JOIN `users` as `u_outward` ON `u_outward`.`id`=`fpv`.`outward_assign_to` WHERE `fpv`.`mst_file_id`=" +
              mst_file_id +
              " AND `fpv`.`is_rejected`=0 ORDER BY `fpv`.`display_order` ASC";
            //  console.log("sql3=>",sql)
            db.query(sql, (err, result) => {
              // console.log("sql====>",sql)
              if (err) {
                console.log(err);
                res
                  .status(200)
                  .json({ message: err.sqlMessage, error: true, data: {} });
              } else if (result.length > 0) {
                res
                  .status(200)
                  .json({ data1: result, data2: [], error: false });
              } else {
                res
                  .status(200)
                  .json({
                    message: "Something went wrong, Please contact to admin",
                    data: {},
                    error: true,
                  });
              }
            });
          }
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  save_plot_validation: (req, res) => {
    try {
      const data = JSON.parse(req.body?.data);
      const allData = data;

      console.log("dsfewfaaaaa====>", allData);



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
      if (differenceInDays <= 8) {
        // If the difference is 0 or 8 days, give a green card
        cardColor = "green";
      } else if (differenceInDays > 8) {
        // If the difference is greater than 8 days, give a red card
        cardColor = "red";
      } else {
        cardColor = "red";
      }


      const filePathArray = [];
      var paths = [];

      if (req?.files?.length > 0) {
        req.files.forEach((f) => {
          filePathArray.push({
            fieldname: f?.fieldname,
            path: getImageWithFoldername(f?.path),
          });
          paths.push(getImageWithFoldername(f?.path));
        });
      }

      if (Array.isArray(data)) {
        const transformedData = data.map((item) => {
          const values = Object.values(item.approved_by_hod);
          const approvedByHod = values.includes("Yes") ? "Yes" : "No";
          return {
            ...item,
            approved_by_hod: approvedByHod,
          };
        });

        console.log("transformedData==>", transformedData);

        transformedData.forEach((d) => {
          var sql =
            "SELECT * FROM `file_plot_validation` WHERE `id`=" + d?.id + "";

          db.query(sql, (err, result) => {
            console.log("sqeoe---//>", sql);
            if (err) {
              console.log(err);
            } else if (result.length > 0) {
              let documents = "";

              if (filePathArray?.length && Array.isArray(filePathArray)) {
                filePathArray.forEach((p) => {
                  if (p?.fieldname.split("_")[0] == d?.id) {
                    documents = p?.path;
                  }
                });
              }

              let values = {
                inward_no: d?.inward_no ? d?.inward_no : result[0]?.inward_no,
                inward_date: d?.inward_date
                  ? d?.inward_date
                  : result[0]?.inward_date,
                outward_no: d?.outward_no
                  ? d?.outward_no
                  : result[0]?.outward_no,
                outward_date: d?.outward_date
                  ? d?.outward_date
                  : result[0]?.outward_date,
                documents: documents
                  ? "plot_validation/" + documents
                  : result[0]?.documents,
                document_upload_date: d?.document_upload_date
                  ? d?.document_upload_date
                  : result[0]?.document_upload_date,
                inward_assign_to: d?.inward_assign_to,
                outward_assign_to: d?.outward_assign_to,
                remark_by_hod: d?.remark_by_hod,
                remark_by_emp: d?.remark_by_emp,
                approved_by_hod: d?.approved_by_hod === "Yes" ? 1 : 0,
                card: req.body.card ? req.body.card : cardColor,
                updated_at: getCurrentDateAndTime(),
                updated_by: req.user?.id,
              };

              var sql =
                "UPDATE `file_plot_validation` SET ? WHERE `id`=" +
                d?.id +
                " AND `is_rejected`=0";

              db.query(sql, values, (err, result) => {
                if (err) {
                  console.log(err);
                }
              });
            }
          });
        });

        res
          .status(200)
          .json({ message: "Changes saved", data: { skip: 0 }, error: false });
      } else {
        console.log("Empty array===>");
        paths.length ? unlinkMultipleImages(paths) : "";
        res
          .status(200)
          .json({
            message: "Internal Validation error",
            data: {},
            error: true,
          });
      }
    } catch (err) {
      console.log(err);
      paths.length ? unlinkMultipleImages(paths) : "";
      console.log("path===>", paths);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  // save_plot_validation:(req,res)=>
  // {
  //     try
  //     {

  //         const data = JSON.parse(req.body?.data);
  //         const allData = data;

  //         console.log("dsfewfaaaaa====>",allData);

  //         const filePathArray = [];
  //         var paths = [];

  //         if(req?.files?.length>0)
  //         {
  //             req.files.forEach((f)=>{
  //                 filePathArray.push({fieldname:f?.fieldname,path:getImageWithFoldername(f?.path)});
  //                 paths.push(getImageWithFoldername(f?.path));
  //             });
  //         }

  //         if(Array.isArray(data))
  //         {

  //             for(let d of data)
  //             {
  //                 var sql = "SELECT *from `file_plot_validation` WHERE `id`="+d?.id+"";

  //                 db.query(sql,(err,result)=>{
  //                     console.log("sqeoe---//>",sql)
  //                     if(err){
  //                         console.log(err);
  //                     }else if(result.length>0){

  //                         let documents = "";

  //                         if(filePathArray?.length && Array.isArray(filePathArray)){
  //                             filePathArray.forEach((p)=>{
  //                                 if(p?.fieldname.split("_")[0]==d?.id){
  //                                     documents = p?.path
  //                                 }
  //                             });
  //                         }

  //                         let values = {
  //                             inward_no : d?.inward_no ? d?.inward_no : result[0]?.inward_no,
  //                             inward_date : d?.inward_date ? d?.inward_date : result[0]?.inward_date,
  //                             outward_no : d?.outward_no ? d?.outward_no : result[0]?.outward_no,
  //                             outward_date : d?.outward_date ? d?.outward_date : result[0]?.outward_date,
  //                             documents : documents ? "plot_validation/"+documents : result[0]?.documents,
  //                             document_upload_date : d?.document_upload_date ? d?.document_upload_date : result[0]?.document_upload_date,
  //                             inward_assign_to : d?.inward_assign_to,
  //                             outward_assign_to : d?.outward_assign_to,
  //                             remark_by_hod:d?.remark_by_hod,
  //                             remark_by_emp:d?.remark_by_emp,
  //                             approved_by_hod:d?.approved_by_hod=== "Yes" ? 1 : 0,
  //                             // inward_is_save : d?.inward_no!=null && d?.inward_no?.length>0 ? 1 : 0,
  //                             // outward_is_save : d?.outward_no!=null && d?.inward_no?.length>0 ? 1 : 0,
  //                             updated_at :getCurrentDateAndTime(),
  //                             updated_by : req.user?.id
  //                         }

  //                         // values = {...values,inward_is_save : values?.inward_no ? 1 : 0,outward_is_save : values?.outward_no ? 1 : 0}

  //                         var sql = "UPDATE `file_plot_validation` SET ? WHERE `id`="+d?.id+" AND `is_rejected`=0";

  //                         db.query(sql,values,(err,result)=>{
  //                             if(err){
  //                                 console.log(err);
  //                             }
  //                         });
  //                     }
  //                 })

  //             }

  //             res.status(200).json({message:"Changes saved",data:{skip:0},error:false});

  //         }
  //         else
  //         {
  //             console.log("Empty array===>");
  //             paths.length ? unlinkMultipleImages(paths):""
  //             res.status(200).json({message:"Internal Validation error",data:{},error:true})
  //         }

  //     }
  //     catch(err)
  //     {
  //         console.log(err);
  //         paths.length ? unlinkMultipleImages(paths):""
  //         console.log("path===>",paths)
  //         res.status(200).json({message:"Server error",data:{},error:true})
  //     }
  // },
  save_and_next_plot_validation: (req, res) => {
    try {
      const data = JSON.parse(req.body?.data);
      console.log("data===>", req.body);
      const mst_file_id = req.body?.mst_file_id;

      const filePathArray = [];
      var paths = [];

      console.log("fsgfs===>", data);
      console.log("files===>", req?.files);
      console.log(mst_file_id);

      if (req?.files?.length > 0) {
        req.files.forEach((f) => {
          filePathArray.push({
            fieldname: f?.fieldname,
            path: getImageWithFoldername(f?.path),
          });
          paths.push(getImageWithFoldername(f?.path));
          console.log("getImageWithFoldername", getImageWithFoldername);
          console.log("ds1-->", f?.path);
          console.log("paths===>", paths);
        });
        console.log("filePathArray===>", filePathArray);
      }

      if (Array.isArray(data)) {
        var emp_id = 0;

        var index = 0;

        for (let d of data) {
          var sql =
            "SELECT *from `file_plot_validation` WHERE `id`=" + d?.id + "";

          db.query(sql, (err, result) => {
            console.log("sql0--->", sql);
            console.log("result---->", result);
            if (err) {
              console.log(err);
            } else if (result.length > 0) {
              let documents = "";

              if (filePathArray?.length && Array.isArray(filePathArray)) {
                filePathArray.forEach((p) => {
                  if (p?.fieldname.split("_")[0] == d?.id) {
                    documents = p?.path;
                    console.log("documentibbhb ====>", documents);
                  }
                });
              }

          

            //   const fileDate = new Date(req.body.date);
            const fileDate = new Date(d.date); // Assuming 'd' represents each object in the 'data' array

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
              if (differenceInDays <= 8) {
                // If the difference is 0 or 8 days, give a green card
                cardColor = "green";
              } else if (differenceInDays > 8) {
                // If the difference is greater than 8 days, give a red card
                cardColor = "red";
              } else {
                cardColor = "red";
              }

              let values = {
                inward_no: d?.inward_no ? d?.inward_no : result[0]?.inward_no,
                inward_date: d?.inward_date
                  ? d?.inward_date
                  : result[0]?.inward_date,
                outward_no: d?.outward_no
                  ? d?.outward_no
                  : result[0]?.outward_no,
                outward_date: d?.outward_date
                  ? d?.outward_date
                  : result[0]?.outward_date,
                documents: documents
                  ? "plot_validation/" + documents
                  : result[0]?.documents,
                document_upload_date: d?.document_upload_date
                  ? d?.document_upload_date
                  : result[0]?.document_upload_date,
                inward_assign_to: d?.inward_assign_to,
                outward_assign_to: d?.outward_assign_to,
                inward_is_save: d?.inward_is_save,
                outward_is_save: d?.outward_is_save,
                remark_by_hod: d?.remark_by_hod,
                remark_by_emp: d?.remark_by_emp,
                approved_by_hod: d?.approved_by_hod === "Yes" ? 1 : 0,
                card: req.body.card ? req.body.card : cardColor,
                updated_at: getCurrentDateAndTime(),
                updated_by: req.user?.id,
              };
              console.log("DOCUMENTS===>", documents);
              console.log("values1223===>", values);

              var sql =
                "UPDATE `file_plot_validation` SET ? WHERE `id`=" +
                d?.id +
                " AND `is_rejected`=0";

              db.query(sql, values, (err, result) => {
                if (err) {
                  console.log(err);
                } else {
                  if (index == data?.length - 1) {
                    //Update emp in file

                    if (values?.outward_is_save == 1) {
                      emp_id = values?.outward_assign_to;
                      commonController.setTeamToMstFile(emp_id, mst_file_id);
                      console.log("1 Update Emp file " + emp_id + "");
                    } else if (values?.inward_is_save == 1) {
                      emp_id = values?.inward_assign_to;
                      commonController.setTeamToMstFile(emp_id, mst_file_id);
                      console.log("2 Update Emp file " + emp_id + "");
                    } else {
                    }
                  }

                  index++;
                }
              });
            }
          });
        }

        var sql =
          "SELECT *from `file_plot_validation` WHERE `mst_file_id`=" +
          mst_file_id +
          " and `is_rejected`=0";

        db.query(sql, async (err, result) => {
          if (err) {
            console.log(err);
            // res.status(200).json({message:err.sqlMessage,data:{},error:true});
          } else {
            const shouldUpdateStage = result.every(
              (r) =>
                r?.inward_is_save == 1 ||
                r?.outward_is_save == 1 ||
                r?.inward_is_skip == 1 ||
                r?.outward_is_skip == 1
            );

            if (shouldUpdateStage) {
              const status_file_name =
                await commonController.getProcessNameOfFile(mst_file_id);

              const fileData = await commonController.getMstFileByMstFileId(
                mst_file_id
              );

              if (status_file_name?.toLowerCase() == "offline") {
                /*Send Email*/
                await sendEmail({
                  subject: "File stage Updated",
                  html: fileStageEmailTemplate({
                    file_name: fileData[0]?.file_name,
                    from_stage: "Plot Validation Certificate",
                    to_stage: "Document Upload",
                    url: `${frontEndUrl.FileStageRouteUrl}/${mst_file_id}`,
                  }),
                });

                commonController.updateMstFileStage(7, mst_file_id);
                res
                  .status(200)
                  .json({
                    message: "Changes saved!",
                    data: { skip: 1, stage_no: 7 },
                    error: false,
                  });
              } else {
                /*Send Email*/
                await sendEmail({
                  subject: "File stage Updated",
                  html: fileStageEmailTemplate({
                    file_name: fileData[0]?.file_name,
                    from_stage: "Plot Validation Certificate",
                    to_stage: "E Nagar Portal",
                    url: `${frontEndUrl.FileStageRouteUrl}/${mst_file_id}`,
                  }),
                });

                commonController.updateMstFileStage(5, mst_file_id);
                commonController.initialEntry_to_enagar_portal(
                  req.user?.comp_id,
                  mst_file_id,
                  req.user?.id,
                  null
                );
                res
                  .status(200)
                  .json({
                    message: "Changes saved!",
                    data: { skip: 1, stage_no: 5 },
                    error: false,
                  });
              }
            } else {
              res
                .status(200)
                .json({
                  message: "Changes saved!",
                  data: { skip: 0, stage_no: 5 },
                  error: false,
                });
            }

            // if(shouldUpdateStage)
            // {
            //     commonController.updateMstFileStage(5,mst_file_id);
            //     commonController.initialEntry_to_enagar_portal(req.user?.comp_id,mst_file_id,req.user?.id,null);
            //     res.status(200).json({message:"Changes saved!",data:{skip:1},error:false});
            // }
            // else{
            //     res.status(200).json({message:"Changes saved!",data:{skip:0},error:false});
            // }
          }
        });

        // res.status(200).json({message:"Changes saved",data:{skip:0},error:false});
      } else {
        console.log("Empty array");
        paths.length ? unlinkMultipleImages(paths) : "";
        res
          .status(200)
          .json({
            message: "Internal Validation error",
            data: {},
            error: true,
          });
      }
    } catch (err) {
      console.log(err);
      paths.length ? unlinkMultipleImages(paths) : "";
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  skip_plot_validation: (req, res) => {
    try {
      const data = {
        id: req.body?.id,
        mst_file_id: req.body?.mst_file_id,
        for: req.body?.for,
      };

      let updatedData = {
        updated_at: getCurrentDateAndTime(),
        updated_by: req.user?.id,
      };

      if (data.for.toUpperCase() == "inward".toUpperCase()) {
        updatedData = { ...updatedData, inward_is_save: 1, inward_is_skip: 1 };
      } else if (data.for.toUpperCase() == "outward".toUpperCase()) {
        updatedData = {
          ...updatedData,
          outward_is_save: 1,
          outward_is_skip: 1,
        };
      }

      console.log(data);
      console.log(updatedData);

      var sql =
        "UPDATE `file_plot_validation` SET ? WHERE `id`=" +
        data.id +
        " and `is_rejected`=0";

      db.query(sql, updatedData, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, data: {}, error: true });
        } else {
          var sql =
            "SELECT *from `file_plot_validation` WHERE `mst_file_id`=" +
            data.mst_file_id +
            " and `is_rejected`=0";

          db.query(sql, async (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(200)
                .json({ message: err.sqlMessage, data: {}, error: true });
            } else {
              const shouldUpdateStage = result.every(
                (r) =>
                  (r?.inward_is_save == 1 && r?.outward_is_save == 1) ||
                  (r?.inward_is_skip == 1 && r?.outward_is_skip == 1)
              );
              if (shouldUpdateStage) {
                const status_file_name =
                  await commonController.getProcessNameOfFile(
                    req.body?.mst_file_id
                  );
                if (status_file_name?.toLowerCase() == "offline") {
                  commonController.updateMstFileStage(7, data.mst_file_id);
                  res
                    .status(200)
                    .json({
                      message: "You've skipped",
                      data: { skip: 1, stage_no: 7 },
                      error: false,
                    });
                } else {
                  commonController.updateMstFileStage(5, data.mst_file_id);
                  commonController.initialEntry_to_enagar_portal(
                    req.user?.comp_id,
                    data.mst_file_id,
                    req.user?.id,
                    null
                  );
                  res
                    .status(200)
                    .json({
                      message: "You've skipped",
                      data: { skip: 1, stage_no: 5 },
                      error: false,
                    });
                }
              } else {
                res
                  .status(200)
                  .json({
                    message: "You've skipped",
                    data: { skip: 0, stage_no: 5 },
                    error: false,
                  });
              }
            }
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  reject_plot_validation: (req, res) => {
    try {
      const mst_file_id = req.body?.mst_file_id;

      var sql =
        "SELECT MAX(`is_rejected`) as `last_rejected_number` from `file_plot_validation` WHERE `mst_file_id`=" +
        mst_file_id +
        "";

      db.query(sql, (err, num) => {
        if (err) {
          if (err) {
            console.log(
              "Set_isReject_zero_file_plot_validation-query 1 --" + err
            );
          }
        } else {
          const max = parseInt(num[0].last_rejected_number) + 1;

          const data = {
            is_rejected: max,
            reason: req.body?.reason,
            updated_at: getCurrentDateAndTime(),
            updated_by: req.user?.id,
          };

          var sql =
            "UPDATE `file_plot_validation` SET ? WHERE `mst_file_id`=" +
            mst_file_id +
            " and `is_rejected`=0";

          db.query(sql, data, (err, result) => {
            if (err) {
              console.log("Set_isReject_zero_file_plot_validation--" + err);
              console.log(err);
              res
                .status(200)
                .json({ message: "Unable to reject!", error: true, data: {} });
            } else {
              commonController.initialEntry_to_file_plot_validation(
                mst_file_id,
                req.user?.id
              );
              res
                .status(200)
                .json({ message: "Rejected!", error: false, data: {} });
            }
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
};

const admin = require("firebase-admin");

module.exports =
{
    setNotification: (jsonString, assign_to, created_by, mst_file_id = 0, client_id = null, table_name = null) => {
        try {
          if (!assign_to) {
            console.log("No assign_to provided, skipping notification.");
            return;
          }

          let assignees = [];
          if (typeof assign_to === 'string') {
              try {
                  const parsed = JSON.parse(assign_to);
                  if (Array.isArray(parsed)) {
                      assignees = parsed;
                  } else {
                      assignees = [assign_to];
                  }
              } catch(e) {
                  assignees = assign_to.split(',').map(s => s.trim()).filter(Boolean);
              }
          } else if (Array.isArray(assign_to)) {
              assignees = assign_to;
          } else {
              assignees = [assign_to];
          }

          if (module.exports.validJson(jsonString)) {
            const jsonData = jsonString;
            const parsedData = JSON.parse(jsonString);

            assignees.forEach(assignee => {
                if (!assignee || assignee === '[]' || assignee === '') return;

                const data = {
                  json_data: jsonData,
                  assign_to: assignee,
                  client_id: client_id,
                  created_by: created_by,
                  child_id: parseInt(mst_file_id),
                  table_name: table_name,
                  created_at: getCurrentDateAndTime(),
                };
          
                const sql = "INSERT INTO `notification` SET ?";
          
                db.query(sql, data, (err, result) => {
                  if (err) {
                    console.error("Notification insert error:", err);
                    const errInfo = JSON.stringify({
                      error: "Insertion error",
                      error_at: getCurrentDateAndTime(),
                      created_by: data?.created_by,
                    });
                    module.exports.logsTheError(errInfo);
                  } else {
                    console.log("Notification inserted successfully:", data);
                    
                    const getDeviceTokenSql = "SELECT device_token FROM users WHERE id = ?";
                    db.query(getDeviceTokenSql, [assignee], (tokenErr, tokenResult) => {
                        if (!tokenErr && tokenResult && tokenResult.length > 0) {
                            const deviceToken = tokenResult[0].device_token;
                            if (deviceToken) {
                                const message = {
                                    notification: {
                                        title: parsedData.action || "New Notification",
                                        body: parsedData.message || "You have a new update."
                                    },
                                    token: deviceToken
                                };
                                admin.messaging().send(message)
                                    .then((response) => {
                                        console.log("Successfully sent push notification:", response);
                                    })
                                    .catch((error) => {
                                        console.error("Error sending push notification:", error);
                                    });
                            }
                        }
                    });
                  }
                });
            });
          } else {
            console.log("Invalid JSON passed to setNotification.");
          }
        } catch (err) {
          const errInfo = JSON.stringify({
            error: "Notification try-catch error",
            error_at: getCurrentDateAndTime(),
            message: err.message,
          });
          module.exports.logsTheError(errInfo);
          console.error("Notification exception:", err);
        }
      },      

    validJson:(jsonString)=>{
        try{
            JSON.parse(jsonString);
            return true;
        }catch(err){
            const errInfo = `${JSON.stringify({error:"JSON Parser Error",error_at:getCurrentDateAndTime()})}\n${line}`;
            module.exports.logsTheError(errInfo);
            return false;
        }
    },
    logsTheError:(errors)=>{
        try{
            const filename = `${ERROR_LOGS_DIRECTORY_FOLDERNAME}/${error_logs_directories?.notificationError}`;
            fs.appendFile(filename,errors,(err)=>{
                if(err){
                    console.log(`Error while appending the content`);
                }
            });
        }
        catch(err){}
    },
    seen_notification:(req,res)=>{
        try
        {
            const id = req?.body?.id;

            const data = {
                is_seen:1,
                seen_at:getCurrentDateAndTime()
            }

            const sql = "UPDATE `notification` SET ? WHERE `id`="+id+" and `is_seen`=0";

            console.log(sql);

            db.query(sql,data,(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else{
                    res.status(200).json({message:"Notification Seen",data:{},error:false});
                }
            });

        }
        catch(err)
        {
            res.status(200).json({error:true,message:"Something went wrong",data:{}});
        }
    },
    seen_notification_all:(req,res)=>{
        try
        {
            const ids = req?.body?.ids;

            const data = {
                is_seen:1,
                seen_at:getCurrentDateAndTime()
            }

            let sql;
            if (Array.isArray(ids) && ids.length > 0) {
                const idList = ids.map(id => parseInt(id)).filter(id => !isNaN(id)).join(',');
                sql = "UPDATE `notification` SET `is_seen`=1, `seen_at`='"+getCurrentDateAndTime()+"' WHERE `id` IN ("+idList+") AND `is_seen`=0";
            } else {
                sql = "UPDATE `notification` SET `is_seen`=1, `seen_at`='"+getCurrentDateAndTime()+"' WHERE `is_seen`=0";
            }

            console.log(sql);

            db.query(sql,(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else{
                    res.status(200).json({message:"All Notifications Seen",data:{affectedRows: result.affectedRows},error:false});
                }
            });
        }
        catch(err)
        {
            res.status(200).json({error:true,message:"Something went wrong",data:{}});
        }
    },
    GetNotification:(req,res)=>{
        try
        {
            const user = req?.user?.id;

            var sql = "SELECT `notification`.`id`,`json_data`,`child_id`,`table_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `fullname`,`notification`.`created_at` from `notification` LEFT JOIN `users` as `u` ON `u`.`id`=`notification`.`created_by` where `is_seen`=0  order by `created_at` DESC";

            db.query(sql,(err,result)=>{
                if(err)
                {
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }
                else
                {
                    res.status(200).json({message:"Record fetched",error:false,data:result});
                }
            });

        }
        catch(err)
        {
            res.status(200).json({error:true,message:"Something went wrong",data:{}});
        }
    },
    removeNotification:(id)=>{
        return new Promise((resolve,reject)=>{
            var sql = "DELETE FROM `notification` WHERE `id`="+id+"";
            db.query(sql,(err,result)=>{
                if(err){
                    reject(err);
                }else{
                    resolve(result);
                }
            })
        });
    },
    EmployeeGetNotification:(req,res)=>{
        try
        {
            const user = req?.user?.id;

            var sql = "SELECT `id`,`json_data`,`child_id`,`table_name`,`created_at` from `notification` where `is_seen`=0  and `assign_to`="+user+" order by `created_at` DESC";

            db.query(sql,(err,result)=>{
                if(err)
                {
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }
                else
                {
                    res.status(200).json({message:"Record fetched",error:false,data:result});
                }
            });

        }
        catch(err)
        {
            res.status(200).json({error:true,message:"Something went wrong",data:{}});
        }
    }
}
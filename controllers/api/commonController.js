module.exports = {
    updateMstFileStage : (mst_stage_id,mst_file_id) =>{
        const stage_id = (typeof mst_stage_id!="undefined" && typeof parseInt(mst_stage_id)=="number") ? mst_stage_id : 1;
        const sql = "UPDATE `mst_file` set `mst_stage_id`="+parseInt(stage_id)+" where `id`="+parseInt(mst_file_id)+"";
        db.query(sql,(err,result)=>{
            if(err){console.log(err)}
        });
    },
    setTeamToMstFile:(employee_id,mst_file_id)=>{
        const team_id = parseInt(employee_id);
        if(team_id && parseInt(mst_file_id))
        {
            const sql = "UPDATE `mst_file` SET `team_id`="+team_id+" WHERE `id`="+parseInt(mst_file_id)+"";
            db.query(sql,(err,result)=>{
                if(err){console.log(err)}
            });
        }
    },
    revertTeamToMstFile:(mst_file_id,callback)=>{
        if(typeof mst_file_id=="number" && mst_file_id)
        {
            console.log("revertTeamToMstFile called");
            var team_id = 0;
            let previous_stage_id = 0;
            var sql = "SELECT *FROM `mst_file` WHERE `id`="+mst_file_id+"";
            db.query(sql,(err,result)=>{
                if(err){
                    console.log(err) 
                    return callback(0);
                }
                else if(result.length>0)
                {
                    const stage_id = parseInt(result[0].mst_stage_id);
                    if(stage_id===4)
                    {
                        previous_stage_id = stage_id-1;
                        var sql = "SELECT *FROM `file_client_msg` WHERE `mst_file_id`="+mst_file_id+"";
                        db.query(sql,(err,client_msg_result)=>{
                            if(err){
                                console.log(err);
                                return callback(0);
                            }
                            else if(client_msg_result.length>0)
                            {
                                team_id = parseInt(client_msg_result[0].hod_liasoner_id);
                                module.exports.setTeamToMstFile(team_id,mst_file_id);
                                return callback(team_id);
                            }
                            else
                            {
                                return callback(0);
                            }
                        })
                    }
                    else if(stage_id===5)
                    {
                        previous_stage_id = stage_id-1;
                        var sql = "SELECT *FROM `file_details` WHERE `mst_file_id`="+mst_file_id+"";
                        db.query(sql,(err,result)=>{
                            if(err){
                                console.log(err)
                                return callback(0);
                            }
                            else if(result.length>0)
                            {
                                const tps_stage = parseInt(result[0].tps_stage);
                                var index_length=0;
                                const types = tps_stage===1 ? "Plot_validation_draft" : tps_stage===2?"Plot_validation_final":null;
                                var sql = "SELECT count(*) as `total` FROM `mst_type` WHERE `types`='"+types+"'";
                                db.query(sql,(err,types_data)=>{

                                    if(err){
                                        console.log(err)
                                        return callback(0);
                                    }
                                    else
                                    {
                                        index_length = parseInt(types_data[0].total);
                                        var sql = "SELECT *FROM `file_plot_validation` WHERE `mst_file_id`="+mst_file_id+" AND `is_rejected`=0 and `type`=2";
                                        db.query(sql,(err,finalResult)=>{
                                            if(err){
                                                console.log(err)
                                                return callback(0);
                                            }
                                            else
                                            {
                                                if(index_length){
                                                    team_id = parseInt(finalResult[index_length-1].assign_to);
                                                    module.exports.setTeamToMstFile(team_id,mst_file_id);
                                                    return callback(team_id);
                                                }else{
                                                    return callback(0);
                                                }
                                            }
                                        });                                        
                                    }
                                });
                            }
                            else
                            {
                                return callback(0);
                            }
                        });
                    }
                }
                else
                {
                    return callback(0);
                }
            });
        }
        else
        {
            return callback(0);
        }
    },
    initialEntry_to_file_plot_validation:(mst_file_id,user_id=null)=>{
        try{
            var sql = "SELECT * from `file_details` where `mst_file_id`="+parseInt(mst_file_id)+"";
            console.log(sql);
            db.query(sql,(err,result)=>{
                if(err)
                {
                    console.log(err)
                }
                else
                {
                    const tps_stage = result[0].tps_stage;

                    var mainSql="";

                    if(parseInt(tps_stage)===1)
                    {
                        mainSql = "SELECT * from `mst_type` where `types`='Plot_validation_draft' order by `display_order` asc";
                    }
                    else if(parseInt(tps_stage)===2)
                    {
                        mainSql = "SELECT * from `mst_type` where `types`='Plot_validation_final' order by `display_order` asc";
                    }
                    else if(parseInt(tps_stage)===3)
                    {
                        mainSql = "SELECT * from `mst_type` where `types`='Plot_validation_nontp' order by `display_order` asc";
                    }

                    console.log(mainSql);

                    db.query(mainSql,(err,allvalues)=>{
                        if(err)
                        {
                            console.log(err)
                        }
                        else
                        {
                            
                            for(let e of allvalues)
                            {
                                const data = 
                                {
                                    mst_file_id : mst_file_id,
                                    mst_type_id : e?.id,
                                    display_order: e?.display_order,
                                    created_at : getCurrentDateAndTime(),
                                    created_by : user_id
                                }

                                var sql = "INSERT INTO `file_plot_validation` SET ?";

                                db.query(sql,data,(err,result)=>{
                                    if(err)
                                    {
                                        console.log(err);
                                    }
                                    else{
                                        console.log("Data added to Plot validation")
                                    }
                                })
                            }
                            
                        }
                    });    

                }
            })
        }   
        catch(err){
            console.log(err);
        }
    },
    add_file_plot_validation : (mst_file_id) =>{
        
        var sql = "SELECT * from `file_details` where `mst_file_id`="+parseInt(mst_file_id)+"";

        db.query(sql,(err,result)=>{
            if(err){console.log(err)}
            else
            {
                const tps_stage = result[0].tps_stage;
                
                if(parseInt(tps_stage)===1)
                {
                    var sql = "SELECT * from `mst_type` where `types`='Plot_validation_draft' order by `display_order` asc";
                }
                else if(parseInt(tps_stage)===2)
                {
                    var sql = "SELECT * from `mst_type` where `types`='Plot_validation_final' order by `display_order` asc";
                }

                db.query(sql,(err,allvalues)=>{
                    if(err){console.log(err)}
                    else
                    {
                        var sql = "INSERT into `file_plot_validation` SET ?";
                        var counter = 0;
                        for(let data of allvalues)
                        {
                            while(counter<2)
                            {

                                db.query(sql,{mst_company_id:1,mst_file_id:mst_file_id,mst_type_id:data.id,is_save:0,is_rejected:0,type:(counter+1)},(err,output)=>{
                                    if(err) { console.log(err)}
                                    console.log("Record added--"+data.id);
                                });

                                counter++;    
                            }
                            counter = 0;
                        }
                    }
                });
            }
        });
    },
    Set_isReject_zero_file_plot_validation:(mst_file_id,reason="")=>{

        var sql = "SELECT MAX(`is_rejected`) as `last_rejected_number` from `file_plot_validation` WHERE `mst_file_id`="+mst_file_id+"";

        db.query(sql,(err,num)=>{
            if(err)
            {
                if(err){console.log("Set_isReject_zero_file_plot_validation-query 1 --"+err)}
            }
            else
            {
                const max = parseInt(num[0].last_rejected_number)+1;

                const data = {
                    is_rejected:max,
                    reason:reason
                };

                var sql = "UPDATE `file_plot_validation` SET ? WHERE `mst_file_id`="+mst_file_id+" and `is_rejected`=0";
                // var sql = "UPDATE `file_plot_validation` SET `is_rejected`="+max+",`reason`="+reason+" WHERE `mst_file_id`="+mst_file_id+" and `is_rejected`=0";

                db.query(sql,data,(err,result)=>{
                    if(err){console.log("Set_isReject_zero_file_plot_validation--"+err)}
                });

            }
        });

		
    },
    initialEntry_to_enagar_portal:(mst_company_id,mst_file_id,user_id,assign_planner=null)=>{

        const type_save={type1:{is_save:0},type2:{is_save:0},type3:{is_save:0},type4:{is_save:0},type5:{is_save:0},type6:{is_save:0}};
        const is_skip = {type1:{is_skip:0},type2:{is_skip:0},type3:{is_skip:0},type4:{is_skip:0},type5:{is_skip:0},type6:{is_skip:0}};
        var sql = "INSERT INTO `file_enagar_portal` SET ?";
        
        const data = {
            mst_company_id:mst_company_id && typeof parseInt(mst_company_id)=="number"? parseInt(mst_company_id) : 0,
            mst_file_id:parseInt(mst_file_id),
            assign_planner:assign_planner,
            type_save:JSON.stringify(type_save),
            is_skip : JSON.stringify(is_skip),
            created_by:parseInt(user_id),
            created_at:getCurrentDateAndTime()
        };

        db.query(sql,data,(err,result)=>{
            if(err){console.log(err)}
        })
    },
    updateDepartments:(userId,departments)=>{
        if(parseInt(userId) && Array.isArray(departments))
        {
            var sql = "SELECT *from `user_department_post` WHERE `user_id`="+userId+"";
            db.query(sql,(err,result)=>{
                if(err){
                    console.log(err);
                }else if(result.length){
                    try
                    {
                        var depart = departments.map((x)=>parseInt(x))
                        if(result.length==depart.length)
                        {
                            var arr = result.map((x,i)=>parseInt(x?.department_id));
                            arr.sort();
                            depart.sort();
                            
                            if(arr.every((x,i)=>x==depart[i]))
                            {

                            }
                            else
                            {
                                if(arr.length==1 && depart.length==1)
                                {
                                    if(arr[0]!=depart[0]){
                                        db.query("DELETE FROM `user_department_post` WHERE `user_id`="+userId+" and `department_id`="+arr[0]+"",(err,xresult)=>{
                                            if(err){
                                                console.log(err);
                                            }
                                        });

                                        var sql = "INSERT INTO `user_department_post`(`user_id`,`department_id`,`post_id`) VALUES ("+parseInt(userId)+","+depart[0]+",1)";
                                        db.query(sql,(err,xresult)=>{
                                            if(err){
                                                console.log(err);
                                            }else{

                                            }
                                        })
                                    }
                                }
                            }
                            
                            
                        }
                        else if(result.length>depart.length)
                        {
                            //Delete
                            for(let r of result)
                            {
                                if(!depart.includes(parseInt(r.department_id)))
                                {
                                    var sql = "DELETE FROM `user_department_post` WHERE `user_id`="+userId+" and `department_id`="+parseInt(r.department_id)+"";
                                    db.query(sql,(err,xresult)=>{
                                        if(err){
                                            console.log(err);
                                        }else{
                                            
                                        }
                                    })
                                }
                                
                            }
                        }
                        else if(depart.length>result.length)
                        {
                            //Update
                            var arr = result.map((x,i)=>parseInt(x?.department_id));
                            for(let d of depart)
                            {
                                if(!arr.includes(d))
                                {
                                    var sql = "INSERT INTO `user_department_post`(`user_id`,`department_id`,`post_id`) VALUES ("+parseInt(userId)+","+d+",1)";
                                    db.query(sql,(err,xresult)=>{
                                        if(err){
                                            console.log(err);
                                        }else{

                                        }
                                    })
                                }
                            }
                        }
                    }
                    catch(err)
                    {
                        console.log(err);
                        console.log("Error occured while updating the department");
                    }
                }
            });
        }
    },
    addDepartments:(userId,departments)=>{
        try
        {
            if(parseInt(userId) && Array.isArray(departments)){
                
                const allValues = [];
                
                for(let d of departments)
                {   
                    // allValues.push([parseInt(userId),parseInt(d),1]);
                    var sql = "INSERT INTO `user_department_post`(`user_id`,`department_id`,`post_id`) VALUES ("+userId+","+d+",1)";
                    db.query(sql,(err,result)=>{
                        if(err){
                            console.log(err);
                        }
                    })
                }

                // console.log(allValues);
                // var sql = "INSERT INTO `user_department_post`(`user_id`,`department_id`,`post_id`) VALUES (?)";
                // db.query(sql,allValues,(err,result)=>{
                //     if(err){
                //         console.log(err);
                //     }else{
                //         console.log("Department added with : "+departments);
                //     }
                // });
            }
        }catch(err)
        {
            console.log(err);
        }
    },
    getDepartmentsByUserId:(id,callback)=>{
        var sql = "SELECT *from `user_department_post` WHERE `user_id`="+id+"";
		var departments = [];
		db.query(sql,(err,departmentData)=>{
	    if(err){
				console.log(err);
                return callback(departments); 
			}else if(departmentData.length>0){
							departments = departmentData;
                            return callback(departments);
                        }else{
                            return callback(departments);
                        }
		});
    },
    getProcessNameOfFile:(mst_file_id)=>{
        return new Promise((resolve,reject)=>{
            var sql = "SELECT `mf`.`id`,`mf`.`process`,`sf`.`status_file_name` FROM `mst_file` as `mf` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process` WHERE `mf`.`id`="+mst_file_id+"";
			db.query(sql,(err,result)=>{
				if(err)
                {
					console.log(`${err}`);
					reject(err);
				}
                else if(result.length)
                {
					resolve(result[0]?.status_file_name);
				}
                else
                {
                    resolve("");
                }
			});
        })
    },
    getMstFileByMstFileId:(mst_file_id)=>{
        return new Promise((resolve,reject)=>{
            var sql = "SELECT `mf`.`id`,`office_file_no`,`file_name`,`mf`.`cus_id`,concat(`client`.`first_name`,' ',`client`.`last_name`) as `client_name`,`file_type`,`code`,`dates`,`images`,`category`,`buc`,`status`,`process`,`show_exp`,`show_todo`,`architect_id`,`mf`.`comp_id`,`file_document_json`,`is_save`,`team_id`,concat(`emp`.`first_name`,' ',`emp`.`last_name`) as `employee_name`,`mf`.`isdeleted`,`mf`.`created_at`,`mf`.`created_by`,`mf`.`updated_by`,`mf`.`updated_at` FROM `mst_file` as `mf` LEFT JOIN `users` as `emp` ON `emp`.`id`=`mf`.`team_id` LEFT JOIN `users` as `client` ON `client`.`id`=`mf`.`cus_id` WHERE `mf`.`id`="+mst_file_id+"";
            db.query(sql,(err,result)=>{
                if(err){
                    reject(err);
                }else{
                    resolve(result);
                }
            });
        });
    },
    getUserByUserId:(userID)=>{
        return new Promise((resolve,reject)=>{
            var sql = "SELECT `u`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `fullname`,`u`.`email`,`u`.`username`,`u`.`phone`,`u`.`phone`,`u`.`country_id`,`u`.`city_id`,`u`.`state_id`,`u`.`street`,`u`.`zip_code`,`u`.`address`,`u`.`description`,`u`.`profile_picture`,`u`.`department_id`,`u`.`post_id`,`u`.`comp_id`,`u`.`isdeleted`,`u`.`created_by`,`u`.`created_at`,`u`.`updated_at`,`u`.`updated_by` FROM `users` as `u`WHERE `u`.`id`="+userID+"";
            db.query(sql,(err,result)=>{
                err ? reject(err) : resolve(result);
            });
        });
    },
    getStageStageId:(stageId)=>{
        return new Promise((resolve,reject)=>{
            try{
                var sql = "SELECT *from `mst_stage` WHERE `id`="+parseInt(stageId)+"";
                db.query(sql,(err,result)=>{
                    if(err){
                        reject(err);
                    }else{
                        resolve(result);
                    }
                });
            }catch(err){
                resolve(err);
            }
        });
    },
    initialEntry_to_allImportantFees:(mst_file_id,user_id)=>{
        return new Promise((resolve,reject)=>{
         var sql = "SELECT *from `mst_type` WHERE `types`='all_important_fees'";

         db.query(sql,(err,result)=>{
            if(err){
                reject(err);
            }else if(result.length>0){
                const rows = [];
                var sql = "INSERT INTO `all_important_fees` SET ?"
                for(const e of result){
                    const data = {
                        mst_file_id:mst_file_id,
                        mst_type_id:e?.id,
                        description : e?.type_name,
                        created_at:getCurrentDateAndTime(),
                        created_by:user_id
                    }

                    db.query(sql,data,(err,result)=>{
                        if(err){
                            reject(err);
                        }else{
                            resolve(result);
                        }
                    });

                }
            }else{
                reject(err);
            }
         })
        });
    },
    initialEntry_to_approved_plan: (mst_file_id,user_id,is_skip=0)=>
    {
        const key = "plan";
         db.query("SELECT * FROM `mst_document` WHERE `category`='"+key+"'",  (err,result)=>{
            if(err){
                console.log(err);
            }else if(result.length>0){
                for(let x of result){
                    const data = {
                        mst_file_id : mst_file_id,
                        mst_document_id: x?.id,
                        document_name: x?.doc_name,
                        is_skip : is_skip,
                        is_save : is_skip,
                        created_at:getCurrentDateAndTime(),
                        created_by:user_id
                    }

                    var sql = "INSERT INTO `file_approved_plan` SET ?";

                     db.query(sql,data,(err,result)=>{
                        if(err){
                            console.log(err);
                        }
                    });
                }
            }else{
                console.log("Not found for initialEntry_to_approved_plan")
            }
        });
    },
    initialEntry_to_file_aminities_fees:(mst_file_id,user_id,is_save=0)=>
    {
        var sql = "INSERT INTO `file_aminities_fees` SET ?";
        const data = {
            mst_file_id : mst_file_id,
            created_at:getCurrentDateAndTime(),
            is_type:1,
            is_save:0,
            is_skip:0,
            created_by : user_id
        }
        db.query(`${sql}`,data,(err,result)=>{
            if(err){
                console.log(err);
            }
        })

        var sql2 = "INSERT INTO `file_aminities_fees` SET ?";
        const data2 = {
            mst_file_id : mst_file_id,
            created_at:getCurrentDateAndTime(),
            is_type:2,
            is_save:0,
            is_skip:0,
            created_by : user_id
        }
        db.query(`${sql2}`,data2,(err,result)=>{
            if(err){
                console.log(err);
            }
        })
    }
}
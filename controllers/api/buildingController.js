module.exports = 
{
    
    checkJson : (jsonString)=>{
        try{
            return JSON.parse(jsonString);
        }
        catch(err){
            return null;
        }
    },
    getBuildingData : (req,res)=>
    {
        try
        {
            const mst_file_id = req.params?.id;
            var sql = "SELECT `building_details`,`building_project_type`,`is_save_building_details` FROM `project_details` WHERE `mst_file_id`="+mst_file_id+"";
            db.query(sql,(err,result)=>{
                if(err){
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else if(result.length>0){
                    res.status(200).json({message:"Record fetched",data:result,error:false})

                }else{
                    res.status(200).json({message:"Not found",data:[],error:false})
                }
            })
        }
        catch(err)
        {
            res.status(200).json({message:"Server error",data:{},error:true});
        }
    },
    saveBuildingData : (req,res)=>
    {
        try
        {
            const data = req.body?.data;
            console.log(data);
            var sql = "SELECT *FROM `project_details` WHERE `mst_file_id`="+data?.mst_file_id+"";

            db.query(sql,(err,result)=>{
                if(err)
                {
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }
                else if(result.length>0)
                {
                    var created_at = result[0]?.created_at_building_details ? result[0]?.created_at_building_details : getCurrentDateAndTime();
                    var created_by = result[0]?.created_by_building_details ? result[0]?.created_by_building_details : req.user?.id;

                    const updatedData  = {
                        created_at_building_details : created_at,
                        created_by_building_details :created_by,
                        building_details : data?.building_details!=undefined ? JSON.stringify(data?.building_details) : null,
                        building_project_type : data?.building_project_type,
                        updated_at_building_details : getCurrentDateAndTime(),
                        updated_by_building_details : req.user?.id
                    }

                    var sql = "UPDATE `project_details` SET ? WHERE `mst_file_id`="+data?.mst_file_id+"";

                    db.query(sql,updatedData,(err,result)=>{
                        if(err){
                            console.log(err);
                            res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                        }else{
                            res.status(200).json({message:"Changes saved!",data:{},error:false});
                        }
                    })
                }
                else
                {
                    //Insert

                    const insertData = {
                        mst_file_id : data?.mst_file_id,
                        building_details : data?.building_details!=undefined  ? JSON.stringify(data?.building_details) : "",
                        building_project_type :data?.building_project_type,
                        created_at_building_details : getCurrentDateAndTime(),
                        created_by_building_details : req.user?.id
                    }

                    var sql = "INSERT INTO `project_details` SET ? "

                    db.query(sql,insertData,(err,result)=>{
                        if(err){
                            console.log(err);
                            res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                        }else{
                            res.status(200).json({message:"Changes saved!",error:false,data:{}});
                        }
                    })

                }
            })
        }
        catch(err)
        {
            res.status(200).json({message:"Server error",data:{},error:true});
        }
    },
    deleteBuildingData : (req,res)=>
    {
        try
        {
            const index = req.body?.index;
            const mst_file_id = req.body?.mst_file_id;

            var sql = "SELECT *from `project_details` WHERE `mst_file_id`="+mst_file_id+"";

            db.query(sql,(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }
                else if(result.length>0)
                {
                    const building_details = module.exports.checkJson(result[0]?.building_details);

                    if(Array.isArray(building_details) && building_details.length>0)
                    {
                        console.log(building_details);
                        const filterArr = building_details.filter((e,i)=>e?.index!=index);

                        const newArr =  filterArr.map((e,i)=>({...e,index:(i+1)}))

                        console.log(newArr);

                        const updatedData = {
                            building_details : JSON.stringify(newArr),
                            updated_at_building_details : getCurrentDateAndTime(),
                            updated_by_building_details : req.user?.id
                        } 

                        var sql = "UPDATE `project_details` SET ? WHERE `mst_file_id`="+mst_file_id+"";

                        db.query(sql,updatedData,(err,result)=>{
                            if(err){
                                res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                            }else{
                                res.status(200).json({message:"Removed!",error:false,data:{}});
                            }
                        })
                    }
                    else
                    {
                        res.status(200).json({message:"Unable to delete",data:{},error:true});
                    }

                }
                else
                {
                    res.status(200).json({message:"File record doesn;t exist",data:{},error:true});
                }
            })

        }
        catch(err)
        {
            res.status(200).json({message:"Server error",data:{},error:true});
        }
    },
    getProjectTypes : (req,res)=>{
        try
        {
            var sql = "SELECT `id`,`type_name` FROM `mst_type` WHERE LCASE(`types`)='project_types' ORDER BY `display_order` ASC";

            db.query(sql,(err,result)=>{
                if(err)
                {
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }
                else if(result.length>0)
                {
                    res.status(200).json({message:"Record Fetched",data:result,error:false});
                }
                else
                {
                    res.status(200).json({message:"Not found",data:[],error:false}); 
                }
            })
        }
        catch(err)
        {
            console.log(err);
            res.status(200).json({message:"Server error",data:{},error:true});
        }
    }
}
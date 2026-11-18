const { unlinkMultipleImages, getImageWithFoldername } = require("../../services/FileService");
module.exports=
{
    checkJson : (jsonString)=>{
        try{
            return JSON.parse(jsonString);
        }
        catch(err){
            return null;
        }
    },
    get_site_condition:(req,res)=>
    {
        try
        {
            const mst_file_id = req.params?.id;
            var sql = "SELECT `id`,`site_condition`,`is_save_site_condition` from `project_details` WHERE `mst_file_id`="+mst_file_id+"";
            db.query(sql,(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessage,error:true,data:[]});
                }else if(result.length>0){
                    res.status(200).json({message:"Record fetched",data:result,error:false});
                }else{
                    res.status(200).json({message:"Not found",data:[],error:false});
                }
            })
        }
        catch(err)
        {
            console.log(err);
            res.status(200).json({message:"Server error",data:{},error:true});
        }
    },
    save_site_condition:(req,res)=>
    {
        const filePathArray = [];
        var paths = [];
        try
        {
           
            const mst_file_id = req.body?.mst_file_id;
            const plaintextdata = JSON.parse(req.body?.plaintextdata);

            console.log(req.files);

            var google_image_1 = "";
            var google_image_2 = "";
            

            if(req?.files.length>0)
            {
                req.files.forEach((f)=>{
                    if(f?.fieldname?.toLowerCase()=="google_image_1")
                    {
                        console.log("google image 1 found");
                        google_image_1 = getImageWithFoldername(f?.path);
                    }
                    else if(f?.fieldname?.toLowerCase()=="google_image_2")
                    {
                        console.log("google image 2 found");

                        google_image_2 = getImageWithFoldername(f?.path);
                    }
                    else
                    {
                        filePathArray.push({fieldname:f?.fieldname,path:getImageWithFoldername(f?.path)});
                    }
                    paths.push(getImageWithFoldername(f?.path));
                });  
            }


            var sql = "SELECT *from `project_details` WHERE `mst_file_id`="+mst_file_id+"";

            db.query(sql,(err,result)=>{
                if(err)
                {
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,data:[],error:true})
                }
                else if(result.length>0)
                {

                    const site_condition_data = module.exports.checkJson(result[0]?.site_condition);

                    var old_google_image_1 = site_condition_data?.google_image_1?.length>0 ? site_condition_data?.google_image_1 : "";
                    var old_google_image_2 = site_condition_data?.google_image_2?.length>0 ? site_condition_data?.google_image_2 : "";

                    var created_at = result[0]?.created_at_site_condition ? result[0]?.created_at_site_condition : getCurrentDateAndTime();
                    var created_by = result[0]?.created_by_site_condition ?  result[0]?.created_by_site_condition : req.user?.id;

                    var finalData_site_condition = [];

                    if(site_condition_data)
                    {
                       
                        let site_condition_image = site_condition_data.site_condition_image;

                        if(Array.isArray(site_condition_image) && site_condition_image?.length>0)
                        {
                            if(filePathArray.length && Array.isArray(filePathArray))
                            {
                                var tempData = [];
                                filePathArray.forEach((p,i1)=>{
                                    if(site_condition_image.some((e)=>e?.index==p?.fieldname.split("_")[0]))
                                    {
                                        tempData.push({index:p?.fieldname.split("_")[0],file:p?.path});
                                    }   
                                    else
                                    {
                                        tempData.push({index:p?.fieldname.split("_")[0],file:p?.path});
                                    }
                               });
    
                               
    
                               site_condition_image.forEach((e1,i1)=>{
                                    if(!tempData.some((e2)=>e2.index==e1.index)){
                                        finalData_site_condition.push(e1);
                                    }
                                });
    
                                finalData_site_condition = [...finalData_site_condition,...tempData];
    
                                finalData_site_condition = finalData_site_condition.sort((a,b) => a.index - b.index);
                                
                                console.log(finalData_site_condition);
    
                            }
                            else
                            {
                                finalData_site_condition  = site_condition_image;
                            }


                        }
                        else
                        {
                            if(filePathArray.length && Array.isArray(filePathArray))
                            {
                                var tempData = [];
                                filePathArray.forEach((p,i1)=>{
                                    tempData.push({index:p?.fieldname.split("_")[0],file:p?.path});
                               });
    
                                finalData_site_condition = [...finalData_site_condition,...tempData];
                                finalData_site_condition = finalData_site_condition.sort((a,b) => a.index - b.index);
                            }
                            else
                            {
                                finalData_site_condition  = [];
                            }


                        }


                        const site_condition_object = {
                            east : plaintextdata?.east,
                            east_wide : plaintextdata?.east_wide,
                            west : plaintextdata?.west,
                            west_wide : plaintextdata?.west_wide,
                            south : plaintextdata?.south,
                            south_wide : plaintextdata?.south_wide,
                            north : plaintextdata?.north,
                            north_wide : plaintextdata?.north_wide,
                            google_image_1 : google_image_1 ? google_image_1 :   old_google_image_1 ,
                            google_image_2 : google_image_2 ?    google_image_2 : old_google_image_2 ,
                            site_condition_image:finalData_site_condition
                        }


                        const finalData = {
                            site_condition : JSON.stringify(site_condition_object),
                            created_at_site_condition : created_at,
                            created_by_site_condition : created_by,
                            updated_at_site_condition : getCurrentDateAndTime(),
                            updated_by_site_condition : req.user?.id
                        }
                        
                        
                        var sql = "UPDATE  `project_details` SET ? WHERE `mst_file_id`="+mst_file_id+"";

                        db.query(sql,finalData,(err,result)=>{
                            if(err){
                                console.log(err);
                                res.status(200).json({message:err.sqlMessage,data:{},error:true});
                            }else{
                                console.log("Updated");
                                res.status(200).json({message:"changes saved",data:{},error:false});
                            }
                        });
                       
                    }
                    else
                    {
                       
                        if(filePathArray.length && Array.isArray(filePathArray))
                        {
                        

                            const rows = [];
                            
                            for(let p of filePathArray)
                            {
                                rows.push({
                                    index : p?.fieldname.split("_")[0],
                                    file : p?.path
                                })
                            }

                            let finalData = {
                                east : plaintextdata?.east,
                                east_wide : plaintextdata?.east_wide,
                                west : plaintextdata?.west,
                                west_wide : plaintextdata?.west_wide,
                                south : plaintextdata?.south,
                                south_wide : plaintextdata?.south_wide,
                                north : plaintextdata?.north,
                                north_wide : plaintextdata?.north_wide,
                                google_image_1 : google_image_1,
                                google_image_2 : google_image_2,
                                
                                site_condition_image:rows,

                            }

                            console.log(finalData);

                            const updatedData = {
                                mst_file_id : mst_file_id,
                                site_condition : JSON.stringify(finalData),
                                created_at_site_condition : created_at,
                                created_by_site_condition : created_by,
                                updated_at_site_condition : getCurrentDateAndTime(),
                                updated_by_site_condition : req?.user?.id
                            }


                            var sql = "UPDATE  `project_details` SET ? WHERE `mst_file_id`="+mst_file_id+"";

                            db.query(sql,updatedData,(err,result)=>{
                                if(err){
                                    console.log(err);
                                    paths?.length ? unlinkMultipleImages(paths):""
                                    res.status(200).json({message:err.sqlMessage,data:{},error:true});
                                }else{
                                    console.log("Inserted 1");
                                    res.status(200).json({message:"changes saved",data:{},error:false});
                                }
                            });

                        }
                        else
                        {
                            let finalData = {
                                east : plaintextdata?.east,
                                east_wide : plaintextdata?.east_wide,
                                west : plaintextdata?.west,
                                west_wide : plaintextdata?.west_wide,
                                south : plaintextdata?.south,
                                south_wide : plaintextdata?.south_wide,
                                north : plaintextdata?.north,
                                north_wide : plaintextdata?.north_wide,
                                google_image_1 : google_image_1,
                                google_image_2 : google_image_2,
                                site_condition_image:[]
                            }
                            const updatedData = {
                                mst_file_id : mst_file_id,
                                site_condition : JSON.stringify(finalData),
                                updated_at_site_condition : getCurrentDateAndTime(),
                                updated_by_site_condition : req?.user?.id
                            }

                            var sql = "UPDATE  `project_details` SET ? WHERE `mst_file_id`="+mst_file_id+"";

                            db.query(sql,updatedData,(err,result)=>{
                                if(err){
                                    console.log(err);
                                    paths?.length ? unlinkMultipleImages(paths):""
                                    res.status(200).json({message:err.sqlMessage,data:{},error:true});
                                }else{
                                    console.log("Inserted 2");
                                    res.status(200).json({message:"changes saved",data:{},error:false});
                                }
                            });
                        }
                    }

                    
                   

                }
                else
                {

                    let finalData = {
                        east : plaintextdata?.east,
                        east_wide : plaintextdata?.east_wide,
                        west : plaintextdata?.west,
                        west_wide : plaintextdata?.west_wide,
                        south : plaintextdata?.south,
                        south_wide : plaintextdata?.south_wide,
                        north : plaintextdata?.north,
                        north_wide : plaintextdata?.north_wide,
                        google_image_1 : google_image_1,
                        google_image_2 : google_image_2,
                    }





                    if(filePathArray.length && Array.isArray(filePathArray))
                    {
                    
                       const rows = [];
                        
                        for(let p of filePathArray)
                        {
                            rows.push({
                                index : p?.fieldname.split("_")[0],
                                file : p?.path
                            })
                        }

                        finalData = {...finalData,site_condition_image:rows}

                        const updatedData = {
                            mst_file_id : mst_file_id,
                            site_condition : JSON.stringify(finalData),
                            created_at_site_condition : getCurrentDateAndTime(),
                            created_by_site_condition : req?.user?.id
                        }

                        var sql = "INSERT INTO  `project_details` SET ?";

                        db.query(sql,updatedData,(err,result)=>{
                            if(err){
                                console.log(err);
                                paths?.length ? unlinkMultipleImages(paths):""
                                res.status(200).json({message:err.sqlMessage,data:{},error:true});
                            }else{
                                console.log("Inserted 3");
                                res.status(200).json({message:"changes saved",data:{},error:false});
                            }
                        });

                    }
                    else
                    {
                        finalData = {...finalData,site_condition_image:[]}

                        const updatedData = {
                            mst_file_id : mst_file_id,
                            site_condition : JSON.stringify(finalData),
                            created_at_site_condition : getCurrentDateAndTime(),
                            created_by_site_condition : req?.user?.id
                        }

                        var sql = "INSERT INTO  `project_details` SET ?";

                        db.query(sql,updatedData,(err,result)=>{
                            if(err){
                                console.log(err);
                                paths?.length ? unlinkMultipleImages(paths):""
                                res.status(200).json({message:err.sqlMessage,data:{},error:true});
                            }else{
                                console.log("Inserted 4");
                                res.status(200).json({message:"changes saved",data:{},error:false});
                            }
                        });
                    }
                }
            });

        }
        catch(err)
        {
            console.log(err);
            paths?.length ? unlinkMultipleImages(paths):""
            res.status(200).json({message:"Server error",data:{},error:true});
        }
    },
    save_and_next_site_condition:(req,res)=>
    {
        try
        {

        }
        catch(err)
        {
            console.log(err);
            res.status(200).json({message:"Server error",data:{},error:true});
        }
    },
    skip_site_condition:(req,res)=>
    {
        try
        {

        }
        catch(err)
        {
            console.log(err);
            res.status(200).json({message:"Server error",data:{},error:true});
        }
    },
    delete_site_condition:(req,res)=>{
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
                    var site_condition_data = module.exports.checkJson(result[0]?.site_condition);
                    const site_condition_image_arr = site_condition_data.site_condition_image;

                    if(Array.isArray(site_condition_image_arr) && site_condition_image_arr!=null)
                    {

                        const filterArr = site_condition_image_arr.filter((e,i)=>e?.index!=index);

                        const newArr =  filterArr.map((e,i)=>({...e,index:(i+1)}))

                        site_condition_data = {...site_condition_data,site_condition_image:newArr}
                         

                        const updatedData = {
                            site_condition : JSON.stringify(site_condition_data),
                            updated_at_site_condition : getCurrentDateAndTime(),
                            updated_by_site_condition : req.user?.id
                        } 

                        var sql = "UPDATE  `project_details` SET ? WHERE `mst_file_id`="+mst_file_id+"";

                        db.query(sql,updatedData,(err,result)=>{
                            if(err){
                                console.log(err);
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
            console.log(err);
            res.status(200).json({message:"Server error",data:{},error:true});
        }
    },
    getProjectDirection:(req,res)=>{
        try
        {
            var sql = "SELECT `id`,`type_name` FROM `mst_type` WHERE LCASE(`types`)='project_direction' ORDER BY `display_order` ASC";

            db.query(sql,(err,result)=>{
                if(err){
                    console.log(err);
                    res.status(200).json({message:err.sqlMessage,error:true,data:{}});
                }else if(result.length>0){
                    res.status(200).json({message:"Record Fetched",data:result,error:false});
                }else{
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
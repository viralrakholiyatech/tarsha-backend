const { unlinkMultipleImages, getImageWithFoldername } = require("../../services/FileService");
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
    getTentativePdf:(req,res)=>{
        try
        {
            const mst_file_id = req.params?.id;
            var sql = "SELECT `id`,`tentative_pdf`,`is_save_tentative_pdf`,`is_save_tentative_pdf` from `project_details` WHERE `mst_file_id`="+mst_file_id+"";
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
            res.status(200).json({message:"Server Error",data:{},error:true});
        }
    },
    saveTentativePdf:(req,res)=>{
        try
        {
            const filePathArray = [];
            var paths = [];
            const mst_file_id = req.body?.mst_file_id;

            console.log(req.files);

            if(req?.files.length>0)
            {
                req.files.forEach((f)=>{
                    filePathArray.push({fieldname:f?.fieldname,path:getImageWithFoldername(f?.path)});
                    paths.push(getImageWithFoldername(f?.path));
                });  
            }

            var sql = "SELECT *from `project_details` WHERE `mst_file_id`="+mst_file_id+"";

            db.query(sql,(err,result)=>{
                if(err){
                    res.status(200).json({message:err.sqlMessage,data:[],error:true})
                }else if(result.length>0){

                    const tentative_pdf = module.exports.checkJson(result[0]?.tentative_pdf);
                   
                    var created_at = result[0]?.created_at_tentative_pdf ? result[0]?.created_at_tentative_pdf : getCurrentDateAndTime();
                    var created_by = result[0]?.created_by_tentative_pdf ? result[0]?.created_by_tentative_pdf : req.user?.id;


                    if(tentative_pdf!=null)
                    {

                        var finalData = [];

                        if(filePathArray.length && Array.isArray(filePathArray))
                        {
                            var tempData = [];
                            filePathArray.forEach((p,i1)=>{
                                if(tentative_pdf.some((e)=>e?.index==p?.fieldname.split("_")[0]))
                                {
                                    tempData.push({index:p?.fieldname.split("_")[0],file:p?.path});
                                }   
                                else
                                {
                                    tempData.push({index:p?.fieldname.split("_")[0],file:p?.path});
                                }
                           });

                           

                           tentative_pdf.forEach((e1,i1)=>{
                                if(!tempData.some((e2)=>e2.index==e1.index)){
                                    finalData.push(e1);
                                }
                            });

                            finalData = [...finalData,...tempData];

                            finalData = finalData.sort((a,b) => a.index - b.index);
                            
                            console.log(finalData);

                        }
                        else
                        {
                            finalData  = tentative_pdf;
                        }

                        const updatedData = {
                            tentative_pdf : JSON.stringify(finalData),
                            created_at_tentative_pdf : created_at,
                            created_by_tentative_pdf : created_by,
                            updated_at_tentative_pdf : getCurrentDateAndTime(),
                            updated_by_tentative_pdf : req?.user?.id
                        }

                        var sql = "UPDATE  `project_details` SET ? WHERE `mst_file_id`="+mst_file_id+"";

                        db.query(sql,updatedData,(err,result)=>{
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
                        
                        if(filePathArray.length && Array.isArray(filePathArray)){
                        
                           const rows = [];
                            
                            for(let p of filePathArray)
                            {
                                rows.push({
                                    index : p?.fieldname.split("_")[0],
                                    file : p?.path
                                })
                            }

                            console.log(rows);

                            const updatedData = {
                                tentative_pdf : JSON.stringify(rows),
                                created_at_tentative_pdf : created_at,
                                created_by_tentative_pdf : created_by,
                                updated_at_tentative_pdf : getCurrentDateAndTime(),
                                updated_by_tentative_pdf : req?.user?.id
                            }

                            var sql = "UPDATE  `project_details` SET ? WHERE `mst_file_id`="+mst_file_id+"";

                            db.query(sql,updatedData,(err,result)=>{
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
                            res.status(200).json({message:"Unable to save",data:{},error:true});
                        }
                    }

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

                        console.log(rows);

                        const updatedData = {
                            mst_file_id : mst_file_id,
                            tentative_pdf : JSON.stringify(rows),
                            created_at_tentative_pdf : getCurrentDateAndTime(),
                            created_by_tentative_pdf : req?.user?.id
                        }

                        var sql = "INSERT INTO  `project_details` SET ?";

                        db.query(sql,updatedData,(err,result)=>{
                            if(err){
                                console.log(err);
                                paths?.length ? unlinkMultipleImages(paths):""
                                res.status(200).json({message:err.sqlMessage,data:{},error:true});
                            }else{
                                console.log("Inserted");
                                res.status(200).json({message:"changes saved",data:{},error:false});
                            }
                        });

                    }
                    else
                    {
                        res.status(200).json({message:"Unable to save",data:{},error:true});
                    }
                }
            });
        }
        catch(err)
        {
            paths?.length ? unlinkMultipleImages(paths):""
            res.status(200).json({message:"Server Error",data:{},error:true});
        }
    },
    deleteTenativePdf:(req,res)=>{
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
                    const tentative_pdf = module.exports.checkJson(result[0]?.tentative_pdf);

                    if(Array.isArray(tentative_pdf) && tentative_pdf!=null)
                    {
                        const filterArr = tentative_pdf.filter((e,i)=>e?.index!=index);


                        const newArr =  filterArr.map((e,i)=>({...e,index:(i+1)}))
                        

                        const updatedData = {
                            tentative_pdf : JSON.stringify(newArr),
                            updated_at_tentative_pdf : getCurrentDateAndTime(),
                            updated_by_tentative_pdf : req.user?.id
                        } 

                        var sql = "UPDATE  `project_details` SET ? WHERE `mst_file_id`="+mst_file_id+"";

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
            res.status(200).json({message:"Server Error",data:{},error:true});
        }
    }
}
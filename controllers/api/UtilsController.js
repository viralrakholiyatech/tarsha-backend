module.exports = {
    departments:(req,res)=>{
        var sql ="SELECT * FROM `mst_department`";
        db.query(sql,(err,result)=>{
            if(err){
                console.log(err);
                res.status(200).json({message:"Unable to fetch department data",error:true,data:{}})
            }else if(result.length>0){
                res.status(200).json({message:"Record fetched",error:false,data:result})
            }else{
                res.status(200).json({message:"Unable to fetch department data",error:true,data:{}})
            }
        });
    },
    post:(req,res)=>{
        var sql = "SELECT * FROM `mst_post`";
        db.query(sql,(err,result)=>{
            if(err){
                console.log(err);
                res.status(200).json({message:"Unable to fetch department data",error:true,data:{}})
            }else if(result.length>0){
                res.status(200).json({message:"Record fetched",error:false,data:result})
            }else{
                res.status(200).json({message:"Unable to fetch department data",error:true,data:{}})
            }
        });
    },
    Roles:(req,res)=>{
        var sql = "SELECT * FROM `mst_groups`";
        db.query(sql,(err,result)=>{
            if(err){
                console.log(err);
                res.status(200).json({message:"Unable to fetch roles data",error:true,data:{}})
            }else if(result.length>0){
                res.status(200).json({message:"Record fetched",error:false,data:result})
            }else{
                res.status(200).json({message:"Unable to fetch roles data",error:true,data:{}})
            }
        });
    }
}
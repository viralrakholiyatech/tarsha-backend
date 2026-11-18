var mdl_common     = require('./../../models/mdl_common');
var asyncLoop = require('node-async-loop');
module.exports = {
    getDocumentMaster:(req,res)=>{
        
        req.assert("category","Please enter category").notEmpty();
        var errors =req.validationErrors();
        if(errors)
        {
            var data = {"error":true,"message":errors[0].msg,data:new Object()};
            res.status(201).send(data);
        }
        else
        {
            const values = {
                comp_id  : 1,
                category : req.body.category
            };

            var sql = "SELECT *FROM `mst_document` WHERE `category`='"+values.category+"' and `comp_id`="+values.comp_id+"";
            db.query(sql,(err,result)=>{
                if(err){
                    var data = {"error":true,"message":"Unable to fetch the data",data:new Object()};
                    res.status(201).send(data);
                }else{
                    var data = {"error":false,"message":"Record fetched successfully",data:result};
                    res.status(201).send(data);
                }
            })    
        }
    }
}
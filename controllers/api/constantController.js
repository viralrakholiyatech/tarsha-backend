var mdl_common     = require('./../../models/mdl_common');
var asyncLoop = require('node-async-loop');
module.exports = {
	
	getStatus_File:function(req,res){

		  var sql = "select * from status_file ";
		  db.query(sql,function(err,result){
			  if (err){
				  var data = {"error":true,'message':err.sqlMessage,'data':new Object()};
				  res.status(201).send(data);
			  }else{
				  if(result.length >0){	
					  var data = {"error":false,'message':"Recoard fetched successfully",'data':result};
					  res.status(201).send(data);
				  }else{
					  var data = {error:true,message:'Some thing went to wrong.','data':new Object()};
					  res.status(201).send(data);	
				  }
			  }
		  })
		
	},
	getMst_Type: async function(req,res){
		
	  var sql = "SELECT * from mst_type WHERE `types`='File_Type'";
	  db.query(sql, function (err, result) {
		  if (err) {				    
			  var data = {"error":true,'message':err.sqlMessage,'data':new Object()};
			  res.status(201).send(data);				    	
		  }else{
			  if(result.length >0){						
				  var data = {"error":false,'message':'Recoard fetched successfully','data':result};
			  res.status(201).send(data);		
			  }else{
				  var data = {error:true,message:'Some thing went to wrong.','data':new Object()};
				  res.status(201).send(data);							
			  }
		  }			   		 
	  });
						
	}
};	

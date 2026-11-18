var mdl_common     = require('./../../models/mdl_common');
var asyncLoop = require('node-async-loop');
const { unlinkMultipleImages,getImageWithFoldername, unlinkSingleImage } = require('../../services/FileService');
module.exports = {
	add: function (req, res) {		
		
		req.assert('file_id',"Please select a file.").notEmpty();
        req.assert('amount',"Amount is required.").notEmpty();
		req.assert("date","date is required").notEmpty();														
		var errors = req.validationErrors();
		if(errors){
			var data = {error: true,message:errors[0].msg,data:{}};			
			res.status(201).send(data);	
		}else{	
			jwt.verify(req.token, meta.thekey,(err, auth) => {
				if(err) {		    
					res.json({message:err.message,error:true});
				}else {	
					
					const this_data = JSON.parse(JSON.stringify(req.body));

					if(req.files.length===0)
					{
						var data = {"error":true,'message':"Please upload the receipt",'data':{}};
						res.status(201).send(data);
					}else{

						var files = [];
						var unnecessary_files = [];
						var receipt_image = "";
						var submitters_img1 = "";
						var submitters_img2 = "";
						var submitters_img3 = "";
						(req.files).forEach((f)=>{
							if(f.fieldname==="receipt_image") {
								receipt_image = getImageWithFoldername(f.path);
								files.push(receipt_image);
							}else if(f.fieldname==="submitters_img1"){
								submitters_img1 = getImageWithFoldername(f.path);
								files.push(submitters_img1);
							}else if(f.fieldname==="submitters_img2"){
								submitters_img2 = getImageWithFoldername(f.path);
								files.push(submitters_img2);
							}else if(f.fieldname==="submitters_img3"){
								submitters_img3 = getImageWithFoldername(f.path);
								files.push(submitters_img3);
							}else{
								unnecessary_files.push(getImageWithFoldername(f.path));
							}
						});

						/*Remove unnecessary files which are not receipt_image,submitters_img1,submitters_img2,submitters_img3 */
						unlinkMultipleImages(unnecessary_files);

						if(!receipt_image)
						{
							/*If receipt image is not uploaded then remove submitters_img1,submitters_img2,submitters_img3*/
							unlinkMultipleImages(files);
							
							var data = {"error":true,'message':"Please upload the receipt",'data':{}};
							res.status(201).send(data);
						}
						
					}

					var user_id = auth.id;																						
					var expense = {
						"file_id":this_data.file_id,
						"amount":this_data.amount,					    
						"description":this_data.description ? this_data.description : "",
						"date":this_data.date,		   									    									    						   							    						 						    							  	   							    						  
						"receipt_image":receipt_image ? receipt_image : "",
						"submitters_img1":submitters_img1,
						"submitters_img2":submitters_img2,
						"submitters_img3":submitters_img3,
						"created_by":user_id,
						"created_at":getCurrentDateAndTime(), //getCurrentDateAndTime() -> from app.js
						"updated_at" : null,
						"updated_by" : null
					}

					console.log(expense);

					db.query('INSERT INTO file_expense SET ?',expense, function (err, result) {
						if (err){
							/*If error occur then remove all the images*/
							unlinkMultipleImages(files);

							var data = {"error":true,'message':err.sqlMessage,'data':{}};
							res.status(201).send(data);
						}else{
							$sql = "SELECT `file_expense`.*,`mst_file`.`file_name` FROM `file_expense` LEFT JOIN `mst_file` ON `mst_file`.`id`=`file_expense`.`file_id` WHERE `file_expense`.`isdeleted`=0 and `file_expense`.`id`='"+result.insertId+"'";
							db.query($sql,async function(err,user){
								if (err){
									var data = {"error":true,'message':err.sqlMessage,'data':{}};
									res.status(201).send(data);
								}else{
									var data = {error: false,message:'File expense has been added successfully.',data:user[0]};
									res.status(201).send(data);		
								}
							});
						}
					});
				}
			});				
				
		}
	},
	getExpenses: async function(req,res){
		jwt.verify(req.token, meta.thekey,(err, auth) => {
		    if(err) {		    
		      	res.json({message:err.message,error:true});
		    }else {		    	
				var user_id = auth.id;
				//get current user
				var sql = "SELECT `file_expense`.*,`mst_file`.`file_name` FROM `file_expense` LEFT JOIN `mst_file` ON `mst_file`.`id`=`file_expense`.`file_id` WHERE `file_expense`.`isdeleted`=0";
				db.query(sql, function (err, result) {
					if (err) {				    
						var data = {"error":true,'message':err.sqlMessage,'data':{}};
						res.status(201).send(data);				    	
					}else{
						if(result.length >0){						
							var data = {"error":false,'message':'Recoard fetched successfully','data':result};
							res.status(201).send(data);		
						}else{
							var data = {error:false,message:'Not found','data':[]};
							res.status(201).send(data);							
						}
					}			   		 
				});
						      	
			}
		});	
	},
	getExpenseById: async (req,res) =>{
		jwt.verify(req.token,meta.thekey,(err,auth)=>{
			if(err){
				res.json({message:err.message,error:true});
			}else{
				var user_id = auth.id;
				var id = parseInt(req.params.id);
				//var sql = "SELECT `file_expense`.*,`mst_file`.`file_name` FROM `file_expense` LEFT JOIN `mst_file` ON `mst_file`.`id`=`file_expense`.`file_id` WHERE `file_expense`.`isdeleted`=0 && id="+id+"";
				var sql = "SELECT *from `file_expense`WHERE `id`="+id+"";
				db.query(sql,(err,result)=>{
					if(err){
						var data = {"error":true,'message':err.sqlMessage,'data':{}};
						res.status(201).send(data);	
					}else{
						if(result.length>0){
							var data = {"error":false,'message':'Record fetched successfully','data':result};
							res.status(201).send(data);		
						}else{
							var data = {error:true,message:'Requested record not found','data':[]};
							res.status(201).send(data);
						}
					}
				});
			}
		})
	},
	update: function (req, res) {
		req.assert("id","Id is required").notEmpty();
		req.assert('file_id',"Please select a file.").notEmpty();
        req.assert('amount',"Amount is required.").notEmpty();
		req.assert("date","date is required").notEmpty();														
		var errors = req.validationErrors();
		if(errors){
			var data = {error: true,message:errors[0].msg,data:{}};			
			res.status(201).send(data);	
		}else{
			jwt.verify(req.token, meta.thekey,(err, auth) => {
				if(err) {		    
					res.json({message:err.message,error:true});
				}else {	

					    const this_data = JSON.parse(JSON.stringify(req.body));

						var oldFiles = [];
						var newFiles = [];
						
						var receipt_image = "";
						var submitters_img1 = "";
						var submitters_img2 = "";
						var submitters_img3 = "";

						if(req.files.length>0)
						{
							(req.files).forEach((f)=>{
								if(f.fieldname==="receipt_image") {
									receipt_image = getImageWithFoldername(f.path);
									newFiles.push(receipt_image);
								}else if(f.fieldname==="submitters_img1"){
									submitters_img1 = getImageWithFoldername(f.path);
									newFiles.push(submitters_img1);
								}else if(f.fieldname==="submitters_img2"){
									submitters_img2 = getImageWithFoldername(f.path);
									newFiles.push(submitters_img2);
								}else if(f.fieldname==="submitters_img3"){
									submitters_img3 = getImageWithFoldername(f.path);
									newFiles.push(submitters_img3);
								}else{
									/*Remove others name images*/
									unlinkSingleImage(getImageWithFoldername(f.path));
								}
							});
						}

						var sql = "SELECT *from `file_expense` WHERE `id`="+parseInt(this_data.id)+"";

						db.query(sql,(err,result)=>{
							if(err){
								unlinkMultipleImages(newFiles);
								var data = {"error":true,'message':err.sqlMessage,'data':{}};
								res.status(201).send(data);	
							}else{
								console.log(result);

								receipt_image ? oldFiles.push(result[0].receipt_image) : receipt_image = result[0].receipt_image;
								submitters_img1 ? oldFiles.push(result[0].submitters_img1) : submitters_img1 = result[0].submitters_img1;
								submitters_img2 ? oldFiles.push(result[0].submitters_img2) : submitters_img2 = result[0].submitters_img2;
								submitters_img3 ? oldFiles.push(result[0].submitters_img3) : submitters_img3 = result[0].submitters_img3;


								var user_id = auth.id;	
								var id = this_data.id;																					
								var expense = {
									"file_id":this_data.file_id,
									"amount":this_data.amount,					    
									"description":this_data.description ? this_data.description : "",
									"date":this_data.date,		   									    									    						   							    						 						    							  	   							    						  
									"receipt_image":receipt_image ? receipt_image : "",
									"submitters_img1":submitters_img1,
									"submitters_img2":submitters_img2,
									"submitters_img3":submitters_img3,
									"is_approved":0,
									"updated_at" : getCurrentDateAndTime(),
									"updated_by" : user_id
								}

								console.log(expense);

								var sql = "UPDATE `file_expense` SET `file_id`="+parseInt(expense.file_id)+",`amount`="+parseFloat(expense.amount)+",`description`='"+expense.description+"',date='"+expense.date+"',receipt_image='"+expense.receipt_image+"',submitters_img1='"+expense.submitters_img1+"',submitters_img2='"+expense.submitters_img2+"',submitters_img3='"+expense.submitters_img3+"',is_approved="+expense.is_approved+",updated_at='"+expense.updated_at+"',updated_by="+parseInt(expense.updated_by)+" WHERE `id`="+id+"";
								db.query(sql,(err,result)=>{
									if(err){
										/*Remove new files*/
										unlinkMultipleImages(newFiles);
										var data = {"error":true,'message':err.sqlMessage,'data':{}};
										res.status(201).send(data);	
									}else{
										/*Remove old files*/
										//unlinkMultipleImages(oldFiles);
										var data = {error: false,message:'File expense has been updated...','data':{}};
										res.status(201).send(data);	
 									}
								});
							}
						});
					}
			});
		}
	},
	delete:function(req,res){
		var id = req.body.id;	
		req.assert('id',"Id required.").notEmpty();																
		var errors = req.validationErrors();
		if(errors){
			var data = {error: true,message:errors[0].msg,data:{}};			
			res.status(201).send(data);	
		}else{
			jwt.verify(req.token, meta.thekey,(err, auth) => {
				if(err) {
					  res.json({message:err.message,error:true});
				}else {
					var user_id = auth.id;
					
					var sql = `UPDATE \`file_expense\`  SET  \`isdeleted\`=${Number(1)},\`updated_at\`='${getCurrentDateAndTime()}',\`updated_by\`=${user_id} where \`id\`=${id}`;
					db.query(sql,function(err,result){
						if (err){
							var data = {"error":true,'message':err.sqlMessage,'data':{}};
							res.status(201).send(data);
						}else{
							var data = {"error":false,'message':"Expense has been deleted successfully.",'data':{}};
							res.status(201).send(data);
						}
					})
				
				}
			})  
		}		
		
	}

};	

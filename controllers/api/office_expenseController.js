var mdl_common     = require('./../../models/mdl_common');
var asyncLoop = require('node-async-loop');
const { unlinkMultipleImages,getImageWithFoldername, unlinkSingleImage } = require('../../services/FileService');
module.exports = {
	add: function (req, res) {	

		req.assert("date","date is required").notEmpty();
		var errors = req.validationErrors();

		if(errors){
			var data = {"error":true,'message':errors[0].msg,'data':{}};
			res.status(201).send(data);		
		}else{
			jwt.verify(req.token, meta.thekey,(err, auth) => {

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

					unnecessary_files.length > 0 ? unlinkMultipleImages(unnecessary_files) : "";
					if(!receipt_image)
					{
						/*If receipt image is not uploaded then remove submitters_img1,submitters_img2,submitters_img3*/
						files.length>0 ? unlinkMultipleImages(files):"";
							
						var data = {"error":true,'message':"Please upload the receipt",'data':{}};
						res.status(201).send(data);
					}
					else
					{
						var user_id = auth.id;																						
						var expense = {
							"expense":(typeof this_data.expense!=="undefined") ? this_data.expense : null,
							"description":this_data.description ? this_data.description : "",
							"date":this_data.date,		   									    									    						   							    						 						    							  	   							    						  
							"receipt_image":receipt_image ? receipt_image : "",
							"deposit":(typeof this_data.deposit!=="undefined") ? this_data.deposit : null,
							"submitters_img1":submitters_img1,
							"submitters_img2":submitters_img2,
							"submitters_img3":submitters_img3,
							"created_by":user_id,
							"created_at":getCurrentDateAndTime(), //getCurrentDateAndTime() -> from app.js
							"updated_at" : null,
							"updated_by" : null
						}

						console.log(expense);

						if((typeof this_data.expense==="undefined") && (typeof this_data.deposit==="undefined")){
							unlinkMultipleImages(files);
							var data = {"error":true,'message':"Please enter expense or deposit",'data':{}};
							res.status(201).send(data);
						}else{
							db.query('INSERT INTO `office_expense` SET ?',expense, (err, result) =>{
								if(err){
									/*If error occur then remove all the images*/
									unlinkMultipleImages(files);
									var data = {"error":true,'message':err.sqlMessage,'data':{}};
									res.status(201).send(data);
								}else{
									var data = {"error":false,'message':'Record has been inserted....','data':result};
									res.status(201).send(data);
								}
							});
						}
					}
					
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
				var sql = "SELECT `id`,`expense`,`description`,`date`,`receipt_image`,`deposit`,`submitters_img1`,`submitters_img2`,`submitters_img3`,`isdeleted`,`is_approved`,`created_by` FROM `office_expense` where `isdeleted`="+Number(0)+"";
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
				
				var sql = "SELECT `id`,`expense`,`description`,`date`,`receipt_image`,`deposit`,`submitters_img1`,`submitters_img2`,`submitters_img3`,`isdeleted`,`is_approved`,`created_by` FROM `office_expense` where `isdeleted`="+Number(0)+" and `id`="+parseInt(id)+"";

				db.query(sql,(err,result)=>{
					if(err){
						var data = {"error":true,'message':err.sqlMessage,'data':{}};
						res.status(201).send(data);	
					}else{
						if(result.length>0){
							var data = {"error":false,'message':'Record fetched successfully','data':result};
							res.status(201).send(data);		
						}else{
							var data = {error:true,message:"Requested Record not found",'data':{}};
							res.status(201).send(data);
						}
					}
				});
			}
		})
	},
	update: function (req, res) {

		req.assert("id","Id is required").notEmpty();
		req.assert("date","date is required").notEmpty();
		var errors = req.validationErrors();

		if(errors){
			var data = {"error":true,"message":errors[0].msg,"data":{}};
			return res.status(201).send(data);
		}else{
			jwt.verify(req.token, meta.thekey,(err, auth) => {
				const this_data = JSON.parse(JSON.stringify(req.body));
				console.log(this_data);

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

				var sql = "SELECT *from `office_expense` WHERE `id`="+parseInt(this_data.id)+" and isdeleted="+Number(0)+"";

				db.query(sql,(err,result)=>{
					if(err){
						unlinkMultipleImages(newFiles);
						var data  = {"error":true,"message":err.sqlMessage,"data":{}};
						res.status(201).send(data);
					}else{
						if(result.length){
							
							receipt_image ? oldFiles.push(result[0].receipt_image) : receipt_image = result[0].receipt_image;
							submitters_img1 ? oldFiles.push(result[0].submitters_img1) : submitters_img1 = result[0].submitters_img1;
							submitters_img2 ? oldFiles.push(result[0].submitters_img2) : submitters_img2 = result[0].submitters_img2;
							submitters_img3 ? oldFiles.push(result[0].submitters_img3) : submitters_img3 = result[0].submitters_img3;

							var user_id = auth.id;	
							var id = this_data.id;
							
							var expense = {
								"id":id,
								"expense":(typeof this_data.expense!=="undefined") ? this_data.expense : null,
								"description":this_data.description ? this_data.description : "",
								"date":this_data.date,		   									    									    						   							    						 						    							  	   							    						  
								"receipt_image":receipt_image ? receipt_image : "",
								"deposit":(typeof this_data.deposit!=="undefined") ? this_data.deposit : null,
								"submitters_img1":submitters_img1,
								"submitters_img2":submitters_img2,
								"submitters_img3":submitters_img3,
								"updated_at" : getCurrentDateAndTime(), //getCurrentDateAndTime() -> from app.js,
								"updated_by" : user_id
							}

							console.log(expense);

							if((typeof this_data.expense==="undefined") && (typeof this_data.deposit==="undefined"))
							{
								unlinkMultipleImages(newFiles);
								var data = {"error":true,'message':"Please enter expense or deposit",'data':{}};
								res.status(201).send(data);
							}else
							{
								/*Remove old files*/
								//unlinkMultipleImages(oldFiles);
								var sql = "UPDATE `office_expense` SET `expense`="+expense.expense+",`description`='"+expense.description+"',`date`='"+expense.date+"',`receipt_image`='"+expense.receipt_image+"',`deposit`="+expense.deposit+",`submitters_img1`='"+expense.submitters_img1+"',`submitters_img2`='"+expense.submitters_img2+"',`submitters_img3`='"+expense.submitters_img3+"',updated_at='"+expense.updated_at+"',updated_by="+expense.updated_by+" where `id`="+parseInt(id)+"";
								db.query(sql,expense,(err,result)=>{
									if(err){
										unlinkMultipleImages(newFiles);
										var data = {"error":true,"message":err.sqlMessage,"data":{}};
										res.status(201).send(data);
									}else{
										var data = {"error":false,'message':"Record has been updated...",'data':{}};
										res.status(201).send(data);
									}
								})
							}

						}else{
							unlinkMultipleImages(newFiles);
							var data = {"error":true,'message':"Record doesn't exist or already deleted",'data':{}};
							res.status(201).send(data);
						}
					}
				});

				
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
					
					var sql = `UPDATE \`office_expense\`  SET  \`isdeleted\`=${Number(1)},\`updated_at\`='${getCurrentDateAndTime()}',\`updated_by\`=${user_id} where \`id\`=${id}`;
					db.query(sql,function(err,result){
						if (err){
							var data = {"error":true,'message':err.sqlMessage,'data':{}};
							res.status(201).send(data);
						}else{
							var data = {"error":false,'message':"Expense has been Removed",'data':{}};
							res.status(201).send(data);
						}
					})

				}
			})  
		}		
		
	}

};	

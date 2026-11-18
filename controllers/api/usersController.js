var mdl_common     = require('./../../models/mdl_common');
var asyncLoop = require('node-async-loop');
module.exports = {
	changePassword: function(req , res){
		var current_password = req.body.current_password;
		var new_password 	 = req.body.new_password;
		var confirm_password = req.body.confirm_password;
		jwt.verify(req.token, meta.thekey,(err, auth) => {
		    if(err) {		    
		      	res.json({message:err.message,error:true});
		    }else {		    	
		    	req.assert('current_password','Current password required').notEmpty();
				req.assert('new_password','New password required').notEmpty();
				req.assert('confirm_password','Confirm password required').notEmpty();
				req.assert('confirm_password','Confirm password does not match new password').equals(new_password);											
				var errors = req.validationErrors();
				if(errors){
					var data = {error: true,message:errors[0].msg,data:new Object()};					
					res.status(201).send(data);	
				}else{
					var user_id = auth.id;
			      	//get current user
			      	var sql = "SELECT * FROM `users` WHERE `id` ='"+user_id+"'";
					db.query(sql, function (err, result,fields) {
					    if (err) {				    
						    var data = {"error":true,'message':err.sqlMessage,'data':new Object()};
					    	res.status(201).send(data);				    	
						}else{
							if(result.length >0){						
								if(bcrypt.compareSync(current_password,result[0].password)){					       					    				
							    	var salt = bcrypt.genSaltSync(10);
									password = bcrypt.hashSync(new_password, salt);
									var sql = "UPDATE `users` SET `password`='"+password+"' WHERE `id`='"+user_id+"'";
									db.query(sql,function(err,result){
										if(err){
											var data = {"error":true,'message':err.sqlMessage,'data':new Object()};
					    					res.status(201).send(data);
										}else{											
											var data = {"error":false,'message':messageClass.RESPONSE.PASSWORD_CHANGE_SUCCESS,'data':new Object()};
					    					res.status(201).send(data);
										}										
									})
							    }else{				       
						        	var data = {error:true,message:'Incorrect current password','data':new Object()};
							    	res.status(201).send(data);
						      	}
						    }else{
						    	var data = {error:true,message:'Some thing went to wrong.','data':new Object()};
							   	res.status(201).send(data);							
						    }
						}			   		 
					});
				}		      	
			}
		});	
	},
	update: function(req , res){
		var email = req.body.email;		
		var username = req.body.username;		
		jwt.verify(req.token, meta.thekey,(err, auth) => {
		    if(err) {
		      	res.json({message:err.message,error:true});
		    }else {
		    	if(typeof email !== "undefined" && email != ''){
					req.assert('email', messageClass.VALIDATION.INVALID_EMAIL).isEmail();				
		    	}
		    	if(typeof req.body.phone != 'undefined' && req.body.phone != ''){
		    		req.assert('phone','Phone should be number.').isNumeric();
					req.assert('phone','Phone length should be 10 digit.').isLength({ min: 10 ,max:10});	
		    	}		    											
				var errors = req.validationErrors();
				if(errors){
					var data = {error: true,message:errors[0].msg,data:new Object()};					
					res.status(201).send(data);	
				}else{
					var user_id = auth.id;
			      	//Check email exixt or not 
			      	let sql = "SELECT * FROM `users` WHERE `id` !='"+user_id+"' AND `email` = '"+email+"'";
					db.query(sql, function (err, result,fields) {
					    if (err) {				    
						    var data = {"error":true,'message':err.sqlMessage,'data':new Object()};
					    	res.status(201).send(data);				    	
						}else{
							if(result.length >0){						
								var data = {"error":true,'message':messageClass.RESPONSE.EMAIL_EXISTS,'data':new Object()};	
								res.status(201).send(data);						    
						    }else{
						    	if(typeof username !== "undefined" && username != ''){
						    		let sql = "SELECT  * FROM `users` WHERE `id` !='"+user_id+"' AND `username` = '"+username+"'";
						    		db.query(sql,function(err,result){
						    			if(result.length > 0){						
											var data = {"error":true,'message':messageClass.RESPONSE.USERNAME_EXISTS,'data':new Object()};	
											res.status(201).send(data);						    
									    }else{
									    	//Update User
									    	var updateArr = new Object();						    	
									    	if(typeof req.body.email != 'undefined' && req.body.email != ''){
												Object.assign(updateArr,{'email':req.body.email});
											}if(typeof req.body.country_id != 'undefined' && req.body.country_id != ''){
												Object.assign(updateArr,{'country_id':req.body.country_id});
											}if(typeof req.body.first_name != 'undefined' && req.body.first_name != ''){
												Object.assign(updateArr,{'first_name':req.body.first_name});
											}if(typeof req.body.last_name != 'undefined' && req.body.last_name != ''){
												Object.assign(updateArr,{'last_name':req.body.last_name});
											}if(typeof req.body.phone != 'undefined' && req.body.phone != ''){
												Object.assign(updateArr,{'phone':req.body.phone});
											}if(typeof req.body.address != 'undefined' && req.body.address != ''){
												Object.assign(updateArr,{'address':req.body.address});
											}if(typeof req.body.state_id != 'undefined' && req.body.state_id != ''){
												Object.assign(updateArr,{'state_id':req.body.state_id});
											}if(typeof req.body.city_id != 'undefined' && req.body.city_id != ''){
												Object.assign(updateArr,{'city_id':req.body.city_id});
											}if(typeof req.body.zip_code != 'undefined' && req.body.zip_code != ''){
												Object.assign(updateArr,{'zip_code':req.body.zip_code});
											}if(typeof req.body.username != 'undefined' && req.body.username != ''){
												Object.assign(updateArr,{'username':req.body.username});
											}if(typeof req.body.description != 'undefined' && req.body.description != ''){
												Object.assign(updateArr,{'description':req.body.description});
											}if(typeof req.body.profile_picture != 'undefined' && req.body.profile_picture != ''){
												Object.assign(updateArr,{'profile_picture':req.body.profile_picture});
											}									
									    	db.query("UPDATE `users` SET ? WHERE `id`='"+user_id+"'",updateArr,function (err, result,fields) {
									    		if (err) {							    		  	   
												    var data = {"error":true,'message':err.sqlMessage,'data':new Object()};
											    	res.status(201).send(data);				    	
												}else{
													//Get user																			
													var sql = "SELECT `users`.`id`,`users`.`first_name`,`users`.`last_name`,`email`,`username`,`phone`,`users`.`country_id`,`countries`.`name` as `country_name`,`users`.`state_id`,`states`.`name` as `state_name`,`users`.`city_id`,`cities`.`name` as `city_name`,`street`,`address`,`users`.`description`,`zip_code`,`users`.`created_at`,`users`.`updated_at`,`users`.`profile_picture` FROM `users`"+ 
																"LEFT JOIN `countries` ON `countries`.`id` = `users`.`country_id`"+
																"LEFT JOIN `states` ON `states`.`id` = `users`.`state_id`"+
																"LEFT JOIN `cities` ON `cities`.`id` = `users`.`city_id`"+
																" WHERE `users`.`id`='"+user_id+"'";
													db.query(sql,updateArr,function (err, user,fields) {
														if (err) {				    
														    var data = {"error":true,'message':err.sqlMessage,'data':new Object()};
													    	res.status(201).send(data);				    	
														}else{				
															user[0].phone = (user[0].phone != null && user[0].phone != '') ? user[0].phone : "";
															user[0].country_name = (user[0].country_name != null && user[0].country_name != '') ? user[0].country_name : "";
															user[0].state_name = (user[0].state_name != null && user[0].state_name != '') ? user[0].state_name : "";
															user[0].city_name = (user[0].city_name != null && user[0].city_name != '') ? user[0].city_name : "";
															user[0].street = (user[0].street != null && user[0].street != '') ? user[0].street : "";
															user[0].zip_code = (user[0].zip_code != null && user[0].zip_code != '') ? user[0].zip_code : "";								
															user[0].address = (user[0].address != null && user[0].address != '') ? user[0].address : "";								
															user[0].username = (user[0].username != null && user[0].username != '') ? user[0].username : "";								
															user[0].description = (user[0].description != null && user[0].description != '') ? user[0].description : "";								
															var data = {"error":false,'message':'Record Updated successfully','data':user[0]};
															res.status(201).send(data);	
														}
													})									
												}
									    	});	
									    }
						    		})
						    	}else{
						    		//Update User
							    	var updateArr = new Object();						    	
							    	if(typeof req.body.email != 'undefined' && req.body.email != ''){
										Object.assign(updateArr,{'email':req.body.email});
									}if(typeof req.body.country_id != 'undefined' && req.body.country_id != ''){
										Object.assign(updateArr,{'country_id':req.body.country_id});
									}if(typeof req.body.first_name != 'undefined' && req.body.first_name != ''){
										Object.assign(updateArr,{'first_name':req.body.first_name});
									}if(typeof req.body.last_name != 'undefined' && req.body.last_name != ''){
										Object.assign(updateArr,{'last_name':req.body.last_name});
									}if(typeof req.body.phone != 'undefined' && req.body.phone != ''){
										Object.assign(updateArr,{'phone':req.body.phone});
									}if(typeof req.body.address != 'undefined' && req.body.address != ''){
										Object.assign(updateArr,{'address':req.body.address});
									}if(typeof req.body.state_id != 'undefined' && req.body.state_id != ''){
										Object.assign(updateArr,{'state_id':req.body.state_id});
									}if(typeof req.body.city_id != 'undefined' && req.body.city_id != ''){
										Object.assign(updateArr,{'city_id':req.body.city_id});
									}if(typeof req.body.zip_code != 'undefined' && req.body.zip_code != ''){
										Object.assign(updateArr,{'zip_code':req.body.zip_code});
									}if(typeof req.body.description != 'undefined' && req.body.description != ''){
										Object.assign(updateArr,{'description':req.body.description});
									}if(typeof req.body.profile_picture != 'undefined' && req.body.profile_picture != ''){
										Object.assign(updateArr,{'profile_picture':req.body.profile_picture});
									}									
							    	db.query("UPDATE `users` SET ? WHERE `id`='"+user_id+"'",updateArr,function (err, result,fields) {
							    		if (err) {							    		  	   
										    var data = {"error":true,'message':err.sqlMessage,'data':new Object()};
									    	res.status(201).send(data);				    	
										}else{
											//Get user																			
											var sql = "SELECT `users`.`id`,`users`.`first_name`,`users`.`last_name`,`email`,`username`,`phone`,`users`.`country_id`,`countries`.`name` as `country_name`,`users`.`state_id`,`states`.`name` as `state_name`,`users`.`city_id`,`cities`.`name` as `city_name`,`street`,`address`,`users`.`description`,`zip_code`,`users`.`created_at`,`users`.`updated_at`,`users`.`profile_picture` FROM `users`"+ 
												"LEFT JOIN `countries` ON `countries`.`id` = `users`.`country_id`"+
												"LEFT JOIN `states` ON `states`.`id` = `users`.`state_id`"+
												"LEFT JOIN `cities` ON `cities`.`id` = `users`.`city_id`"+
												" WHERE `users`.`id`='"+user_id+"'"
											db.query(sql,updateArr,function (err, user,fields) {
												if (err) {				    
												    var data = {"error":true,'message':err.sqlMessage,'data':new Object()};
											    	res.status(201).send(data);				    	
												}else{				
													user[0].phone = (user[0].phone != null && user[0].phone != '') ? user[0].phone : "";
													user[0].country_name = (user[0].country_name != null && user[0].country_name != '') ? user[0].country_name : "";
													user[0].state_name = (user[0].state_name != null && user[0].state_name != '') ? user[0].state_name : "";
													user[0].city_name = (user[0].city_name != null && user[0].city_name != '') ? user[0].city_name : "";
													user[0].street = (user[0].street != null && user[0].street != '') ? user[0].street : "";
													user[0].zip_code = (user[0].zip_code != null && user[0].zip_code != '') ? user[0].zip_code : "";								
													user[0].address = (user[0].address != null && user[0].address != '') ? user[0].address : "";								
													user[0].username = (user[0].username != null && user[0].username != '') ? user[0].username : "";								
													user[0].description = (user[0].description != null && user[0].description != '') ? user[0].description : "";								
													var data = {"error":false,'message':'Record Updated successfully','data':user[0]};
													res.status(201).send(data);	
												}
											})									
										}
							    	});	
						    	}						    								
						    }
						}			   		 
					});
				}		      	
			}
		});		
	},
	findByIdAndDelete:function(req , res){			
		jwt.verify(req.token, meta.thekey,(err, auth) => {
		    if(err) {
		      	res.json({message:err.message,error:true});
		    }else {
		    	var user_id = auth.id;
		    
		    	var data = {"error":false,'message':"Account deleted successfully.",'data':new Object()};
				res.status(201).send(data);
		    }
		})    
	},
	searchUsers:function(req,res){
		jwt.verify(req.token, meta.thekey,(err, auth) => {
		    if(err) {
		      	res.json({message:err.message,error:true});
		    }else {
		    	var user_id = auth.id; // login user id
				var keyword = req.body.keyword;											
				req.assert('keyword','keyword field required').notEmpty();											
				var errors = req.validationErrors();
				if(errors){
					var data = {error: true,message:errors[0].msg,data:new Object()};					
					res.status(201).send(data);	
				}else{  
					$sql = "SELECT `users`.`id`,`users`.`first_name`,`users`.`last_name`,`email`,`username`,`phone`,`users`.`country_id`,`countries`.`name` as `country_name`,`users`.`state_id`,`states`.`name` as `state_name`,`users`.`city_id`,`cities`.`name` as `city_name`,`street`,`address`,`users`.`description`,`zip_code`,`users`.`created_at`,`users`.`updated_at`,`users`.`profile_picture` FROM `users`"+ 
																		"LEFT JOIN `countries` ON `countries`.`id` = `users`.`country_id`"+
																		"LEFT JOIN `states` ON `states`.`id` = `users`.`state_id`"+
																		"LEFT JOIN `cities` ON `cities`.`id` = `users`.`city_id`"+
																		"WHERE 1 AND `users`.`id` != '"+user_id+"' AND `users`.`first_name` LIKE '%"+keyword+"%'";
					db.query($sql,async function(err,users){
						if (err){
							var data = {"error":true,'message':err.sqlMessage,'data':new Object()};
						    res.status(201).send(data);
						}else{						
							if(users.length > 0){				 
								var data = {error: false,message:'Record fetch successfully.',data:users};
								res.status(201).send(data);
														
							}else{
								var data = {error: false,message:'Record fetch successfully.',data:users};
								res.status(201).send(data);
							}																					        			    										    							    										    					   							        	
						}	
					})																			
				}			
		    }
		})    
	}
};	

module.exports = {
	reply: function (res, error, message, code, data) {
		var dataObject = {
			error: error,
            statusCode: code,
            message: message,
            data: data
		};
		res.status(code).send(dataObject);
	},

	set_response: function (res, data, code ) {		
		res.status(code).send(data);
	},

	checkUserName: function (res, data, code ) {		
		res.status(code).send(data);
	},

	checkPassword: function (password) {		
		res.status(code).send(data);
	},

	sendMail: function (from, to, subject, text, html, callback) {
		var mailOptions = {
		    from: from, // sender address 
		    to: to, // list of receivers 
		    subject: subject, // Subject line 
		    text: text, // plaintext body 
		    html: html // html body 
		};
		 
		// send mail with defined transport object 
		transporter.sendMail(mailOptions, function(error, info) {
		    if (error) {
		    	c(error);
		        return callback(false);
		    } else {
		    	return callback(true);
		    }
		});
	},

	generateOTP: function () {
		var val = Math.floor(1000 + Math.random() * 9000);
		return val;
	},

	verifytoken : function (req,res,next){	 
  		const bearerHeader = req.headers['authorization'];
	  	if(typeof bearerHeader !== 'undefined') {    	
	    	const bearer = bearerHeader.split(' ');
	    	// Get token from array
	    	const bearerToken = bearer[1]; 
			req.user = jwt.verify(bearerToken,meta.thekey);   	
	    	req.token = bearerToken;    	
	    	next();
	  	} else {    
	    	res.status(401).json({
	    		error:true,
	    		message:"Wrong number of segments",
				data:{}
	    	});
	  	}
	},

	getRandomString: function (length = 10) {
	    var result           = '';
		var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		var charactersLength = characters.length;
		for ( var i = 0; i < length; i++ ) {
		    result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}		
		return result;
	},

	getSecretCode: function (length = 25) {
	    var result           = '';
		var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
		var charactersLength = characters.length;
		for ( var i = 0; i < length; i++ ) {
		    result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}		
		return result;
	},

	getSecretID: function (length = 25) {
	    var result           = '';
		var characters       = 'abcdefghijklmnopqrstuvwxyz0123456789';
		var charactersLength = characters.length;
		for ( var i = 0; i < length; i++ ) {
		    result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}		
		return result;
	}
};

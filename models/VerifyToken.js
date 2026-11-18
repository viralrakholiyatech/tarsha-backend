const { auth_header, scode, rsmessage, jwtInfo,userRoles } = require("../helpers/constants")

module.exports =
{
    checkJwtString:(header)=>{
        try
        {
            if(header)
            {
                const token = header.split(' ')[1];
                return jwt.verify(token,jwtInfo.secret_key);
            }
            else
            {
                return null;   
            }
        }
        catch(err)
        {
            return null;
        }
    },
    // jwtVerify: (req, res, next) => {
    //     const authorizationHeader = req.headers[auth_header];
    
    //     if (authorizationHeader) {
    //         try {
    //             // Remove "Bearer " prefix from the token
    //             const token = authorizationHeader.split(' ')[1];
    
    //             req.user = module.exports.checkJwtString(token); // Verify the token
    
    //             if (req.user) {
    //                 next();
    //             } else {
    //                 res.status(scode.unauthorized).json({ message: rsmessage.unauthorized, success: false });
    //             }
    //         } catch (err) {
    //             res.status(scode.unauthorized).json({ message: rsmessage.unauthorized, success: false });
    //         }
    //     } else {
    //         res.status(scode.unauthorized).json({ message: rsmessage.unauthorized, success: false });
    //     }
    // },
    jwtVerify: (req, res, next) => {
        const token = module.exports.checkJwtString(req.headers[auth_header]);
        console.log('Received token:', token);
    
        try {
            if (token) {
                req.user = token;
                next();
            } else {
                throw new Error('JWT token not provided');
            }
        } catch (err) {
            console.error('Error:', err);
            res.status(scode.unauthorized).json({ message: rsmessage.unauthorized, success: false });
        }
    },
    
    
    // jwtVerify:(req,res,next)=>
    // {
    //     const token = module.exports.checkJwtString(req.headers[auth_header]);

    //     if(token)
    //     {
    //         try
    //         {
    //             req.user = token;
    //             next();
    //         }
    //         catch(err)
    //         {
    //             res.status(scode.unauthorized).json({message:rsmessage.unauthorized,success:false});
    //         }
    //     }
    //     else
    //     {
    //         res.status(scode.unauthorized).json({message:rsmessage.unauthorized,success:false});
    //     }
    // },
    jwtVerifyWithRoles:(roles_arr=[userRoles.admin_key])=>
    {
        return (req,res,next)=>{

            try
            {
                const token = module.exports.checkJwtString(req.headers[auth_header]);

                if(token)
                {
                    req.user = token;
                    const rolesArray =  req.user?.user_roles;

                    const isAuthorized = rolesArray.some((role)=>roles_arr.includes(role))

                    if(isAuthorized)
                    {
                        next();
                    }
                    else
                    {
                        res.status(scode.bad_req).json({message:rsmessage.unauthorized,success:false});
                    }     
                  
                }
                else
                {
                    res.status(scode.unauthorized).json({message:rsmessage.unauthorized,success:false});
                }
            }
            catch(err)
            {
                console.log(err);
                res.status(scode.unauthorized).json({message:rsmessage.token_expire,success:false});
            }
        }
    }
}
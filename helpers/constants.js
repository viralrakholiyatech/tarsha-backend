module.exports =
{
    frontEndUrl:{
        url:"https://dev.zaidexceldesign.com",
        FileStageRouteUrl:"https://dev.zaidexceldesign.com/file-details"
    },
    mailConstant:{
        user:"noreply@zaidexceldesign.com",
        pass:process.env.SMTP_PASSWORD,
        defaultTo : "shaikhzaid027@gmail.com",
        host:"zaidexceldesign.com",
        service:"",
        port:25
    },
    rsmessage:{
        invalid:"Invalid Request",
        authenticated:"Logged In!",
        record_fetched:"Record fetched",
        data_not_found:"Not found",
        invalid_email:"Invalid email",
        required:"Required!",
        email_not_found:"Username is not existed",
        invalid_password:"Invalid password!",
        loggedIn:"Authenticated",
        disabledUser:"Your account is Inactive",
        token_expire:"Timed out",
        default_record_add:"Inserted!",
        record_with_name:(name)=>`${name} added`,
        removed:"Removed",
        updated:"Changes saved",
        bad_msg:"Something went wrong",
        success_msg:"Succeed",
        unauthorized:"Resouces are not allowed to be accessed",
    },
    scode:{
        success:200,
        bad_req:200,
        unauthorized:200
    },
    privateKeyFileName:"privateKey.txt",
    auth_header:"authorization",
    folders:{
        default_dir:"default"
    },
    filesName:{
        AdminMailLog:"AdminMailLogs.txt"
    },
    jwtInfo:{
        secret_key:process.env.JWT_SECRET,
        expiresIn:"2h"
    },
    userRoles:{
        admin_key:"admin",
        emp_key:"Employees",
        client_key:"Client",
        subadmin:"subadmin"
    }
}
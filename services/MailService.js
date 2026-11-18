const nodemailer = require("nodemailer");
const { mailConstant } = require("../helpers/constants");
module.exports=
{
    sendEmail:async (msgObject)=>{
        const msg = {
            from : msgObject?.from ? msgObject?.from : mailConstant.user,
            to : msgObject?.to ? msgObject?.to : mailConstant.defaultTo,
            subject : msgObject?.subject ? msgObject?.subject : "Message From zaidexceldesign" ,
            html : msgObject?.html ? msgObject?.html : `<h5>Thank you for connecting with zaidexceldesign.com</h5>`,
        }

        nodemailer.createTransport({
            auth:{
                user:mailConstant.user,
                pass:mailConstant.pass
            },
            port:mailConstant.port,
            host:mailConstant.host,
            secure: false,
            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false,
            },
        }).sendMail(msg,(err)=>{
            if(err){
               console.log(err);
                const content = `\n${JSON.stringify({error:true,time:getCurrentDateAndTime(),...msg})}\n--------------------------------------------------------------------------------------`;
                // addContentToFile(`${PUBLIC_DIR}/${folders.default_dir}/${filesName.AdminMailLog}`,content);
            }else{
                console.log("Email sent");
                const content = `\n${JSON.stringify({error:false,time:getCurrentDateAndTime(),...msg})}\n--------------------------------------------------------------------------------------`;
                // addContentToFile(`${PUBLIC_DIR}/${folders.default_dir}/${filesName.AdminMailLog}`,content);
            }
        })
    },
    fileStageEmailTemplate:(obj)=>{
        return `
        <html>
            <body>
                <p>File stage has been updated From ${obj?.from_stage} to ${obj?.to_stage}</p>
                <h4>Details</h4>
                <table cellpadding='10'>
                <tr>
                    <td width='30%'>File Name</td>
                    <td>${obj?.file_name}</td>
                </tr>
                <tr>
                    <td width='30%'>Current stage</td>
                    <td>${obj?.to_stage}</td>
                </tr>
                <tr>
                    <td>More Info:</td>
                    <td><a href='${obj?.url}' target='__blank'>Click here</a></td>
                </tr>
                </table>
            </body>
        </html>
        `

       
    }
}
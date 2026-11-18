const date = require("date-and-time");
module.exports =
{
    filter_string:(string)=>{
        try
        {
            let output;
            if(string && string.length>0)
            {
                output = string.replace(/"/g,`\\"`);
                output = output.replace(/'/g,`\\'`);
            }
            return output;
        }
        catch(err)
        {
            console.log(err);
            return "";
        }
    },
    ObjectDataToTable:(obj,title="")=>{
        try
        {
            let output = `
            <html>
            <head>
            <style>
                table {
                    font-family: arial, sans-serif;
                    border-collapse: collapse;
                    width: 100%;
                }
                td, th {
                    border: 1px solid #dddddd;
                    text-align: left;
                    padding: 8px;
                  }
                  tr:nth-child(even) {
                    background-color: #dddddd;
                  }    
            </style>
            </head>
            <body>
            <center><h2>${title}</h2></center>
            `;
            if(obj!=null)
            {
                output = "<table><thead></thead><tbody>";
                let str = "";
                
                for(let key of Object.keys(obj))
                {
                    // console.log(`${key} ${obj[key]}`);
                    str += `<tr><td>${key}</td><td>${obj[key]}</td></tr>`;
                }

                str+="</tbody></table></body></html>";
                output+=str;

                return output;

            }
        }
        catch(err)
        {
            console.log(err);
            return "";
        }
    },
    GetDateAndTime : (_Date,_format="DD-MMM-YYYY HH:mm:ss") => {
        try{
            if(!_Date || !_format){
                return "-";
            } 
        
            const _date = _Date.split(" ")[0];
            const _time = (_Date.split(" ")[1]);
            const finalDateAndTime =  date.transform(`${_date} ${_time}`,_format,_format);
        
            return date.isValid(finalDateAndTime,_format) ? finalDateAndTime : "-";
        }catch(err){
            console.log(err);
            return "-";
        }
    }
}
module.exports = {
    filter_string:(string)=>{
        let output;
        if(string!=undefined && string!=null && string)
        {
            output = string.replace(/"/g,`\\"`);
            output = output.replace(/'/g,`\\'`);
        }
        return output;
    },
    getOnlyDateFromMySql: (_date) => {
        try {
            if (!_date) return null;
            if (_date instanceof Date) {
                const y = _date.getFullYear();
                const m = String(_date.getMonth() + 1).padStart(2, "0");
                const d = String(_date.getDate()).padStart(2, "0");
                return `${y}-${m}-${d}`;
            }
            const str = String(_date).trim();
            const datePart = str.split(/[T ]/)[0];
            return datePart || null;
        } catch (err) {
            console.log(err);
            return null;
        }
    },
    getOnlyTimeFromMySql: (_date) => {
        try {
            if (!_date) return null;
            if (_date instanceof Date) {
                const hh = String(_date.getHours()).padStart(2, "0");
                const mm = String(_date.getMinutes()).padStart(2, "0");
                const ss = String(_date.getSeconds()).padStart(2, "0");
                return `${hh}:${mm}:${ss}`;
            }
            const str = String(_date).trim();
            const parts = str.split(/[T ]/);
            if (parts.length > 1) {
                return parts[1].split(".")[0];
            }
            return null;
        } catch (err) {
            console.log(err);
            return null;
        }
    },
    isDateInBetween:(date,start,end)=>
    {
        try
        {
            return moment(date).isBetween(start,end) || (moment(date).isSameOrAfter(start) && moment(date).isSameOrBefore(end));
        }
        catch(err)
        {
            console.log(err);
            return false;
        }
    },
    isValidJson:(json_string)=>{
        try{
            return JSON.parse(json_string);
        }catch(err){
            return null;
        }
    },
    validJson:(json_string)=>{
        try{
            JSON.parse(json_string);
            return true;
        }catch(err){
            console.log(err);
            return false;
        }
    },
    skipStagesMessage:()=>{
        return "You've skipped the stage";
    }
}
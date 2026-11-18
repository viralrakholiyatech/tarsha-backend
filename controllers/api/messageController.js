module.exports={
    customerMessage:"Your file has been created",
    sendMessageToClient:"You've been assigned new file",
    assignFile:"You've been assigned the file",
    rejectPlotValidation:"File has been rejected",
    stageChanged:"File has moved to next stage...",
    demoMessage:(filename,name)=>{
        return `${filename} added by ${name}`
    }
}
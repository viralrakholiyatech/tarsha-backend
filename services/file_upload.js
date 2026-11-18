const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        let foldername = req.params.foldername;
        cb(null,path.join(PUBLIC_DIRECTORY,foldername));
    },
    filename:(req,file,cb)=>{
        cb(null,`${Date.now()}_${Math.random()*100}-${file.originalname}`);
    }
});

const file_upload = multer({
    storage : storage,
    limits : 2048 * 100
});


module.exports = file_upload;
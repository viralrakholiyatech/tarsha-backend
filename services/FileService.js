
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        let foldername = req.params?.foldername;
        let directory = path.join(PUBLIC_DIRECTORY, foldername);
        !fs.existsSync(directory)
          ? fs.mkdirSync(directory, { recursive: true })
          : "";
        cb(null, directory);
      } catch (err) {
        console.log(err);
        let foldername = "default";
        let directory = path.join(PUBLIC_DIRECTORY, foldername);
        !fs.existsSync(directory)
          ? fs.mkdirSync(directory, { recursive: true })
          : "";
        cb(null, directory);
      }
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}_${Math.random() * 100}-${file.originalname}`);
    },
  });
  
  const file_upload = multer({
    storage: storage,
    limits: 2048 * 100,
  });
  
  const getImageWithFoldername = (_path, number = 6) => {
    return _path.split("/").slice(number).join("/");
  };
  const getImageWithFolder = (_path, number = 5) => {
      
    return _path.split("/").slice(number).join("/");
  };
  
  const getImageWithname = (_path, number = 5) => {
      
    return _path.split("\\").slice(number).join("\\");
  };
  
  const unlinkSingleImage = (_path) => {
    if (!_path || _path.startsWith("http://") || _path.startsWith("https://")) {
      return;
    }
    const fullpath = `${PUBLIC_DIRECTORY}/${_path}`;
    console.log(fullpath);
    if (fs.existsSync(fullpath)) {
      fs.unlink(fullpath, (err) => {
        if (err) {
          console.log(`Error while Unlinking the image at ${current_timestamp}`);
        } else {
          console.log(`${fullpath} deleted`);
        }
      });
    }
  };
  
  const unlinkMultipleImages = (_path_arr) => {
    var f = "";
    for (const _path of _path_arr) {
      if (!_path || _path.startsWith("http://") || _path.startsWith("https://")) {
        continue;
      }
      f = `${PUBLIC_DIRECTORY}/${_path}`;
      if (fs.existsSync(f)) {
        fs.unlink(f, (err) => {
          if (err) {
            console.log(
              `Error while Unlinking the image at ${current_timestamp}`
            );
          } else {
            console.log(`${f} deleted`);
          }
        });
      }
    }
  };
  
  module.exports = {
    file_upload,
    getImageWithFoldername,
    getImageWithFolder,
    unlinkSingleImage,
    unlinkMultipleImages,
    getImageWithname,
  };
  
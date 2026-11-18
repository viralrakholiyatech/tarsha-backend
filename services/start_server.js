app.set('port', process.env.PORT || 7600);
const port = app.get("port");
app.listen(port,()=>{
    console.log(`Server is listening to PORT ${port}`);
});

app.set('port', Number(process.env.PORT) || 7600);
const port = app.get('port');
module.exports = app.listen(port, '0.0.0.0', () => {
  console.log(`Server is listening on 0.0.0.0:${port}`);
});

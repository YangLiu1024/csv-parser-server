# Express Response
## Field
res.app -> hold the reference to express application  
res.locals -> an object that contains response local variables scoped to the request, such as res.locals.user = req.user
## Methods
* res.append(field, string|string[]) -> append the value to specifed header field, if not exist, create a new header
* res.attachment([filename]) -> 将 response header 'Content-Disposition' 设置为 'attachment', 如果指定了filename, 则同时设置 header 'Content-Type'  
  比如 res.attachment('logo.png') -> Content-Disposition:attachment;filename="logo.png" Content-Type:image/png
* res.cookie(name, value,[,options])
* res.clearCookie(name[,options])
* res.download(path[,filename][,options][,fn]), transfer the file at path as an "attachment". browser will prompt the user for download
* res.end() -> end response without data
* res.get(field) -> return the HTTP response header specified by field
* res.set(field, value) -> 设置 HTTP header
* res.json([body]) -> 将 body 通过 JSON.stringify(body) 转换为 JSON, 然后 send response
* res.redirect([status,] path) -> Redirects to the URL derived from the specified path, with specified status
* res.render(view[,locals][,callback]) -> view 是模板路径，locals 是传给模板的参数对象
* res.send([body]) -> 如果 body 是 string, 该方法会将 Content-Type 设置为 'text/html', 如果是 object, array, 则会使用 'application/json' 如果是 Buffer object, 则会改为 'application/octet-stream'
* res.sendFile(path,[,options][,callback]), path 需要是绝对路径，除非 options 里设置了 root 参数。  
  The method invokes the callback function fn(err) when the transfer is complete or when an error occurs.  
  If the callback function is specified and an error occurs, the callback function must explicitly handle the response process either by ending the request-response cycle, or by passing control to the next route.
```js
  app.get('/file/:name', function (req, res, next) {
  var options = {
    root: path.join(__dirname, 'public'),
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  }

  var fileName = req.params.name
  res.sendFile(fileName, options, function (err) {
    if (err) {
      next(err)
    } else {
      console.log('Sent:', fileName)
    }
  })
})
```
* res.status(statusCode) -> 设置 response status code
* res.type(type) -> 设置 response header 'Content-Type'